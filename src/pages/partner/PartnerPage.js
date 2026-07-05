/**
 * src/pages/partner/PartnerPage.js
 *
 * Matches the supplier-onboarding mockup: dark hero with background image,
 * a 3-card benefits grid, and a two-column onboarding form section (pro-tip
 * + static progress steps on the left, the actual form on the right).
 * Nav is simplified to just the logo (links home) + a "Login" button, which
 * opens the same login popup as before — still renders <SupplierPortal />
 * on success.
 *
 * NEW — Invite registration: if this page is loaded with a ?token= query
 * param (from the supplier invite email — see emailService.js
 * sendInviteEmail(..., 'supplier'), which now links to
 * marqlandstudios.com/partner?token=... instead of the admin app), the page
 * shows a "Complete Your Registration" form (name + password) instead of
 * the marketing content. Submits to the existing, role-agnostic
 * POST /api/auth/invite/register — same endpoint the admin app's invite
 * flow already uses. On success, the person is told their account is
 * pending and to bookmark marqlandstudios.com/partner to log in once
 * approved.
 *
 * Form fields map directly to models/public-site/PartnerLead.js:
 *   Legal Business Name  -> companyName
 *   Company Website      -> website (protocol optional — "www.x.com" is fine, normalized server-side)
 *   Primary Contact Name -> contactName
 *   Business Email       -> email
 *   Phone Number         -> phone
 *   Tell us about...     -> message
 *
 * The "Upload Catalog/Portfolio" file is submitted as multipart/form-data
 * and stored on OneDrive (development/website -> supplier folder ->
 * {companyName}), same convention as supplier product videos. Files over
 * 50MB are rejected client-side immediately, with the same limit enforced
 * server-side too.
 *
 * Security: every text field is sanitized as you type (disallowed
 * characters simply never appear) and re-validated before submit. This is
 * a UX layer only — utils/inputValidation.js's backend counterpart is the
 * real security boundary and re-checks everything from scratch.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck, Share2, TrendingUp, Lightbulb, UploadCloud, X, LogIn, Check, Loader2, Eye, EyeOff, Mail,Link2,
} from 'lucide-react';
import SupplierPortal from './SupplierPortal';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
import {
  sanitizeName, sanitizePhone, sanitizeMessage,
  isValidName, isValidEmail, isValidPhone, isValidMessage, isSafeUrl, isValidPassword, GENERIC_INVALID_MESSAGE,
} from '../../utils/inputValidation'; // NEW — security hardening

const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

// NEW — Partner page now shares HomePage.js's look and feel exactly (fonts,
// color palette, layout language) instead of the old standalone partnerTheme.
// C.* keys are kept so the JSX below didn't need to change line-by-line —
// only the values now map onto Marqland's navy/brass-gold system.
const C = {
  primary: '#b8975a',                    // brass gold — same accent as HomePage
  background: '#0e1520',                 // deep navy — matches HomePage's base background
  surfaceContainerLowest: '#0c1320',      // matches HomePage's footer background
  surfaceDeep: 'var(--navy)',             // matches HomePage's card/modal background
  surfaceBorder: 'rgba(255,255,255,0.1)',
  onBackground: 'rgba(255,255,255,0.85)',
  onSurfaceVariant: 'rgba(255,255,255,0.34)',
  goldMuted: 'rgba(184,151,90,0.35)',
};

// Small set of layout-only classes HomePage.js doesn't already provide
// (icon circles, benefit cards, responsive grids). Everything else — .sf,
// .lbl, .fi, .btn-gold, .nav, .pill, .divider — comes straight from
// MARQLAND_THEME_CSS, same as HomePage.js.
const PARTNER_PAGE_CSS = `
  .pp-root { min-height: 100vh; background: var(--navy); color: rgba(255,255,255,0.85); font-family: 'Jost', sans-serif; }
  .pp-gold-border { border: 1px solid rgba(184,151,90,0.25); }
  .pp-icon-circle {
    width: 56px; height: 56px; border-radius: 50%;
    border: 1px solid rgba(184,151,90,0.3);
    display: flex; align-items: center; justify-content: center;
    color: #b8975a; margin-bottom: 20px;
  }
  .pp-benefit-card {
    padding: 40px 32px; display: flex; flex-direction: column; gap: 12px;
    background: linear-gradient(135deg, rgba(27,32,39,0.8), rgba(15,20,26,0.9));
    transition: transform 0.4s ease;
  }
  .pp-benefit-card:hover { transform: translateY(-6px); }
  .pp-benefits-grid { display: grid; grid-template-columns: 1fr !important; gap: 24px; }
  .pp-form-grid { display: grid; grid-template-columns: 1fr !important; gap: 48px; }
  @media (min-width: 768px) { .pp-benefits-grid { grid-template-columns: repeat(3, 1fr) !important; } }
  @media (min-width: 900px) { .pp-form-grid { grid-template-columns: 5fr 7fr !important; } }
`;

// Same Google Fonts loader HomePage.js uses (Cormorant Garamond + Jost),
// guarded so it's a no-op if HomePage already loaded it in this session.
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

const API_BASE = process.env.REACT_APP_API_URL || '';
const MAX_PORTFOLIO_BYTES = 50 * 1024 * 1024; // 50MB — matches the backend multer limit

const emptyLead = {
  companyName: '', contactName: '', email: '', phone: '', website: '', message: '',
};

const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida/AP1WRLvkRdPdWDEt66QnhqdvNaknVTY61O2xh469ttdd0_-IU_v3sbjIXX0oTr4JVACwHa9e3gfPxMZFiQdIUgLUi03TToNk1gOLZ_jSkqy9mG-EoT-B5xmVw88Pn6GvIqiRT5pJiJB0pRZ5NQPM46RfPnNHVH302KnuIzWAi_emDYFZB4OpgFxEMX5TEsk-hTHlt8Isu9KitAV8X8aikSJ4AXCvFi7RhS1mb6jGvzRbwIc_oQ5PcukRs5z2xbU';

const PartnerPage = () => {
  const [lead, setLead] = useState(emptyLead);
  const [portfolioFile, setPortfolioFile] = useState(null); // now uploaded for real — see submitLead
  const [fileError, setFileError] = useState(''); // NEW — shown when a file is rejected (too large / wrong type)
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false); // NEW — eye toggle

  // NEW — "Forgot password?" mini-flow inside the login popup
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // NEW — invite-token registration state
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [inviteState, setInviteState] = useState(inviteToken ? 'checking' : 'none'); // 'none'|'checking'|'valid'|'invalid'|'expired'
  const [inviteEmail, setInviteEmail] = useState('');
  const [registerForm, setRegisterForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false); // NEW — eye toggle

  // NEW — password reset flow (marqlandstudios.com/partner?reset=<token>)
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('reset'));
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false); // NEW — eye toggle

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

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    if (!isValidEmail(forgotEmail)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
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

  const submitResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword(resetForm.newPassword)) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
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

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (!isValidName(registerForm.name)) {
      setRegisterError(GENERIC_INVALID_MESSAGE);
      return;
    }
    if (!isValidPassword(registerForm.password)) {
      setRegisterError('Password must be at least 8 characters.');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
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

  // Nav background transitions on scroll — same behavior as HomePage.js
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [supplierSession, setSupplierSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem('supplierSession');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const submitLead = async (e) => {
    e.preventDefault();
    // NEW — security hardening: re-validate everything before submit, even
    // though the fields already strip disallowed characters as you type.
    if (!isValidName(lead.companyName) || !isValidName(lead.contactName)) {
      setError(GENERIC_INVALID_MESSAGE);
      return;
    }
    if (!isValidEmail(lead.email)) {
      setError('Please enter a valid business email address.');
      return;
    }
    if (!isValidPhone(lead.phone)) {
      setError('Phone can only contain digits, spaces, +, -, and parentheses.');
      return;
    }
    if (!isSafeUrl(lead.website)) {
      setError('Please enter a valid website URL (starting with http:// or https://).');
      return;
    }
    if (!isValidMessage(lead.message)) {
      setError(GENERIC_INVALID_MESSAGE);
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Supplier Code of Conduct and Privacy Policy.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(lead).forEach(([key, value]) => fd.append(key, value));
      if (portfolioFile) fd.append('portfolio', portfolioFile);

      await axios.post(`${API_BASE}/api/public-site/partner-leads`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      setLead(emptyLead);
      setPortfolioFile(null);
      setAgreedToTerms(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    // NEW — security hardening: validate email format client-side. Password
    // is intentionally NOT restricted to alphanumeric — it's hashed and
    // never rendered/executed anywhere, so there's no XSS surface there,
    // and restricting its character set would only make it weaker.
    if (!isValidEmail(loginForm.email)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, loginForm);
      const { accessToken, user } = res.data;
      if (user.role !== 'supplier') {
        setLoginError('This login is for approved Partners only.');
        return;
      }
      const session = { accessToken, user };
      sessionStorage.setItem('supplierSession', JSON.stringify(session));
      setSupplierSession(session);
      setShowLogin(false);
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('supplierSession');
    setSupplierSession(null);
  };

  const scrollToForm = (e) => {
    e.preventDefault();
    document.getElementById('onboarding-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Password reset — reached via marqlandstudios.com/partner?reset=... ────
  if (resetToken) {
    return (
      <div className="pp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <style>{MARQLAND_THEME_CSS}</style>
        <style>{PARTNER_PAGE_CSS}</style>
        <FontLoader />
        <div className="pp-gold-border" style={{ background: C.surfaceDeep, width: '100%', maxWidth: 440, padding: '44px 40px' }}>
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
              <a href="/partner" className="btn-gold" style={{ display: 'inline-block', textDecoration: 'none' }}>Go to Login</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Invite-token registration — takes priority over everything else ───────
  // Reached via marqlandstudios.com/partner?token=... from the supplier
  // invite email. Shows a minimal "complete your registration" form instead
  // of the marketing page.
  if (inviteToken) {
    return (
      <div className="pp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <style>{MARQLAND_THEME_CSS}</style>
        <style>{PARTNER_PAGE_CSS}</style>
        <FontLoader />
        <div className="pp-gold-border" style={{ background: C.surfaceDeep, width: '100%', maxWidth: 440, padding: '44px 40px' }}>
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
                Your account is pending approval from our team. Once you're enabled as a partner,
                save <strong style={{ color: C.onBackground }}>marqlandstudios.com/partner</strong> and log in there with your new password.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Logged-in supplier sees the portal instead of the marketing page ──────
  if (supplierSession) {
    return <SupplierPortal session={supplierSession} onLogout={logout} />;
  }

  const BENEFITS = [
    { icon: ShieldCheck, title: 'Exclusive B2B Reach', text: 'Put your products directly in front of verified corporate clients and referral networks who value premium craftsmanship.' },
    { icon: Share2, title: 'Streamlined Coordination', text: 'Our automated vendor ecosystem ensures smooth communication, seamless order tracking, and efficient collaboration.' },
    { icon: TrendingUp, title: 'Shared Growth', text: 'We actively market and feature outstanding catalog additions, driving new business inquiries straight to you.' },
  ];

  return (
    <div className="pp-root">
      <style>{MARQLAND_THEME_CSS}</style>
      <style>{PARTNER_PAGE_CSS}</style>
      <FontLoader />

      {/* ── Nav — same classes/fonts/behavior as HomePage.js ── */}
      <nav className="nav" style={{ background: scrolled ? 'rgba(14,21,32,0.94)' : 'rgba(14,21,32,0.52)', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent' }}>
        <Link to="/" className="nav-logo sf" style={{ textDecoration: 'none' }}>Marqland Studios</Link>
        <div className="nav-links">
          <button className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowLogin(true)}>
            <LogIn size={13} /> Login
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: 68 }}>
        {/* ── Hero ── */}
        <section className="grain" style={{ minHeight: '100vh', background: 'linear-gradient(155deg,#0c1220 0%,#111a28 60%,#0e1824 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '18%', right: '6%',  width: 380, height: 380, border: '1px solid rgba(184,151,90,0.05)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: '15%', right: '3%',  width: 500, height: 500, border: '1px solid rgba(184,151,90,0.03)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom:'12%', left: '4%', width: 220, height: 220, border: '1px solid rgba(255,255,255,0.025)', borderRadius: '50%' }} />
              </div>
              <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: 860 }}>
                <div className="h1" style={{ marginBottom: 26 }}><span className="pill">Elite Partnership Program</span></div>
                <h1 className="h2 sf" style={{ fontSize: 'clamp(46px,8vw,80px)', color: 'white', fontWeight: 300, lineHeight: 1.05, marginBottom: 0 }}>Grow Your Business with</h1>
                <h1 className="h3 sf" style={{ fontSize: 'clamp(46px,8vw,90px)', color: '#b8975a', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.05, marginBottom: 22 }}>Marqland Studios.</h1>
                <p className="h4 sf" style={{ color: 'rgba(255,255,255,0.34)', fontSize: 'clamp(14px,2vw,18px)', fontStyle: 'italic', fontWeight: 300, maxWidth: 520, margin: '0 auto 44px', lineHeight: 1.75 }}>
                At Marqland Studios, we believe our success is built on the strength of our partnerships.
                We don't just showcase products — we tell stories that inspire confidence and build lasting
                corporate relationships. By sharing your finest collections on our platform, you gain direct
                visibility with premium clients and businesses looking for exceptional quality.
                </p>
              </div>
              <div>
                <a href="#onboarding-form" onClick={scrollToForm} className="btn-gold" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Register As Supplier
                </a>
              </div>
              <div style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 1, height: 42, background: 'linear-gradient(to bottom, rgba(184,151,90,0.45), transparent)' }} />
                <span style={{ color: 'rgba(255,255,255,0.16)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif' }}>Scroll</span>
              </div>
        </section>

        {/* ── Benefits ── */}
        <section className="grain" style={{ padding: '80px 24px', background: C.surfaceContainerLowest }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 className="sf" style={{ fontSize: 32, fontWeight: 500, color: C.primary, marginBottom: 16 }}>
                Why Upload Your Products to Marqland?
              </h2>
              <div style={{ width: 96, height: 1, background: C.goldMuted, margin: '0 auto' }} />
            </div>
            <div className="pp-benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="pp-gold-border pp-benefit-card">
                  <div className="pp-icon-circle"><Icon size={26} /></div>
                  <h3 className="sf" style={{ fontSize: 20, fontWeight: 600, color: C.primary, letterSpacing: '0.03em' }}>{title}</h3>
                  <p style={{ color: C.onSurfaceVariant, lineHeight: 1.7, fontSize: 15 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Onboarding form ── */}
        <section id="onboarding-form" style={{ padding: '80px 24px', position: 'relative' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 64 }}>

              {/* Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 24 }}>
                <div>
                  <h2 className="sf" style={{ fontSize: 32, fontWeight: 500, color: C.primary, marginBottom: 16 }}>
                    Ready to Showcase Your Collection?
                  </h2>
                  <p style={{ fontSize: 17, color: C.onSurfaceVariant, lineHeight: 1.7 }}>
                    Let's collaborate to elevate your brand and expand your market reach. Complete the
                    initial registration to join our verified supplier pool.
                  </p>
                </div>

                <div style={{ background: C.surfaceDeep, padding: 28, borderLeft: `4px solid ${C.primary}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.primary }}>
                    <Lightbulb size={18} />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Pro-Tip for Maximum Impact</span>
                  </div>
                  <p style={{ color: C.onBackground, lineHeight: 1.7, fontStyle: 'italic', fontSize: 14 }}>
                    To ensure your products stand out to our exclusive network, please describe your
                    production capacity and design philosophy clearly — high-quality presentation is the
                    first step to capturing high-value business leads.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 8 }}>
                  {[
                    { n: 1, label: 'Company Profile', active: true },
                    { n: 2, label: 'Catalog Submission', active: false },
                    { n: 3, label: 'Verification & Launch', active: false },
                  ].map(step => (
                    <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: step.active ? 1 : 0.4 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', border: `2px solid ${step.active ? C.primary : C.surfaceBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                        color: step.active ? C.primary : C.onBackground, flexShrink: 0,
                      }} className="sf">
                        {step.n}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: step.active ? C.primary : C.onBackground }}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div>
                <div className="pp-gold-border" style={{ background: C.surfaceDeep, padding: 48, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                  {submitted ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(230,193,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Check size={28} color={C.primary} />
                      </div>
                      <h3 className="sf" style={{ fontSize: 22, color: C.primary, marginBottom: 8 }}>Application Received</h3>
                      <p style={{ color: C.onSurfaceVariant, fontSize: 14 }}>
                        Thank you for your interest. A partnership executive will review your submission
                        within 48 business hours.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submitLead} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <label className="lbl">Legal Business Name</label>
                          <input className="fi" placeholder="e.g. Artisanal Collections Ltd." required
                            value={lead.companyName} onChange={e => setLead({ ...lead, companyName: sanitizeName(e.target.value) })} />
                        </div>
                        <div>
                          <label className="lbl">Company Website</label>
                          <input className="fi" type="text" placeholder="example.com"
                            value={lead.website}
                            onChange={e => setLead({ ...lead, website: e.target.value.replace(/^https?:\/\//i, '') })} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <label className="lbl">Primary Contact Name</label>
                          <input className="fi" placeholder="Full name" required
                            value={lead.contactName} onChange={e => setLead({ ...lead, contactName: sanitizeName(e.target.value) })} />
                        </div>
                        <div>
                          <label className="lbl">Business Email</label>
                          <input className="fi" type="email" placeholder="partner@company.com" required
                            value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <label className="lbl">Phone Number</label>
                          <input className="fi" type="tel" placeholder="+91…"
                            value={lead.phone} onChange={e => setLead({ ...lead, phone: sanitizePhone(e.target.value) })} />
                        </div>
                        <div />
                      </div>

                      <div>
                        <label className="lbl">Tell us about your collection</label>
                        <textarea className="fi" rows={4} style={{ resize: 'none' }}
                          placeholder="Briefly describe your production capacity and design philosophy…"
                          value={lead.message} onChange={e => setLead({ ...lead, message: sanitizeMessage(e.target.value) })} />
                      </div>

                      {/* Portfolio upload — uploaded for real, see submitLead */}
                      <label style={{
                        border: `2px dashed ${fileError ? '#ffb4ab' : C.surfaceBorder}`, padding: 40, textAlign: 'center',
                        cursor: 'pointer', display: 'block',
                      }}>
                        <UploadCloud size={36} color={C.primary} style={{ marginBottom: 12 }} />
                        <p style={{ fontSize: 14, color: C.onBackground, marginBottom: 4 }}>
                          {portfolioFile ? portfolioFile.name : 'Upload Catalog or Portfolio (PDF/ZIP)'}
                        </p>
                        <p style={{ fontSize: 12, color: C.onSurfaceVariant }}>Maximum file size 50MB. High resolution preferred.</p>
                        <input type="file" accept=".pdf,.zip" hidden onChange={e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          if (f.size > MAX_PORTFOLIO_BYTES) {
                            setFileError(`That file is ${(f.size / (1024 * 1024)).toFixed(1)}MB — the limit is 50MB. Please upload a smaller file.`);
                            e.target.value = '';
                            return;
                          }
                          setFileError('');
                          setPortfolioFile(f);
                        }} />
                      </label>
                      {fileError && <p style={{ color: '#ffb4ab', fontSize: 12, marginTop: -8 }}>{fileError}</p>}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="checkbox" id="terms" checked={agreedToTerms}
                          onChange={e => setAgreedToTerms(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} />
                        <label htmlFor="terms" style={{ fontSize: 12, color: C.onSurfaceVariant }}>
                          I agree to the Marqland Studios Supplier Code of Conduct and Privacy Policy.
                        </label>
                      </div>

                      {error && <p style={{ color: '#ffb4ab', fontSize: 13 }}>{error}</p>}

                      <button type="submit" disabled={submitting} className="btn-gold"
                        style={{ width: '100%', padding: '18px 0', fontSize: 15, justifyContent: 'center', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {submitting ? 'Submitting…' : 'Submit Application'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: '#0c1320', padding: '68px 48px 36px' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 36, marginBottom: 52, paddingBottom: 44, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 className="sf" style={{ fontSize: 24, color: 'white', fontWeight: 300, margin: '0 0 12px' }}>Marqland Studios.</h3>
              <p style={{ color: 'rgba(255,255,255,0.26)', fontSize: 13, lineHeight: 1.75, maxWidth: 260, margin: '0 0 20px', fontWeight: 300 }}>Premium brand experiences through curated gifting and bespoke event orchestration.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="https://instagram.com/marqland" target="_blank" rel="noreferrer" className="fl"><InstagramIcon size={14} /></a>
                <a href="mailto:info@marqland.com" className="fl"><Mail size={14} /></a>
                <a href="https://marqlandstudios.com"    target="_blank" rel="noreferrer" className="fl"><Link2 size={14} /></a>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', margin: 0 }}>© {new Date().getFullYear()} Marqland Studios</p>
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, letterSpacing: '0.2em',  textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', margin: 0 }}>Bespoke Orchestration</p>
          </div>
        </div>
      </footer>

      {/* ── Login popup ── */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,10,18,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="pp-gold-border" style={{ background: C.surfaceDeep, width: '100%', maxWidth: 420, padding: '44px 40px', position: 'relative' }}>
            <button onClick={() => { setShowLogin(false); setShowForgotPassword(false); setForgotSent(false); }}
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'rgba(226,226,226,0.4)', cursor: 'pointer' }}><X size={18} /></button>

            {!showForgotPassword ? (
              <>
                <h2 className="sf" style={{ fontSize: 26, color: C.primary, fontWeight: 500, marginBottom: 24 }}>Partner Login</h2>
                <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <input className="fi" required type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
                  <div style={{ position: 'relative' }}>
                    <input className="fi" required type={showLoginPassword ? 'text' : 'password'} placeholder="Password" value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowLoginPassword(v => !v)}
                      style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant }}>
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                <h2 className="sf" style={{ fontSize: 24, color: C.primary, fontWeight: 500, marginBottom: 16 }}>Reset Password</h2>
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
      )}
    </div>
  );
};

export default PartnerPage;