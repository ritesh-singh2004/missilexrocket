import { Router } from 'express';

const router = Router();

// Get all AI providers
router.get('/providers', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const providers = await prisma.aIProvider.findMany({
      include: { models: true },
      orderBy: { name: 'asc' }
    });
    res.json(providers);
  } catch (err) {
    next(err);
  }
});

// Create AI provider
router.post('/providers', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, type, apiKey, endpoint } = req.body;

    if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

    const provider = await prisma.aIProvider.create({
      data: { name, type, apiKey: apiKey || '', endpoint }
    });

    res.json(provider);
  } catch (err) {
    next(err);
  }
});

// Update AI provider
router.put('/providers/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, apiKey, endpoint, isEnabled } = req.body;
    await prisma.aIProvider.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(apiKey !== undefined && { apiKey }),
        ...(endpoint !== undefined && { endpoint }),
        ...(isEnabled !== undefined && { isEnabled })
      }
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete AI provider
router.delete('/providers/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.aIProvider.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Get models for a provider
router.get('/providers/:id/models', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const models = await prisma.aIModel.findMany({
      where: { providerId: req.params.id },
      orderBy: { name: 'asc' }
    });
    res.json(models);
  } catch (err) {
    next(err);
  }
});

// Add model to provider
router.post('/providers/:id/models', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, displayName, contextWindow, maxOutput, costPer1kInput, costPer1kOutput, speed, tier } = req.body;

    const model = await prisma.aIModel.create({
      data: {
        providerId: req.params.id,
        name,
        displayName: displayName || name,
        contextWindow: contextWindow || 8192,
        maxOutput: maxOutput || 4096,
        costPer1kInput,
        costPer1kOutput,
        speed,
        tier: tier || 'balanced'
      }
    });

    res.json(model);
  } catch (err) {
    next(err);
  }
});

// Get all available models
router.get('/available', (req, res) => {
  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000, tier: 'fast', description: 'Fast, multimodal model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', contextWindow: 128000, tier: 'balanced', description: 'High quality, large context' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', contextWindow: 8192, tier: 'reasoning', description: 'Best reasoning capabilities' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextWindow: 200000, tier: 'balanced', description: 'Excellent for coding' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', contextWindow: 200000, tier: 'reasoning', description: 'Most capable model' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', contextWindow: 200000, tier: 'fast', description: 'Fast and affordable' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', contextWindow: 32000, tier: 'balanced', description: 'Google flagship model' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', contextWindow: 1000000, tier: 'reasoning', description: '1M context window' },
    { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Local', contextWindow: 128000, tier: 'balanced', description: 'Open source, self-hosted' },
    { id: 'codellama-34b', name: 'Code Llama 34B', provider: 'Local', contextWindow: 16000, tier: 'fast', description: 'Code-specialized local model' }
  ];
  res.json(models);
});

// Usage stats
router.get('/usage', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { startDate, endDate } = req.query;

    const where = { userId: req.userId };
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const usage = await prisma.usageRecord.findMany({ where, orderBy: { createdAt: 'desc' } });

    const summary = {
      totalRequests: usage.length,
      totalInputTokens: usage.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: usage.reduce((sum, r) => sum + r.outputTokens, 0),
      totalCost: usage.reduce((sum, r) => sum + (r.cost || 0), 0),
      byModel: {}
    };

    for (const record of usage) {
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      }
      summary.byModel[record.model].requests++;
      summary.byModel[record.model].inputTokens += record.inputTokens;
      summary.byModel[record.model].outputTokens += record.outputTokens;
      summary.byModel[record.model].cost += record.cost || 0;
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
