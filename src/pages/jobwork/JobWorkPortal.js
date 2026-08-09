/**
 * src/pages/jobwork/JobWorkPortal.js
 *
 * Shown after a successful Job Work vendor login (role === 'jobWork').
 * Three tabs — Ongoing / Completed / Archive — global search, date-range
 * filter, and a row form (description, quantity, price/unit, live-computed
 * GST total, multi-image upload + live camera capture). Edit/Delete are
 * only available while a row is 'ongoing' (locked once admin approves it).
 *
 * Rows render as a single compact line; click a row (or its chevron) to
 * expand it in place and reveal the full description, photos, admin
 * comment, and actions.
 *
 * Talks to /api/job-work/* (see backend routes/jobWorkVendorRoutes.js),
 * authenticated via the Bearer token from JobWorkPage's login popup
 * (session.accessToken) — same auth pattern as SupplierPortal.js.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NavBar from '../../components/NavBar';
import {
  Plus, Trash2, Upload, Camera, X, Search, Calendar, Pencil,
  CheckCircle2, Clock, Archive, MessageSquare, Loader2, ChevronDown,
} from 'lucide-react';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
import {
  isValidMessage, sanitizeMessage, isValidQuantity, isValidPrice,
  computeJobWorkTotal, JOB_WORK_GST_RATE, GENERIC_INVALID_MESSAGE,
} from '../../utils/jobWorkValidation';

const API_BASE = process.env.REACT_APP_API_URL || '';
const MAX_IMAGES = 12;

const emptyForm = () => ({ description: '', quantity: '', pricePerUnit: '', files: [], previews: [] });

// OneDrive's webUrl (img.url) opens the online viewer page, not a raw image
// byte stream, so it can't be used as an <img src> directly — this hits the
// backend proxy (GET /api/job-work/media/:rowId/:imageId) instead, which
// streams the actual file content through Graph.
const mediaUrl = (rowId, imageId) => `${API_BASE}/api/job-work/media/${rowId}/${imageId}`;

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const TABS = [
  { id: 'ongoing', label: 'Ongoing', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'archive', label: 'Archive', icon: Archive },
];

const JobWorkPortal = ({ session, onLogout }) => {
  const authHeader = { Authorization: `Bearer ${session.accessToken}` };

  const [tab, setTab] = useState('ongoing');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const [lightboxImage, setLightboxImage] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await axios.get(`${API_BASE}/api/job-work/rows`, {
        headers: authHeader,
        params: { tab, search: search.trim() || undefined, from: from || undefined, to: to || undefined },
      });
      setRows(res.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load your job work.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, from, to]);

  useEffect(() => { load(); }, [load]);

  const onFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, MAX_IMAGES);
    setForm(f => ({ ...f, files, previews: files.map(file => URL.createObjectURL(file)) }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormErrors([]);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({ description: row.description, quantity: String(row.quantity), pricePerUnit: String(row.pricePerUnit), files: [], previews: [] });
    setFormErrors([]);
    setShowForm(true);
  };

  const validateForm = () => {
    const errs = [];
    if (!form.description.trim()) errs.push('Description is required.');
    else if (!isValidMessage(form.description)) errs.push('Description: ' + GENERIC_INVALID_MESSAGE);
    if (!isValidQuantity(form.quantity)) errs.push('Quantity must be a positive number.');
    if (!isValidPrice(form.pricePerUnit)) errs.push('Price per unit must be a positive number.');
    setFormErrors(errs);
    return errs.length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('description', form.description);
      fd.append('quantity', form.quantity);
      fd.append('pricePerUnit', form.pricePerUnit);
      form.files.forEach(f => fd.append('images', f));

      if (editingId) {
        await axios.put(`${API_BASE}/api/job-work/rows/${editingId}`, fd, { headers: { ...authHeader, 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_BASE}/api/job-work/rows`, fd, { headers: { ...authHeader, 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormErrors([err.response?.data?.message || 'Failed to save.']);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm('Delete this job work entry? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/job-work/rows/${row._id}`, { headers: authHeader });
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const estimatedTotal = computeJobWorkTotal(form.quantity, form.pricePerUnit);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Jost', sans-serif" }}>
      <style>{MARQLAND_THEME_CSS}</style>

      <NavBar authState="logout" onLogout={onLogout} mobileMenu />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '108px 24px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <span className="pill">Job Work Portal</span>
            <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, marginTop: 10 }}>Welcome, {session.user.name}</h1>
          </div>
          <button onClick={openCreate} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={14} /> New Job Work
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px', marginRight: 24,
                color: tab === t.id ? '#d4b06a' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === t.id ? '2px solid #d4b06a' : '2px solid transparent',
                fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Search + date filter */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 0, top: 15, color: 'rgba(255,255,255,0.4)' }} />
            <input className="fi" style={{ paddingLeft: 22 }} placeholder="Search your submissions…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={13} color="rgba(255,255,255,0.4)" />
            <input className="fi" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 140 }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>to</span>
            <input className="fi" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 140 }} />
          </div>
        </div>

        {loadError && <p style={{ color: '#ffb4ab', fontSize: 12, marginBottom: 16 }}>{loadError}</p>}

        {/* Row list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
            <Loader2 size={16} className="animate-spin" style={{ marginRight: 8, verticalAlign: 'middle' }} /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>No job work in {tab} yet.</p>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 }}>
            {/* Column headers for the collapsed line */}
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 150px 110px 90px 24px', gap: 12,
              padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
            }}>
              <span>Serial</span><span>Description</span><span>Qty × Price</span><span>Total</span><span>Status</span><span />
            </div>

            {rows.map((row, idx) => {
              const expanded = expandedIds.has(row._id);
              return (
                <div key={row._id} style={{ borderBottom: idx === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Collapsed single-line row */}
                  <div
                    onClick={() => toggleExpanded(row._id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 150px 110px 90px 24px', gap: 12,
                      alignItems: 'center', padding: '10px 16px', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#d4b06a', letterSpacing: '0.05em' }}>{row.serialId}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.description}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {row.quantity} × {money(row.pricePerUnit)}
                    </span>
                    <span style={{ fontSize: 13, color: '#d4b06a', fontWeight: 500 }}>{money(row.totalAmount)}</span>
                    <span style={{
                      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', width: 'fit-content',
                      color: row.status === 'ongoing' ? '#e6c180' : row.status === 'completed' ? '#7ec98a' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${row.status === 'ongoing' ? 'rgba(230,193,128,0.4)' : row.status === 'completed' ? 'rgba(126,201,138,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    }}>
                      {row.status}
                    </span>
                    <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </div>

                  {/* Expanded detail panel */}
                  {expanded && (
                    <div style={{ padding: '4px 16px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{row.description}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                        Submitted {fmtDate(row.createdAt)} · {row.gstRate}% GST included
                      </p>

                      {row.images?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          {row.images.map((img, i) => (
                            <img key={i} src={mediaUrl(row._id, img._id)} alt="" onClick={(e) => { e.stopPropagation(); setLightboxImage(mediaUrl(row._id, img._id)); }}
                              style={{ width: 64, height: 64, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid rgba(255,255,255,0.12)' }} />
                          ))}
                        </div>
                      )}

                      {row.adminComment && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(224,133,133,0.08)', border: '1px solid rgba(224,133,133,0.25)', display: 'flex', gap: 8 }}>
                          <MessageSquare size={14} color="#e08585" style={{ flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontSize: 12, color: '#e08585', margin: 0 }}>{row.adminComment}</p>
                        </div>
                      )}

                      {row.status === 'ongoing' && (
                        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteRow(row); }} style={{ background: 'none', border: 'none', color: '#e08585', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create/Edit form modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(14,21,32,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--navy)', border: '1px solid rgba(184,151,90,0.25)', width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 32, position: 'relative' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X size={18} />
            </button>
            <h2 className="sf" style={{ fontSize: 22, color: '#b8975a', fontWeight: 500, marginBottom: 20 }}>
              {editingId ? 'Edit Job Work' : 'New Job Work'}
            </h2>

            <label className="lbl">Description *</label>
            <textarea className="fi" rows={3} style={{ width: '100%', resize: 'none', marginBottom: 16 }}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: sanitizeMessage(e.target.value) }))} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
              <div>
                <label className="lbl">Quantity *</label>
                <input className="fi" type="number" min="0" step="any" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="lbl">Price / Unit (₹) *</label>
                <input className="fi" type="number" min="0" step="any" value={form.pricePerUnit}
                  onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
              </div>
            </div>

            {form.quantity && form.pricePerUnit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(184,151,90,0.08)', border: '1px solid rgba(184,151,90,0.2)', marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Estimated total (incl. {JOB_WORK_GST_RATE}% GST)</span>
                <span style={{ fontSize: 14, color: '#d4b06a', fontWeight: 600 }}>{money(estimatedTotal)}</span>
              </div>
            )}

            <label className="lbl" style={{ display: 'block', marginBottom: 8 }}>Photos {editingId ? '(adds to existing)' : ''}</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <label style={{ cursor: 'pointer' }}>
                <div style={{ width: 88, height: 88, border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Upload size={18} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Upload</span>
                </div>
                <input type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
              </label>
              <label style={{ cursor: 'pointer' }}>
                <div style={{ width: 88, height: 88, border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Camera size={18} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Take Photo</span>
                </div>
                {/* capture="environment" opens the rear camera directly on mobile — the
                    simplest reliable "live picture" flow without a custom getUserMedia UI. */}
                <input type="file" accept="image/*" capture="environment" hidden
                  onChange={e => onFiles([...(form.files || []), ...Array.from(e.target.files || [])])} />
              </label>
              {form.previews.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 88, height: 88, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }} />
              ))}
            </div>

            {formErrors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {formErrors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#ffb4ab' }}>{e}</p>)}
              </div>
            )}

            <button onClick={submitForm} disabled={saving} className="btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Submit Job Work'}
            </button>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, cursor: 'zoom-out' }}>
          <img src={lightboxImage} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
};

export default JobWorkPortal;