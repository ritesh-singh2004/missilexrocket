import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);
const router = Router();

async function gitCmd(command, cwd) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    return { success: false, stdout: err.stdout?.trim() || '', stderr: err.stderr?.trim() || err.message };
  }
}

// GitHub OAuth - redirect to GitHub
router.get('/auth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env' });
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/github/auth/callback';
  const scope = 'read:user user:email repo';
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  res.json({ url });
});

// GitHub OAuth callback
router.get('/auth/github/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.status(400).json({ error: tokenData.error_description });

    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'AI-IDE' }
    });
    const githubUser = await userRes.json();

    res.json({
      accessToken: tokenData.access_token,
      user: { login: githubUser.login, avatar_url: githubUser.avatar_url, name: githubUser.name }
    });
  } catch (err) { next(err); }
});

// List user repos
router.post('/repos', async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'AI-IDE' }
    });
    const repos = await reposRes.json();

    if (!Array.isArray(repos)) return res.status(400).json({ error: 'Failed to fetch repos' });

    res.json(repos.map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      defaultBranch: r.default_branch,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      htmlUrl: r.html_url,
      private: r.private,
      updatedAt: r.updated_at,
      stargazersCount: r.stargazers_count,
      forksCount: r.forks_count
    })));
  } catch (err) { next(err); }
});

// Clone repo
router.post('/clone', async (req, res, next) => {
  try {
    const { cloneUrl, name, workspaceDir } = req.body;
    if (!cloneUrl) return res.status(400).json({ error: 'Clone URL required' });

    const targetDir = join(workspaceDir || process.cwd(), name || 'repo');
    if (existsSync(targetDir)) return res.status(400).json({ error: 'Directory already exists' });

    const result = await gitCmd(`git clone "${cloneUrl}" "${targetDir}"`);
    if (!result.success) return res.status(500).json({ error: result.stderr });

    res.json({ message: 'Cloned successfully', path: targetDir });
  } catch (err) { next(err); }
});

// Create repo on GitHub
router.post('/create-repo', async (req, res, next) => {
  try {
    const { accessToken, name, description, private: isPrivate } = req.body;
    if (!accessToken || !name) return res.status(400).json({ error: 'Token and name required' });

    const repoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'AI-IDE' },
      body: JSON.stringify({ name, description, private: isPrivate || false, auto_init: true })
    });
    const repo = await repoRes.json();

    if (repo.message) return res.status(400).json({ error: repo.message });
    res.json({ message: 'Repo created', url: repo.html_url, cloneUrl: repo.clone_url });
  } catch (err) { next(err); }
});

// Push to GitHub
router.post('/push', async (req, res, next) => {
  try {
    const { projectId, remote, branch } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const remoteArg = remote || 'origin';
    const branchArg = branch || '';
    const result = await gitCmd(`git push ${remoteArg} ${branchArg}`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Pull from GitHub
router.post('/pull', async (req, res, next) => {
  try {
    const { projectId, remote } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd(`git pull ${remote || 'origin'}`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Get pull requests
router.post('/pull-requests', async (req, res, next) => {
  try {
    const { accessToken, owner, repo } = req.body;
    if (!accessToken || !owner || !repo) return res.status(400).json({ error: 'Missing parameters' });

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'AI-IDE' }
    });
    const prs = await prRes.json();

    res.json(Array.isArray(prs) ? prs.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      user: pr.user?.login,
      createdAt: pr.created_at,
      htmlUrl: pr.html_url
    })) : []);
  } catch (err) { next(err); }
});

// Create pull request
router.post('/create-pr', async (req, res, next) => {
  try {
    const { accessToken, owner, repo, title, body, head, base } = req.body;
    if (!accessToken || !owner || !repo || !title) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'AI-IDE' },
      body: JSON.stringify({ title, body: body || '', head: head || 'main', base: base || 'main' })
    });
    const pr = await prRes.json();

    if (pr.message) return res.status(400).json({ error: pr.message });
    res.json({ message: 'PR created', number: pr.number, url: pr.html_url });
  } catch (err) { next(err); }
});

// Get branches
router.post('/branches', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd('git branch -a', project.path);
    const branches = result.stdout.split('\n').filter(Boolean).map(b => ({
      name: b.replace(/^\*?\s+/, '').trim(),
      current: b.startsWith('*'),
      remote: b.trim().includes('remotes/')
    }));
    res.json(branches);
  } catch (err) { next(err); }
});

// Create branch
router.post('/create-branch', async (req, res, next) => {
  try {
    const { projectId, name } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd(`git checkout -b "${name}"`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Switch branch
router.post('/switch-branch', async (req, res, next) => {
  try {
    const { projectId, name } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd(`git checkout "${name}"`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Get commits
router.post('/commits', async (req, res, next) => {
  try {
    const { projectId, limit } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const count = limit || 20;
    const result = await gitCmd(`git log --oneline -${count} --pretty=format:"%H|%s|%an|%ai"`, project.path);
    const commits = result.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });
    res.json(commits);
  } catch (err) { next(err); }
});

// Get diff
router.post('/diff', async (req, res, next) => {
  try {
    const { projectId, file } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const command = file ? `git diff "${file}"` : 'git diff';
    const result = await gitCmd(command, project.path);
    res.json({ diff: result.stdout });
  } catch (err) { next(err); }
});

// Stage files
router.post('/stage', async (req, res, next) => {
  try {
    const { projectId, files } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const fileArgs = files.map(f => `"${f}"`).join(' ');
    const result = await gitCmd(`git add ${fileArgs}`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Unstage files
router.post('/unstage', async (req, res, next) => {
  try {
    const { projectId, files } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const fileArgs = files.map(f => `"${f}"`).join(' ');
    const result = await gitCmd(`git reset HEAD ${fileArgs}`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Commit
router.post('/commit', async (req, res, next) => {
  try {
    const { projectId, message, files } = req.body;
    if (!message) return res.status(400).json({ error: 'Commit message required' });

    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (files?.length > 0) {
      const fileArgs = files.map(f => `"${f}"`).join(' ');
      await gitCmd(`git add ${fileArgs}`, project.path);
    }

    const result = await gitCmd(`git commit -m "${message.replace(/"/g, '\\"')}"`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Revert file
router.post('/revert', async (req, res, next) => {
  try {
    const { projectId, file } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd(`git checkout HEAD -- "${file}"`, project.path);
    res.json(result);
  } catch (err) { next(err); }
});

// Git status
router.post('/status', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const statusResult = await gitCmd('git status --porcelain', project.path);
    const branchResult = await gitCmd('git branch --show-current', project.path);

    const files = statusResult.stdout.split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2).trim();
      const path = line.substring(3);
      let changeType = 'modified';
      if (status.includes('A')) changeType = 'added';
      else if (status.includes('D')) changeType = 'deleted';
      else if (status.includes('?')) changeType = 'untracked';
      else if (status.includes('R')) changeType = 'renamed';
      return { path, status, changeType, staged: status[0] !== ' ' && status[0] !== '?' };
    });

    res.json({ branch: branchResult.stdout, files, isClean: files.length === 0 });
  } catch (err) { next(err); }
});

// Initialize git repo
router.post('/init', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const prisma = req.app.locals.prisma;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: req.userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await gitCmd('git init', project.path);
    if (result.success) {
      await prisma.project.update({ where: { id: projectId }, data: { isGitRepo: true } });
    }
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
