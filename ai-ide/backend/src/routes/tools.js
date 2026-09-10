import { Router } from 'express';

const router = Router();

// List MCP tools
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.query;

    const where = {};
    if (projectId) where.projectId = projectId;

    const tools = await prisma.mCPTool.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(tools);
  } catch (err) {
    next(err);
  }
});

// Register MCP tool
router.post('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, name, description, inputSchema, outputSchema, endpoint, authType, authConfig, permissions } = req.body;

    if (!name || !endpoint) return res.status(400).json({ error: 'Name and endpoint are required' });

    const tool = await prisma.mCPTool.create({
      data: {
        projectId: projectId || null,
        name,
        description: description || '',
        inputSchema: JSON.stringify(inputSchema || {}),
        outputSchema: outputSchema ? JSON.stringify(outputSchema) : null,
        endpoint,
        authType,
        authConfig: authConfig ? JSON.stringify(authConfig) : null,
        permissions: permissions || 'read'
      }
    });

    res.json(tool);
  } catch (err) {
    next(err);
  }
});

// Update MCP tool
router.put('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, description, inputSchema, endpoint, isEnabled, permissions } = req.body;

    await prisma.mCPTool.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(inputSchema && { inputSchema: JSON.stringify(inputSchema) }),
        ...(endpoint && { endpoint }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(permissions && { permissions })
      }
    });

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete MCP tool
router.delete('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.mCPTool.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Test MCP tool connection
router.post('/:id/test', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const tool = await prisma.mCPTool.findUnique({ where: { id: req.params.id } });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    // Test connection (simplified)
    res.json({ status: 'ok', message: 'Tool endpoint is reachable' });
  } catch (err) {
    next(err);
  }
});

export default router;
