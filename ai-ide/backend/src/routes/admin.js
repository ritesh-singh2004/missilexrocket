import { Router } from 'express';

const router = Router();

// Middleware to check admin role
function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Dashboard stats
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const [
      totalUsers,
      totalProjects,
      totalConversations,
      totalAgentTasks,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.conversation.count(),
      prisma.agentTask.count(),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, email: true, createdAt: true } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, language: true, createdAt: true } }),
    ]);

    res.json({
      totalUsers,
      totalProjects,
      totalConversations,
      totalAgentTasks,
      recentUsers,
      recentProjects
    });
  } catch (err) { next(err); }
});

// List all users
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      take: 100
    });
    res.json(users);
  } catch (err) { next(err); }
});

// Update user role
router.put('/users/:id/role', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { role } = req.body;
    if (!['user', 'admin', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json({ message: 'Role updated' });
  } catch (err) { next(err); }
});

// Delete user
router.delete('/users/:id', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

// List all projects
router.get('/projects', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { name: true, email: true } } },
      take: 100
    });
    res.json(projects);
  } catch (err) { next(err); }
});

// System health
router.get('/health', adminOnly, async (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});

// Audit logs
router.get('/audit', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// Usage summary
router.get('/usage', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const usage = await prisma.usageRecord.groupBy({
      by: ['model'],
      _sum: { inputTokens: true, outputTokens: true, cost: true },
      _count: true,
      orderBy: { _count: { id: 'desc' } }
    });
    res.json(usage);
  } catch (err) { next(err); }
});

// Background tasks
router.get('/tasks', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const tasks = await prisma.backgroundTask.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(tasks);
  } catch (err) { next(err); }
});

export default router;
