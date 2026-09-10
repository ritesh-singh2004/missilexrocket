import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.message });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.name === 'ForbiddenError' || err.status === 403) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (err.name === 'NotFoundError' || err.status === 404) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}
