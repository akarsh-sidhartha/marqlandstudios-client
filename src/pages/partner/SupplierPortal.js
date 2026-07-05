/**
 * src/pages/partner/SupplierPortal.js
 *
 * Shown after a successful Partner login (role === 'supplier').
 * Tab 1 — Add Products: dynamic row-based bulk upload form.
 * Tab 2 — My Submissions: review pending/rejected rows; edit + resubmit
 *          rejected ones (approved rows are converted server-side and
 *          disappear from here, per spec).
 *
 * Talks to /api/suppliers/* (see routes/supplierRoutes.js), authenticated
 * via the Bearer token from the Partner login popup (session.accessToken).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Upload, LogOut, RefreshCw, AlertTriangle, CheckCircle2, Clock, X, XCircle, Video } from 'lucide-react';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme'; // NEW — same .fi/.btn-gold/.pill/.sf/.nav classes as HomePage

const API_BASE = process.env.REACT_APP_API_URL || '';

const emptyRow = () => ({
  _key: Math.random().toString(36).slice(2),
  brand: '', name: '', description: '', videoUrl: '', sellingPrice: '', // NEW
  imageFile: null, imagePreview: '',
  galleryFiles: [], galleryPreviews: [],
  videoFile: null, // NEW — manual video upload, alongside the YouTube URL option
});

const SupplierPortal = ({ session, onLogout }) => {
  const [tab, setTab] = useState('add'); // 'add' | 'review'
  const authHeader = { Authorization: `Bearer ${session.accessToken}` };

  // ── TAB 1: Add Products ────────────────────────────────────────────────────
  const [rows, setRows] = useState([emptyRow()]);
  const [rowErrors, setRowErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const addRow = () => setRows(r => [...r, emptyRow()]);
  const removeRow = (key) => setRows(r => r.length > 1 ? r.filter(row => row._key !== key) : r);
  const updateRow = (key, patch) => setRows(r => r.map(row => row._key === key ? { ...row, ...patch } : row));

  const onPrimaryImage = (key, file) => {
    if (!file) return;
    updateRow(key, { imageFile: file, imagePreview: URL.createObjectURL(file) });
  };
  const onGalleryImages = (key, files) => {
    const list = Array.from(files || []);
    updateRow(key, { galleryFiles: list, galleryPreviews: list.map(f => URL.createObjectURL(f)) });
  };

  const validateRows = () => {
    const errs = {};
    rows.forEach((row, i) => {
      const rowErr = [];
      if (!row.brand.trim()) rowErr.push('Brand is required');
      if (!row.name.trim()) rowErr.push('Product name is required');
      if (!row.description.trim()) rowErr.push('Description is required');
      if (!row.imageFile) rowErr.push('Primary image is required');
      if (!row.sellingPrice || Number(row.sellingPrice) <= 0) rowErr.push('Selling price is required');
      if (rowErr.length) errs[i] = rowErr;
    });
    setRowErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitBatch = async () => {
    if (!validateRows()) return;
    setSubmitting(true);
    setBatchResult(null);
    try {
      const fd = new FormData();
      fd.append('rows', JSON.stringify(rows.map(r => ({
        brand: r.brand, name: r.name, description: r.description, videoUrl: r.videoUrl, sellingPrice: r.sellingPrice,
      }))));
      rows.forEach((row, i) => {
        if (row.imageFile) fd.append(`image_${i}`, row.imageFile);
        (row.galleryFiles || []).forEach(f => fd.append(`gallery_${i}`, f));
        if (row.videoFile) fd.append(`video_${i}`, row.videoFile); // NEW — manual video upload
      });

      const res = await axios.post(`${API_BASE}/api/suppliers/products/bulk`, fd, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
      });
      setBatchResult({ ok: true, message: res.data.message, errors: res.data.errors || [] });
      setRows([emptyRow()]);
      setRowErrors({});
    } catch (err) {
      setBatchResult({ ok: false, message: err.response?.data?.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── TAB 2: Review / edit / resubmit ────────────────────────────────────────
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [editing, setEditing] = useState(null); // the submission object being edited, or null

  const loadSubmissions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await axios.get(`${API_BASE}/api/suppliers/products`, { headers: authHeader });
      setMySubmissions(res.data);
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoadingSubs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  useEffect(() => { if (tab === 'review') loadSubmissions(); }, [tab, loadSubmissions]);

  const deleteSubmission = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
    try {
      await axios.delete(`${API_BASE}/api/suppliers/products/${id}`, { headers: authHeader });
      loadSubmissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const openEdit = (submission) => setEditing({
    ...submission,
    newImageFile: null, newImagePreview: submission.imageUrl,
    newGalleryFiles: [],
    newVideoFile: null, // NEW
  });

  const saveEdit = async () => {
    try {
      const fd = new FormData();
      fd.append('brand', editing.brand);
      fd.append('name', editing.name);
      fd.append('description', editing.description);
      fd.append('videoUrl', editing.newVideoFile ? '' : (editing.videoUrl || ''));
      fd.append('sellingPrice', editing.sellingPrice || ''); // NEW
      if (editing.newImageFile) fd.append('image', editing.newImageFile);
      (editing.newGalleryFiles || []).forEach(f => fd.append('gallery', f));
      if (editing.newVideoFile) fd.append('video', editing.newVideoFile); // NEW — manual video upload

      await axios.put(`${API_BASE}/api/suppliers/products/${editing._id}`, fd, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
      });
      setEditing(null);
      loadSubmissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Resubmit failed.');
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  { bg: '#3a3220', color: '#d4b06a', icon: <Clock size={12} /> },
      rejected: { bg: '#3a2020', color: '#e08585', icon: <AlertTriangle size={12} /> },
      approved: { bg: '#20351f', color: '#7ec98a', icon: <CheckCircle2 size={12} /> },
      deleted:  { bg: '#3a2020', color: '#e08585', icon: <XCircle size={12} /> }, // NEW
    };
    const s = map[status] || map.pending;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, padding: '3px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 3 }}>
        {s.icon} {status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy, #0e1520)', color: 'white' }}>
      <style>{MARQLAND_THEME_CSS}</style>

      {/* NEW — same .nav layout/classes as the marketing page: logo far left,
          primary action (Logout, here) far right. */}
      <nav className="nav" style={{ background: 'rgba(14,21,32,0.94)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" className="nav-logo sf" style={{ textDecoration: 'none' }}>Marqland Studios</Link>
        <div className="nav-links">
          <button onClick={onLogout} className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '108px 24px 40px' }}>
        <div style={{ marginBottom: 8 }}>
          <span className="pill">Partner Portal</span>
          <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, marginTop: 10 }}>
            Welcome, {session.user.supplierCompanyName || session.user.name}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {[['add', 'Add Products'], ['review', 'Review My Products']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px', marginRight: 24,
                color: tab === id ? '#d4b06a' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === id ? '2px solid #d4b06a' : '2px solid transparent',
                fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              {label}
            </button>
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
                {batchResult.errors?.map((e, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#e08585', marginTop: 4 }}>Row {e.row + 1}: {e.message}</p>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {rows.map((row, i) => (
                <div key={row._key} style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 20, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Product {i + 1}</span>
                    <button onClick={() => removeRow(row._key)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>

                  {rowErrors[i] && (
                    <div style={{ marginBottom: 12 }}>
                      {rowErrors[i].map((e, j) => <p key={j} style={{ fontSize: 11, color: '#e08585' }}>• {e}</p>)}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <input className="fi" placeholder="Brand Name *" value={row.brand} onChange={e => updateRow(row._key, { brand: e.target.value })} />
                    <input className="fi" placeholder="Product Name *" value={row.name} onChange={e => updateRow(row._key, { name: e.target.value })} />
                    <input className="fi" type="number" placeholder="Selling Price (₹) *" value={row.sellingPrice} onChange={e => updateRow(row._key, { sellingPrice: e.target.value })} />
                  </div>
                  <textarea className="fi" rows={3} placeholder="Product Description *" value={row.description} onChange={e => updateRow(row._key, { description: e.target.value })} style={{ width: '100%', resize: 'none', marginBottom: 12 }} />
                  <input className="fi" placeholder="YouTube / video URL (optional — or upload a video file below)" value={row.videoUrl}
                    onChange={e => updateRow(row._key, { videoUrl: e.target.value })} style={{ width: '100%', marginBottom: 16 }} disabled={!!row.videoFile} />

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {/* Primary image */}
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{ width: 100, height: 100, border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {row.imagePreview
                          ? <img src={row.imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Upload size={20} color="rgba(255,255,255,0.4)" />}
                      </div>
                      <input type="file" accept="image/*" hidden onChange={e => onPrimaryImage(row._key, e.target.files[0])} />
                      <p style={{ fontSize: 10, marginTop: 6, color: 'rgba(255,255,255,0.4)' }}>Primary Image *</p>
                    </label>

                    {/* Gallery */}
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{ width: 100, height: 100, border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', flexWrap: 'wrap', gap: 2, padding: 4, overflow: 'hidden' }}>
                        {row.galleryPreviews.length
                          ? row.galleryPreviews.slice(0, 4).map((src, gi) => <img key={gi} src={src} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />)
                          : <Upload size={20} color="rgba(255,255,255,0.4)" style={{ margin: 'auto' }} />}
                      </div>
                      <input type="file" accept="image/*" multiple hidden onChange={e => onGalleryImages(row._key, e.target.files)} />
                      <p style={{ fontSize: 10, marginTop: 6, color: 'rgba(255,255,255,0.4)' }}>Additional Images</p>
                    </label>

                    {/* NEW — Manual video upload (stored on OneDrive: supplier folder -> product name) */}
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{ width: 100, height: 100, border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 6, textAlign: 'center' }}>
                        {row.videoFile
                          ? <span style={{ fontSize: 10, color: '#d4b06a', wordBreak: 'break-word' }}>{row.videoFile.name}</span>
                          : <Video size={20} color="rgba(255,255,255,0.4)" />}
                      </div>
                      <input type="file" accept="video/*" hidden onChange={e => {
                        const f = e.target.files[0];
                        updateRow(row._key, { videoFile: f || null, videoUrl: f ? '' : row.videoUrl });
                      }} />
                      <p style={{ fontSize: 10, marginTop: 6, color: 'rgba(255,255,255,0.4)' }}>Upload Video</p>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 18px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <Plus size={14} /> Add Row
              </button>
              <button onClick={submitBatch} disabled={submitting} className="btn-gold">
                {submitting ? 'Submitting…' : 'Save & Submit All'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: Review My Products ── */}
        {tab === 'review' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={loadSubmissions} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loadingSubs ? (
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
            ) : mySubmissions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>No submissions yet — add products in the first tab.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mySubmissions.map(sub => (
                  <div key={sub._id} style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <img src={sub.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontSize: 14 }}>{sub.name}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub.brand}</p>
                        </div>
                        {statusBadge(sub.status)}
                      </div>
                      {sub.status === 'rejected' && sub.rejectionReason && (
                        <p style={{ fontSize: 12, color: '#e08585', marginTop: 8 }}>Reason: {sub.rejectionReason}</p>
                      )}
                      {sub.status === 'deleted' && sub.deletionReason && (
                        <p style={{ fontSize: 12, color: '#e08585', marginTop: 8 }}>
                          This product was removed from the catalogue by Marqland Studios. Reason: {sub.deletionReason}
                        </p>
                      )}
                      {sub.status === 'approved' && (
                        <p style={{ fontSize: 12, color: '#7ec98a', marginTop: 8 }}>Live in the Marqland Studios catalogue.</p>
                      )}
                      {(sub.status === 'pending' || sub.status === 'rejected') && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                          <button onClick={() => openEdit(sub)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
                            {sub.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                          </button>
                          <button onClick={() => deleteSubmission(sub._id)} style={{ background: 'none', border: '1px solid rgba(224,133,133,0.3)', color: '#e08585', padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit / resubmit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,10,18,0.75)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--navy, #0e1520)', width: '100%', maxWidth: 520, padding: 32, position: 'relative', border: '1px solid rgba(184,151,90,0.2)', maxHeight: '86vh', overflowY: 'auto' }}>
            <button onClick={() => setEditing(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}><X size={18} /></button>
            <h2 className="sf" style={{ fontSize: 22, fontWeight: 300, marginBottom: 20 }}>Edit Submission</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="fi" placeholder="Brand" value={editing.brand} onChange={e => setEditing({ ...editing, brand: e.target.value })} />
              <input className="fi" placeholder="Product Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="fi" type="number" placeholder="Selling Price (₹)" value={editing.sellingPrice || ''} onChange={e => setEditing({ ...editing, sellingPrice: e.target.value })} />
              <textarea className="fi" rows={3} placeholder="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} style={{ resize: 'none' }} />
              <input className="fi" placeholder="Video URL" value={editing.videoUrl || ''}
                onChange={e => setEditing({ ...editing, videoUrl: e.target.value })} disabled={!!editing.newVideoFile} />
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                {editing.newVideoFile ? `Selected: ${editing.newVideoFile.name}` : 'Or upload a video file instead'}
                <input type="file" accept="video/*" hidden onChange={e => {
                  const f = e.target.files[0];
                  setEditing({ ...editing, newVideoFile: f || null, videoUrl: f ? '' : editing.videoUrl });
                }} />
              </label>
              <label style={{ cursor: 'pointer' }}>
                <img src={editing.newImagePreview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', display: 'block', marginBottom: 6 }} />
                <input type="file" accept="image/*" hidden onChange={e => {
                  const f = e.target.files[0];
                  if (f) setEditing({ ...editing, newImageFile: f, newImagePreview: URL.createObjectURL(f) });
                }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Click to replace primary image</span>
              </label>
              <button onClick={saveEdit} className="btn-gold" style={{ justifyContent: 'center', marginTop: 8 }}>
                Resubmit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPortal;