import React from 'react';
import { useStore } from '../stores/useStore';

export default function StatusBar() {
  const { currentProject, gitBranch, activeFile, user, toggleBottomPanel } = useStore();

  return (
    <div style={{
      height: '24px', background: '#161b22', borderTop: '1px solid #30363d',
      display: 'flex', alignItems: 'center', padding: '0 12px', gap: '12px',
      fontSize: '11px', color: '#8b949e', flexShrink: 0
    }}>
      {currentProject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/>
            <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
          </svg>
          <span>{gitBranch || 'main'}</span>
        </div>
      )}
      {activeFile && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{activeFile.language}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>UTF-8</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Spaces: 2</span>
          </div>
        </>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={toggleBottomPanel}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
          border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '11px', padding: '2px 4px'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e6edf3'}
        onMouseLeave={e => e.currentTarget.style.color = '#8b949e'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5"/>
          <line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
        <span>Terminal</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>AI IDE v1.0</span>
      </div>
    </div>
  );
}
