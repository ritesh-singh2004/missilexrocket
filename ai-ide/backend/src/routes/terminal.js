import { Router } from 'express';
import { spawn } from 'child_process';

const router = Router();

const terminalSessions = new Map();

// Create terminal session
router.post('/sessions', async (req, res, next) => {
  try {
    const { projectId, cwd } = req.body;
    const prisma = req.app.locals.prisma;

    let workDir = process.cwd();
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
      if (project) workDir = project.path;
    }
    if (cwd) workDir = cwd;

    const sessionId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    const term = spawn(shell, [], { cwd: workDir, env: { ...process.env, TERM: 'xterm-256color' } });

    const session = {
      id: sessionId,
      pid: term.pid,
      cwd: workDir,
      createdAt: new Date(),
      buffer: []
    };

    term.stdout.on('data', (data) => {
      session.buffer.push({ type: 'stdout', data: data.toString(), timestamp: Date.now() });
      if (session.buffer.length > 10000) session.buffer = session.buffer.slice(-5000);
    });

    term.stderr.on('data', (data) => {
      session.buffer.push({ type: 'stderr', data: data.toString(), timestamp: Date.now() });
    });

    term.on('close', (code) => {
      session.buffer.push({ type: 'exit', code, timestamp: Date.now() });
      terminalSessions.delete(sessionId);
    });

    terminalSessions.set(sessionId, session);
    res.json({ sessionId, pid: term.pid, cwd: workDir });
  } catch (err) {
    next(err);
  }
});

// Send input to terminal
router.post('/sessions/:id/input', (req, res, next) => {
  try {
    const session = terminalSessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { data } = req.body;
    const term = terminalSessions.get(req.params.id);
    if (term && term.process) {
      term.process.stdin.write(data);
    }

    res.json({ message: 'Input sent' });
  } catch (err) {
    next(err);
  }
});

// Get terminal output
router.get('/sessions/:id/output', (req, res, next) => {
  try {
    const session = terminalSessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { since } = req.query;
    let buffer = session.buffer;
    if (since) {
      const sinceTime = parseInt(since);
      buffer = buffer.filter(b => b.timestamp > sinceTime);
    }

    res.json({ output: buffer });
  } catch (err) {
    next(err);
  }
});

// Close terminal session
router.delete('/sessions/:id', (req, res, next) => {
  try {
    const session = terminalSessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    terminalSessions.delete(req.params.id);
    res.json({ message: 'Session closed' });
  } catch (err) {
    next(err);
  }
});

// List sessions
router.get('/sessions', (req, res) => {
  const sessions = Array.from(terminalSessions.values()).map(s => ({
    id: s.id,
    pid: s.pid,
    cwd: s.cwd,
    createdAt: s.createdAt
  }));
  res.json(sessions);
});

// Execute command directly
router.post('/execute', (req, res, next) => {
  try {
    const { command, cwd, timeout } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });

    const maxTimeout = timeout || 30000;
    const proc = spawn(command, [], {
      shell: true,
      cwd: cwd || process.cwd(),
      env: process.env,
      timeout: maxTimeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      res.json({ stdout, stderr, exitCode: code });
    });

    proc.on('error', (err) => {
      res.json({ stdout, stderr: err.message, exitCode: 1 });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
