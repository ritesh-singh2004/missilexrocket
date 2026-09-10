import React from 'react';
import { useStore } from '../stores/useStore';

export default function ToastContainer() {
  const { toasts } = useStore();

  const getColor = (type) => {
    switch (type) {
      case 'success': return '#238636';
      case 'error': return '#da3633';
      case 'warning': return '#d29922';
      default: return '#388bfd';
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '48px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          padding: '10px 16px', borderRadius: '8px', background: '#161b22',
          border: `1px solid ${getColor(toast.type)}`, color: '#e6edf3',
          fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxWidth: '360px'
        }}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
