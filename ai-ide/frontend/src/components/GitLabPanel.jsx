import { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function GitLabPanel() {
  const { gitlabToken, gitlabProjects, connectGitLab, loadGitLabProjects, addToast } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectVisibility, setNewProjectVisibility] = useState('private');

  useEffect(() => {
    const savedToken = localStorage.getItem('gitlab_token');
    if (savedToken && !gitlabToken) {
      useStore.setState({ gitlabToken: savedToken });
      loadGitLabProjects();
    }
  }, []);

  useEffect(() => {
    if (gitlabToken) loadGitLabProjects();
  }, [gitlabToken]);

  if (!gitlabToken) {
    return (
      <div style={{ padding: '16px' }}>
        <h3 style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '12px' }}>GitLab</h3>
        <button
          onClick={connectGitLab}
          style={{
            width: '100%', padding: '10px', background: '#e24329', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
          }}
        >
          Connect GitLab
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ color: '#e5e7eb', fontSize: '14px', margin: 0 }}>GitLab Projects</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '4px 10px', background: '#e24329', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
          }}
        >
          + New
        </button>
      </div>

      {showCreate && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newProjectName.trim()) return;
          try {
            const token = gitlabToken || localStorage.getItem('gitlab_token');
            const res = await fetch('/api/gitlab/create-project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: token, name: newProjectName, description: newProjectDesc, visibility: newProjectVisibility })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addToast('Project created on GitLab', 'success');
            setShowCreate(false);
            setNewProjectName('');
            setNewProjectDesc('');
            loadGitLabProjects();
          } catch (err) {
            addToast(err.message, 'error');
          }
        }} style={{ marginBottom: '12px', padding: '10px', background: '#1f2937', borderRadius: '6px' }}>
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            style={{
              width: '100%', padding: '6px 8px', background: '#111827', color: '#e5e7eb',
              border: '1px solid #374151', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', boxSizing: 'border-box'
            }}
          />
          <input
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              width: '100%', padding: '6px 8px', background: '#111827', color: '#e5e7eb',
              border: '1px solid #374151', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', boxSizing: 'border-box'
            }}
          />
          <select
            value={newProjectVisibility}
            onChange={(e) => setNewProjectVisibility(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', background: '#111827', color: '#e5e7eb',
              border: '1px solid #374151', borderRadius: '4px', marginBottom: '8px', fontSize: '12px'
            }}
          >
            <option value="private">Private</option>
            <option value="internal">Internal</option>
            <option value="public">Public</option>
          </select>
          <button
            type="submit"
            style={{
              width: '100%', padding: '6px', background: '#e24329', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            Create Project
          </button>
        </form>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {gitlabProjects.map(proj => (
          <div
            key={proj.id}
            style={{
              padding: '8px 10px', borderRadius: '6px', marginBottom: '6px',
              background: '#1f2937', border: '1px solid #374151', cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{proj.name}</span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/gitlab/clone', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cloneUrl: proj.cloneUrl, name: proj.name })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    addToast(`Cloned ${proj.name}`, 'success');
                  } catch (err) {
                    addToast(err.message, 'error');
                  }
                }}
                style={{
                  padding: '3px 8px', background: '#3b82f6', color: '#fff',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'
                }}
              >
                Clone
              </button>
            </div>
            {proj.description && (
              <p style={{ color: '#9ca3af', fontSize: '11px', margin: '4px 0 0' }}>{proj.description}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ color: proj.visibility === 'public' ? '#10b981' : '#f59e0b', fontSize: '11px' }}>{proj.visibility}</span>
              <span style={{ color: '#6b7280', fontSize: '11px' }}>★ {proj.starCount || 0}</span>
            </div>
          </div>
        ))}
        {gitlabProjects.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No projects found</p>
        )}
      </div>
    </div>
  );
}
