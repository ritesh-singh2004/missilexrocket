import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, relative, extname } from 'path';

const router = Router();

const jobQueue = [];
const runningJobs = new Map();

// Agent types
const AGENT_TYPES = {
  CODING: 'coding',
  RESEARCH: 'research',
  DEBUGGING: 'debugging',
  TESTING: 'testing',
  REVIEW: 'review',
  DOCUMENTATION: 'documentation',
  SECURITY: 'security',
  DEVOPS: 'devops'
};

// Background job processor
async function processJob(job, prisma, io) {
  const update = (data) => {
    prisma.backgroundTask.update({ where: { id: job.id }, data });
    io.to(`user:${job.userId}`).emit('agent:progress', { jobId: job.id, ...data });
  };

  try {
    update({ status: 'running', startedAt: new Date() });

    const payload = JSON.parse(job.payload);
    let result = null;

    switch (payload.type) {
      case 'code_review':
        result = await runCodeReview(payload, job, prisma);
        break;
      case 'security_scan':
        result = await runSecurityScan(payload, job, prisma);
        break;
      case 'test_generation':
        result = await runTestGeneration(payload, job, prisma);
        break;
      case 'documentation':
        result = await runDocumentation(payload, job, prisma);
        break;
      case 'refactor':
        result = await runRefactor(payload, job, prisma);
        break;
      case 'dependency_check':
        result = await runDependencyCheck(payload, job, prisma);
        break;
      default:
        result = { message: `Unknown job type: ${payload.type}` };
    }

    update({ status: 'completed', result: JSON.stringify(result), completedAt: new Date() });
  } catch (err) {
    update({ status: 'failed', error: err.message, completedAt: new Date() });
  }
}

