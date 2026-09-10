import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
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

// GitLab OAuth redirect
router.get('/auth/gitlab', (req, res) => {
  const clientId = process.env.GITLAB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GitLab OAuth not configured. Set GITLAB_CLIENT_ID in .env' });
  const redirectUri = process.env.GITLAB_REDIRECT_URI || 'http://localhost:3001/api/gitlab/auth/callback';
  const url = `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read_api+api`;
  res.json({ url });
});

// GitLab OAuth callback
router.get('/auth/gitlab/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const tokenRes = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITLAB_CLIENT_ID,
        client_secret: process.env.GITLAB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GITLAB_REDIRECT_URI || 'http://localhost:3001/api/gitlab/auth/callback'
      })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.status(400).json({ error: tokenData.error_description });

    const userRes = await fetch('https://gitlab.com/api/v4/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const gitlabUser = await userRes.json();

    res.json({
      accessToken: tokenData.access_token,
      user: { login: gitlabUser.username, avatar_url: gitlabUser.avatar_url, name: gitlabUser.name }
    });
  } catch (err) { next(err); }
});

// List GitLab projects
router.post('/projects', async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    const projRes = await fetch('https://gitlab.com/api/v4/projects?membership=true&per_page=50&order_by=last_activity_at', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projRes.json();

    res.json(Array.isArray(projects) ? projects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      fullPath: p.path_with_namespace,
      description: p.description,
      defaultBranch: p.default_branch,
      cloneUrl: p.http_url_to_repo,
      sshUrl: p.ssh_url_to_repo,
      webUrl: p.web_url,
      visibility: p.visibility,
      lastActivity: p.last_activity_at,
      starCount: p.star_count,
      forksCount: p.forks_count
    })) : []);
  } catch (err) { next(err); }
});

// Clone GitLab project
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

// Create GitLab project
router.post('/create-project', async (req, res, next) => {
  try {
    const { accessToken, name, description, visibility } = req.body;
    if (!accessToken || !name) return res.status(400).json({ error: 'Token and name required' });

    const projRes = await fetch('https://gitlab.com/api/v4/projects', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || '', visibility: visibility || 'private', initialize_with_readme: true })
    });
    const project = await projRes.json();

    if (project.message) return res.status(400).json({ error: project.message });
    res.json({ message: 'Project created', url: project.web_url, cloneUrl: project.http_url_to_repo });
  } catch (err) { next(err); }
});

// Merge requests
router.post('/merge-requests', async (req, res, next) => {
  try {
    const { accessToken, projectId } = req.body;
    if (!accessToken || !projectId) return res.status(400).json({ error: 'Missing parameters' });

    const mrRes = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=opened&per_page=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const mrs = await mrRes.json();

    res.json(Array.isArray(mrs) ? mrs.map(mr => ({
      iid: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state,
      author: mr.author?.username,
      createdAt: mr.created_at,
      webUrl: mr.web_url
    })) : []);
  } catch (err) { next(err); }
});

// Create merge request
router.post('/create-mr', async (req, res, next) => {
  try {
    const { accessToken, projectId, title, description, sourceBranch, targetBranch } = req.body;
    if (!accessToken || !projectId || !title) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const mrRes = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || '',
        source_branch: sourceBranch || 'main',
        target_branch: targetBranch || 'main'
      })
    });
    const mr = await mrRes.json();

    if (mr.message) return res.status(400).json({ error: mr.message });
    res.json({ message: 'MR created', iid: mr.iid, url: mr.web_url });
  } catch (err) { next(err); }
});

export default router;
