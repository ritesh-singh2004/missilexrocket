import React, { useState } from 'react';
import { useStore } from '../stores/useStore';

function FileIcon({ name, isDirectory }) {
  if (isDirectory) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="1.5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }
  const ext = name.split('.').pop()?.toLowerCase();
  const colors = {
    js: '#f0db4f', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
    py: '#3776ab', java: '#ed8b00', c: '#555', cpp: '#555',
    go: '#00add8', rs: '#dea584', rb: '#cc342d',
    html: '#e34c26', css: '#264de4', json: '#f0db4f',
    md: '#ffffff', yaml: '#cb171e', yml: '#cb171e',
    sh: '#4eaa25', bash: '#4eaa25',
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[ext] || '#8b949e'} strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function FileTreeItem({ item, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const { activeFile, openFile } = useStore();
  const isActive = activeFile?.path === item.path;

  const handleClick = () => {
    if (item.type === 'directory') {
      setExpanded(!expanded);
    } else {
      openFile(item.path);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
          paddingLeft: `${depth * 12 + 8}px`, cursor: 'pointer', fontSize: '12px',
          background: isActive ? '#1c2128' : 'transparent',
          color: isActive ? '#e6edf3' : '#8b949e',
          borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent'
        }}
        onClick={handleClick}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1c212880'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        {item.type === 'directory' && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        {item.type === 'directory' && <span style={{ width: 12 }} />}
        <FileIcon name={item.name} isDirectory={item.type === 'directory'} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e6edf3' }}>{item.name}</span>
      </div>
      {item.type === 'directory' && expanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem key={child.path} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer() {
  const { fileTree, currentProject } = useStore();

  if (!currentProject) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
        <p>No project open</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>Open a project to browse files</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {currentProject.name}
      </div>
      {fileTree.length === 0 ? (
        <div style={{ padding: '8px 16px', fontSize: '12px', color: '#8b949e' }}>Loading files...</div>
      ) : (
        fileTree.map(item => (
          <FileTreeItem key={item.path} item={item} />
        ))
      )}
    </div>
  );
}
