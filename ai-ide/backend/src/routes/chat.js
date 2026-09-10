import { Router } from 'express';

const router = Router();

// Create conversation
router.post('/conversations', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, title, mode } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        projectId: projectId || null,
        userId: req.userId,
        title: title || 'New Chat',
        mode: mode || 'chat'
      }
    });

    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// List conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } }
    });
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Get conversation with messages
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Update conversation
router.put('/conversations/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { title, model } = req.body;
    await prisma.conversation.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { ...(title && { title }), ...(model && { model }) }
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.conversation.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Send message
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { content, model, contextFiles } = req.body;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const userMessage = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        role: 'user',
        content,
        model: model || conversation.model
      }
    });

    // Build context for AI
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });

    // Placeholder: In production, this calls the AI provider
    const aiResponse = await generateAIResponse(messages, conversation, req.app.locals.prisma, contextFiles);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        role: 'assistant',
        content: aiResponse.content,
        model: model || conversation.model || 'gpt-4',
        tokenCount: aiResponse.tokenCount,
        contextFiles: contextFiles ? JSON.stringify(contextFiles) : null
      }
    });

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    res.json({ userMessage, assistantMessage });
  } catch (err) {
    next(err);
  }
});

// Stream message (SSE)
router.post('/conversations/:id/stream', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { content, model, contextFiles } = req.body;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: req.params.id,
        role: 'user',
        content,
        model: model || conversation.model
      }
    });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });

    // Stream AI response
    const fullResponse = await streamAIResponse(messages, conversation, prisma, contextFiles, res);

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: req.params.id,
        role: 'assistant',
        content: fullResponse,
        model: model || conversation.model || 'gpt-4'
      }
    });

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
});

// Search conversations
router.get('/search', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { q } = req.query;
    if (!q) return res.json([]);

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: req.userId,
        OR: [
          { title: { contains: q } },
          { messages: { some: { content: { contains: q } } } }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    });
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// AI Response generators (stubs - replace with real AI provider integration)
async function generateAIResponse(messages, conversation, prisma, contextFiles) {
  // Build context
  let systemPrompt = 'You are an AI coding assistant. Help the user with coding tasks, explain code, suggest improvements, and answer technical questions. Be concise and helpful.';

  if (conversation.projectId) {
    const project = await prisma.project.findFirst({ where: { id: conversation.projectId } });
    if (project) {
      systemPrompt += `\n\nCurrent project: ${project.name}`;
      if (project.language) systemPrompt += `\nLanguage: ${project.language}`;
      if (project.framework) systemPrompt += `\nFramework: ${project.framework}`;
    }
  }

  if (contextFiles && contextFiles.length > 0) {
    systemPrompt += '\n\nContext files:\n';
    for (const file of contextFiles) {
      systemPrompt += `\n--- ${file.path} ---\n${file.content}\n`;
    }
  }

  // For now, return a helpful response indicating AI needs to be configured
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const content = lastUserMessage?.content || '';

  let response = '';

  if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
    response = "Hello! I'm your AI coding assistant. I can help you with:\n\n- **Code generation** - Write new functions, components, or features\n- **Code explanation** - Understand existing code\n- **Debugging** - Find and fix bugs\n- **Refactoring** - Improve code structure\n- **Testing** - Generate test cases\n\nHow can I help you today?";
  } else if (content.toLowerCase().includes('help')) {
    response = "I can assist with:\n\n1. `@file` - Reference a specific file\n2. `@codebase` - Search the entire codebase\n3. `@terminal` - Reference terminal output\n4. `@selection` - Reference selected code\n\nJust describe what you need, and I'll help!";
  } else {
    response = `I received your message: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"\n\nTo enable full AI capabilities, please configure an AI provider in Settings > AI Models. You can use:\n\n- **OpenAI** (GPT-4, GPT-4o)\n- **Anthropic** (Claude)\n- **Google** (Gemini)\n- **Local models** (Ollama)\n\nOnce configured, I'll be able to analyze your code, suggest changes, and help with complex tasks.`;
  }

  return { content: response, tokenCount: response.split(' ').length * 2 };
}

async function streamAIResponse(messages, conversation, prisma, contextFiles, res) {
  const response = await generateAIResponse(messages, conversation, prisma, contextFiles);
  const words = response.content.split(' ');

  for (let i = 0; i < words.length; i++) {
    const word = (i === 0 ? '' : ' ') + words[i];
    res.write(`data: ${JSON.stringify({ content: word, done: false })}\n\n`);
    await new Promise(r => setTimeout(r, 20));
  }

  return response.content;
}

export default router;
