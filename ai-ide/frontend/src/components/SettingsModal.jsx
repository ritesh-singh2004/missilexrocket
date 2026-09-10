import React, { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function SettingsModal() {
  const { toggleSettings, settings, updateSettings, user, logout } = useStore();
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState({});

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'editor', label: 'Editor' },
    { id: 'ai', label: 'AI Models' },
    { id: 'git', label: 'Git' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'account', label: 'Account' },
  ];

  const handleSave = async () => {
    await updateSettings(localSettings);
    toggleSettings();
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: '#0d1117', color: '#e6edf3',
    border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '6px'
  };

  const sectionStyle = { marginBottom: '24px' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={toggleSettings}
    >
      <div
        style={{ background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', width: '700px', height: '80vh', display: 'flex', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div style={{ width: '192px', borderRight: '1px solid #30363d', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Settings</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                background: activeTab === tab.id ? '#1c2128' : 'transparent',
                color: activeTab === tab.id ? '#e6edf3' : '#8b949e',
                border: 'none', cursor: 'pointer', marginBottom: '4px'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'general' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '24px' }}>General Settings</h2>
              <div style={sectionStyle}>
                <label style={labelStyle}>Theme</label>
                <select style={inputStyle} value={localSettings.theme || 'dark'} onChange={e => setLocalSettings(s => ({ ...s, theme: e.target.value }))}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Auto Save</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={localSettings.autoSave !== false} onChange={e => setLocalSettings(s => ({ ...s, autoSave: e.target.checked }))} />
                  <span style={{ fontSize: '13px', color: '#8b949e' }}>Automatically save files when switching tabs</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '24px' }}>Editor Settings</h2>
              <div style={sectionStyle}>
                <label style={labelStyle}>Font Size</label>
                <input type="number" style={{ ...inputStyle, width: '128px' }} value={localSettings.fontSize || 14} onChange={e => setLocalSettings(s => ({ ...s, fontSize: parseInt(e.target.value) }))} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Font Family</label>
                <select style={inputStyle} value={localSettings.fontFamily || 'JetBrains Mono'} onChange={e => setLocalSettings(s => ({ ...s, fontFamily: e.target.value }))}>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Fira Code">Fira Code</option>
                  <option value="Consolas">Consolas</option>
                  <option value="monospace">System Monospace</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Tab Size</label>
                <select style={{ ...inputStyle, width: '128px' }} value={localSettings.tabSize || 2} onChange={e => setLocalSettings(s => ({ ...s, tabSize: parseInt(e.target.value) }))}>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Word Wrap</label>
                <select style={inputStyle} value={localSettings.wordWrap || 'off'} onChange={e => setLocalSettings(s => ({ ...s, wordWrap: e.target.value }))}>
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="wordWrapColumn">Word Wrap Column</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Minimap</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={localSettings.minimap !== false} onChange={e => setLocalSettings(s => ({ ...s, minimap: e.target.checked }))} />
                  <span style={{ fontSize: '13px', color: '#8b949e' }}>Show minimap</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '24px' }}>AI Model Settings</h2>
              <div style={sectionStyle}>
                <label style={labelStyle}>Default Model</label>
                <select style={inputStyle} value={localSettings.defaultModel || 'gpt-4'} onChange={e => setLocalSettings(s => ({ ...s, defaultModel: e.target.value }))}>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                  <option value="gemini-pro">Gemini Pro</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>AI Provider</label>
                <select style={inputStyle} value={localSettings.aiProvider || 'openai'} onChange={e => setLocalSettings(s => ({ ...s, aiProvider: e.target.value }))}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="local">Local (Ollama)</option>
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>API Endpoint (optional)</label>
                <input type="text" style={inputStyle} placeholder="https://api.openai.com/v1" value={localSettings.apiEndpoint || ''} onChange={e => setLocalSettings(s => ({ ...s, apiEndpoint: e.target.value }))} />
              </div>
              <div style={{ padding: '16px', background: '#0d1117', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>API Keys</div>
                <p style={{ fontSize: '12px', color: '#8b949e' }}>
                  Configure your API keys in the <code style={{ color: '#58a6ff' }}>.env</code> file or set them as environment variables.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '24px' }}>Terminal Settings</h2>
              <div style={sectionStyle}>
                <label style={labelStyle}>Default Shell</label>
                <select style={inputStyle} value={localSettings.terminalShell || 'bash'} onChange={e => setLocalSettings(s => ({ ...s, terminalShell: e.target.value }))}>
                  <option value="bash">Bash</option>
                  <option value="zsh">Zsh</option>
                  <option value="powershell">PowerShell</option>
                  <option value="cmd">Command Prompt</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '24px' }}>Account</h2>
              {user && (
                <div style={{ padding: '16px', background: '#0d1117', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%', background: '#238636',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 700, color: '#fff'
                    }}>
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: '#e6edf3' }}>{user.name}</div>
                      <div style={{ fontSize: '13px', color: '#8b949e' }}>{user.email}</div>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={logout} style={{
                padding: '8px 16px', background: '#da3633', color: '#fff', border: 'none',
                borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
              }}>Sign Out</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #30363d' }}>
            <button onClick={toggleSettings} style={{
              padding: '8px 16px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
            }}>Cancel</button>
            <button onClick={handleSave} style={{
              padding: '8px 16px', background: '#238636', color: '#fff', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
            }}>Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
