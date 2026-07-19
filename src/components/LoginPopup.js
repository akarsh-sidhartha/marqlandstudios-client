/**
 * src/components/LoginPopup.js
 *
 * Shared login popup used by every external portal on this site — Partner
 * (supplier), Job Work vendor, and Courier partner. Single implementation
 * so the login UX (including the password show/hide eye icon) stays
 * identical across all three instead of being copy-pasted per page.
 *
 * Fully self-contained: owns its own form state, calls POST /api/auth/login,
 * enforces that the returned user's role is one of `allowedRoles`, persists
 * the session to sessionStorage under `sessionStorageKey`, and reports
 * success via `onLoginSuccess(session)`. Also includes the "Forgot
 * password?" mini-flow (POST /api/auth/forgot-password), reused as-is from
 * the original PartnerPage.js/JobWorkPage.js implementations.
 *
 * Props:
 *   show               - whether the popup is visible
 *   onClose            - close handler
 *   accentColor        - button/focus color (each portal keeps its own brand accent)
 *   title              - e.g. "Partner Login", "Vendor Log In"
 *   allowedRoles       - array of acceptable user.role values, e.g. ['supplier']
 *   wrongRoleMessage   - shown when login succeeds but role isn't in allowedRoles
 *   sessionStorageKey  - sessionStorage key to persist { accessToken, user } under
 *   onLoginSuccess     - (session) => void
 */
import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { isValidEmail } from '../utils/inputValidation';

const API_BASE = process.env.REACT_APP_API_URL || '';

const C = {
  surfaceDeep: 'var(--navy)',
  onSurfaceVariant: 'rgba(255,255,255,0.34)',
};

const LoginPopup = ({
  show, onClose, accentColor = '#b8975a', title = 'Log In',
  allowedRoles, wrongRoleMessage = 'This login is not valid for this portal.',
  sessionStorageKey, onLoginSuccess,
}) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  if (!show) return null;

  const close = () => {
    setShowForgotPassword(false);
    setForgotSent(false);
    setLoginError('');
    onClose?.();
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    if (!isValidEmail(loginForm.email)) { setLoginError('Please enter a valid email address.'); return; }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, loginForm);
      const { accessToken, user } = res.data;
      if (!allowedRoles.includes(user.role)) {
        setLoginError(wrongRoleMessage);
        return;
      }
      const session = { accessToken, user };
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
      onLoginSuccess?.(session);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.status === 'pending') {
        setLoginError('Your account is pending approval. An admin will grant access shortly.');
      } else {
        setLoginError(err.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    if (!isValidEmail(forgotEmail)) { setLoginError('Please enter a valid email address.'); return; }
    setForgotSubmitting(true);
    setLoginError('');
    try {
      await axios.post(`${API_BASE}/api/auth/forgot-password`, { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // backend always responds generically — never reveals whether the email exists
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(14,21,32,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.surfaceDeep, border: '1px solid rgba(184,151,90,0.25)', width: '100%', maxWidth: 400, padding: '36px 32px', position: 'relative' }}>
        <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant }}>
          <X size={18} />
        </button>

        {!showForgotPassword ? (
          <>
            <h2 className="sf" style={{ fontSize: 22, color: accentColor, fontWeight: 500, marginBottom: 20, textAlign: 'center' }}>{title}</h2>
            <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="lbl">Email</label>
                <input className="fi" required type="email" value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
              </div>
              <div style={{ position: 'relative' }}>
                <label className="lbl">Password</label>
                <input className="fi" required type={showPassword ? 'text' : 'password'} value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: 38, background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginError && <p style={{ color: '#ffb4ab', fontSize: 12 }}>{loginError}</p>}
              <button type="submit" disabled={loggingIn} className="btn-gold" style={{ marginTop: 4 }}>
                {loggingIn ? 'Logging in…' : 'Log In'}
              </button>
              <button type="button" onClick={() => setShowForgotPassword(true)}
                style={{ background: 'none', border: 'none', color: C.onSurfaceVariant, fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline' }}>
                Forgot password?
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="sf" style={{ fontSize: 22, color: accentColor, fontWeight: 500, marginBottom: 16, textAlign: 'center' }}>Reset Password</h2>
            {!forgotSent ? (
              <form onSubmit={submitForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: C.onSurfaceVariant }}>Enter your email and we'll send you a link to reset your password.</p>
                <input className="fi" required type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                {loginError && <p style={{ color: '#ffb4ab', fontSize: 12 }}>{loginError}</p>}
                <button type="submit" disabled={forgotSubmitting} className="btn-gold">
                  {forgotSubmitting ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => setShowForgotPassword(false)}
                  style={{ background: 'none', border: 'none', color: C.onSurfaceVariant, fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline' }}>
                  Back to Login
                </button>
              </form>
            ) : (
              <p style={{ fontSize: 14, color: C.onSurfaceVariant, lineHeight: 1.7 }}>
                If that email is registered, a reset link has been sent. Check your inbox and follow the link to set a new password.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPopup;
