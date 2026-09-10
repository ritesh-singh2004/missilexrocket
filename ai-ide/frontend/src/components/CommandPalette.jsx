import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';

const COMMANDS = [
  { id: 'new-file', label: 'New File', shortcut: 'Ctrl+N', category: 'File' },
  { id: 'save-file', label: 'Save File', shortcut: 'Ctrl+S', category: 'File' },
  { id: 'open-file', label: 'Open File', shortcut: 'Ctrl+O', category: 'File' },
  { id: 'close-file', label: 'Close Editor', shortcut: 'Ctrl+W', category: 'File' },
  { id: 'toggle-terminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`', category: 'View' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', category: 'View' },
  { id: 'toggle-ai', label: 'Toggle AI Panel', shortcut: 'Ctrl+L', category: 'View' },
  { id: 'toggle-settings', label: 'Open Settings', shortcut: 'Ctrl+,', category: 'View' },
  { id: 'new-chat', label: 'New AI Chat', shortcut: '', category: 'AI' },
  { id: 'git-commit', label: 'Git Commit', shortcut: 'Ctrl+Shift+G', category: 'Git' },
  { id: 'git-status', label: 'Git Status', shortcut: '', category: 'Git' },
  { id: 'run-tests', label: 'Run Tests', shortcut: '', category: 'Run' },
  { id: 'build', label: 'Build Project', shortcut: 'Ctrl+Shift+B', category: 'Run' },
  { id: 'search-files', label: 'Search Files', shortcut: 'Ctrl+P', category: 'Search' },
  { id: 'search-code', label: 'Search in Files', shortcut: 'Ctrl+Shift+F', category: 'Search' },
  { id: 'format-document', label: 'Format Document', shortcut: 'Shift+Alt+F', category: 'Edit' },
  { id: 'go-to-line', label: 'Go to Line', shortcut: 'Ctrl+G', category: 'Navigation' },
];

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const { toggleCommandPalette, setBottomPanelView, toggleAIPanel, toggleSettings, setSidebarView, createConversation, currentProject } = useStore();

  const filtered = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (cmd) => {
    toggleCommandPalette();
    switch (cmd.id) {
      case 'toggle-terminal':
        setBottomPanelView('terminal');
        break;
      case 'toggle-ai':
        toggleAIPanel();
        break;
      case 'toggle-settings':
        toggleSettings();
        break;
      case 'toggle-sidebar':
        setSidebarView(useStore.getState().sidebarView === 'files' ? null : 'files');
        break;
      case 'new-chat':
        createConversation(currentProject?.id);
        break;
      case 'search-files':
        setSidebarView('search');
        break;
      case 'search-code':
        setSidebarView('search');
        break;
      case 'git-status':
        setSidebarView('git');
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh'
      }}
      onClick={toggleCommandPalette}
    >
      <div
        style={{
          background: '#161b22', borderRadius: '12px', border: '1px solid #30363d',
          width: '560px', maxHeight: '400px', overflow: 'hidden', boxShadow: '0 16px 70px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a command..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '16px', background: 'transparent', color: '#e6edf3',
            border: 'none', borderBottom: '1px solid #30363d', fontSize: '14px', outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', cursor: 'pointer',
                background: i === selectedIndex ? '#1c2128' : 'transparent'
              }}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: '#8b949e', width: '64px' }}>{cmd.category}</span>
                <span style={{ fontSize: '13px', color: '#e6edf3' }}>{cmd.label}</span>
              </div>
              {cmd.shortcut && (
                <span style={{
                  padding: '2px 6px', borderRadius: '4px', background: '#30363d',
                  fontSize: '11px', fontFamily: 'monospace', color: '#8b949e'
                }}>{cmd.shortcut}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
