import React, { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function GitPanel() {
  const { currentProject, gitStatus, gitFiles, gitBranch, loadGitStatus, gitCommit } = useStore();
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadGitStatus(currentProject.id);
    }
  }, [currentProject]);

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    setLoading(true);
    try {
      const stagedFiles = gitFiles.filter(f => f.staged).map(f => f.path);
      await gitCommit(commitMsg, stagedFiles.length > 0 ? stagedFiles : undefined);
      setCommitMsg('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
        <p>No project open</p>
      </div>
    );
  }

  if (!gitStatus) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
        <p>Not a git repository</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>Initialize git to use source control</p>
      </div>
    );
  }

  const stagedFiles = gitFiles.filter(f => f.staged);
  const unstagedFiles = gitFiles.filter(f => !f.staged);

  const getChangeColor = (type) => {
    switch (type) {
      case 'added': return '#3fb950';
      case 'deleted': return '#f85149';
      case 'untracked': return '#8b949e';
      default: return '#d29922';
    }
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="18" r="3"/>
          <circle cx="6" cy="6" r="3"/>
          <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
        </svg>
        <span style={{ color: '#58a6ff', fontWeight: 500 }}>{gitBranch}</span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <textarea
          placeholder="Commit message..."
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '8px', background: '#0d1117', color: '#e6edf3',
            border: '1px solid #30363d', borderRadius: '6px', fontSize: '12px', outline: 'none',
            resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMsg.trim() || loading}
          style={{
            width: '100%', marginTop: '8px', padding: '6px', background: '#238636', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            opacity: !commitMsg.trim() || loading ? 0.5 : 1
          }}
        >
          {loading ? 'Committing...' : 'Commit'}
        </button>
      </div>

      {stagedFiles.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Staged Changes</div>
          {stagedFiles.map(f => (
            <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
              <span style={{ width: '16px', textAlign: 'center', fontFamily: 'monospace', color: getChangeColor(f.changeType) }}>
                {f.changeType === 'added' ? 'A' : f.changeType === 'deleted' ? 'D' : 'M'}
              </span>
              <span style={{ color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {unstagedFiles.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Changes</div>
          {unstagedFiles.map(f => (
            <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
              <span style={{ width: '16px', textAlign: 'center', fontFamily: 'monospace', color: getChangeColor(f.changeType) }}>
                {f.changeType === 'added' ? 'A' : f.changeType === 'deleted' ? 'D' : f.changeType === 'untracked' ? '?' : 'M'}
              </span>
              <span style={{ color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {gitFiles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#8b949e', fontSize: '12px' }}>
          <p>No changes</p>
        </div>
      )}
    </div>
  );
}
