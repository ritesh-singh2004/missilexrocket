import React, { useState } from 'react';
import { useStore } from '../stores/useStore';

export default function WelcomeScreen() {
  const { projects, openProject, createProject, setSidebarView } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await createProject(name, path, description);
      await openProject(project);
      setShowCreate(false);
      setName('');
      setPath('');
      setDescription('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', padding: '32px' }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#238636', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#e6edf3' }}>AI IDE</span>
          </div>
          <h1 style={{ fontSize: '20px', color: '#8b949e', marginBottom: '8px', fontWeight: 400 }}>
            AI-Native Coding Platform
          </h1>
          <p style={{ fontSize: '14px', color: '#8b949e', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            Build software with AI assistance. Chat with AI about your code, let agents write features, and ship faster.
          </p>
        </div>

        {/* Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '24px', borderRadius: '12px', border: '1px solid #30363d',
              background: '#161b22', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#58a6ff'; e.currentTarget.style.background = '#1c2128'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#161b22'; }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(88,166,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3', marginBottom: '4px' }}>Create Project</h3>
            <p style={{ fontSize: '12px', color: '#8b949e', margin: 0 }}>Start a new project from scratch</p>
          </button>

          <button
            onClick={() => setSidebarView('projects')}
            style={{
              padding: '24px', borderRadius: '12px', border: '1px solid #30363d',
              background: '#161b22', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3fb950'; e.currentTarget.style.background = '#1c2128'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#161b22'; }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(63,185,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3', marginBottom: '4px' }}>Open Project</h3>
            <p style={{ fontSize: '12px', color: '#8b949e', margin: 0 }}>Open an existing project</p>
          </button>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Recent Projects
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.slice(0, 5).map(project => (
                <button
                  key={project.id}
                  onClick={() => openProject(project)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #30363d',
                    background: '#161b22', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#58a6ff'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#30363d'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(88,166,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                    <div style={{ fontSize: '11px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.path}</div>
                  </div>
                  {project.language && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#30363d', fontSize: '10px', color: '#8b949e', flexShrink: 0 }}>{project.language}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#8b949e' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: '#161b22', border: '1px solid #30363d', fontFamily: 'monospace', fontSize: '11px' }}>Ctrl+Shift+P</kbd>
              Command Palette
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: '#161b22', border: '1px solid #30363d', fontFamily: 'monospace', fontSize: '11px' }}>Ctrl+`</kbd>
              Terminal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: '#161b22', border: '1px solid #30363d', fontFamily: 'monospace', fontSize: '11px' }}>Ctrl+S</kbd>
              Save
            </span>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', width: '420px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>Create New Project</span>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Project Name</label>
                <input
                  type="text"
                  placeholder="my-project"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0d1117', color: '#e6edf3',
                    border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Project Path</label>
                <input
                  type="text"
                  placeholder="/path/to/project"
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0d1117', color: '#e6edf3',
                    border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>Absolute path to the project directory</p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Description (optional)</label>
                <input
                  type="text"
                  placeholder="What is this project about?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0d1117', color: '#e6edf3',
                    border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  padding: '8px 16px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                }}>Cancel</button>
                <button type="submit" disabled={loading} style={{
                  padding: '8px 16px', background: '#238636', color: '#fff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.6 : 1
                }}>
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
