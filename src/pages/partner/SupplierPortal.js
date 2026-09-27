/**
 * src/pages/partner/SupplierPortal.js
 *
 * Shown after a successful Partner login (role === 'supplier').
 *
 * Tab 1 — Add Products: one card per product (add as many as you like).
 *   Images upload the moment they're picked; video can be a YouTube link OR
 *   an uploaded file. Submitting creates each product immediately; uploaded
 *   videos then continue in the background task tray (chunked, resumable)
 *   and land on OneDrive (development|website › supplier folder › company › product).
 *
 * Tab 2 — My Products: paged list (status filter + search) of everything the
 *   partner has submitted. Every product can be edited — price, description,
 *   images, video — and every edit is reviewed by Marqland:
 *     pending / rejected → saved and (re)sent for review
 *     approved (live)    → saved as a change request. The live product (and
 *                          any client quote containing it) keeps the approved
 *                          version until Marqland approves the change.
 *     deleted            → read-only (removed by Marqland, reason shown)
 *
 * API: /api/v2/supplier/products (+ /v2/media/images, /v2/uploads, /v2/jobs),
 * authenticated with the Partner login's access token (src/lib/apiClient.js).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock, X, XCircle, Video, Pencil, Search, Loader2, PlayCircle, Globe,
} from 'lucide-react';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
import NavBar from '../../components/NavBar';
import TaskTray from '../../components/TaskTray';
import { sanitizeName, sanitizeMessage, isValidName, isValidMessage, GENERIC_INVALID_MESSAGE } from '../../utils/inputValidation';
import { setAuthToken, onAuthExpired } from '../../lib/apiClient';
import v2, { newIdempotencyKey } from '../../lib/apiV2';
import { startVideoUpload } from '../../lib/chunkedUpload';
import useStagedImages from '../../lib/useStagedImages';
import { ImageGrid, VideoPicker, videoError, videoPayload } from './ProductMediaFields';

const GOLD = '#d4b06a';
const RED = '#e08585';
const GREEN = '#7ec98a';
const MUTED = 'rgba(255,255,255,0.5)';
const PAGE_SIZE = 12;

const STATUS_STYLE = {
  pending:  { bg: '#3a3220', color: GOLD, icon: <Clock size={12} />, label: 'Pending review' },
  rejected: { bg: '#3a2020', color: RED, icon: <AlertTriangle size={12} />, label: 'Rejected' },
  approved: { bg: '#20351f', color: GREEN, icon: <CheckCircle2 size={12} />, label: 'Live' },
  deleted:  { bg: '#3a2020', color: RED, icon: <XCircle size={12} />, label: 'Removed' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, padding: '3px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 3, whiteSpace: 'nowrap' }}>
      {s.icon} {s.label}
    </span>
  );
};

const VideoBadge = ({ video }) => {
  if (video?.upload?.status === 'processing') return <span style={chip(GOLD)}><Loader2 size={10} className="animate-spin" /> Video processing</span>;
  if (video?.upload?.status === 'failed') return <span style={chip(RED)} title={video.upload.error}><AlertTriangle size={10} /> Video upload failed</span>;
  if (video?.source === 'upload') return <span style={chip(MUTED)}><Video size={10} /> Video</span>;
  if (video?.source === 'link') return <span style={chip(MUTED)}><PlayCircle size={10} /> YouTube</span>;
  return null;
};
const chip = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color, border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: 3 });

const label = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, display: 'block', marginBottom: 6 };

// Front-end mirror of the server rules (utils/inputValidation.js) — UX only.
const validateFields = ({ brand, name, description, sellingPrice }) => {
  const errs = [];
  if (!brand.trim()) errs.push('Brand is required');
  else if (!isValidName(brand)) errs.push(`Brand: ${GENERIC_INVALID_MESSAGE}`);
  if (!name.trim()) errs.push('Product name is required');
  else if (!isValidName(name)) errs.push(`Product name: ${GENERIC_INVALID_MESSAGE}`);
  if (!description.trim()) errs.push('Description is required');
  else if (!isValidMessage(description)) errs.push(`Description: ${GENERIC_INVALID_MESSAGE}`);
  if (!sellingPrice || Number(sellingPrice) <= 0) errs.push('Selling price is required');
  return errs;
};

/** Shared save flow for create + edit. Returns the saved product. */
const saveProduct = async ({ id, fields, imgs, video, idempotencyKey }) => {
  const list = await imgs.settle();
  if (!list.length) throw new Error('Add at least one image.');
  if (list.some((i) => i.status !== 'ready')) throw new Error('Some images failed to upload — retry or remove them.');

  const body = {
    brand: fields.brand.trim(),
    name: fields.name.trim(),
    description: fields.description,
    sellingPrice: Number(fields.sellingPrice),
    images: imgs.payload(list),
  };
  const vid = videoPayload(video, { isEdit: Boolean(id) });
  if (vid) body.video = vid;

  const { data } = id
    ? await v2.patch(`/v2/supplier/products/${id}`, body, { idempotencyKey })
    : await v2.post('/v2/supplier/products', body, { idempotencyKey });

  if (video.mode === 'upload' && video.file) {
    startVideoUpload({ file: video.file, purpose: 'supplier-product-video', targetId: data._id, title: `Video · ${data.name}` });
  }
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Add-product card (one per product being added)
// ─────────────────────────────────────────────────────────────────────────────
const NewProductCard = ({ index, canRemove, onRemove, onSaved, registerSubmit }) => {
  const [fields, setFields] = useState({ brand: '', name: '', description: '', sellingPrice: '' });
  const [video, setVideo] = useState({ mode: 'none', url: '', file: null });
  const imgs = useStagedImages();
  const [errors, setErrors] = useState([]);
  const [state, setState] = useState('idle'); // idle | saving | saved
  const key = useRef(newIdempotencyKey());

  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const errs = validateFields(fields);
    if (!imgs.images.length) errs.push('At least one image is required');
    const vErr = videoError(video);
    if (vErr) errs.push(vErr);
    setErrors(errs);
    if (errs.length) return { ok: false };
    setState('saving');
    try {
      const saved = await saveProduct({ fields, imgs, video, idempotencyKey: key.current });
      setState('saved');
      onSaved(saved);
      return { ok: true };
    } catch (err) {
      setState('idle');
      setErrors([err.message]);
      return { ok: false };
    }
  };

  // Parent's "Submit all" calls every card's submit().
  registerSubmit(submit);

  if (state === 'saved') return null;
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 20, opacity: state === 'saving' ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Product {index + 1}</span>
        {canRemove && <button onClick={onRemove} title="Remove" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Trash2 size={16} /></button>}
      </div>
      {errors.length > 0 && <div style={{ marginBottom: 12 }}>{errors.map((e) => <p key={e} style={{ fontSize: 11, color: RED }}>• {e}</p>)}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        <input className="fi" placeholder="Brand Name *" value={fields.brand} onChange={(e) => set('brand', sanitizeName(e.target.value))} />
        <input className="fi" placeholder="Product Name *" value={fields.name} onChange={(e) => set('name', sanitizeName(e.target.value))} />
        <input className="fi" type="number" min="0" placeholder="Selling Price (₹) *" value={fields.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} />
      </div>
      <textarea className="fi" rows={3} placeholder="Product Description *" value={fields.description}
        onChange={(e) => set('description', sanitizeMessage(e.target.value))} style={{ width: '100%', resize: 'vertical', marginBottom: 16 }} />

      <span style={label}>Images *</span>
      <ImageGrid images={imgs} />

      <div style={{ marginTop: 18 }}>
        <span style={label}>Product video (optional)</span>
        <VideoPicker value={video} onChange={setVideo} />
      </div>
      {state === 'saving' && <p style={{ fontSize: 11, color: GOLD, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} className="animate-spin" /> Saving…</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Edit modal (all statuses except deleted)
// ─────────────────────────────────────────────────────────────────────────────
const EditProductModal = ({ product, onClose, onSaved }) => {
  // For a live product with a change already in review (or rejected), keep
  // editing that proposal rather than starting again from the live version.
  const draft = product.pendingChanges || product;
  const [fields, setFields] = useState({
    brand: draft.brand || '', name: draft.name || '', description: draft.description || '', sellingPrice: draft.sellingPrice || '',
  });
  const [video, setVideo] = useState({ mode: draft.video?.source ? 'keep' : 'none', url: draft.video?.source === 'link' ? draft.video.url : '', file: null });
  const imgs = useStagedImages(draft.images || []);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const key = useRef(newIdempotencyKey());
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const save = async () => {
    const errs = validateFields(fields);
    if (!imgs.images.length) errs.push('At least one image is required');
    const vErr = videoError(video);
    if (vErr) errs.push(vErr);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const saved = await saveProduct({ id: product._id, fields, imgs, video, idempotencyKey: key.current });
      onSaved(saved);
      onClose();
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSaving(false);
    }
  };

  const isLive = product.status === 'approved';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,10,18,0.75)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--navy, #0e1520)', width: '100%', maxWidth: 640, padding: 32, position: 'relative', border: '1px solid rgba(184,151,90,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} disabled={saving} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
        <h2 className="sf" style={{ fontSize: 24, fontWeight: 300, marginBottom: 6 }}>Edit Product</h2>
        <div style={{ marginBottom: 18 }}><StatusBadge status={product.status} /></div>

        {isLive ? (
          <>
            <p style={{ fontSize: 12, color: GOLD, background: 'rgba(212,176,106,0.08)', border: '1px solid rgba(212,176,106,0.25)', padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8 }}>
              <Globe size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              This product is live. Your changes will be sent to Marqland Studios for approval — the current version stays live
              (including in client quotes) until they're approved.
            </p>
            {product.pendingChanges?.status === 'pending' && (
              <p style={{ fontSize: 12, color: GOLD, marginBottom: 12 }}>You're editing changes that are already waiting for approval — saving replaces them.</p>
            )}
            {product.pendingChanges?.status === 'rejected' && (
              <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>Your last changes were rejected: {product.pendingChanges.reason || 'no reason given'}. Fix and resubmit below.</p>
            )}
          </>
        ) : product.status === 'rejected' ? (
          <p style={{ fontSize: 12, color: RED, marginBottom: 16 }}>Rejected: {product.rejectionReason || 'no reason given'} — saving sends it back for review.</p>
        ) : null}

        {errors.length > 0 && <div style={{ marginBottom: 12 }}>{errors.map((e) => <p key={e} style={{ fontSize: 12, color: RED }}>• {e}</p>)}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><span style={label}>Brand</span><input className="fi" value={fields.brand} onChange={(e) => set('brand', sanitizeName(e.target.value))} style={{ width: '100%' }} /></div>
            <div><span style={label}>Product name</span><input className="fi" value={fields.name} onChange={(e) => set('name', sanitizeName(e.target.value))} style={{ width: '100%' }} /></div>
          </div>
          <div>
            <span style={label}>Your price (₹)</span>
            <input className="fi" type="number" min="0" value={fields.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <span style={label}>Description</span>
            <textarea className="fi" rows={4} value={fields.description} onChange={(e) => set('description', sanitizeMessage(e.target.value))} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div><span style={label}>Images</span><ImageGrid images={imgs} size={84} /></div>
          <div><span style={label}>Product video</span><VideoPicker value={video} onChange={setVideo} current={draft.video} /></div>

          <button onClick={save} disabled={saving} className="btn-gold" style={{ justifyContent: 'center', marginTop: 8 }}>
            {saving ? 'Saving…' : isLive ? 'Submit Changes for Approval' : product.status === 'rejected' ? 'Save & Resubmit for Review' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Portal
// ─────────────────────────────────────────────────────────────────────────────
const SupplierPortal = ({ session, onLogout }) => {
  const [tab, setTab] = useState('add'); // 'add' | 'review'

  // All v2 calls authenticate with this session; an expired token logs out.
  setAuthToken(session.accessToken);
  useEffect(() => onAuthExpired(() => onLogout()), [onLogout]);

  // ── TAB 1: Add Products ───────────────────────────────────────────────────
  const [cards, setCards] = useState(() => [{ key: newIdempotencyKey() }]);
  const submitters = useRef(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const addCard = () => setCards((c) => [...c, { key: newIdempotencyKey() }]);
  const removeCard = (key) => { submitters.current.delete(key); setCards((c) => (c.length > 1 ? c.filter((x) => x.key !== key) : c)); };

  const submitAll = async () => {
    setSubmitting(true);
    setBatchResult(null);
    const results = await Promise.all([...submitters.current.entries()].map(async ([key, submit]) => ({ key, ...(await submit()) })));
    const ok = results.filter((r) => r.ok);
    const failed = results.length - ok.length;
    const done = new Set(ok.map((r) => r.key));
    ok.forEach((r) => submitters.current.delete(r.key));
    setCards((c) => {
      const left = c.filter((x) => !done.has(x.key));
      return left.length ? left : [{ key: newIdempotencyKey() }];
    });
    setBatchResult({
      ok: failed === 0,
      message: `${ok.length} product${ok.length === 1 ? '' : 's'} submitted for review.${failed ? ` ${failed} need${failed === 1 ? 's' : ''} attention — see the highlighted fields.` : ''}`,
    });
    setSubmitting(false);
    if (ok.length) setListVersion((v) => v + 1);
  };

  // ── TAB 2: My Products ────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [list, setList] = useState({ items: [], page: 0, total: 0, hasMore: false, statusCounts: {}, loading: false, error: '' });
  const [listVersion, setListVersion] = useState(0);
  const [editing, setEditing] = useState(null);
  const listController = useRef(null);

  const loadPage = useCallback(async (page) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setList((l) => ({ ...(page === 1 ? { ...l, items: [] } : l), loading: true, error: '' }));
    try {
      const { data, meta } = await v2.get('/v2/supplier/products', {
        signal: controller.signal,
        params: { page, limit: PAGE_SIZE, status: statusFilter || undefined, search: searchTerm.trim() || undefined },
      });
      setList((l) => ({
        items: page === 1 ? data : [...l.items, ...data], page, total: meta.total, hasMore: meta.hasMore,
        statusCounts: meta.statusCounts || {}, loading: false, error: '',
      }));
    } catch (err) {
      if (err.code === 'CANCELLED') return;
      setList((l) => ({ ...l, loading: false, error: err.message }));
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    if (tab !== 'review') return undefined;
    const t = setTimeout(() => loadPage(1), 300);
    return () => clearTimeout(t);
  }, [tab, loadPage, listVersion]);

  const replaceItem = (saved) => setList((l) => ({ ...l, items: l.items.map((i) => (i._id === saved._id ? saved : i)) }));

  const deleteProduct = async (p) => {
    const question = p.status === 'deleted'
      ? `Remove "${p.name}" from your list? This can't be undone.`
      : `Delete "${p.name}"?`;
    if (!window.confirm(question)) return;
    try {
      await v2.delete(`/v2/supplier/products/${p._id}`);
      setList((l) => ({
        ...l,
        items: l.items.filter((i) => i._id !== p._id),
        total: Math.max(0, l.total - 1),
        statusCounts: { ...l.statusCounts, [p.status]: Math.max(0, (l.statusCounts[p.status] || 0) - 1) },
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  // 'changes' overlaps the status buckets (it counts live products), so it's not part of the total.
  const totalAll = Object.entries(list.statusCounts).filter(([k]) => k !== 'changes').reduce((a, [, n]) => a + n, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy, #0e1520)', color: 'white' }}>
      <style>{MARQLAND_THEME_CSS}</style>
      <NavBar authState="logout" onLogout={onLogout} />
      <TaskTray />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '108px 24px 80px' }}>
        <div style={{ marginBottom: 8 }}>
          <span className="pill">Partner Portal</span>
          <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, marginTop: 10 }}>
            Welcome, {session.user.supplierCompanyName || session.user.name}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {[['add', 'Add Products'], ['review', 'My Products']].map(([id, text]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px', marginRight: 24,
              color: tab === id ? GOLD : MUTED, borderBottom: tab === id ? `2px solid ${GOLD}` : '2px solid transparent',
              fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>{text}</button>
          ))}
        </div>

        {/* ── TAB 1: Add Products ── */}
        {tab === 'add' && (
          <div>
            {batchResult && (
              <div style={{
                marginBottom: 20, padding: 14, borderRadius: 4,
                background: batchResult.ok ? 'rgba(126,201,138,0.1)' : 'rgba(224,133,133,0.1)',
                border: `1px solid ${batchResult.ok ? 'rgba(126,201,138,0.35)' : 'rgba(224,133,133,0.35)'}`,
              }}>
                <p style={{ fontSize: 13 }}>{batchResult.message}</p>
                <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Video uploads continue in the background (bottom-right). You can keep working.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {cards.map((c, i) => (
                <NewProductCard
                  key={c.key}
                  index={i}
                  canRemove={cards.length > 1}
                  onRemove={() => removeCard(c.key)}
                  onSaved={() => {}}
                  registerSubmit={(fn) => submitters.current.set(c.key, fn)}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
              <button onClick={addCard} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 18px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <Plus size={14} /> Add another product
              </button>
              <button onClick={submitAll} disabled={submitting} className="btn-gold">
                {submitting ? 'Submitting…' : 'Save & Submit All'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: My Products ── */}
        {tab === 'review' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              {[['', 'All', totalAll], ['approved', 'Live'], ['changes', 'Changes in review'], ['pending', 'Pending'], ['rejected', 'Rejected'], ['deleted', 'Removed']].map(([value, text, n]) => (
                <button key={value || 'all'} onClick={() => setStatusFilter(value)} style={{
                  padding: '6px 12px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  border: `1px solid ${statusFilter === value ? GOLD : 'rgba(255,255,255,0.15)'}`,
                  background: statusFilter === value ? 'rgba(212,176,106,0.12)' : 'none', color: statusFilter === value ? GOLD : MUTED,
                }}>
                  {text} {value ? (list.statusCounts[value] ?? 0) : n}
                </button>
              ))}
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
                <input className="fi" value={searchTerm} onChange={(e) => setSearchTerm(sanitizeName(e.target.value))} placeholder="Search products" style={{ paddingLeft: 30, width: 220 }} />
              </div>
              <button onClick={() => loadPage(1)} title="Refresh" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}><RefreshCw size={14} /></button>
            </div>

            {list.error && (
              <p style={{ color: RED, fontSize: 13, marginBottom: 12 }}>
                {list.error} <button onClick={() => loadPage(list.page || 1)} style={{ background: 'none', border: `1px solid ${RED}`, color: RED, padding: '2px 10px', marginLeft: 8, cursor: 'pointer' }}>Retry</button>
              </p>
            )}
            {!list.loading && !list.error && list.items.length === 0 && (
              <p style={{ color: MUTED }}>{statusFilter || searchTerm ? 'No products match.' : 'No products yet — add some in the first tab.'}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.items.map((p) => (
                <div key={p._id} style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <img src={p.imageUrl} alt="" style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14 }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{p.brand} · ₹{p.sellingPrice} · {(p.images || []).length} image{(p.images || []).length === 1 ? '' : 's'}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}><VideoBadge video={p.video} /></div>
                    {p.status === 'rejected' && p.rejectionReason && <p style={{ fontSize: 12, color: RED, marginTop: 8 }}>Reason: {p.rejectionReason}</p>}
                    {p.status === 'deleted' && (
                      <>
                        <p style={{ fontSize: 12, color: RED, marginTop: 8 }}>
                          Removed from the catalogue by Marqland Studios.{p.deletionReason ? ` Reason: ${p.deletionReason}` : ''}
                        </p>
                        {/* Removed products can be cleared from the partner's list. */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                          <button onClick={() => deleteProduct(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(224,133,133,0.3)', color: RED, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
                            <Trash2 size={12} /> Delete from list
                          </button>
                        </div>
                      </>
                    )}
                    {p.status === 'approved' && !p.pendingChanges && <p style={{ fontSize: 12, color: GREEN, marginTop: 8 }}>Live in the Marqland Studios catalogue. Edits are reviewed before they go live.</p>}
                    {p.pendingChanges?.status === 'pending' && (
                      <p style={{ fontSize: 12, color: GOLD, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} /> Your changes are waiting for approval — the current version stays live until then.
                      </p>
                    )}
                    {p.pendingChanges?.status === 'rejected' && (
                      <p style={{ fontSize: 12, color: RED, marginTop: 8 }}>
                        Your changes were not approved{p.pendingChanges.reason ? `: ${p.pendingChanges.reason}` : '.'} Edit to fix and resubmit.
                      </p>
                    )}
                    {p.status !== 'deleted' && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <button onClick={() => setEditing(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
                          <Pencil size={12} /> {p.status === 'rejected' || p.pendingChanges?.status === 'rejected' ? 'Edit & Resubmit' : p.pendingChanges ? 'Edit changes' : 'Edit'}
                        </button>
                        {(p.status === 'pending' || p.status === 'rejected') && (
                          <button onClick={() => deleteProduct(p)} style={{ background: 'none', border: '1px solid rgba(224,133,133,0.3)', color: RED, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {list.loading && <p style={{ color: MUTED, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="animate-spin" /> Loading…</p>}
            {!list.loading && list.hasMore && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => loadPage(list.page + 1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 18px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Load more · {list.items.length} of {list.total}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && <EditProductModal product={editing} onClose={() => setEditing(null)} onSaved={replaceItem} />}
    </div>
  );
};

export default SupplierPortal;
