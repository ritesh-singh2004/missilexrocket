import { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function GitHubPanel() {
  const { githubToken, githubRepos, connectGitHub, loadGitHubRepos, cloneGitHubRepo, createGitHubRepo, addToast } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [cloning, setCloning] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken && !githubToken) {
      useStore.setState({ githubToken: savedToken });
      loadGitHubRepos();
    }
  }, []);

  useEffect(() => {
    if (githubToken) loadGitHubRepos();
  }, [githubToken]);

  const handleConnect = () => {
    connectGitHub();
  };

  const handleClone = async (repo) => {
    setCloning(repo.id);
    try {
      await cloneGitHubRepo(repo.cloneUrl, repo.name);
      addToast(`Cloned ${repo.name}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCloning(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    try {
      await createGitHubRepo(newRepoName, newRepoDesc, newRepoPrivate);
      setShowCreate(false);
      setNewRepoName('');
      setNewRepoDesc('');
      setNewRepoPrivate(false);
      loadGitHubRepos();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (!githubToken) {
    return (
      <div style={{ padding: '16px' }}>
        <h3 style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '12px' }}>GitHub</h3>
        <button
          onClick={handleConnect}
          style={{
            width: '100%', padding: '10px', background: '#238636', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
          }}
        >
          Connect GitHub
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ color: '#e5e7eb', fontSize: '14px', margin: 0 }}>GitHub Repositories</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '4px 10px', background: '#238636', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
          }}
        >
          + New
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: '12px', padding: '10px', background: '#1f2937', borderRadius: '6px' }}>
          <input
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            placeholder="Repository name"
            style={{
              width: '100%', padding: '6px 8px', background: '#111827', color: '#e5e7eb',
              border: '1px solid #374151', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', boxSizing: 'border-box'
            }}
          />
          <input
            value={newRepoDesc}
            onChange={(e) => setNewRepoDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              width: '100%', padding: '6px 8px', background: '#111827', color: '#e5e7eb',
              border: '1px solid #374151', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', boxSizing: 'border-box'
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
            <input type="checkbox" checked={newRepoPrivate} onChange={(e) => setNewRepoPrivate(e.target.checked)} />
            Private repository
          </label>
          <button
            type="submit"
            style={{
              width: '100%', padding: '6px', background: '#238636', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            Create Repository
          </button>
        </form>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {githubRepos.map(repo => (
          <div
            key={repo.id}
            style={{
              padding: '8px 10px', borderRadius: '6px', marginBottom: '6px',
              background: '#1f2937', border: '1px solid #374151', cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{repo.name}</span>
              <button
                onClick={() => handleClone(repo)}
                disabled={cloning === repo.id}
                style={{
                  padding: '3px 8px', background: cloning === repo.id ? '#4b5563' : '#3b82f6', color: '#fff',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'
                }}
              >
                {cloning === repo.id ? 'Cloning...' : 'Clone'}
              </button>
            </div>
            {repo.description && (
              <p style={{ color: '#9ca3af', fontSize: '11px', margin: '4px 0 0' }}>{repo.description}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {repo.language && <span style={{ color: '#3b82f6', fontSize: '11px' }}>{repo.language}</span>}
              {repo.private && <span style={{ color: '#f59e0b', fontSize: '11px' }}>Private</span>}
              <span style={{ color: '#6b7280', fontSize: '11px' }}>★ {repo.stars || 0}</span>
            </div>
          </div>
        ))}
        {githubRepos.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No repositories found</p>
        )}
      </div>
    </div>
  );
}
