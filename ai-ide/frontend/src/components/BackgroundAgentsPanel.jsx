import { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';

export default function BackgroundAgentsPanel() {
  const { backgroundJobs, loadBackgroundJobs, runCodeReview, runSecurityScan, addToast } = useStore();
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackgroundJobs();
    const interval = setInterval(loadBackgroundJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'queued': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleQuickReview = async () => {
    setLoading(true);
    try {
      await runCodeReview();
      addToast('Code review started in background', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityScan = async () => {
    setLoading(true);
    try {
      await runSecurityScan();
      addToast('Security scan started in background', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '12px' }}>Background Agents</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handleQuickReview}
          disabled={loading}
          style={{
            padding: '8px 12px', background: loading ? '#4b5563' : '#3b82f6', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flex: 1
          }}
        >
          {loading ? 'Running...' : 'Code Review'}
        </button>
        <button
          onClick={handleSecurityScan}
          disabled={loading}
          style={{
            padding: '8px 12px', background: loading ? '#4b5563' : '#ef4444', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flex: 1
          }}
        >
          {loading ? 'Running...' : 'Security Scan'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '6px 12px', background: activeTab === 'jobs' ? '#374151' : 'transparent', color: '#e5e7eb',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
          }}
        >
          Jobs
        </button>
        <button
          onClick={() => setActiveTab('automations')}
          style={{
            padding: '6px 12px', background: activeTab === 'automations' ? '#374151' : 'transparent', color: '#e5e7eb',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
          }}
        >
          Automations
        </button>
      </div>

      {activeTab === 'jobs' && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {backgroundJobs.map(job => (
            <div
              key={job.id}
              style={{
                padding: '10px', borderRadius: '6px', marginBottom: '8px',
                background: '#1f2937', border: '1px solid #374151'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>
                  {job.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Job'}
                </span>
                <span
                  style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                    background: getStatusColor(job.status) + '22', color: getStatusColor(job.status)
                  }}
                >
                  {job.status}
                </span>
              </div>
              {job.result && (
                <pre style={{
                  color: '#9ca3af', fontSize: '11px', margin: 0, padding: '8px',
                  background: '#111827', borderRadius: '4px', overflow: 'auto', maxHeight: '100px'
                }}>
                  {typeof job.result === 'string' ? job.result : JSON.stringify(JSON.parse(job.result), null, 2)}
                </pre>
              )}
              {job.error && (
                <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>{job.error}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ color: '#6b7280', fontSize: '10px' }}>
                  {job.createdAt ? new Date(job.createdAt).toLocaleString() : ''}
                </span>
                {job.completedAt && (
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>
                    Duration: {Math.round((new Date(job.completedAt) - new Date(job.createdAt)) / 1000)}s
                  </span>
                )}
              </div>
            </div>
          ))}
          {backgroundJobs.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No background jobs</p>
          )}
        </div>
      )}

      {activeTab === 'automations' && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>Automations coming soon</p>
          <p style={{ color: '#4b5563', fontSize: '11px' }}>Set up automated code reviews, tests, and more</p>
        </div>
      )}
    </div>
  );
}
