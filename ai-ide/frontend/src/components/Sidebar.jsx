import React, { useState } from 'react';
import { useStore } from '../stores/useStore';
import FileExplorer from './FileExplorer';
import GitPanel from './GitPanel';
import ProjectList from './ProjectList';
import AgentPanel from './AgentPanel';
import GitHubPanel from './GitHubPanel';
import GitLabPanel from './GitLabPanel';
import BackgroundAgentsPanel from './BackgroundAgentsPanel';
import AdminPanel from './AdminPanel';

const SIDEBAR_ICONS = [
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'files', label: 'Explorer', icon: 'files' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'git', label: 'Source Control', icon: 'git' },
  { id: 'github', label: 'GitHub', icon: 'github' },
  { id: 'gitlab', label: 'GitLab', icon: 'gitlab' },
  { id: 'agent', label: 'Agent', icon: 'bot' },
  { id: 'background', label: 'Background Agents', icon: 'background' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'admin', label: 'Admin', icon: 'admin' },
];

function SidebarIcon({ id, label, icon, active, onClick }) {
  const icons = {
    projects: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    files: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    git: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>,
    github: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
    gitlab: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.387 9.452.045 13.587c-.323 1.312.968 2.451 2.291 2.13l.011-.003h21.316c1.324.322 2.614-.818 2.29-2.13zM7.582 9.45l3.334 10.258H4.248l3.334-10.258zm8.834 10.258l3.334-10.258 3.334 10.258h-6.668z"/></svg>,
    bot: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
    background: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    terminal: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };

  return (
    <div
      className={`sidebar-icon-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
    >
      {icons[icon]}
    </div>
  );
}

export default function Sidebar() {
  const { sidebarView, setSidebarView, currentProject, setBottomPanelView } = useStore();

  const handleIconClick = (id) => {
    if (id === 'terminal') {
      setBottomPanelView('terminal');
      return;
    }
    setSidebarView(sidebarView === id ? null : id);
  };

  const renderPanel = () => {
    switch (sidebarView) {
      case 'projects': return <ProjectList />;
      case 'files': return currentProject ? <FileExplorer /> : <ProjectList />;
      case 'search': return <SearchPanel />;
      case 'git': return <GitPanel />;
      case 'github': return <GitHubPanel />;
      case 'gitlab': return <GitLabPanel />;
      case 'agent': return <AgentPanel />;
      case 'background': return <BackgroundAgentsPanel />;
      case 'admin': return <AdminPanel />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div className="sidebar-icon">
        {SIDEBAR_ICONS.map(icon => (
          <SidebarIcon
            key={icon.id}
            {...icon}
            active={sidebarView === icon.id}
            onClick={() => handleIconClick(icon.id)}
          />
        ))}
      </div>
      {sidebarView && (
        <div className="ide-sidebar" style={{ width: '240px', minWidth: '240px', background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {SIDEBAR_ICONS.find(i => i.id === sidebarView)?.label || sidebarView}
            </span>
            <button
              onClick={() => setSidebarView(null)}
              style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderPanel()}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchPanel() {
  const { currentProject } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchType, setSearchType] = useState('code');

  const handleSearch = async () => {
    if (!query || !currentProject) return;
    try {
      const endpoint = searchType === 'files' ? '/search/files' : '/search/code';
      const res = await fetch(`${endpoint}?projectId=${currentProject.id}&q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ai_ide_token')}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1, padding: '6px 10px', background: '#0d1117', color: '#e6edf3',
            border: '1px solid #30363d', borderRadius: '6px', fontSize: '12px', outline: 'none'
          }}
        />
        <select
          value={searchType}
          onChange={e => setSearchType(e.target.value)}
          style={{
            width: '80px', padding: '6px', background: '#0d1117', color: '#e6edf3',
            border: '1px solid #30363d', borderRadius: '6px', fontSize: '12px', outline: 'none'
          }}
        >
          <option value="code">Code</option>
          <option value="files">Files</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {results.map((r, i) => (
          <div key={i} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ color: '#58a6ff' }}>{r.file || r.name}</div>
            {r.line && <div style={{ color: '#8b949e', marginTop: '4px' }}>Line {r.line}: {r.content}</div>}
            {r.preview && <div style={{ color: '#8b949e', marginTop: '4px' }}>{r.preview}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
