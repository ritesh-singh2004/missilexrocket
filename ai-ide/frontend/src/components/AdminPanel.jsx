import { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { addToast } = useStore();

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const updateRole = async (userId, role) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addToast('Role updated', 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '12px' }}>Admin Dashboard</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['overview', 'users', 'projects'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px', background: activeTab === tab ? '#374151' : 'transparent', color: '#e5e7eb',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Users', value: stats.totalUsers, color: '#3b82f6' },
            { label: 'Projects', value: stats.totalProjects, color: '#10b981' },
            { label: 'Conversations', value: stats.totalConversations, color: '#f59e0b' },
            { label: 'Agent Tasks', value: stats.totalAgentTasks, color: '#ef4444' },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                padding: '12px', background: '#1f2937', borderRadius: '6px', border: '1px solid #374151'
              }}
            >
              <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: '24px', fontWeight: 700, margin: '4px 0 0' }}>{stat.value || 0}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {users.map(user => (
            <div
              key={user.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px', background: '#1f2937', borderRadius: '6px', marginBottom: '8px', border: '1px solid #374151'
              }}
            >
              <div>
                <p style={{ color: '#e5e7eb', fontSize: '13px', margin: 0, fontWeight: 500 }}>{user.name}</p>
                <p style={{ color: '#6b7280', fontSize: '11px', margin: '2px 0 0' }}>{user.email}</p>
              </div>
              <select
                value={user.role}
                onChange={(e) => updateRole(user.id, e.target.value)}
                style={{
                  padding: '4px 8px', background: '#111827', color: '#e5e7eb',
                  border: '1px solid #374151', borderRadius: '4px', fontSize: '12px'
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
          {users.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No users found</p>
          )}
        </div>
      )}

      {activeTab === 'projects' && stats?.recentProjects && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {stats.recentProjects.map(proj => (
            <div
              key={proj.id}
              style={{
                padding: '10px', background: '#1f2937', borderRadius: '6px', marginBottom: '8px', border: '1px solid #374151'
              }}
            >
              <p style={{ color: '#e5e7eb', fontSize: '13px', margin: 0, fontWeight: 500 }}>{proj.name}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {proj.language && <span style={{ color: '#3b82f6', fontSize: '11px' }}>{proj.language}</span>}
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{new Date(proj.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
