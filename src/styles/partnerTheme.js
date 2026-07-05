/**
 * src/styles/partnerTheme.js
 *
 * Color/typography tokens + CSS matching the supplier-onboarding mockup
 * (dark slate background, gold accent, EB Garamond + Plus Jakarta Sans).
 * This is a distinct palette from marqlandTheme.js (HomePage's navy/gold) —
 * used only by the Partner page family so the marketing site itself is
 * untouched.
 */
export const PARTNER_COLORS = {
  background: '#121414',
  surface: '#121414',
  surfaceDeep: '#161E2B',
  surfaceContainerLowest: '#0c0f0f',
  surfaceBorder: 'rgba(184, 151, 90, 0.2)',
  onBackground: '#e2e2e2',
  onSurfaceVariant: '#d1c5b5',
  primary: '#e6c180',
  onPrimary: '#412d00',
  surfaceTint: '#e6c180',
  goldMuted: '#8E7343',
};

export const PARTNER_THEME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  .pp-root {
    background-color: ${PARTNER_COLORS.background};
    color: ${PARTNER_COLORS.onBackground};
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .pp-serif { font-family: 'EB Garamond', Georgia, serif; }

  .pp-nav {
    position: fixed; top: 0; left: 0; width: 100%; z-index: 50;
    display: flex; justify-content: space-between; align-items: center;
    height: 80px; padding: 0 24px;
    background: rgba(18,20,20,0.8); backdrop-filter: blur(12px);
    border-bottom: 1px solid ${PARTNER_COLORS.surfaceBorder};
  }
  .pp-nav-inner { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
  .pp-nav-link { color: ${PARTNER_COLORS.onSurfaceVariant}; text-decoration: none; font-size: 14px; letter-spacing: 0.08em; font-weight: 600; transition: color 0.2s; }
  .pp-nav-link:hover { color: ${PARTNER_COLORS.primary}; }

  .pp-btn-gold {
    background: ${PARTNER_COLORS.primary}; color: ${PARTNER_COLORS.onPrimary};
    border: none; padding: 12px 28px; font-size: 14px; font-weight: 600;
    letter-spacing: 0.04em; cursor: pointer; transition: opacity 0.25s, transform 0.15s;
  }
  .pp-btn-gold:hover { opacity: 0.9; }
  .pp-btn-gold:active { transform: scale(0.97); }

  .pp-gold-border {
    border: 1px solid transparent;
    background: linear-gradient(${PARTNER_COLORS.surfaceDeep}, ${PARTNER_COLORS.surfaceDeep}) padding-box,
                linear-gradient(to bottom right, rgba(230,193,128,0.4), rgba(230,193,128,0.05)) border-box;
  }

  .pp-input {
    width: 100%; background: ${PARTNER_COLORS.background};
    border: 1px solid ${PARTNER_COLORS.surfaceBorder}; color: ${PARTNER_COLORS.onBackground};
    padding: 12px 16px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .pp-input::placeholder { color: rgba(226,226,226,0.35); }
  .pp-input:focus { border-color: ${PARTNER_COLORS.primary}; box-shadow: 0 0 0 1px rgba(230,193,128,0.2); }
  .pp-label {
    display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${PARTNER_COLORS.goldMuted}; margin-bottom: 8px;
  }

  .pp-benefit-card {
    padding: 40px; display: flex; flex-direction: column; gap: 20px;
    transition: transform 0.3s;
  }
  .pp-benefit-card:hover { transform: translateY(-6px); }
  .pp-icon-circle {
    width: 56px; height: 56px; border-radius: 999px; border: 1px solid ${PARTNER_COLORS.surfaceBorder};
    display: flex; align-items: center; justify-content: center; color: ${PARTNER_COLORS.primary};
  }

  @media (max-width: 900px) {
    .pp-hero-grid { grid-template-columns: 1fr !important; }
    .pp-benefits-grid { grid-template-columns: 1fr !important; }
    .pp-form-grid { grid-template-columns: 1fr !important; }
    .pp-nav-links { display: none !important; }
  }
`;