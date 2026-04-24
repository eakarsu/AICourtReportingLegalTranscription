import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Login successful. Welcome back!');
      navigate('/');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setEmail('admin@courtreport.com');
    setPassword('password123');
    setTimeout(async () => {
      setLoading(true);
      try {
        const response = await API.post('/auth/login', {
          email: 'admin@courtreport.com',
          password: 'password123',
        });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Login successful. Welcome back!');
        navigate('/');
      } catch (err) {
        const message =
          err.response?.data?.message || 'Login failed. Please check your credentials.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  return (
    <div className="login-page" style={styles.page}>
      <div className="login-card" style={styles.card}>
        <div style={styles.iconRow}>
          <span style={styles.icon}>&#9878;&#65039;</span>
        </div>
        <h1 className="login-title" style={styles.title}>
          AI Court Reporting &amp; Legal Transcription
        </h1>
        <p style={styles.subtitle}>Secure Access Portal</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label} htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            className="login-input"
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="login-input"
            style={styles.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="login-btn"
            style={styles.loginBtn}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <button
          className="quick-login-btn"
          style={styles.quickLoginBtn}
          type="button"
          onClick={handleQuickLogin}
          disabled={loading}
        >
          Quick Login (Demo)
        </button>

        <p style={styles.footer}>
          Protected under attorney-client privilege. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #0f1923 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '20px',
  },
  card: {
    background: '#1e2d3d',
    borderRadius: '12px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    textAlign: 'center',
  },
  iconRow: {
    marginBottom: '8px',
    fontSize: '48px',
    lineHeight: 1,
  },
  icon: {
    display: 'inline-block',
  },
  title: {
    color: '#e0e6ed',
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    letterSpacing: '0.3px',
  },
  subtitle: {
    color: '#7a8fa3',
    fontSize: '14px',
    margin: '0 0 32px 0',
  },
  form: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    color: '#8a9bb0',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: '20px',
    border: '1px solid #2c3e50',
    borderRadius: '8px',
    backgroundColor: '#152232',
    color: '#e0e6ed',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  loginBtn: {
    width: '100%',
    padding: '13px',
    backgroundColor: '#2980b9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '4px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    gap: '12px',
  },
  dividerText: {
    flex: 1,
    color: '#4a5c6e',
    fontSize: '13px',
    textAlign: 'center',
    position: 'relative',
  },
  quickLoginBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#5dade2',
    border: '1px solid #2c3e50',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  footer: {
    color: '#4a5c6e',
    fontSize: '11px',
    marginTop: '28px',
    marginBottom: 0,
    lineHeight: 1.5,
  },
};

export default LoginPage;
