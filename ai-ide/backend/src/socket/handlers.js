import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-ide-dev-secret-key';

export function setupSocketHandlers(io, prisma) {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user room
    socket.join(`user:${socket.userId}`);

    // Terminal session
    socket.on('terminal:create', async (data) => {
      const { projectId } = data;
      let cwd = process.cwd();

      if (projectId) {
        const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: socket.userId } });
        if (project) cwd = project.path;
      }

      socket.emit('terminal:created', { sessionId: `term_${Date.now()}`, cwd });
    });

    socket.on('terminal:input', (data) => {
      const { sessionId, input } = data;
      // Handle terminal input
      socket.emit('terminal:output', { sessionId, data: `Echo: ${input}` });
    });

    // Agent task updates
    socket.on('agent:subscribe', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('agent:unsubscribe', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // Chat streaming
    socket.on('chat:message', async (data) => {
      const { conversationId, content, contextFiles } = data;

      try {
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: socket.userId }
        });

        if (!conversation) {
          socket.emit('chat:error', { error: 'Conversation not found' });
          return;
        }

        // Save user message
        await prisma.message.create({
          data: { conversationId, role: 'user', content }
        });

        // Get history
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' }
        });

        // Simulate AI response (replace with real AI provider)
        const response = generateQuickResponse(content, contextFiles);

        // Stream response
        const words = response.split(' ');
        let fullResponse = '';

        for (let i = 0; i < words.length; i++) {
          const word = (i === 0 ? '' : ' ') + words[i];
          fullResponse += word;
          socket.emit('chat:chunk', { conversationId, content: word, done: false });
          await new Promise(r => setTimeout(r, 30));
        }

        // Save assistant message
        await prisma.message.create({
          data: { conversationId, role: 'assistant', content: fullResponse, model: 'gpt-4' }
        });

        socket.emit('chat:done', { conversationId, content: fullResponse });
      } catch (err) {
        socket.emit('chat:error', { error: err.message });
      }
    });

    // File watching (simplified)
    socket.on('file:watch', (data) => {
      const { projectId, filePath } = data;
      socket.join(`file:${projectId}:${filePath}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  // Broadcast agent task updates
  return {
    broadcastTaskUpdate: (taskId, update) => {
      io.to(`task:${taskId}`).emit('agent:update', { taskId, ...update });
    },
    broadcastFileChange: (projectId, filePath, change) => {
      io.to(`file:${projectId}:${filePath}`).emit('file:changed', { projectId, filePath, ...change });
    },
    notifyUser: (userId, notification) => {
      io.to(`user:${userId}`).emit('notification', notification);
    }
  };
}

function generateQuickResponse(content, contextFiles) {
  const lower = content.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') {
    return "Hello! I'm your AI coding assistant. I can help you with code generation, debugging, refactoring, and more. What would you like to work on?";
  }

  if (lower.includes('help')) {
    return "Here's what I can help with:\n\n1. **Code Generation** - Write functions, components, or features\n2. **Code Review** - Analyze code for issues\n3. **Debugging** - Find and fix bugs\n4. **Refactoring** - Improve code structure\n5. **Testing** - Generate test cases\n6. **Documentation** - Write docs and comments\n\nJust describe what you need!";
  }

  if (lower.includes('explain')) {
    return "I'd be happy to explain code! Please select the code you'd like me to explain and use `@selection` to reference it, or use `@file` to reference a specific file.";
  }

  if (lower.includes('fix') || lower.includes('bug')) {
    return "I can help fix bugs! Please share:\n1. The error message or unexpected behavior\n2. The relevant code\n3. What you expected to happen\n\nYou can use `@terminal` to reference terminal output or `@selection` for selected code.";
  }

  if (contextFiles && contextFiles.length > 0) {
    const fileNames = contextFiles.map(f => f.path).join(', ');
    return `I see you've referenced ${contextFiles.length} file(s): ${fileNames}. I'm ready to help with this code. What would you like me to do?`;
  }

  return `I received your message: "${content.substring(0, 150)}${content.length > 150 ? '...' : ''}"\n\nTo enable full AI capabilities, please configure an AI provider in Settings > AI Models. I'll then be able to analyze your codebase, suggest changes, and help with complex coding tasks.`;
}
