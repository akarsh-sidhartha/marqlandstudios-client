/**
 * src/pages/jobwork/JobWorkPage.js
 *
 * Shared entry point for BOTH the Job Work vendor portal AND the Courier
 * partner portal, at the same URL: /job-work. After login, the role on the
 * returned session decides which portal renders — 'jobWork' -> JobWorkPortal,
 * 'courier' -> CourierPortal. This intentionally keeps courier off
 * admin.marqlandstudios.com entirely (see that repo's App.js redirect) and
 * segregates external vendor/partner roles from internal staff roles, all
 * under one external entry point rather than one URL per role.
 *
 * Mirrors src/pages/partner/PartnerPage.js's invite-token pattern:
 *  - ?token=... (from the job-work invite email) -> "create your password"
 *    form -> POST /api/auth/invite/register (existing, role-agnostic) ->
 *    "pending admin approval" message.
 *  - ?reset=... -> password reset form -> POST /api/auth/reset-password.
 *  - Otherwise: a branded landing + <LoginPopup> (shared component, also
 *    used by PartnerPage.js — same login UX, including the password
 *    show/hide eye icon, across every external portal on this site).
 *
 * NOT wired into App.js's routes yet — see JOB_WORK_WIRING.md at the repo
 * root for the one line to add.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Check, Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import JobWorkPortal from './JobWorkPortal';
import CourierPortal from './CourierPortal';
import LoginPopup from '../../components/LoginPopup';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
import {
  sanitizeName, isValidName, isValidPassword, GENERIC_INVALID_MESSAGE,
} from '../../utils/inputValidation';

const API_BASE = process.env.REACT_APP_API_URL || '';
const SESSION_KEY = 'jobWorkSession'; // shared storage key for both roles served by this page

const C = {
  primary: '#b8975a',
  surfaceDeep: 'var(--navy)',
  onBackground: 'rgba(255,255,255,0.85)',
  onSurfaceVariant: 'rgba(255,255,255,0.34)',
};

const JOBWORK_PAGE_CSS = `
  .jw-root { min-height: 100vh; background: var(--navy); color: rgba(255,255,255,0.85); font-family: 'Jost', sans-serif; }
  .jw-gold-border { border: 1px solid rgba(184,151,90,0.25); }
`;

const FontLoader = () => {
  useEffect(() => {
    if (document.querySelector('#ms-gf')) return;
    const l = document.createElement('link');
    l.id = 'ms-gf';
    l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap';
    l.rel = 'stylesheet';
    document.head.appendChild(l);
  }, []);
  return null;
};

const JobWorkPage = () => {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [showLogin, setShowLogin] = useState(false);

  // ── Invite-token registration ──────────────────────────────────────────────
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [inviteState, setInviteState] = useState(inviteToken ? 'checking' : 'none');
  const [inviteEmail, setInviteEmail] = useState('');
  const [registerForm, setRegisterForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // ── Password reset (marqlandstudios.com/job-work?reset=<token>) ───────────
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('reset'));
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    axios.get(`${API_BASE}/api/auth/invite/verify`, { params: { token: inviteToken } })
      .then(res => {
        setInviteEmail(res.data.email);
        setInviteState('valid');
      })
      .catch(err => {
        setInviteState(err.response?.status === 410 ? 'expired' : 'invalid');
      });
  }, [inviteToken]);

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (!isValidName(registerForm.name)) { setRegisterError(GENERIC_INVALID_MESSAGE); return; }
    if (!isValidPassword(registerForm.password)) { setRegisterError('Password must be at least 8 characters.'); return; }
    if (registerForm.password !== registerForm.confirmPassword) { setRegisterError('Passwords do not match.'); return; }
    setRegistering(true);
    setRegisterError('');
    try {
      await axios.post(`${API_BASE}/api/auth/invite/register`, {
        token: inviteToken, name: registerForm.name, password: registerForm.password,
      });
      setRegistered(true);
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const submitResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword(resetForm.newPassword)) { setResetError('Password must be at least 8 characters.'); return; }
    if (resetForm.newPassword !== resetForm.confirmPassword) { setResetError('Passwords do not match.'); return; }
    setResetting(true);
    setResetError('');
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, { token: resetToken, newPassword: resetForm.newPassword });
      setResetDone(true);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  // ── Password reset screen (marqlandstudios.com/job-work?reset=<token>) ────
  if (resetToken) {
    return (
      <div className="jw-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{MARQLAND_THEME_CSS}</style>
        <style>{JOBWORK_PAGE_CSS}</style>
        <FontLoader />
        <div className="jw-gold-border" style={{ background: C.surfaceDeep, width: '100%', maxWidth: 440, padding: '44px 40px' }}>
          <div className="sf" style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 24, textAlign: 'center' }}>Marqland Studios</div>

          {!resetDone ? (
            <>
              <h2 className="sf" style={{ fontSize: 24, color: C.primary, fontWeight: 500, marginBottom: 20, textAlign: 'center' }}>
                Set a New Password
              </h2>
              <form onSubmit={submitResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <label className="lbl">New Password</label>
                  <input className="fi" required type={showResetPassword ? 'text' : 'password'} value={resetForm.newPassword}
                    onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} placeholder="At least 8 characters" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowResetPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: 38, background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant }}>
                    {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <label className="lbl">Confirm Password</label>
                  <input className="fi" required type={showResetPassword ? 'text' : 'password'} value={resetForm.confirmPassword}
                    onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })} />
                </div>
                {resetError && <p style={{ color: '#ffb4ab', fontSize: 12 }}>{resetError}</p>}
                <button type="submit" disabled={resetting} className="btn-gold" style={{ marginTop: 4 }}>
                  {resetting ? 'Updating…' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(230,193,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={28} color={C.primary} />
              </div>
              <h3 className="sf" style={{ fontSize: 20, color: C.primary, marginBottom: 12 }}>Password Updated</h3>
              <p style={{ color: C.onSurfaceVariant, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                You can now log in with your new password.
              </p>
              <a href="/job-work" className="btn-gold" style={{ display: 'inline-block', textDecoration: 'none' }}>Go to Login</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Invite-token registration screen (priority over everything else) ──────
  if (inviteToken) {
    return (
      <div className="jw-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{MARQLAND_THEME_CSS}</style>
        <style>{JOBWORK_PAGE_CSS}</style>
        <FontLoader />
        <div className="jw-gold-border" style={{ background: C.surfaceDeep, width: '100%', maxWidth: 440, padding: '44px 40px' }}>
          <div className="sf" style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 24, textAlign: 'center' }}>Marqland Studios</div>

          {inviteState === 'checking' && (
            <p style={{ textAlign: 'center', color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={16} className="animate-spin" /> Verifying your invite…
            </p>
          )}

          {inviteState === 'invalid' && (
            <p style={{ textAlign: 'center', color: '#ffb4ab', fontSize: 14 }}>
              This invite link is invalid or has already been used. Please contact Marqland Studios for a new invite.
            </p>
          )}

          {inviteState === 'expired' && (
            <p style={{ textAlign: 'center', color: '#ffb4ab', fontSize: 14 }}>
              This invite link has expired. Please ask Marqland Studios to send you a new one.
            </p>
          )}

          {inviteState === 'valid' && !registered && (
            <>
              <h2 className="sf" style={{ fontSize: 24, color: C.primary, fontWeight: 500, marginBottom: 8, textAlign: 'center' }}>
                Complete Your Registration
              </h2>
              <p style={{ fontSize: 13, color: C.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>{inviteEmail}</p>
              <form onSubmit={submitRegistration} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="lbl">Your Name</label>
                  <input className="fi" required value={registerForm.name}
                    onChange={e => setRegisterForm({ ...registerForm, name: sanitizeName(e.target.value) })} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label className="lbl">Password</label>
                  <input className="fi" required type={showRegisterPassword ? 'text' : 'password'} value={registerForm.password}
                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="At least 8 characters" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowRegisterPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: 38, background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant }}>
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <label className="lbl">Confirm Password</label>
                  <input className="fi" required type={showRegisterPassword ? 'text' : 'password'} value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} />
                </div>
                {registerError && <p style={{ color: '#ffb4ab', fontSize: 12 }}>{registerError}</p>}
                <button type="submit" disabled={registering} className="btn-gold" style={{ marginTop: 4 }}>
                  {registering ? 'Creating account…' : 'Register'}
                </button>
              </form>
            </>
          )}

          {registered && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(230,193,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={28} color={C.primary} />
              </div>
              <h3 className="sf" style={{ fontSize: 20, color: C.primary, marginBottom: 12 }}>Account Created</h3>
              <p style={{ color: C.onSurfaceVariant, fontSize: 14, lineHeight: 1.7 }}>
                Your account is pending approval from our team. Once you're granted access,
                come back to <strong style={{ color: C.onBackground }}>marqlandstudios.com/job-work</strong> and log in with your new password.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Logged-in vendor/courier sees their portal instead of the landing page ─
  if (session) {
    if (session.user.role === 'courier') return <CourierPortal session={session} onLogout={logout} />;
    return <JobWorkPortal session={session} onLogout={logout} />;
  }

  // ── Landing + login popup ──────────────────────────────────────────────────
  return (
    <div className="jw-root">
      <style>{MARQLAND_THEME_CSS}</style>
      <style>{JOBWORK_PAGE_CSS}</style>
      <FontLoader />

      <nav className="nav" style={{ background: 'rgba(14,21,32,0.94)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" className="nav-logo sf" style={{ textDecoration: 'none' }}>Marqland Studios</Link>
        <div className="nav-links">
          <button onClick={() => setShowLogin(true)} className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogIn size={13} /> Log In
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '160px 24px 80px', textAlign: 'center' }}>
        <span className="pill">Job Work &amp; Courier Portal</span>
        <h1 className="sf" style={{ fontSize: 40, fontWeight: 300, marginTop: 16, marginBottom: 16 }}>
          Submit your <em style={{ color: C.primary }}>work.</em>
        </h1>
        <p style={{ color: C.onSurfaceVariant, fontSize: 15, lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
          If you're a Marqland Studios job-work vendor or courier partner, log in below to
          submit and track your work. Not yet onboarded? Ask your Marqland contact to send you an invite.
        </p>
      </div>

      <LoginPopup
        show={showLogin}
        onClose={() => setShowLogin(false)}
        accentColor={C.primary}
        title="Vendor Log In"
        allowedRoles={['jobWork', 'courier']}
        wrongRoleMessage="This login is for approved Job Work vendors or Courier partners only."
        sessionStorageKey={SESSION_KEY}
        onLoginSuccess={(next) => { setSession(next); setShowLogin(false); }}
      />
    </div>
  );
};

export default JobWorkPage;
