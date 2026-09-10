import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../stores/useStore';

function MessageContent({ content }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre key={i} style={{
              background: '#0d1117', borderRadius: '6px', padding: '12px', margin: '8px 0',
              overflowX: 'auto', fontSize: '12px', fontFamily: 'monospace'
            }}>
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} style={{
            background: '#0d1117', padding: '2px 6px', borderRadius: '4px', color: '#58a6ff',
            fontSize: '12px', fontFamily: 'monospace'
          }}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export default function AIPanel() {
  const { messages, sendMessage, conversations, currentConversation, createConversation, selectConversation, deleteConversation, currentProject, toggleAIPanel } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const contextFiles = useStore.getState().activeFile ? [{
      path: useStore.getState().activeFile.path,
      content: useStore.getState().editorContent
    }] : [];
    await sendMessage(input.trim(), contextFiles);
    setInput('');
    setLoading(false);
  };

  const panelStyle = {
    width: '360px', minWidth: '360px', background: '#161b22', borderLeft: '1px solid #30363d',
    display: 'flex', flexDirection: 'column', height: '100%'
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="12" cy="5" r="2"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>AI Assistant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <button
            onClick={toggleAIPanel}
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Chat History */}
      {showHistory && (
        <div style={{ borderBottom: '1px solid #30363d', maxHeight: '192px', overflowY: 'auto' }}>
          <div style={{ padding: '8px' }}>
            <button
              onClick={() => { createConversation(currentProject?.id); setShowHistory(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px',
                background: 'none', border: 'none', color: '#58a6ff', fontSize: '12px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              + New Chat
            </button>
            {conversations.map(conv => (
              <div
                key={conv.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                  background: currentConversation?.id === conv.id ? '#1c2128' : 'transparent',
                  color: currentConversation?.id === conv.id ? '#e6edf3' : '#8b949e'
                }}
                onClick={() => { selectConversation(conv.id); setShowHistory(false); }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title || 'New Chat'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {messages.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(88,166,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', marginBottom: '8px' }}>AI Assistant</h3>
            <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
              Ask me anything about your code. I can help with:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {['Explain code', 'Fix bugs', 'Generate features', 'Refactor code', 'Write tests'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8b949e' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#58a6ff' }}/>
                  {item}
                </div>
              ))}
            </div>
            {currentProject && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#0d1117', borderRadius: '8px', textAlign: 'left' }}>
                <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Project Context</div>
                <div style={{ fontSize: '12px', color: '#e6edf3' }}>{currentProject.name}</div>
                {currentProject.language && (
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>{currentProject.language} • {currentProject.framework || 'General'}</div>
                )}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '6px',
                background: msg.role === 'user' ? '#238636' : '#8957e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {msg.role === 'user' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"/>
                    <circle cx="12" cy="5" r="2"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <MessageContent content={msg.content} />
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '6px', background: '#8957e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="12" cy="5" r="2"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>AI Assistant</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 150, 300].map((delay, i) => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%', background: '#8b949e',
                      animation: `bounce 1s infinite ${delay}ms`
                    }}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '12px', borderTop: '1px solid #30363d' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="Ask AI anything... (Ctrl+Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            style={{
              width: '100%', padding: '10px 40px 10px 12px', background: '#0d1117', color: '#e6edf3',
              border: '1px solid #30363d', borderRadius: '8px', fontSize: '13px', outline: 'none',
              resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              position: 'absolute', right: '8px', bottom: '8px', padding: '6px',
              background: '#238636', color: '#fff', border: 'none', borderRadius: '6px',
              cursor: 'pointer', opacity: !input.trim() || loading ? 0.3 : 1
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#8b949e' }}>
          {['@file', '@selection', '@terminal'].map(tag => (
            <span key={tag} style={{
              padding: '2px 6px', borderRadius: '4px', background: '#161b22', border: '1px solid #30363d'
            }}>{tag}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
