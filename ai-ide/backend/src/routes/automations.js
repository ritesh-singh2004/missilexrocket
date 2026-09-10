import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();

const automations = new Map();

// Automation definitions
const AUTOMATION_TYPES = [
  { id: 'dependency_check', name: 'Dependency Check', description: 'Check for outdated or vulnerable dependencies', schedule: 'weekly' },
  { id: 'code_review', name: 'Code Review', description: 'Automated code review on push', schedule: 'on_push' },
  { id: 'test_run', name: 'Test Runner', description: 'Run tests automatically', schedule: 'on_push' },
  { id: 'security_scan', name: 'Security Scan', description: 'Scan for security vulnerabilities', schedule: 'daily' },
  { id: 'documentation', name: 'Doc Generator', description: 'Generate documentation', schedule: 'weekly' },
  { id: 'lint', name: 'Linter', description: 'Run linter on code changes', schedule: 'on_push' },
];

// List automation types
router.get('/types', (req, res) => {
  res.json(AUTOMATION_TYPES);
});

// List user automations
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userAutomations = await prisma.backgroundTask.findMany({
      where: { type: 'automation' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(userAutomations);
  } catch (err) { next(err); }
});

// Create automation
router.post('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { type, projectId, config, schedule } = req.body;

    const automation = await prisma.backgroundTask.create({
      data: {
        type: 'automation',
        payload: JSON.stringify({ automationType: type, projectId, config, schedule }),
        status: 'active'
      }
    });

    res.json(automation);
  } catch (err) { next(err); }
});

// Run automation
router.post('/:id/run', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const io = req.app.locals.io;
    const automation = await prisma.backgroundTask.findUnique({ where: { id: req.params.id } });
    if (!automation) return res.status(404).json({ error: 'Automation not found' });

    const config = JSON.parse(automation.payload);

    // Create a new job for this automation run
    const job = await prisma.backgroundTask.create({
      data: {
        type: config.automationType,
        payload: JSON.stringify({ ...config, type: config.automationType }),
        status: 'queued'
      }
    });

    res.json({ message: 'Automation triggered', jobId: job.id });
  } catch (err) { next(err); }
});

// Delete automation
router.delete('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.backgroundTask.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Toggle automation
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const automation = await prisma.backgroundTask.findUnique({ where: { id: req.params.id } });
    if (!automation) return res.status(404).json({ error: 'Not found' });

    const newStatus = automation.status === 'active' ? 'paused' : 'active';
    await prisma.backgroundTask.update({ where: { id: req.params.id }, data: { status: newStatus } });
    res.json({ status: newStatus });
  } catch (err) { next(err); }
});

export default router;
