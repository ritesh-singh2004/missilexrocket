import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

async function gitCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    return { success: false, stdout: err.stdout?.trim() || '', stderr: err.stderr?.trim() || err.message };
  }
}

// Git status
router.get('/status', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.query;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand('git status --porcelain', cwd);
    const branchResult = await gitCommand('git branch --show-current', cwd);

    const files = result.stdout.split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2).trim();
      const path = line.substring(3);
      let changeType = 'modified';
      if (status.includes('A')) changeType = 'added';
      else if (status.includes('D')) changeType = 'deleted';
      else if (status.includes('?')) changeType = 'untracked';
      else if (status.includes('R')) changeType = 'renamed';
      return { path, status, changeType, staged: status[0] !== ' ' && status[0] !== '?' };
    });

    res.json({
      branch: branchResult.stdout,
      files,
      ahead: 0,
      behind: 0,
      isClean: files.length === 0
    });
  } catch (err) {
    next(err);
  }
});

// Git log
router.get('/log', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, limit } = req.query;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const count = limit || 20;
    const result = await gitCommand(
      `git log --oneline -${count} --pretty=format:"%H|%s|%an|%ai"`,
      cwd
    );

    if (!result.success) return res.json([]);

    const commits = result.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });

    res.json(commits);
  } catch (err) {
    next(err);
  }
});

// Git diff
router.get('/diff', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, file } = req.query;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const command = file ? `git diff "${file}"` : 'git diff';
    const result = await gitCommand(command, cwd);
    res.json({ diff: result.stdout });
  } catch (err) {
    next(err);
  }
});

// Git branch
router.get('/branches', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.query;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand('git branch -a', cwd);
    const branches = result.stdout.split('\n').filter(Boolean).map(b => {
      const name = b.replace(/^\*?\s+/, '').trim();
      const current = b.startsWith('*');
      const remote = name.startsWith('remotes/');
      return { name, current, remote };
    });

    res.json(branches);
  } catch (err) {
    next(err);
  }
});

// Create branch
router.post('/branches', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, name } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand(`git checkout -b "${name}"`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Switch branch
router.post('/branches/switch', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, name } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand(`git checkout "${name}"`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Stage files
router.post('/stage', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, files } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const fileArgs = files.map(f => `"${f}"`).join(' ');
    const result = await gitCommand(`git add ${fileArgs}`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Unstage files
router.post('/unstage', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, files } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const fileArgs = files.map(f => `"${f}"`).join(' ');
    const result = await gitCommand(`git reset HEAD ${fileArgs}`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Commit
router.post('/commit', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, message, files } = req.body;

    if (!message) return res.status(400).json({ error: 'Commit message is required' });

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    if (files && files.length > 0) {
      const fileArgs = files.map(f => `"${f}"`).join(' ');
      await gitCommand(`git add ${fileArgs}`, cwd);
    }

    const result = await gitCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Pull
router.post('/pull', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand('git pull', cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Push
router.post('/push', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, remote, branch } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const remoteArg = remote || 'origin';
    const branchArg = branch || '';
    const result = await gitCommand(`git push ${remoteArg} ${branchArg}`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Revert file
router.post('/revert', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, file } = req.body;

    let cwd = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) cwd = project.path;
    }

    const result = await gitCommand(`git checkout HEAD -- "${file}"`, cwd);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
