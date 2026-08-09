/**
 * src/components/NavBar.js
 *
 * Single shared nav bar for every external portal page (PartnerPage,
 * SupplierPortal, JobWorkPage, JobWorkPortal, CourierPortal). Replaces the
 * near-identical <nav className="nav">...</nav> block that used to be
 * copy-pasted into each of those files.
 *
 * Auth affordance is driven entirely by the `authState` prop — a page never
 * shows both Login and Logout, only whichever applies to it:
 *   - authState="login"  -> renders a Login button, calls onLoginClick
 *   - authState="logout" -> renders a Log Out button, calls onLogout
 *   - authState="none"   -> renders just the logo, no auth button
 *
 * Mobile view: pass `mobileMenu` to collapse the auth action behind a
 * hamburger toggle below 640px, instead of always showing the pill button
 * inline. Currently used by CourierPortal.js, JobWorkPage.js, and
 * JobWorkPortal.js. PartnerPage.js / SupplierPortal.js leave it off (their
 * single button already fits fine at every width), so they render exactly
 * as before.
 *
 * Relies on the same .nav / .nav-logo / .nav-links / .btn-gold classes that
 * already come from MARQLAND_THEME_CSS (imported by every page that uses
 * this component) — this file only adds the extra CSS needed for the
 * mobile toggle + dropdown panel.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Menu, X } from 'lucide-react';

const NAVBAR_CSS = `
  .mq-navbar-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: none;
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff;
    cursor: pointer;
  }
  .mq-navbar-mobile-panel { display: none; }

  @media (max-width: 640px) {
    .mq-navbar[data-mobile-menu="true"] .mq-navbar-actions { display: none; }
    .mq-navbar[data-mobile-menu="true"] .mq-navbar-toggle { display: inline-flex; }
    .mq-navbar[data-mobile-menu="true"][data-open="true"] .mq-navbar-mobile-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(14,21,32,0.98);
      padding: 16px 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
    }
    .mq-navbar-mobile-panel .btn-gold { width: 100%; justify-content: center; }
  }
`;

const NavBar = ({
  authState = 'none',        // 'login' | 'logout' | 'none'
  onLoginClick,
  onLogout,
  loginLabel = 'Login',
  logoutLabel = 'Log Out',
  logoTo = '/',
  logoText = 'Marqland Studios',
  scrolled = true,           // solid background by default; PartnerPage passes its own scroll state
  mobileMenu = false,        // enable the hamburger/mobile-panel behavior
}) => {
  const [open, setOpen] = useState(false);

  const authButton = authState === 'login' ? (
    <button
      type="button"
      className="btn-gold"
      style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}
      onClick={() => { setOpen(false); onLoginClick && onLoginClick(); }}
    >
      <LogIn size={13} /> {loginLabel}
    </button>
  ) : authState === 'logout' ? (
    <button
      type="button"
      className="btn-gold"
      style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}
      onClick={() => { setOpen(false); onLogout && onLogout(); }}
    >
      <LogOut size={13} /> {logoutLabel}
    </button>
  ) : null;

  return (
    <nav
      className="nav mq-navbar"
      data-mobile-menu={mobileMenu ? 'true' : 'false'}
      data-open={open ? 'true' : 'false'}
      style={{
        position: 'relative', // anchors the mobile dropdown panel
        background: scrolled ? 'rgba(14,21,32,0.94)' : 'rgba(14,21,32,0.52)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
      }}
    >
      <style>{NAVBAR_CSS}</style>

      <Link to={logoTo} className="nav-logo sf" style={{ textDecoration: 'none' }}>
        {logoText}
      </Link>

      {authButton && (
        <div className="nav-links mq-navbar-actions">
          {authButton}
        </div>
      )}

      {mobileMenu && authButton && (
        <button
          type="button"
          className="mq-navbar-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {mobileMenu && authButton && (
        <div className="mq-navbar-mobile-panel">
          {authButton}
        </div>
      )}
    </nav>
  );
};

export default NavBar;