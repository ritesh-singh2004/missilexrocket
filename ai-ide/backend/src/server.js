import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import chatRoutes from './routes/chat.js';
import agentRoutes from './routes/agents.js';
import terminalRoutes from './routes/terminal.js';
import gitRoutes from './routes/git.js';
import searchRoutes from './routes/search.js';
import settingsRoutes from './routes/settings.js';
import modelRoutes from './routes/models.js';
import taskRoutes from './routes/tasks.js';
import toolRoutes from './routes/tools.js';
import githubRoutes from './routes/github.js';
import gitlabRoutes from './routes/gitlab.js';
import backgroundRoutes from './routes/background.js';
import automationRoutes from './routes/automations.js';
import adminRoutes from './routes/admin.js';

import { setupSocketHandlers } from './socket/handlers.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 10e6
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Ensure data directories exist
const dataDir = join(__dirname, '..', 'data');
const workspaceDir = join(dataDir, 'workspaces');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(workspaceDir)) mkdirSync(workspaceDir, { recursive: true });

// Make prisma and io available to routes
app.locals.prisma = prisma;
app.locals.io = io;
app.locals.workspaceDir = workspaceDir;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Static files
app.use(express.static(join(__dirname, '..', '..', 'frontend', 'dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/terminal', authMiddleware, terminalRoutes);
app.use('/api/git', authMiddleware, gitRoutes);
app.use('/api/search', authMiddleware, searchRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/tools', authMiddleware, toolRoutes);
app.use('/api/github', authMiddleware, githubRoutes);
app.use('/api/gitlab', authMiddleware, gitlabRoutes);
app.use('/api/background', authMiddleware, backgroundRoutes);
app.use('/api/automations', authMiddleware, automationRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  }
});

// Error handling
app.use(errorHandler);

// Socket.IO
setupSocketHandlers(io, prisma);

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`AI IDE Backend running on http://${HOST}:${PORT}`);
  logger.info(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

export { app, server, io, prisma };
