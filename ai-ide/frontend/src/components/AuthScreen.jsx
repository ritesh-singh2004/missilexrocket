import React, { useState } from 'react';
import { useStore } from '../stores/useStore';

const styles = {
  container: { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' },
  card: { width: '100%', maxWidth: '400px', padding: '32px' },
  logo: { display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  logoBox: { width: '40px', height: '40px', borderRadius: '8px', background: '#58a6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#e6edf3', marginBottom: '8px', textAlign: 'center' },
  subtitle: { color: '#8b949e', fontSize: '14px', textAlign: 'center', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '500', color: '#8b949e', marginBottom: '6px' },
  input: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#e6edf3', fontSize: '13px', outline: 'none' },
  button: { width: '100%', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: '#58a6ff', color: 'white' },
  link: { color: '#58a6ff', fontSize: '14px', textAlign: 'center', marginTop: '24px', display: 'block', background: 'none', border: 'none', cursor: 'pointer' },
  error: { color: '#f85149', fontSize: '13px', background: 'rgba(248,81,73,0.1)', padding: '12px', borderRadius: '8px' },
};

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={styles.logo}>
            <div style={styles.logoBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#e6edf3' }}>AI IDE</span>
          </div>
          <h1 style={styles.title}>{isLogin ? 'Welcome back' : 'Create account'}</h1>
          <p style={styles.subtitle}>{isLogin ? 'Sign in to your AI coding platform' : 'Start building with AI assistance'}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div>
              <label style={styles.label}>Name</label>
              <input type="text" style={styles.input} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <input type="password" style={styles.input} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} style={styles.link}>
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