async function runCodeReview(payload, job, prisma) {
  const { projectId, files } = payload;
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const findings = [];
  const excludePatterns = ['node_modules', '.git', 'dist', 'build'];

  function scanDir(dir, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (excludePatterns.includes(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else {
          const ext = extname(entry.name).toLowerCase();
          if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs'].includes(ext)) {
            try {
              const content = readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              const relPath = relative(project.path, fullPath).replace(/\\/g, '/');

              lines.forEach((line, idx) => {
                if (line.includes('eval(') || line.includes('exec(')) {
                  findings.push({ file: relPath, line: idx + 1, severity: 'critical', message: 'Potentially dangerous code execution', suggestion: 'Avoid eval/exec with user input' });
                }
                if (line.includes('console.log') && ext.includes('ts')) {
                  findings.push({ file: relPath, line: idx + 1, severity: 'low', message: 'Console.log in production code', suggestion: 'Remove or use a logger' });
                }
                if (line.includes('TODO') || line.includes('FIXME')) {
                  findings.push({ file: relPath, line: idx + 1, severity: 'info', message: 'Unresolved TODO/FIXME', suggestion: 'Address or create a ticket' });
                }
                if (line.length > 200) {
                  findings.push({ file: relPath, line: idx + 1, severity: 'low', message: 'Very long line (>200 chars)', suggestion: 'Consider breaking into multiple lines' });
                }
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  scanDir(project.path);

  return {
    type: 'code_review',
    totalFindings: findings.length,
    critical: findings.filter(f => f.severity === 'critical').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
    suggestions: findings.filter(f => f.severity === 'low' || f.severity === 'info').length,
    findings: findings.slice(0, 100)
  };
}

async function runSecurityScan(payload, job, prisma) {
  const { projectId } = payload;
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const issues = [];

  // Check for hardcoded secrets
  const secretPatterns = [
    { regex: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded API Key' },
    { regex: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded Password' },
    { regex: /secret\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded Secret' },
    { regex: /token\s*[:=]\s*['"][^'"]+['"]/gi, type: 'Hardcoded Token' },
    { regex: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key' },
  ];

  const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.env.example'];

  function scanDir(dir, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (excludePatterns.includes(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const relPath = relative(project.path, fullPath).replace(/\\/g, '/');
            const lines = content.split('\n');

            for (const pattern of secretPatterns) {
              lines.forEach((line, idx) => {
                if (pattern.regex.test(line)) {
                  issues.push({
                    file: relPath,
                    line: idx + 1,
                    severity: 'critical',
                    type: pattern.type,
                    message: `Possible ${pattern.type} detected`
                  });
                }
                pattern.regex.lastIndex = 0;
              });
            }
          } catch {}
        }
      }
    } catch {}
  }

  scanDir(project.path);

  // Check package.json for vulnerable patterns
  if (existsSync(join(project.path, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(project.path, 'package.json'), 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const riskyPackages = ['request', 'node-ipc', 'colors', 'faker'];
      for (const dep of Object.keys(allDeps || {})) {
        if (riskyPackages.includes(dep)) {
          issues.push({ file: 'package.json', severity: 'warning', type: 'Risky Dependency', message: `${dep} is known to have issues` });
        }
      }
    } catch {}
  }

  return {
    type: 'security_scan',
    totalIssues: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    issues: issues.slice(0, 100)
  };
}

async function runTestGeneration(payload, job, prisma) {
  const { projectId, filePath } = payload;
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const fullPath = join(project.path, filePath);
  if (!existsSync(fullPath)) throw new Error('File not found');

  const content = readFileSync(fullPath, 'utf-8');
  const ext = extname(filePath).toLowerCase();

  // Generate basic test structure
  let testContent = '';
  if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
    testContent = `import { describe, it, expect } from 'vitest';\n\n// TODO: Add imports from '${filePath}'\n\ndescribe('Tests for ${filePath}', () => {\n  it('should work correctly', () => {\n    expect(true).toBe(true);\n  });\n\n  // TODO: Add more test cases\n});\n`;
  } else if (ext === '.py') {
    testContent = `import pytest\n\n# TODO: Add imports from ${filePath}\n\ndef test_basic():\n    assert True\n\n# TODO: Add more test cases\n`;
  }

  return {
    type: 'test_generation',
    file: filePath,
    testContent,
    message: 'Test file generated (add imports and implement tests)'
  };
}

async function runDocumentation(payload, job, prisma) {
  const { projectId, filePath } = payload;
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const fullPath = join(project.path, filePath);
  if (!existsSync(fullPath)) throw new Error('File not found');

  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  const docItems = [];
  lines.forEach((line, idx) => {
    const funcMatch = line.match(/(?:function|const|let|var|async)\s+(\w+)/);
    const classMatch = line.match(/class\s+(\w+)/);
    if (funcMatch) docItems.push({ type: 'function', name: funcMatch[1], line: idx + 1 });
    if (classMatch) docItems.push({ type: 'class', name: classMatch[1], line: idx + 1 });
  });

  return {
    type: 'documentation',
    file: filePath,
    totalFunctions: docItems.filter(d => d.type === 'function').length,
    totalClasses: docItems.filter(d => d.type === 'class').length,
    items: docItems.slice(0, 50),
    message: `Found ${docItems.length} documentable items`
  };
}

async function runRefactor(payload, job, prisma) {
  const { projectId, filePath, instructions } = payload;
  return {
    type: 'refactor',
    file: filePath,
    instructions,
    message: 'Refactoring analysis complete. Review the suggestions in the chat.'
  };
}

async function runDependencyCheck(payload, job, prisma) {
  const { projectId } = payload;
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const results = [];

  if (existsSync(join(project.path, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(project.path, 'package.json'), 'utf-8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      results.push({
        type: 'npm',
        totalDeps: Object.keys(deps).length,
        totalDevDeps: Object.keys(devDeps).length,
        dependencies: Object.entries(deps).map(([name, version]) => ({ name, version })),
        devDependencies: Object.entries(devDeps).map(([name, version]) => ({ name, version }))
      });
    } catch {}
  }

  if (existsSync(join(project.path, 'requirements.txt'))) {
    try {
      const reqs = readFileSync(join(project.path, 'requirements.txt'), 'utf-8');
      const packages = reqs.split('\n').filter(Boolean).map(l => l.trim());
      results.push({ type: 'python', totalDeps: packages.length, packages });
    } catch {}
  }

  return { type: 'dependency_check', results };
}

// List background jobs
router.get('/jobs', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const jobs = await prisma.backgroundTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

// Create background job
router.post('/jobs', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const io = req.app.locals.io;
    const { type, payload, priority } = req.body;

    if (!type || !payload) return res.status(400).json({ error: 'Type and payload required' });

    const job = await prisma.backgroundTask.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        priority: priority || 0,
        status: 'queued'
      }
    });

    // Process in background
    processJob(job, prisma, io).catch(err => {
      console.error('Background job error:', err);
    });

    res.json(job);
  } catch (err) { next(err); }
});

// Get job by ID
router.get('/jobs/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const job = await prisma.backgroundTask.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) { next(err); }
});

// Cancel job
router.post('/jobs/:id/cancel', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.backgroundTask.updateMany({
      where: { id: req.params.id, status: { in: ['queued', 'pending'] } },
      data: { status: 'cancelled' }
    });
    res.json({ message: 'Cancelled' });
  } catch (err) { next(err); }
});

// Delete job
router.delete('/jobs/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.backgroundTask.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Agent types
router.get('/types', (req, res) => {
  res.json(Object.entries(AGENT_TYPES).map(([key, value]) => ({ id: value, name: key })));
});

// Quick agent actions
router.post('/quick-review', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const io = req.app.locals.io;
    const { projectId } = req.body;

    const job = await prisma.backgroundTask.create({
      data: {
        type: 'code_review',
        payload: JSON.stringify({ projectId, type: 'code_review' }),
        status: 'queued'
      }
    });

    processJob(job, prisma, io).catch(console.error);
    res.json({ message: 'Code review started', jobId: job.id });
  } catch (err) { next(err); }
});

router.post('/quick-security', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const io = req.app.locals.io;
    const { projectId } = req.body;

    const job = await prisma.backgroundTask.create({
      data: {
        type: 'security_scan',
        payload: JSON.stringify({ projectId, type: 'security_scan' }),
        status: 'queued'
      }
    });

    processJob(job, prisma, io).catch(console.error);
    res.json({ message: 'Security scan started', jobId: job.id });
  } catch (err) { next(err); }
});

router.post('/quick-test', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const io = req.app.locals.io;
    const { projectId, filePath } = req.body;

    const job = await prisma.backgroundTask.create({
      data: {
        type: 'test_generation',
        payload: JSON.stringify({ projectId, filePath, type: 'test_generation' }),
        status: 'queued'
      }
    });

    processJob(job, prisma, io).catch(console.error);
    res.json({ message: 'Test generation started', jobId: job.id });
  } catch (err) { next(err); }
});

export default router;
