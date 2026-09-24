import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';
import { SegmentedControl } from '../components/SegmentedControl';

export function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (isRegister && !name.trim()) errors.name = 'Name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    if (!password) errors.password = 'Password is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
        showToast('Account created successfully');
      } else {
        await login(email.trim(), password);
        showToast('Welcome to StockPulse');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.status === 401 ? 'Email or password is incorrect.' : err.message;
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = async (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setMode('login');
    setLoading(true);
    try {
      await login(userEmail, userPass);
      showToast('Logged in with demo credentials');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showToast(err.message || 'Demo login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Column: Institutional Brand & Simulation Terminal Showcase */}
      <div className="auth-hero">
        <div className="auth-hero-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="auth-hero-brand">StockPulse</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#A1A1AA',
                fontWeight: 500,
                letterSpacing: '0.04em',
              }}
            >
              v2.0
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              color: '#A1A1AA',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--gain)',
              }}
            />
            Simulated Market Engine
          </div>
        </div>

        <div className="auth-hero-tagline">
          <h1 style={{ fontWeight: 400 }}>
            Know what you own. See every trade move the market.
          </h1>
          <p style={{ marginTop: 12, lineHeight: 1.6, color: '#A1A1AA', maxWidth: '44ch' }}>
            A virtual stock portfolio and risk engine featuring trade-driven dynamic pricing, midpoint slippage execution, and autonomous Gaussian drift.
          </p>

          {/* Institutional Highlights Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginTop: 36,
              maxWidth: 480,
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
                Market-Impact Model
              </div>
              <div style={{ fontSize: '13px', color: '#F4F4F2', fontWeight: 500, marginTop: 4 }}>
                Slippage-adjusted midpoint fills
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
                Concurrency Engine
              </div>
              <div style={{ fontSize: '13px', color: '#F4F4F2', fontWeight: 500, marginTop: 4 }}>
                Deadlock-free 2-phase locks
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
                Risk &amp; Concentration
              </div>
              <div style={{ fontSize: '13px', color: '#F4F4F2', fontWeight: 500, marginTop: 4 }}>
                Real-time HHI score &amp; alerts
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
                Price History
              </div>
              <div style={{ fontSize: '13px', color: '#F4F4F2', fontWeight: 500, marginTop: 4 }}>
                Server-downsampled charts
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#71717A' }}>
          Simulated market environment · Virtual ₹10,00,000 cash per account
        </div>
      </div>

      {/* Right Column: Clean Authentication Panel */}
      <div className="auth-form-side">
        {/* Floating Top Controls (Theme Toggle & Mobile Brand) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ThemeToggle />
        </div>

        <div className="auth-card" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <div className="auth-mobile-brand">
            <span style={{ fontWeight: 600 }}>StockPulse</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--fill)',
                color: 'var(--ink-2)',
                marginLeft: 8,
              }}
            >
              v2.0
            </span>
          </div>

          {/* Mode Switcher: Log in | Register */}
          <div style={{ marginBottom: 24 }}>
            <SegmentedControl
              options={[
                { label: 'Log in', value: 'login' },
                { label: 'Create account', value: 'register' },
              ]}
              value={mode}
              onChange={(val) => {
                setMode(val);
                setFieldErrors({});
              }}
              ariaLabel="Select authentication mode"
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <Field id="auth-name" label="Full name" error={fieldErrors.name}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ananya Sharma"
                  autoComplete="name"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </Field>
            )}

            <Field id="auth-email" label="Email address" error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              />
            </Field>

            <Field id="auth-password" label="Password" error={fieldErrors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 40px 0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 32,
                    minHeight: 32,
                    padding: '0 8px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-3)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', minHeight: 46, marginTop: '8px', fontSize: 'var(--text-sm)', fontWeight: 600 }}
            >
              {loading
                ? 'Authenticating…'
                : isRegister
                ? 'Create Account'
                : 'Sign In to StockPulse'}
            </Button>
          </form>

          {/* Quick Demo Credentials Panel for 1-Click Evaluation */}
          {!isRegister && (
            <div
              style={{
                marginTop: 24,
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Demo Access
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>1-Click Login</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('user@stockpulse.com', 'password123')}
                  disabled={loading}
                  style={{
                    padding: '8px',
                    minHeight: 36,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line-strong)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink)',
                    fontWeight: 500,
                    textAlign: 'center',
                  }}
                >
                  Trader User
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('testadmin@stockpulse.com', 'admin123')}
                  disabled={loading}
                  style={{
                    padding: '8px',
                    minHeight: 36,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line-strong)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink)',
                    fontWeight: 500,
                    textAlign: 'center',
                  }}
                >
                  Admin Sim
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Muted Internship Footer */}
        <Footer style={{ marginTop: 'auto', paddingTop: 24 }} />
      </div>
    </div>
  );
}
