import React, { useState } from 'react';
import { useStore } from '../stores/useStore';

export default function ProjectList() {
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
      setSidebarView('files');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: '#0d1117', color: '#e6edf3',
    border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '12px' }}>
      <button
        onClick={() => setShowCreate(true)}
        style={{
          width: '100%', marginBottom: '12px', padding: '8px', borderRadius: '8px',
          border: '1px dashed #30363d', background: 'transparent', color: '#8b949e',
          fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Project
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => { openProject(project); setSidebarView('files'); }}
            style={{
              width: '100%', padding: '8px', borderRadius: '6px', background: 'transparent',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(88,166,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
              <div style={{ fontSize: '10px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.language || 'Unknown'}</div>
            </div>
          </button>
        ))}
      </div>

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#8b949e', fontSize: '12px' }}>
          <p>No projects yet</p>
          <p style={{ marginTop: '4px' }}>Create or open a project to get started</p>
        </div>
      )}

      {showCreate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', width: '420px', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>Create Project</span>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Name</label>
                <input style={inputStyle} placeholder="my-project" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Path</label>
                <input style={inputStyle} placeholder="/path/to/project" value={path} onChange={e => setPath(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px' }}>Description</label>
                <input style={inputStyle} placeholder="Optional" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  padding: '8px 16px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                }}>Cancel</button>
                <button type="submit" disabled={loading} style={{
                  padding: '8px 16px', background: '#238636', color: '#fff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.6 : 1
                }}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
