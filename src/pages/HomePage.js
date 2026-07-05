import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MARQLAND_THEME_CSS as CSS } from '../styles/marqlandTheme';
import {
  sanitizeName, sanitizePhone, sanitizeMessage,
  isValidName, isValidEmail, isValidPhone, isValidMessage, GENERIC_INVALID_MESSAGE,
} from '../utils/inputValidation'; // NEW — security hardening
import {
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
  Link2,
  Mail,
  X,
  ChevronLeft,
  ShoppingBag,
  Palette,
  CheckCircle,
  Truck,
  ArrowUpRight,
  Quote,
} from 'lucide-react';

const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const API_BASE   = process.env.REACT_APP_API_URL    || '';

// Bento span class per card index
const getBentoClass = (index) => {
  const p = [
    'ms-bento-2c2r', // 0: big feature card
    '',              // 1: 1x1
    '',              // 2: 1x1
    'ms-bento-2r',   // 3: tall
    'ms-bento-2c',   // 4: wide
    '',              // 5: 1x1
    '',              // 6: 1x1
  ];
  return p[index % p.length];
};

const useInView = (threshold = 0.12) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const FadeIn = ({ children, delay = 0, className = '', style = {} }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

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

// ── Testimonials Page ─────────────────────────────────────────────────────────
const TestimonialsPage = ({ data, onBack, onInquiry }) => {
  const cols = [[], [], []];
  (data.testimonials || []).forEach((t, i) => cols[i % 3].push({ ...t, _i: i }));

  return (
    <div style={{ paddingTop: 68 }}>
      {/* Hero strip */}
      <div className="grain" style={{ background: 'var(--navy)', padding: '72px 48px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '5%', width: 400, height: 400, border: '1px solid rgba(184,151,90,0.05)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '-25%', right: '2%', width: 560, height: 560, border: '1px solid rgba(184,151,90,0.03)', borderRadius: '50%' }} />
        </div>
        <div style={{ maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 3 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', marginBottom: 28, padding: 0, transition: 'color 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            <ArrowLeft size={12} /> Back to Home
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="lbl" style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Client Voices</div>
              <h1 className="sf" style={{ fontSize: 'clamp(40px,6vw,80px)', color: 'white', fontWeight: 300, lineHeight: 1.05 }}>
                Kind <em style={{ color: '#b8975a' }}>Words.</em>
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8 }}>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 300, maxWidth: 280, lineHeight: 1.6, margin: 0 }}>
                What our clients say about working with Marqland Studios.
              </p>
            </div>
          </div>
          {/* count pill */}
          {data.testimonials?.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <span className="pill">{data.testimonials.length} {data.testimonials.length === 1 ? 'Review' : 'Reviews'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Masonry grid */}
      <div className="sp" style={{ maxWidth: 1600, margin: '0 auto' }}>
        {data.testimonials?.length > 0 ? (
          <div className="t-masonry">
            {/* Build columns manually for true masonry — each item breaks naturally */}
            {data.testimonials.map((t, i) => (
              <FadeIn key={i} delay={Math.min(i * 0.05, 0.4)} className="t-masonry-item">
                <div className="t-card">
                  <Quote size={22} color="rgba(184,151,90,0.18)" strokeWidth={1} style={{ marginBottom: 16 }} />
                  <p className="sf" style={{ fontSize: 16, color: '#2a2a2a', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, marginBottom: 24 }}>
                    "{t.feedback || t.text || t.content || ''}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 18, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontSize: 11, fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>{(t.author || 'C')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)' }}>{t.author || 'Client'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.role || t.company || ''}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>No testimonials yet</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="grain sp" style={{ background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 3 }}>
          <FadeIn>
            <span className="pill" style={{ marginBottom: 26, display: 'inline-block' }}>Start a Conversation</span>
            <h2 className="sf" style={{ fontSize: 'clamp(32px,5vw,60px)', color: 'white', fontWeight: 300, lineHeight: 1.1, marginBottom: 4 }}>
              The rumor mill was right —
            </h2>
            <h2 className="sf" style={{ fontSize: 'clamp(32px,5vw,60px)', color: '#b8975a', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 22 }}>
              welcome.
            </h2>
            <p className="sf" style={{ color: 'rgba(255,255,255,0.26)', fontStyle: 'italic', fontSize: 15, marginBottom: 40, lineHeight: 1.75 }}>
              Drop your details. We'll orchestrate the rest.
            </p>
            <button onClick={onInquiry} className="btn-gold">Get in Touch <ArrowUpRight size={13} /></button>
          </FadeIn>
        </div>
      </section>
    </div>
  );
};

const HomePage = () => {
  const [data, setData]           = useState({ categories: [], testimonials: [] });
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [form, setForm]           = useState({ name: '', company: '', email: '', phone: '', hearAbout: '' });
  const [formError, setFormError] = useState(''); // NEW — security hardening validation feedback
  const [lb, setLb]               = useState({ open: false, index: 0, images: [] });
  const [pageView, setPageView]   = useState('home'); // 'home' | 'testimonials'

  useEffect(() => {
    axios.get(`${API_BASE}/api/public-site/store`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (id === 'testimonials') {
      setSelectedCat(null); setSelectedSub(null);
      setPageView('testimonials');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // switching back to home from testimonials page
    if (pageView === 'testimonials') {
      setPageView('home');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 130);
      return;
    }
    if (selectedCat) {
      setSelectedCat(null); setSelectedSub(null);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 130);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // One press always = back to catalogue.
  // When a sub was AUTO-selected (because there are no generic images),
  // there is nothing to show at sub=null, so skip straight to catalogue.
  const handleBack = () => {
    if (selectedSub) {
      const hasGeneric = (selectedCat?.images || []).filter(i => !i.isCover).length > 0;
      if (hasGeneric) {
        setSelectedSub(null);          // category has an "All" tab — go there
      } else {
        setSelectedSub(null);
        setSelectedCat(null);          // no generic images — skip to catalogue
      }
    } else {
      setSelectedCat(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectCat = (cat) => {
    setSelectedCat(cat);
    const nonCover = (cat.images || []).filter(i => !i.isCover);
    setSelectedSub(nonCover.length === 0 && cat.subcategories?.length > 0 ? cat.subcategories[0] : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getImgs = () => {
    if (!selectedCat) return [];
    if (selectedSub && selectedSub.id !== 'generic') return selectedSub.images || [];
    return (selectedCat.images || []).filter(i => !i.isCover);
  };
  const imgs = getImgs();

  const openLb  = (i) => { setLb({ open: true, index: i, images: imgs }); document.body.style.overflow = 'hidden'; };
  const closeLb = ()  => { setLb({ open: false, index: 0, images: [] }); document.body.style.overflow = ''; };
  const nextLb  = (e) => { e.stopPropagation(); setLb(p => ({ ...p, index: (p.index + 1) % p.images.length })); };
  const prevLb  = (e) => { e.stopPropagation(); setLb(p => ({ ...p, index: (p.index - 1 + p.images.length) % p.images.length })); };

  const submitForm = async (e) => {
    e.preventDefault();
    // NEW — security hardening: re-check everything before submit, even
    // though the fields already strip disallowed characters as you type.
    if (!isValidName(form.name) || !isValidName(form.company)) {
      setFormError(GENERIC_INVALID_MESSAGE);
      return;
    }
    if (!isValidEmail(form.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!isValidPhone(form.phone)) {
      setFormError('Phone can only contain digits, spaces, +, -, and parentheses.');
      return;
    }
    if (!isValidMessage(form.hearAbout)) {
      setFormError(GENERIC_INVALID_MESSAGE);
      return;
    }
    setFormError('');
    try {
      await axios.post(`${API_BASE}/api/public-site/inquiry`, form);
      setForm({ name: '', company: '', email: '', phone: '', hearAbout: '' });
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2200);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  const hasGeneric = (selectedCat?.images || []).filter(i => !i.isCover).length > 0;

  // CSS now imported from shared theme file — see import at top of file

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e1520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{CSS}</style>
        <span className="sf" style={{ color: '#b8975a', fontSize: 13, letterSpacing: '0.35em', opacity: 0.5 }}>LOADING</span>
      </div>
    );
  }

  return (
    <div className="ms" style={{ minHeight: '100vh' }}>
      <style>{CSS}</style>
      <FontLoader />

      {/* Lightbox */}
      {lb.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,8,14,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeLb}>
          <button onClick={closeLb} style={{ position: 'absolute', top: 26, right: 26, background: 'none', border: 'none', color: 'rgba(255,255,255,0.32)', cursor: 'pointer' }}><X size={24} /></button>
          <button onClick={prevLb}  style={{ position: 'absolute', left: 12, padding: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer' }}><ChevronLeft size={42} strokeWidth={1} /></button>
          <div style={{ maxWidth: '86vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={lb.images[lb.index]?.url} alt="" style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain' }} />
            <p style={{ marginTop: 18, color: 'rgba(255,255,255,0.18)', fontSize: 10, letterSpacing: '0.3em', fontFamily: 'Jost, sans-serif' }}>{lb.index + 1} / {lb.images.length}</p>
          </div>
          <button onClick={nextLb}  style={{ position: 'absolute', right: 12, padding: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer' }}><ChevronRight size={42} strokeWidth={1} /></button>
        </div>
      )}

      {/* Inquiry Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'rgba(6,10,18,0.75)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--navy)', width: '100%', maxWidth: 496, padding: '50px 44px', position: 'relative' }}>
            <button onClick={() => { setShowModal(false); setShowSuccess(false); }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}><X size={18} /></button>
              <span className="pill" style={{ marginBottom: 26, display: 'inline-block' }}>Inquiry</span>
                <h2 className="sf" style={{ fontSize: 38, color: 'white', fontWeight: 300, lineHeight: 1.1, marginBottom: 8 }}>Let's create<br /><em>something remarkable.</em></h2>
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, letterSpacing: '0.05em', marginBottom: 36 }}>Our team responds within 24 hours.</p>
                <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input className="fi" type="text"  required placeholder="Your Name"    value={form.name}    onChange={e => setForm({ ...form, name:    sanitizeName(e.target.value) })} />
                  <input className="fi" type="text"  required placeholder="Company"      value={form.company} onChange={e => setForm({ ...form, company: sanitizeName(e.target.value) })} />
                  <input className="fi" type="email" required placeholder="Email"        value={form.email}   onChange={e => setForm({ ...form, email:   e.target.value })} />
                  <input className="fi" type="tel"   required placeholder="Phone"        value={form.phone}   onChange={e => setForm({ ...form, phone:   sanitizePhone(e.target.value) })} />
                  <textarea className="fi" rows={3} placeholder="How did you hear about us?" value={form.hearAbout} onChange={e => setForm({ ...form, hearAbout: sanitizeMessage(e.target.value) })} style={{ resize: 'none', lineHeight: 1.6 }} />
                  {formError && <p style={{ color: '#e08585', fontSize: 12 }}>{formError}</p>}
                  <button type="submit" className="btn-gold" style={{ marginTop: 10, justifyContent: 'center' }}>Send Inquiry <ArrowUpRight size={13} /></button>
                </form>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="nav" style={{ background: scrolled ? 'rgba(14,21,32,0.94)' : 'rgba(14,21,32,0.52)', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent' }}>
        <button className="nav-logo sf" onClick={() => { setSelectedCat(null); setSelectedSub(null); setPageView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Marqland Studios</button>
        <div className="nav-links">
          {[['Catalogue','catalogue'],['Process','process'],['Testimonials','testimonials']].map(([l,id]) => (
            <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{l}</button>
          ))}
          {/* NEW — Partner tab: registration + login entry point for suppliers */}
          <a href="/partner" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ textDecoration: 'none' }}>Partner</a>
          <button className="btn-gold" style={{ padding: '10px 22px' }} onClick={() => setShowModal(true)}>Get in Touch</button>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)}><span /><span /><span /></button>
      </nav>

      {/* Mobile menu */}
      <div className={`mob-menu ${menuOpen ? 'open' : ''}`}>
        {[['Catalogue','catalogue'],['Process','process'],['Testimonials','testimonials']].map(([l,id]) => (
          <button key={id} className="mob-link" onClick={() => scrollTo(id)}>{l}</button>
        ))}
        <button className="btn-gold" style={{ marginTop: 8 }} onClick={() => { setShowModal(true); setMenuOpen(false); }}>Get in Touch</button>
      </div>

      <main>
        {pageView === 'testimonials' ? (
          <TestimonialsPage
            data={data}
            onBack={() => { setPageView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onInquiry={() => setShowModal(true)}
          />
        ) : !selectedCat ? (
          <>
            {/* Hero */}
            <section className="grain" style={{ minHeight: '100vh', background: 'linear-gradient(155deg,#0c1220 0%,#111a28 60%,#0e1824 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '18%', right: '6%',  width: 380, height: 380, border: '1px solid rgba(184,151,90,0.05)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: '15%', right: '3%',  width: 500, height: 500, border: '1px solid rgba(184,151,90,0.03)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom:'12%', left: '4%', width: 220, height: 220, border: '1px solid rgba(255,255,255,0.025)', borderRadius: '50%' }} />
              </div>
              <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: 860 }}>
                <div className="h1" style={{ marginBottom: 26 }}><span className="pill">Premium Corporate Gifting</span></div>
                <h1 className="h2 sf" style={{ fontSize: 'clamp(46px,8vw,90px)', color: 'white', fontWeight: 300, lineHeight: 1.05, marginBottom: 0 }}>Gifts That</h1>
                <h1 className="h3 sf" style={{ fontSize: 'clamp(46px,8vw,90px)', color: '#b8975a', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.05, marginBottom: 22 }}>Speak Volumes.</h1>
                <p className="h4 sf" style={{ color: 'rgba(255,255,255,0.34)', fontSize: 'clamp(14px,2vw,18px)', fontStyle: 'italic', fontWeight: 300, maxWidth: 520, margin: '0 auto 44px', lineHeight: 1.75 }}>
                  From onboarding kits to grand celebrations — bespoke gifting experiences that elevate your brand.
                </p>
                <div className="h5 hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => scrollTo('catalogue')} className="btn-gold">Explore Catalogue <ChevronRight size={13} /></button>
                  <button onClick={() => setShowModal(true)} className="btn-outline">Get in Touch</button>
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 1, height: 42, background: 'linear-gradient(to bottom, rgba(184,151,90,0.45), transparent)' }} />
                <span style={{ color: 'rgba(255,255,255,0.16)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif' }}>Scroll</span>
              </div>
            </section>

            {/* Marquee */}
            <div style={{ background: '#b8975a', padding: '12px 0', overflow: 'hidden' }}>
              <div className="mq-track">
                {Array(8).fill(['Bespoke Gifting','·','Corporate Kits','·','Brand Experiences','·','Event Curation','·']).flat().map((w,i) => (
                  <span key={i} style={{ color: 'rgba(14,21,32,0.62)', fontSize: 10, fontWeight: 400, letterSpacing: '0.25em', textTransform: 'uppercase', marginRight: 26, fontFamily: 'Jost, sans-serif' }}>{w}</span>
                ))}
              </div>
            </div>

            {/* Catalogue bento */}
            <section id="catalogue" className="sp" style={{ maxWidth: 1600, margin: '0 auto' }}>
              <FadeIn>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div className="lbl" style={{ marginBottom: 10 }}>Our Collections</div>
                    <h2 className="sf" style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 300, lineHeight: 1.1 }}>Curated for<br /><em>Every Occasion</em></h2>
                  </div>
                  <div className="cat-hdr-desc" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="divider" />
                    <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 300, maxWidth: 250, lineHeight: 1.6, margin: 0 }}>Each collection reflects your brand's character.</p>
                  </div>
                </div>
              </FadeIn>
              <div className="bento">
                {data.categories.map((cat, idx) => {
                  const cover = cat.images?.find(i => i.isCover) || cat.images?.[0];
                  return (
                    <FadeIn key={cat.id} delay={idx * 0.06} className={getBentoClass(idx)} style={{ height: '100%' }}>
                      <div className="cat-card" onClick={() => selectCat(cat)}>
                        {cover
                          ? <img src={cover.url} alt={cat.name} />
                          : <div style={{ width: '100%', height: '100%', background: '#1a2332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}><ImageIcon size={34} strokeWidth={1} /></div>
                        }
                        <div className="cat-overlay" />
                        <div className="cat-lbl">
                          <p className="lbl" style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>Collection</p>
                          <h3 className="sf" style={{ fontSize: 22, color: 'white', fontWeight: 300, margin: '0 0 8px', lineHeight: 1.2 }}>{cat.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b8975a' }}>
                            <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif' }}>Explore</span>
                            <ChevronRight size={12} />
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </section>

            {/* Process */}
            <section id="process" className="grain sp" style={{ background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 3 }}>
                <FadeIn>
                  <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <div className="lbl" style={{ color: 'rgba(255,255,255,0.26)', marginBottom: 10 }}>Our Process</div>
                    <h2 className="sf" style={{ fontSize: 'clamp(30px,4vw,50px)', color: 'white', fontWeight: 300, lineHeight: 1.1, marginBottom: 12 }}>Seamless from <em style={{ color: '#b8975a' }}>Start to Finish</em></h2>
                    <p className="sf" style={{ color: 'rgba(255,255,255,0.26)', fontStyle: 'italic', fontSize: 15, maxWidth: 360, margin: '0 auto' }}>Four elegant steps to bring your vision to life.</p>
                  </div>
                </FadeIn>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
                  {[
                    { Icon: ShoppingBag, title: 'Select Product', step: '01', desc: 'Choose from our curated, season-updated collections.' },
                    { Icon: Palette,     title: 'Request Mockup', step: '02', desc: 'We visualize your branding directly on the product.' },
                    { Icon: CheckCircle, title: 'Approve Design', step: '03', desc: 'Finalize specifications and production details.' },
                    { Icon: Truck,       title: 'Swift Delivery', step: '04', desc: 'Timely, careful logistics delivered nationwide.' },
                  ].map((s, i) => (
                    <FadeIn key={s.step} delay={i * 0.1}>
                      <div className="proc-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                          <div style={{ width: 44, height: 44, border: '1px solid rgba(184,151,90,0.17)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.Icon size={17} color="rgba(184,151,90,0.62)" strokeWidth={1.5} /></div>
                          <span className="sf" style={{ fontSize: 40, color: 'rgba(255,255,255,0.04)', fontWeight: 300, lineHeight: 1 }}>{s.step}</span>
                        </div>
                        <h3 className="sf" style={{ fontSize: 19, color: 'white', fontWeight: 300, marginBottom: 9 }}>{s.title}</h3>
                        <p style={{ color: 'rgba(255,255,255,0.24)', fontSize: 12, letterSpacing: '0.04em', lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="grain sp" style={{ background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 3 }}>
                <FadeIn>
                  <span className="pill" style={{ marginBottom: 26, display: 'inline-block' }}>Start a Conversation</span>
                  <h2 className="sf" style={{ fontSize: 'clamp(32px,5vw,60px)', color: 'white', fontWeight: 300, lineHeight: 1.1, marginBottom: 4 }}>The rumor mill was right —</h2>
                  <h2 className="sf" style={{ fontSize: 'clamp(32px,5vw,60px)', color: '#b8975a', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 22 }}>welcome.</h2>
                  <p className="sf" style={{ color: 'rgba(255,255,255,0.26)', fontStyle: 'italic', fontSize: 15, marginBottom: 40, lineHeight: 1.75 }}>Drop your details. We'll orchestrate the rest.</p>
                  <button onClick={() => setShowModal(true)} className="btn-gold">Get in Touch <ArrowUpRight size={13} /></button>
                </FadeIn>
              </div>
            </section>
          </>
        ) : (
          /* Category detail */
          <div>
            <div className="detail-head" style={{ padding: '100px 48px 0', maxWidth: 1600, margin: '0 auto' }}>
              <button
                onClick={handleBack}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', marginBottom: 22, padding: 0, transition: 'color 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                <ArrowLeft size={12} /> Back to Catalogue
              </button>
              <div className="lbl" style={{ marginBottom: 8 }}>{selectedCat.name}</div>
              <h2 className="sf" style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 300, lineHeight: 1.05, margin: '0 0 24px' }}>
                <em>{selectedSub?.name || selectedCat.name}</em>
              </h2>

              {selectedCat.subcategories?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                  {hasGeneric && (
                    <button className={`sub-btn ${!selectedSub ? 'sub-on' : 'sub-off'}`} onClick={() => setSelectedSub(null)}>All</button>
                  )}
                  {selectedCat.subcategories.map(sub => (
                    <button key={sub.id} className={`sub-btn ${selectedSub?.id === sub.id ? 'sub-on' : 'sub-off'}`} onClick={() => setSelectedSub(sub)}>
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Masonry grid — respects each image's natural aspect ratio */}
            <div className="detail-body" style={{ padding: '14px 48px 72px', maxWidth: 1600, margin: '0 auto' }}>
              <div className="masonry">
                {imgs.map((img, idx) => (
                  <div key={img.id} className="masonry-item" onClick={() => openLb(idx)}>
                    <img src={img.url} alt="" loading="lazy" />
                  </div>
                ))}
              </div>
              {imgs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--muted)' }}>
                  <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>No images in this collection yet</p>
                </div>
              )}
            </div>
          </div>
        ) /* end pageView ternary */}
      </main>

      {/* ── Success toast — auto-closes after 2.2s ── */}
      {showSuccess && (
        <div className="toast-wrap">
          <div className="toast-card">
            <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
            <h2 className="sf" style={{ fontSize: 32, color: 'white', fontWeight: 300, lineHeight: 1.1, marginBottom: 10 }}>
              Consider it <em style={{ color: '#b8975a' }}>done.</em>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, letterSpacing: '0.06em', lineHeight: 1.7 }}>
              Your inquiry landed safely.<br />We'll be in touch before you finish your next meeting.
            </p>
          </div>
        </div>
      )}

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
            <div>
              <p className="lbl" style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>Navigation</p>
              {['Catalogue','Process','Testimonials'].map(l => (
                <button key={l} className="fnb" onClick={() => {
                  if (l === 'Testimonials') { setPageView('testimonials'); window.scrollTo({ top:0, behavior:'smooth' }); }
                  else scrollTo(l.toLowerCase());
                }}>{l}</button>
              ))}
            </div>
            <div>
              <p className="lbl" style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>Contact</p>
              <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, fontWeight: 300, lineHeight: 1.8, margin: '0 0 18px' }}>info@marqland.com<br />Bengaluru, India</p>
              <button onClick={() => setShowModal(true)} className="btn-gold" style={{ padding: '10px 24px' }}>Send Inquiry</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', margin: 0 }}>© {new Date().getFullYear()} Marqland Studios</p>
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, letterSpacing: '0.2em',  textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', margin: 0 }}>Bespoke Orchestration</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;