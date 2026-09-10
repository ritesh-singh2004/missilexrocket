import { Router } from 'express';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const router = Router();

// Search files by name
router.get('/files', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, q } = req.query;

    if (!q) return res.json([]);

    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project || !existsSync(project.path)) return res.json([]);

    const results = [];
    const query = q.toLowerCase();

    function search(dir, depth = 0) {
      if (depth > 10 || results.length > 100) return;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name.toLowerCase().includes(query)) {
              results.push({
                name: entry.name,
                path: relative(project.path, fullPath).replace(/\\/g, '/'),
                type: 'directory'
              });
            }
            search(fullPath, depth + 1);
          } else {
            if (entry.name.toLowerCase().includes(query)) {
              results.push({
                name: entry.name,
                path: relative(project.path, fullPath).replace(/\\/g, '/'),
                type: 'file',
                extension: extname(entry.name)
              });
            }
          }
        }
      } catch {}
    }

    search(project.path);
    res.json(results.slice(0, 100));
  } catch (err) {
    next(err);
  }
});

// Search code content
router.get('/code', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, q, include } = req.query;

    if (!q) return res.json([]);

    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project || !existsSync(project.path)) return res.json([]);

    const results = [];
    const query = q.toLowerCase();
    const includePattern = include || null;

    function search(dir, depth = 0) {
      if (depth > 10 || results.length > 200) return;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            search(fullPath, depth + 1);
          } else {
            const ext = extname(entry.name).toLowerCase();
            if (!['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.rb', '.php', '.html', '.css', '.json', '.yaml', '.yml', '.md', '.sql', '.sh'].includes(ext)) continue;
            if (includePattern && !ext.includes(includePattern)) continue;

            try {
              const content = readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query)) {
                  const start = Math.max(0, i - 1);
                  const end = Math.min(lines.length - 1, i + 1);
                  results.push({
                    file: relative(project.path, fullPath).replace(/\\/g, '/'),
                    line: i + 1,
                    content: lines[i].trim(),
                    context: lines.slice(start, end + 1).join('\n'),
                    score: 1.0
                  });
                  if (results.length >= 200) break;
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    search(project.path);
    res.json(results.slice(0, 200));
  } catch (err) {
    next(err);
  }
});

// Search symbols
router.get('/symbols', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { projectId, q } = req.query;

    if (!q) return res.json([]);

    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project || !existsSync(project.path)) return res.json([]);

    const results = [];
    const query = q.toLowerCase();
    const symbolRegex = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/;

    function search(dir, depth = 0) {
      if (depth > 10 || results.length > 100) return;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            search(fullPath, depth + 1);
          } else {
            const ext = extname(entry.name).toLowerCase();
            if (!['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs'].includes(ext)) continue;

            try {
              const content = readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(symbolRegex);
                if (match && match[1].toLowerCase().includes(query)) {
                  results.push({
                    name: match[1],
                    kind: lines[i].match(/function|class|const|let|var|interface|type|enum/)?.[0] || 'symbol',
                    file: relative(project.path, fullPath).replace(/\\/g, '/'),
                    line: i + 1,
                    preview: lines[i].trim().substring(0, 100)
                  });
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    search(project.path);
    res.json(results.slice(0, 100));
  } catch (err) {
    next(err);
  }
});

export default router;
