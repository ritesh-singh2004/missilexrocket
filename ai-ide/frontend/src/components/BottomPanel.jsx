import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';

function TerminalPanel() {
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const { executeCommand, currentProject } = useStore();
  const outputRef = useRef(null);

  useEffect(() => {
    setOutput([{
      type: 'system',
      content: `Terminal ready. Working directory: ${currentProject?.path || '~'}`
    }]);
  }, [currentProject]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [output]);

  const handleExecute = async () => {
    if (!input.trim()) return;
    const cmd = input;
    setInput('');
    setOutput(prev => [...prev, { type: 'command', content: `$ ${cmd}` }]);

    try {
      const result = await executeCommand(cmd);
      if (result.stdout) {
        setOutput(prev => [...prev, { type: 'stdout', content: result.stdout }]);
      }
      if (result.stderr) {
        setOutput(prev => [...prev, { type: 'stderr', content: result.stderr }]);
      }
      if (result.exitCode !== 0) {
        setOutput(prev => [...prev, { type: 'error', content: `Exit code: ${result.exitCode}` }]);
      }
    } catch (err) {
      setOutput(prev => [...prev, { type: 'error', content: err.message }]);
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'command': return '#58a6ff';
      case 'error': return '#f85149';
      case 'stderr': return '#d29922';
      case 'system': return '#8b949e';
      default: return '#e6edf3';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div ref={outputRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
        {output.map((line, i) => (
          <div key={i} style={{ marginBottom: '4px', color: getColor(line.type) }}>
            {line.content}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#58a6ff', fontSize: '12px', fontFamily: 'monospace' }}>$</span>
        <input
          type="text"
          style={{
            flex: 1, background: 'transparent', color: '#e6edf3', fontSize: '12px',
            fontFamily: 'monospace', outline: 'none', border: 'none'
          }}
          placeholder="Enter command..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleExecute()}
          autoFocus
        />
      </div>
    </div>
  );
}

function ProblemsPanel() {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
      <p>No problems detected</p>
    </div>
  );
}

function OutputPanel() {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
      <p>No output</p>
    </div>
  );
}

export default function BottomPanel() {
  const { bottomPanelView, setBottomPanelView, toggleBottomPanel } = useStore();

  const tabs = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'problems', label: 'Problems' },
    { id: 'output', label: 'Output' },
  ];

  return (
    <div style={{ height: '256px', borderTop: '1px solid #30363d', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #30363d' }}>
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                padding: '8px 16px', fontSize: '12px', fontWeight: 500, background: 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                color: bottomPanelView === tab.id ? '#e6edf3' : '#8b949e',
                borderBottom: bottomPanelView === tab.id ? '2px solid #58a6ff' : '2px solid transparent'
              }}
              onClick={() => setBottomPanelView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleBottomPanel}
          style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '8px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {bottomPanelView === 'terminal' && <TerminalPanel />}
        {bottomPanelView === 'problems' && <ProblemsPanel />}
        {bottomPanelView === 'output' && <OutputPanel />}
      </div>
    </div>
  );
}
