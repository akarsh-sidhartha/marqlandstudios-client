/**
 * src/styles/marqlandTheme.js
 *
 * Shared theme CSS extracted from HomePage.js's inline `CSS` template
 * literal — the exact same navy/gold rules, so HomePage's look is unchanged.
 * Import this anywhere that needs the `.fi` / `.btn-gold` / `.pill` / `.sf`
 * classes outside of HomePage itself (e.g. PartnerPage.js, SupplierPortal.js),
 * so there's one source of truth instead of a duplicated copy.
 *
 * Usage:
 *   import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
 *   ...
 *   <style>{MARQLAND_THEME_CSS}</style>
 */
export const MARQLAND_THEME_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --navy: #0e1520; --gold: #b8975a; --gold2: #d4b06a;
      --offwhite: #faf8f5; --text: #1a1a1a; --muted: #888;
    }
    .ms { font-family: 'Jost', sans-serif; background: var(--offwhite); color: var(--text); -webkit-font-smoothing: antialiased; }
    .sf { font-family: 'Cormorant Garamond', Georgia, serif; }

    /* grain */
    .grain { position: relative; }
    .grain::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2; border-radius: inherit;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      background-size: 200px;
    }

    /* nav */
    .nav {
      position: fixed; top: 0; width: 100%; z-index: 100; height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 48px;
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      transition: background 0.5s, border-color 0.5s;
    }
    .nav-logo { background: none; border: none; cursor: pointer; color: white; font-size: 20px; font-weight: 300; letter-spacing: 0.05em; font-family: 'Cormorant Garamond', Georgia, serif; }
    .nav-links { display: flex; align-items: center; gap: 36px; }
    .nav-link { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; font-family: 'Jost', sans-serif; transition: color 0.3s; }
    .nav-link:hover { color: white; }
    .hamburger { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    .hamburger span { display: block; width: 22px; height: 1px; background: white; }
    .mob-menu { display: none; position: fixed; inset: 0; top: 68px; background: rgba(10,15,24,0.97); z-index: 99; flex-direction: column; align-items: center; justify-content: center; gap: 30px; }
    .mob-menu.open { display: flex; }
    .mob-link { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.6); font-size: 13px; font-family: 'Jost', sans-serif; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; }

    /* buttons */
    .btn-gold { display: inline-flex; align-items: center; gap: 10px; background: var(--gold); color: var(--navy); padding: 16px 40px; border: none; cursor: pointer; font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; transition: background 0.3s, transform 0.3s; }
    .btn-gold:hover { background: var(--gold2); transform: translateY(-1px); }
    .btn-outline { display: inline-flex; align-items: center; gap: 10px; background: transparent; color: white; padding: 15px 40px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; transition: border-color 0.3s, background 0.3s; }
    .btn-outline:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }

    /* labels */
    .lbl { font-size: 9px; font-weight: 400; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); }
    .pill { display: inline-block; padding: 5px 18px; border: 1px solid rgba(184,151,90,0.4); font-size: 9px; font-weight: 400; letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); }
    .divider { width: 40px; height: 1px; background: var(--gold); }

    /* sub tabs */
    .sub-btn { padding: 7px 20px; cursor: pointer; font-family: 'Jost', sans-serif; font-size: 9px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid; transition: all 0.3s; }
    .sub-on  { background: var(--navy); color: white; border-color: var(--navy); }
    .sub-off { background: transparent; color: var(--muted); border-color: rgba(0,0,0,0.12); }
    .sub-off:hover { border-color: var(--navy); color: var(--navy); }

    /* category bento cards */
    .cat-card { overflow: hidden; cursor: pointer; position: relative; border-radius: 4px; height: 100%; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
    .cat-card:hover { transform: scale(1.01); }
    .cat-card > img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 1.2s cubic-bezier(0.16,1,0.3,1); }
    .cat-card:hover > img { transform: scale(1.07); }
    .cat-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,12,18,0.88) 0%, rgba(8,12,18,0.08) 55%, transparent 100%); }
    .cat-lbl { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 26px; z-index: 3; }

    /* bento grid */
    .bento { display: grid; grid-template-columns: repeat(3,1fr); grid-auto-rows: 340px; gap: 12px; }
    .ms-bento-2c   { grid-column: span 2; }
    .ms-bento-2r   { grid-row:    span 2; }
    .ms-bento-2c2r { grid-column: span 2; grid-row: span 2; }

    /* masonry (product images) */
    .masonry { columns: 4; column-gap: 10px; }
    .masonry-item { break-inside: avoid; margin-bottom: 10px; overflow: hidden; cursor: zoom-in; background: #ece9e4; }
    .masonry-item img { width: 100%; height: auto; display: block; transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
    .masonry-item:hover img { transform: scale(1.04); }

    /* process */
    .proc-card { border: 1px solid rgba(255,255,255,0.07); border-radius: 4px; padding: 40px; height: 100%; transition: border-color 0.4s, background 0.4s; }
    .proc-card:hover { border-color: rgba(184,151,90,0.28); background: rgba(184,151,90,0.04); }

    /* testimonials */
    .testi { border: 1px solid rgba(0,0,0,0.07); border-radius: 4px; padding: 44px; background: white; display: flex; flex-direction: column; height: 100%; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s; }
    .testi:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.07); }

    /* form */
    .fi { width: 100%; padding: 13px 0; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.14); color: white; font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 300; letter-spacing: 0.07em; outline: none; transition: border-color 0.3s; }
    .fi::placeholder { color: rgba(255,255,255,0.28); }
    .fi:focus { border-bottom-color: var(--gold); }

    /* hero animations */
    @keyframes up { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:translateY(0); } }
    .h1{animation:up 0.9s ease 0.3s both;} .h2{animation:up 0.9s ease 0.5s both;}
    .h3{animation:up 0.9s ease 0.7s both;} .h4{animation:up 0.9s ease 0.9s both;}
    .h5{animation:up 0.9s ease 1.1s both;}

    /* marquee */
    @keyframes mq { from{transform:translateX(0);} to{transform:translateX(-50%);} }
    .mq-track { display:flex; animation:mq 30s linear infinite; white-space:nowrap; }

    /* footer */
    .fl { display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.45); text-decoration:none; transition:background 0.3s,color 0.3s,border-color 0.3s; }
    .fl:hover { background:var(--gold); color:var(--navy); border-color:var(--gold); }
    .fnb { display:block; background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.38); font-size:13px; font-family:'Jost',sans-serif; font-weight:300; margin-bottom:11px; padding:0; transition:color 0.3s; text-align:left; }
    .fnb:hover { color:white; }

    /* section pads */
    .sp  { padding: 96px 48px; }
    .sps { padding: 64px 48px; }

    /* ═════════ RESPONSIVE ═════════ */
    @media (max-width: 1100px) { .masonry { columns: 3; } }
    @media (max-width: 900px) {
      .bento { grid-template-columns: repeat(2,1fr); grid-auto-rows: 260px; }
      .ms-bento-2c { grid-column: span 1; }
      .ms-bento-2c2r { grid-column: span 2; grid-row: span 1; }
      .masonry { columns: 2; }
      .sp  { padding: 64px 28px; }
      .sps { padding: 48px 28px; }
      .cat-hdr-desc { display: none; }
    }
    /* ── Testimonial masonry ── */
    .t-masonry { columns: 3; column-gap: 16px; }
    .t-masonry-item { break-inside: avoid; margin-bottom: 16px; }
    .t-card {
      background: white; border: 1px solid rgba(0,0,0,0.06);
      padding: 32px; cursor: default;
      transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s;
    }
    .t-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.07); }
    @media (max-width: 1024px) { .t-masonry { columns: 2; } }
    @media (max-width: 640px)  { .t-masonry { columns: 1; } }

    /* ── Success toast ── */
    @keyframes toastIn  { from { opacity:0; transform:translateY(24px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes toastOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(-16px) scale(0.96); } }
    .toast-wrap {
      position: fixed; inset: 0; z-index: 300;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
    }
    .toast-card {
      background: var(--navy); border: 1px solid rgba(184,151,90,0.35);
      padding: 44px 52px; text-align: center;
      animation: toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
      max-width: 420px; width: 90%;
    }
    .toast-card.leaving { animation: toastOut 0.35s ease forwards; }

    @media (max-width: 640px) {
      .nav { padding: 0 20px; }
      .nav-links { display: none; }
      .hamburger { display: flex; }
      .bento { grid-template-columns: 1fr; grid-auto-rows: 240px; }
      .ms-bento-2c   { grid-column: span 1; }
      .ms-bento-2r   { grid-row:    span 1; }
      .ms-bento-2c2r { grid-column: span 1; grid-row: span 1; }
      .masonry { columns: 1; }
      .sp  { padding: 48px 18px; }
      .sps { padding: 36px 18px; }
      .btn-gold, .btn-outline { padding: 14px 26px; }
      .proc-card { padding: 26px; }
      .testi { padding: 26px; }
      .hero-btns { flex-direction: column; align-items: center; }
      .detail-head { padding: 90px 18px 0 !important; }
      .detail-body { padding: 14px 18px 56px !important; }
    }
`;