import React, { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function AgentPanel() {
  const { currentProject, agentTasks, loadAgentTasks, createAgentTask, executeAgentTask, cancelAgentTask } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgentTasks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const task = await createAgentTask(title, description);
      await executeAgentTask(task.id);
      setTitle('');
      setDescription('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'queued': return '#8b949e';
      case 'running': return '#58a6ff';
      case 'completed': return '#3fb950';
      case 'failed': return '#f85149';
      case 'cancelled': return '#d29922';
      default: return '#8b949e';
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px', background: '#0d1117', color: '#e6edf3',
    border: '1px solid #30363d', borderRadius: '6px', fontSize: '12px', outline: 'none',
    boxSizing: 'border-box', marginBottom: '8px'
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>New Agent Task</div>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Describe what to do..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <button
            type="submit"
            disabled={!title.trim() || loading}
            style={{
              width: '100%', padding: '6px', background: '#238636', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              opacity: !title.trim() || loading ? 0.5 : 1
            }}
          >
            {loading ? 'Starting...' : 'Run Agent'}
          </button>
        </form>
      </div>

      <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Tasks</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {agentTasks.map(task => (
          <div key={task.id} style={{ padding: '8px', borderRadius: '6px', background: '#0d1117', border: '1px solid #30363d' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(task.status) }}/>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{task.title}</span>
              </div>
              <span style={{ fontSize: '10px', color: getStatusColor(task.status) }}>{task.status}</span>
            </div>
            {task.description && (
              <p style={{ fontSize: '10px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
            )}
            {task.status === 'running' && (
              <button
                onClick={() => cancelAgentTask(task.id)}
                style={{ marginTop: '8px', fontSize: '10px', color: '#f85149', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cancel
              </button>
            )}
          </div>
        ))}
        {agentTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#8b949e', fontSize: '12px' }}>
            <p>No tasks yet</p>
            <p style={{ marginTop: '4px' }}>Create a task to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
