import { Router } from 'express';

const router = Router();

// Get user settings
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    let settings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
    if (!settings) {
      settings = await prisma.userSettings.create({ data: { userId: req.userId } });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// Update settings
router.put('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { theme, fontSize, fontFamily, tabSize, wordWrap, minimap, lineNumbers, autoSave, defaultModel, aiProvider, apiEndpoint, terminalShell } = req.body;

    const data = {};
    if (theme !== undefined) data.theme = theme;
    if (fontSize !== undefined) data.fontSize = fontSize;
    if (fontFamily !== undefined) data.fontFamily = fontFamily;
    if (tabSize !== undefined) data.tabSize = tabSize;
    if (wordWrap !== undefined) data.wordWrap = wordWrap;
    if (minimap !== undefined) data.minimap = minimap;
    if (lineNumbers !== undefined) data.lineNumbers = lineNumbers;
    if (autoSave !== undefined) data.autoSave = autoSave;
    if (defaultModel !== undefined) data.defaultModel = defaultModel;
    if (aiProvider !== undefined) data.aiProvider = aiProvider;
    if (apiEndpoint !== undefined) data.apiEndpoint = apiEndpoint;
    if (terminalShell !== undefined) data.terminalShell = terminalShell;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId, ...data }
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// Get project rules
router.get('/rules/:projectId', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const rules = await prisma.projectRule.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// Create project rule
router.post('/rules', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, name, content, scope } = req.body;
    const rule = await prisma.projectRule.create({
      data: { projectId, name, content, scope: scope || 'project' }
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// Update project rule
router.put('/rules/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, content, isActive } = req.body;
    await prisma.projectRule.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(content && { content }), ...(isActive !== undefined && { isActive }) }
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete project rule
router.delete('/rules/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.projectRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
