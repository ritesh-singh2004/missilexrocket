import React from 'react';
import { useStore } from '../stores/useStore';

export default function TitleBar() {
  const { currentProject, user, toggleCommandPalette } = useStore();

  return (
    <div style={{
      height: '40px', background: '#0d1117', borderBottom: '1px solid #30363d',
      display: 'flex', alignItems: 'center', padding: '0 12px', gap: '12px', flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px', background: '#238636',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3', letterSpacing: '0.5px' }}>AI IDE</span>
      </div>

      {currentProject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8b949e' }}>
          <span style={{ color: '#e6edf3', fontWeight: 500 }}>{currentProject.name}</span>
          {currentProject.language && (
            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#30363d', color: '#8b949e', fontSize: '11px' }}>{currentProject.language}</span>
          )}
          {currentProject.framework && (
            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#30363d', color: '#8b949e', fontSize: '11px' }}>{currentProject.framework}</span>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={toggleCommandPalette}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '6px',
          background: '#161b22', border: '1px solid #30363d', color: '#8b949e', fontSize: '12px',
          cursor: 'pointer', transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.borderColor = '#8b949e'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#30363d'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search or run a command...</span>
        <span style={{ marginLeft: '16px', padding: '2px 6px', borderRadius: '4px', background: '#30363d', fontSize: '10px' }}>Ctrl+Shift+P</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', background: '#238636',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#fff'
            }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '12px', color: '#8b949e' }}>{user.name?.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
