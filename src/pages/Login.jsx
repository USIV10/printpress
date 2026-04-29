import React, { useState } from 'react';
import s from './Login.module.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Please enter both username and password.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await onLogin(username.trim().toLowerCase(), password);
      if (!res.success) setError(res.message || 'Login failed.');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className={s.screen}>
      <div className={s.card}>
        <div className={s.brand}>
          <div className={s.logo}>
            <svg viewBox="0 0 32 32" fill="none">
              <rect x="2" y="8" width="28" height="18" rx="3" fill="#2dd4a0" opacity=".15" stroke="#2dd4a0" strokeWidth="1.5"/>
              <rect x="6" y="4" width="20" height="6" rx="2" fill="#2dd4a0" opacity=".3" stroke="#2dd4a0" strokeWidth="1"/>
              <rect x="9" y="14" width="14" height="2" rx="1" fill="#2dd4a0"/>
              <rect x="9" y="19" width="9"  height="2" rx="1" fill="#2dd4a0" opacity=".6"/>
            </svg>
          </div>
          <h1 className={s.appName}>PrintPress</h1>
          <p className={s.tagline}>Sales & Profit Management</p>
        </div>

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <h2 className={s.title}>Sign in</h2>
          <p className={s.subtitle}>Enter your credentials to continue</p>

          <div className={s.field}>
            <label className={s.label}>Username</label>
            <input
              className={s.input}
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Password</label>
            <div className={s.pwWrap}>
              <input
                className={s.input}
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className={s.pwToggle} onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l14 14M8.5 8.5A3 3 0 0011.5 11.5M6.5 6.5C4.8 7.6 3.5 8.8 2 10c2.5 3 5.5 5 8 5a8 8 0 003.5-.8M13.5 13.5C15.2 12.4 16.5 11.2 18 10c-2.5-3-5.5-5-8-5a8 8 0 00-3.5.8"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 10c2.5-4 5.5-6 8-6s5.5 2 8 6c-2.5 4-5.5 6-8 6s-5.5-2-8-6z"/>
                    <circle cx="10" cy="10" r="2.5"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={s.error}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="7"/>
                <line x1="8" y1="5" x2="8" y2="8.5"/>
                <circle cx="8" cy="11" r=".5" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? (
              <span className={s.spinner}/>
            ) : 'Sign in'}
          </button>
        </form>

        <div className={s.hint}>
          <p>Default credentials</p>
          <div className={s.creds}>
            <span><strong>Admin:</strong> admin / admin123</span>
            <span><strong>Sales:</strong> sales / sales123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
