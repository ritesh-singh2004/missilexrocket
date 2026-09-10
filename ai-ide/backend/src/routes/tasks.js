import { Router } from 'express';

const router = Router();

// List background tasks
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { status, type } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const tasks = await prisma.backgroundTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Create background task
router.post('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { type, payload, priority, scheduledAt } = req.body;

    const task = await prisma.backgroundTask.create({
      data: {
        type,
        payload: JSON.stringify(payload || {}),
        priority: priority || 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Get task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const task = await prisma.backgroundTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Cancel task
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.backgroundTask.updateMany({
      where: { id: req.params.id, status: { in: ['queued', 'pending'] } },
      data: { status: 'cancelled' }
    });
    res.json({ message: 'Cancelled' });
  } catch (err) {
    next(err);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.backgroundTask.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
