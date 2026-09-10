import { Router } from 'express';
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { join, extname, relative, basename } from 'path';

const router = Router();

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', '.cache', '.vscode', '.idea'];
const EXCLUDE_EXTENSIONS = ['.exe', '.dll', '.so', '.dylib', '.bin', '.zip', '.tar', '.gz', '.rar', '.7z', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'];

function scanDirectory(dirPath, basePath, depth = 0) {
  if (depth > 15) return [];
  const items = [];
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const children = scanDirectory(fullPath, basePath, depth + 1);
        if (children.length > 0) {
          items.push({ name: entry.name, path: relativePath, type: 'directory', children });
        }
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (EXCLUDE_EXTENSIONS.includes(ext)) continue;
        const stat = statSync(fullPath);
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stat.size,
          extension: ext,
          modified: stat.mtime.toISOString()
        });
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dirPath}:`, err.message);
  }
  return items.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

function detectProjectType(projectPath) {
  let framework = null, language = null, packageManager = null;

  if (existsSync(join(projectPath, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) framework = 'Next.js';
      else if (deps.react) framework = 'React';
      else if (deps.vue) framework = 'Vue';
      else if (deps.angular || deps['@angular/core']) framework = 'Angular';
      else if (deps.svelte) framework = 'Svelte';
      else if (deps.express) framework = 'Express';
      else if (deps.fastify) framework = 'Fastify';
      language = 'JavaScript';
      packageManager = existsSync(join(projectPath, 'yarn.lock')) ? 'yarn' :
                       existsSync(join(projectPath, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
    } catch {}
  }

  if (existsSync(join(projectPath, 'tsconfig.json'))) language = 'TypeScript';
  if (existsSync(join(projectPath, 'requirements.txt')) || existsSync(join(projectPath, 'pyproject.toml'))) language = 'Python';
  if (existsSync(join(projectPath, 'Cargo.toml'))) { language = 'Rust'; framework = 'Rust'; }
  if (existsSync(join(projectPath, 'go.mod'))) { language = 'Go'; framework = 'Go'; }
  if (existsSync(join(projectPath, 'pom.xml')) || existsSync(join(projectPath, 'build.gradle'))) { language = 'Java'; framework = 'Java'; }
  if (existsSync(join(projectPath, 'Gemfile'))) { language = 'Ruby'; framework = 'Ruby'; }
  if (existsSync(join(projectPath, 'composer.json'))) { language = 'PHP'; framework = 'PHP'; }

  const isGit = existsSync(join(projectPath, '.git'));
  return { framework, language, packageManager, isGit };
}

// List all projects
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const projects = await prisma.project.findMany({
      where: { ownerId: req.userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// Get project by ID
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Create project
router.post('/', async (req, res, next) => {
  try {
    const { name, description, path: projectPath } = req.body;
    if (!name || !projectPath) {
      return res.status(400).json({ error: 'Name and path are required' });
    }

    const resolvedPath = projectPath.replace(/\\/g, '/');
    if (!existsSync(resolvedPath)) {
      return res.status(400).json({ error: 'Project path does not exist' });
    }

    const detection = detectProjectType(resolvedPath);
    const prisma = req.app.locals.prisma;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        path: resolvedPath,
        framework: detection.framework,
        language: detection.language,
        packageManager: detection.packageManager,
        isGitRepo: detection.isGit,
        ownerId: req.userId
      }
    });

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Update project
router.put('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, description } = req.body;
    const project = await prisma.project.updateMany({
      where: { id: req.params.id, ownerId: req.userId },
      data: { ...(name && { name }), ...(description !== undefined && { description }) }
    });
    if (project.count === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.project.deleteMany({ where: { id: req.params.id, ownerId: req.userId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Get project file tree
router.get('/:id/files', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!existsSync(project.path)) {
      return res.status(400).json({ error: 'Project path no longer exists' });
    }

    const tree = scanDirectory(project.path, project.path);
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

// Read file content
router.get('/:id/file', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });

    const fullPath = join(project.path, filePath);
    if (!existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });

    const stat = statSync(fullPath);
    if (stat.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (>10MB)' });
    }

    const content = readFileSync(fullPath, 'utf-8');
    res.json({ content, size: stat.size, modified: stat.mtime.toISOString() });
  } catch (err) {
    next(err);
  }
});

// Write file content
router.put('/:id/file', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    const fullPath = join(project.path, filePath);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    writeFileSync(fullPath, content, 'utf-8');
    res.json({ message: 'File saved', path: filePath });
  } catch (err) {
    next(err);
  }
});

// Create file/folder
router.post('/:id/file', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { path: filePath, isDirectory, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    const fullPath = join(project.path, filePath);
    if (existsSync(fullPath)) return res.status(400).json({ error: 'File already exists' });

    if (isDirectory) {
      mkdirSync(fullPath, { recursive: true });
    } else {
      const dir = join(fullPath, '..');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content || '', 'utf-8');
    }

    res.json({ message: 'Created', path: filePath });
  } catch (err) {
    next(err);
  }
});

// Delete file/folder
router.delete('/:id/file', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    const fullPath = join(project.path, filePath);
    if (!existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });

    unlinkSync(fullPath);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Rename file
router.post('/:id/rename', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'Old and new paths are required' });

    const fullOldPath = join(project.path, oldPath);
    const fullNewPath = join(project.path, newPath);

    if (!existsSync(fullOldPath)) return res.status(404).json({ error: 'Source not found' });
    if (existsSync(fullNewPath)) return res.status(400).json({ error: 'Destination already exists' });

    renameSync(fullOldPath, fullNewPath);
    res.json({ message: 'Renamed' });
  } catch (err) {
    next(err);
  }
});

export default router;
