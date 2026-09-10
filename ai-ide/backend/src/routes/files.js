import { Router } from 'express';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { join, relative, extname } from 'path';

const router = Router();

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', '.cache'];

function scanDir(dir, base, depth = 0) {
  if (depth > 15) return [];
  const items = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.includes(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      const relPath = relative(base, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        const children = scanDir(fullPath, base, depth + 1);
        if (children.length > 0) items.push({ name: entry.name, path: relPath, type: 'directory', children });
      } else {
        const stat = statSync(fullPath);
        items.push({ name: entry.name, path: relPath, type: 'file', size: stat.size, extension: extname(entry.name) });
      }
    }
  } catch {}
  return items.sort((a, b) => (a.type === 'directory' ? -1 : 1) - (b.type === 'directory' ? -1 : 1) || a.name.localeCompare(b.name));
}

router.get('/tree', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, path: dirPath } = req.query;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const targetPath = dirPath ? join(project.path, dirPath) : project.path;
    if (!existsSync(targetPath)) return res.status(404).json({ error: 'Path not found' });
    res.json(scanDir(targetPath, project.path));
  } catch (err) { next(err); }
});

router.get('/content', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, path: filePath } = req.query;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const fullPath = join(project.path, filePath);
    if (!existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
    const stat = statSync(fullPath);
    if (stat.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'File too large' });
    res.json({ content: readFileSync(fullPath, 'utf-8'), size: stat.size });
  } catch (err) { next(err); }
});

router.put('/content', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, path: filePath, content } = req.body;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const fullPath = join(project.path, filePath);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    res.json({ message: 'Saved' });
  } catch (err) { next(err); }
});

router.post('/create', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, path: filePath, isDirectory, content } = req.body;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const fullPath = join(project.path, filePath);
    if (existsSync(fullPath)) return res.status(400).json({ error: 'Already exists' });
    if (isDirectory) { mkdirSync(fullPath, { recursive: true }); }
    else { const dir = join(fullPath, '..'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); writeFileSync(fullPath, content || '', 'utf-8'); }
    res.json({ message: 'Created' });
  } catch (err) { next(err); }
});

router.delete('/delete', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, path: filePath } = req.query;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const fullPath = join(project.path, filePath);
    if (!existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });
    unlinkSync(fullPath);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

router.post('/rename', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, oldPath, newPath } = req.body;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const fullOld = join(project.path, oldPath);
    const fullNew = join(project.path, newPath);
    if (!existsSync(fullOld)) return res.status(404).json({ error: 'Source not found' });
    renameSync(fullOld, fullNew);
    res.json({ message: 'Renamed' });
  } catch (err) { next(err); }
});

export default router;
