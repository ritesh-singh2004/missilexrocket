import { create } from 'zustand';

const API_BASE = '/api';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('ai_ide_token');
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const useStore = create((set, get) => ({
  // Auth state
  user: null,
  token: localStorage.getItem('ai_ide_token'),
  isAuthenticated: !!localStorage.getItem('ai_ide_token'),

  // Projects
  projects: [],
  currentProject: null,
  fileTree: [],
  openFiles: [],
  activeFile: null,

  // Editor
  editorContent: '',
  editorModified: false,
  editorLanguage: 'plaintext',

  // Chat
  conversations: [],
  currentConversation: null,
  messages: [],
  chatInput: '',

  // Agent
  agentTasks: [],
  currentTask: null,
  taskSteps: [],

  // Terminal
  terminalSessions: [],
  activeTerminal: null,

  // Git
  gitStatus: null,
  gitBranch: '',
  gitFiles: [],

  // UI
  sidebarView: 'files',
  aiPanelOpen: true,
  bottomPanelOpen: false,
  bottomPanelView: 'terminal',
  commandPaletteOpen: false,
  settingsOpen: false,
  toasts: [],

  // Settings
  settings: null,

  // Auth actions
  login: async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('ai_ide_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  register: async (name, email, password) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    localStorage.setItem('ai_ide_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem('ai_ide_token');
    set({ user: null, token: null, isAuthenticated: false, projects: [], currentProject: null });
  },

  loadProfile: async () => {
    try {
      const user = await apiFetch('/auth/profile');
      set({ user, isAuthenticated: true });
    } catch {
      localStorage.removeItem('ai_ide_token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  // Project actions
  loadProjects: async () => {
    const projects = await apiFetch('/projects');
    set({ projects });
  },

  createProject: async (name, path, description) => {
    const project = await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, path, description })
    });
    set(s => ({ projects: [project, ...s.projects] }));
    return project;
  },

  openProject: async (project) => {
    const fileTree = await apiFetch(`/projects/${project.id}/files`);
    set({ currentProject: project, fileTree, openFiles: [], activeFile: null });
    // Load git status
    get().loadGitStatus(project.id);
  },

  closeProject: () => {
    set({ currentProject: null, fileTree: [], openFiles: [], activeFile: null });
  },

  // File actions
  openFile: async (filePath) => {
    const project = get().currentProject;
    if (!project) return;

    const existing = get().openFiles.find(f => f.path === filePath);
    if (existing) {
      set({ activeFile: existing });
      return;
    }

    const data = await apiFetch(`/projects/${project.id}/file?path=${encodeURIComponent(filePath)}`);
    const ext = filePath.split('.').pop();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp',
      go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
      html: 'html', css: 'css', json: 'json', yaml: 'yaml', yml: 'yaml',
      md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell'
    };

    const file = {
      path: filePath,
      name: filePath.split('/').pop(),
      content: data.content,
      language: langMap[ext] || 'plaintext',
      modified: false,
      originalContent: data.content
    };

    set(s => ({ openFiles: [...s.openFiles, file], activeFile: file }));
  },

  setActiveFile: (file) => {
    set({ activeFile: file, editorContent: file.content, editorLanguage: file.language });
  },

  closeFile: (filePath) => {
    set(s => {
      const openFiles = s.openFiles.filter(f => f.path !== filePath);
      const activeFile = s.activeFile?.path === filePath ? (openFiles[0] || null) : s.activeFile;
      return { openFiles, activeFile };
    });
  },

  updateFileContent: (content) => {
    set(s => ({
      editorContent: content,
      activeFile: s.activeFile ? { ...s.activeFile, content, modified: content !== s.activeFile.originalContent } : null,
      openFiles: s.openFiles.map(f => f.path === s.activeFile?.path ? { ...f, content, modified: content !== f.originalContent } : f)
    }));
  },

  saveFile: async () => {
    const project = get().currentProject;
    const file = get().activeFile;
    if (!project || !file) return;

    await apiFetch(`/projects/${project.id}/file`, {
      method: 'PUT',
      body: JSON.stringify({ path: file.path, content: file.content })
    });

    set(s => ({
      openFiles: s.openFiles.map(f => f.path === file.path ? { ...f, modified: false, originalContent: f.content } : f),
      activeFile: s.activeFile ? { ...s.activeFile, modified: false, originalContent: s.activeFile.content } : null
    }));

    get().addToast('File saved', 'success');
  },

  // Chat actions
  loadConversations: async () => {
    const conversations = await apiFetch('/chat/conversations');
    set({ conversations });
  },

  createConversation: async (projectId) => {
    const conversation = await apiFetch('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ projectId, title: 'New Chat' })
    });
    set(s => ({
      conversations: [conversation, ...s.conversations],
      currentConversation: conversation,
      messages: []
    }));
    return conversation;
  },

  selectConversation: async (id) => {
    const data = await apiFetch(`/chat/conversations/${id}`);
    set({ currentConversation: data, messages: data.messages });
  },

  deleteConversation: async (id) => {
    await apiFetch(`/chat/conversations/${id}`, { method: 'DELETE' });
    set(s => ({
      conversations: s.conversations.filter(c => c.id !== id),
      currentConversation: s.currentConversation?.id === id ? null : s.currentConversation,
      messages: s.currentConversation?.id === id ? [] : s.messages
    }));
  },

  sendMessage: async (content, contextFiles) => {
    let conversation = get().currentConversation;
    if (!conversation) {
      conversation = await get().createConversation(get().currentProject?.id);
    }

    // Add user message optimistically
    const userMsg = { id: Date.now().toString(), role: 'user', content, createdAt: new Date().toISOString() };
    set(s => ({ messages: [...s.messages, userMsg] }));

    try {
      const data = await apiFetch(`/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, contextFiles })
      });

      set(s => ({
        messages: [...s.messages.filter(m => m.id !== userMsg.id), data.userMessage, data.assistantMessage]
      }));
    } catch (err) {
      set(s => ({ messages: s.messages.filter(m => m.id !== userMsg.id) }));
      get().addToast(err.message, 'error');
    }
  },

  // Agent actions
  loadAgentTasks: async () => {
    const tasks = await apiFetch('/agents/tasks');
    set({ agentTasks: tasks });
  },

  createAgentTask: async (title, description) => {
    const task = await apiFetch('/agents/tasks', {
      method: 'POST',
      body: JSON.stringify({ projectId: get().currentProject?.id, title, description })
    });
    set(s => ({ agentTasks: [task, ...s.agentTasks] }));
    return task;
  },

  executeAgentTask: async (taskId) => {
    await apiFetch(`/agents/tasks/${taskId}/execute`, { method: 'POST' });
    get().loadAgentTasks();
  },

  cancelAgentTask: async (taskId) => {
    await apiFetch(`/agents/tasks/${taskId}/cancel`, { method: 'POST' });
    get().loadAgentTasks();
  },

  // Git actions
  loadGitStatus: async (projectId) => {
    try {
      const status = await apiFetch(`/git/status?projectId=${projectId}`);
      set({ gitStatus: status, gitBranch: status.branch, gitFiles: status.files });
    } catch {
      set({ gitStatus: null, gitBranch: '', gitFiles: [] });
    }
  },

  gitCommit: async (message, files) => {
    await apiFetch('/git/commit', {
      method: 'POST',
      body: JSON.stringify({ projectId: get().currentProject?.id, message, files })
    });
    get().loadGitStatus(get().currentProject?.id);
    get().addToast('Changes committed', 'success');
  },

  // GitHub/GitLab actions
  githubToken: null,
  gitlabToken: null,
  githubRepos: [],
  gitlabProjects: [],

  connectGitHub: async () => {
    const data = await apiFetch('/github/auth/github');
    window.open(data.url, '_blank', 'width=600,height=700');
  },

  completeGitHubAuth: async (accessToken) => {
    set({ githubToken: accessToken });
    localStorage.setItem('github_token', accessToken);
    get().addToast('GitHub connected', 'success');
  },

  loadGitHubRepos: async () => {
    const token = get().githubToken || localStorage.getItem('github_token');
    if (!token) return;
    const repos = await apiFetch('/github/repos', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token })
    });
    set({ githubRepos: repos });
  },

  cloneGitHubRepo: async (cloneUrl, name) => {
    const data = await apiFetch('/github/clone', {
      method: 'POST',
      body: JSON.stringify({ cloneUrl, name, workspaceDir: get().workspaceDir })
    });
    if (data.path) {
      await get().createProject(name, data.path);
      get().addToast('Repository cloned', 'success');
    }
    return data;
  },

  createGitHubRepo: async (name, description, isPrivate) => {
    const token = get().githubToken || localStorage.getItem('github_token');
    const data = await apiFetch('/github/create-repo', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token, name, description, private: isPrivate })
    });
    get().addToast('Repository created on GitHub', 'success');
    return data;
  },

  connectGitLab: async () => {
    const data = await apiFetch('/gitlab/auth/gitlab');
    window.open(data.url, '_blank', 'width=600,height=700');
  },

  completeGitLabAuth: async (accessToken) => {
    set({ gitlabToken: accessToken });
    localStorage.setItem('gitlab_token', accessToken);
    get().addToast('GitLab connected', 'success');
  },

  loadGitLabProjects: async () => {
    const token = get().gitlabToken || localStorage.getItem('gitlab_token');
    if (!token) return;
    const projects = await apiFetch('/gitlab/projects', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token })
    });
    set({ gitlabProjects: projects });
  },

  // Background agent actions
  backgroundJobs: [],

  loadBackgroundJobs: async () => {
    const jobs = await apiFetch('/background/jobs');
    set({ backgroundJobs: jobs });
  },

  createBackgroundJob: async (type, payload) => {
    const job = await apiFetch('/background/jobs', {
      method: 'POST',
      body: JSON.stringify({ type, payload })
    });
    set(s => ({ backgroundJobs: [job, ...s.backgroundJobs] }));
    return job;
  },

  runCodeReview: async () => {
    const job = await apiFetch('/background/quick-review', {
      method: 'POST',
      body: JSON.stringify({ projectId: get().currentProject?.id })
    });
    get().addToast('Code review started', 'info');
    return job;
  },

  runSecurityScan: async () => {
    const job = await apiFetch('/background/quick-security', {
      method: 'POST',
      body: JSON.stringify({ projectId: get().currentProject?.id })
    });
    get().addToast('Security scan started', 'info');
    return job;
  },

  // Terminal actions
  createTerminal: async () => {
    const data = await apiFetch('/terminal/sessions', {
      method: 'POST',
      body: JSON.stringify({ projectId: get().currentProject?.id })
    });
    set(s => ({ terminalSessions: [...s.terminalSessions, data], activeTerminal: data }));
    return data;
  },

  executeCommand: async (command) => {
    const data = await apiFetch('/terminal/execute', {
      method: 'POST',
      body: JSON.stringify({ command, cwd: get().currentProject?.path })
    });
    return data;
  },

  // Settings actions
  loadSettings: async () => {
    const settings = await apiFetch('/settings');
    set({ settings });
  },

  updateSettings: async (updates) => {
    const settings = await apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    set({ settings });
  },

  // UI actions
  setSidebarView: (view) => set({ sidebarView: view }),
  toggleAIPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelView: (view) => set({ bottomPanelView: view, bottomPanelOpen: true }),
  toggleCommandPalette: () => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleSettings: () => set(s => ({ settingsOpen: !s.settingsOpen })),

  addToast: (message, type = 'info') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
}));
