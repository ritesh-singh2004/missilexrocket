import { Router } from 'express';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'fs';
import { join, extname, relative } from 'path';
import { v4 as uuid } from 'uuid';

const router = Router();

const TOOL_DEFINITIONS = [
  {
    name: 'list_files',
    description: 'List files and directories in a path',
    inputSchema: { path: 'string' },
    permissions: 'read'
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: { path: 'string' },
    permissions: 'read'
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: { path: 'string', content: 'string' },
    permissions: 'write'
  },
  {
    name: 'create_file',
    description: 'Create a new file with content',
    inputSchema: { path: 'string', content: 'string' },
    permissions: 'write'
  },
  {
    name: 'delete_file',
    description: 'Delete a file',
    inputSchema: { path: 'string' },
    permissions: 'dangerous'
  },
  {
    name: 'search_code',
    description: 'Search for patterns in code',
    inputSchema: { query: 'string', include: 'string?' },
    permissions: 'read'
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command',
    inputSchema: { command: 'string', cwd: 'string?' },
    permissions: 'dangerous'
  },
  {
    name: 'git_status',
    description: 'Get git status of the repository',
    inputSchema: {},
    permissions: 'read'
  },
  {
    name: 'git_diff',
    description: 'Get git diff',
    inputSchema: { file: 'string?' },
    permissions: 'read'
  },
  {
    name: 'git_commit',
    description: 'Create a git commit',
    inputSchema: { message: 'string', files: 'string[]?' },
    permissions: 'moderate'
  }
];

// List available tools
router.get('/tools', (req, res) => {
  res.json(TOOL_DEFINITIONS);
});

// Create agent task
router.post('/tasks', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, title, description, model } = req.body;

    const task = await prisma.agentTask.create({
      data: {
        projectId: projectId || null,
        userId: req.userId,
        title,
        description: description || '',
        model: model || 'gpt-4',
        status: 'queued',
        state: 'IDLE'
      }
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// List agent tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, status } = req.query;

    const where = { userId: req.userId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const tasks = await prisma.agentTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { steps: true, toolCalls: true }
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Get task by ID
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const task = await prisma.agentTask.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, toolCalls: { orderBy: { createdAt: 'asc' } } }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Execute agent task
router.post('/tasks/:id/execute', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const task = await prisma.agentTask.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'running') return res.status(400).json({ error: 'Task is already running' });

    const project = task.projectId ? await prisma.project.findFirst({ where: { id: task.projectId } }) : null;
    if (!project) return res.status(400).json({ error: 'Project not found or not assigned' });

    // Update task status
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'running', state: 'PLANNING', startedAt: new Date() }
    });

    // Execute in background (simplified for now)
    executeAgentTask(task, project, prisma).catch(err => {
      console.error('Agent task error:', err);
      prisma.agentTask.update({
        where: { id: task.id },
        data: { status: 'failed', state: 'FAILED', errorMessage: err.message }
      });
    });

    res.json({ message: 'Task started', taskId: task.id });
  } catch (err) {
    next(err);
  }
});

// Cancel task
router.post('/tasks/:id/cancel', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.agentTask.updateMany({
      where: { id: req.params.id, userId: req.userId, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelled', state: 'CANCELLED' }
    });
    res.json({ message: 'Task cancelled' });
  } catch (err) {
    next(err);
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.agentTask.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Execute tool call
router.post('/tools/:toolName/execute', async (req, res, next) => {
  try {
    const { toolName } = req.params;
    const { arguments: args, projectId } = req.body;

    const prisma = req.app.locals.prisma;
    const project = projectId ? await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } }) : null;
    if (!project) return res.status(400).json({ error: 'Project not found' });

    const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
    if (!toolDef) return res.status(404).json({ error: 'Tool not found' });

    const result = await executeTool(toolName, args, project.path);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Execute tool without project context
router.post('/tools/execute', async (req, res, next) => {
  try {
    const { toolName, arguments: args, projectId } = req.body;

    const prisma = req.app.locals.prisma;
    let projectPath = process.cwd();

    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) projectPath = project.path;
    }

    const result = await executeTool(toolName, args, projectPath);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

async function executeTool(toolName, args, projectPath) {
  switch (toolName) {
    case 'list_files': {
      const targetPath = join(projectPath, args.path || '.');
      if (!existsSync(targetPath)) return { error: 'Path not found' };
      const entries = readdirSync(targetPath, { withFileTypes: true });
      return {
        output: entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          path: (args.path || '.') + '/' + e.name
        }))
      };
    }

    case 'read_file': {
      const filePath = join(projectPath, args.path);
      if (!existsSync(filePath)) return { error: 'File not found' };
      const stat = statSync(filePath);
      if (stat.size > 10 * 1024 * 1024) return { error: 'File too large' };
      const content = readFileSync(filePath, 'utf-8');
      return { output: content };
    }

    case 'write_file':
    case 'create_file': {
      const filePath = join(projectPath, args.path);
      const dir = join(filePath, '..');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, args.content, 'utf-8');
      return { output: `File ${args.path} saved successfully` };
    }

    case 'delete_file': {
      const filePath = join(projectPath, args.path);
      if (!existsSync(filePath)) return { error: 'File not found' };
      unlinkSync(filePath);
      return { output: `File ${args.path} deleted` };
    }

    case 'search_code': {
      const results = [];
      function searchDir(dir, pattern) {
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              searchDir(fullPath, pattern);
            } else {
              try {
                const content = readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                  if (line.toLowerCase().includes(pattern.toLowerCase())) {
                    results.push({
                      file: relative(projectPath, fullPath).replace(/\\/g, '/'),
                      line: idx + 1,
                      content: line.trim()
                    });
                  }
                });
              } catch {}
            }
          }
        } catch {}
      }
      searchDir(projectPath, args.query);
      return { output: results.slice(0, 50) };
    }

    default:
      return { error: `Tool ${toolName} not implemented` };
  }
}

async function executeAgentTask(task, project, prisma) {
  const steps = [
    { action: 'plan', description: 'Creating execution plan' },
    { action: 'analyze', description: 'Analyzing codebase' },
    { action: 'execute', description: 'Executing changes' },
    { action: 'verify', description: 'Verifying results' }
  ];

  for (let i = 0; i < steps.length; i++) {
    const stepDef = steps[i];

    await prisma.agentStep.create({
      data: {
        taskId: task.id,
        stepNumber: i + 1,
        action: stepDef.action,
        description: stepDef.description,
        status: 'running',
        startedAt: new Date()
      }
    });

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        state: stepDef.action.toUpperCase(),
        plan: JSON.stringify(steps.map(s => s.description))
      }
    });

    // Simulate work
    await new Promise(r => setTimeout(r, 1000));

    await prisma.agentStep.updateMany({
      where: { taskId: task.id, stepNumber: i + 1 },
      data: { status: 'completed', completedAt: new Date(), duration: 1000 }
    });
  }

  await prisma.agentTask.update({
    where: { id: task.id },
    data: { status: 'completed', state: 'COMPLETED', completedAt: new Date(), result: 'Task completed successfully' }
  });
}

export default router;
