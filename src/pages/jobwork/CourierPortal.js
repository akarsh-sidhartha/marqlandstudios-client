/**
 * src/pages/jobwork/CourierPortal.js
 *
 * Shown after a successful login with role 'courier'. Same page family as
 * JobWorkPortal.js (both are reached via the shared /job-work entry point
 * in JobWorkPage.js, which branches on session.user.role) — courier used to
 * get a near-full copy of admin.marqlandstudios.com's CourierTracking.js
 * (see that file's header comment), which let a courier see/edit/delete
 * ANY shipment, not just their own. This portal is properly scoped: a
 * courier only ever sees shipments they created (backend enforces the same
 * ownership check on every verb — see routes/shipmentRoutes.js).
 *
 * Status-grouping logic (COMPLETED_STATUSES / ARCHIVE_THRESHOLD_DAYS) is
 * copied verbatim from CourierTracking.js so the three tabs behave
 * identically to what a courier is used to. The background auto-tracking
 * scheduler (services/shipmentTrackingService.js) polls ALL shipments
 * regardless of owner, so a courier's shipments still get automatic status
 * updates exactly like before — nothing here changes that.
 *
 * Talks to /api/shipments/* and /api/shipping-partners (read-only, for the
 * partner-name dropdown) — both already existing, unmodified endpoints.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Trash2, Pencil, LogOut, X, Search, Calendar, Clock, CheckCircle2,
  Archive, Loader2, Truck, RotateCcw,
} from 'lucide-react';
import { MARQLAND_THEME_CSS } from '../../styles/marqlandTheme';
import { isValidMessage, sanitizeMessage, GENERIC_INVALID_MESSAGE } from '../../utils/jobWorkValidation';
import { SearchableSelect, INDIA_STATES, CITIES_BY_STATE } from '../../utils/indiaLocations';

const API_BASE = process.env.REACT_APP_API_URL || '';

// ── Same constants as admin's CourierTracking.js, kept in sync intentionally ──
const COMPLETED_STATUSES = ['Delivered', 'Completed', 'Returned'];
const ARCHIVE_THRESHOLD_DAYS = 30;
const STATUS_OPTIONS = ['Pending', 'Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Completed', 'Returned', 'Exception'];

const isArchived = (s) => {
  if (!COMPLETED_STATUSES.includes(s.status)) return false;
  const anchor = s.lastTrackedAt || s.updatedAt || s.shippedDate || s.createdAt;
  return (Date.now() - new Date(anchor).getTime()) / 86_400_000 > ARCHIVE_THRESHOLD_DAYS;
};

const TABS = [
  { id: 'active', label: 'Active', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'archive', label: 'Archive', icon: Archive },
];

const emptyForm = () => ({
  shippedDate: new Date().toISOString().slice(0, 10),
  recipientName: '', recipientAddress: '', country: 'India', city: '', state: '', phone: '',
  trackingId: '', shippingPartner: '', status: 'Pending', notes: '', orderId: null,
});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const distinctSorted = (arr, key) => [...new Set(arr.map(s => s[key]).filter(Boolean))].sort();

// Native <select> option popups are OS-rendered — the dark theme's white
// text becomes invisible against that white popup unless options are
// explicitly given light-background/dark-text colors of their own.
const selectStyle = { colorScheme: 'light' };
const optionStyle = { color: '#1a1a1a', background: '#ffffff' };

const CourierPortal = ({ session, onLogout }) => {
  const authHeader = { Authorization: `Bearer ${session.accessToken}` };

  const [tab, setTab] = useState('active');
  const [shipments, setShipments] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [cityManual, setCityManual] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await axios.get(`${API_BASE}/api/shipments`, { headers: authHeader });
      setShipments(res.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load your shipments.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    axios.get(`${API_BASE}/api/shipping-partners`, { headers: authHeader })
      .then(res => setPartners(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCityManual(false);
    setFormErrors([]);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({
      shippedDate: (s.shippedDate || '').slice(0, 10),
      recipientName: s.recipientName || '', recipientAddress: s.recipientAddress || '',
      country: s.country || 'India', city: s.city || '', state: s.state || '', phone: s.phone || '',
      trackingId: s.trackingId || '', shippingPartner: s.shippingPartner || '',
      status: s.status || 'Pending', notes: s.notes || '', orderId: s.orderId || null,
    });
    // If the shipment's saved city isn't in our known list for its state
    // (or its state isn't recognised at all), default to manual entry so
    // the existing value isn't silently lost.
    const knownCities = CITIES_BY_STATE[s.state] || [];
    setCityManual(!!s.city && !knownCities.includes(s.city));
    setFormErrors([]);
    setShowForm(true);
  };

  const handleStateChange = (newState) => {
    setForm(f => ({ ...f, state: newState, city: '' }));
    setCityManual(false);
  };

  const validateForm = () => {
    const errs = [];
    if (!form.recipientName.trim()) errs.push('Recipient name is required.');
    if (!form.shippedDate) errs.push('Shipped date is required.');
    if (form.notes && !isValidMessage(form.notes)) errs.push('Notes: ' + GENERIC_INVALID_MESSAGE);
    setFormErrors(errs);
    return errs.length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/api/shipments/${editingId}`, form, { headers: authHeader });
      } else {
        await axios.post(`${API_BASE}/api/shipments`, form, { headers: authHeader });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormErrors([err.response?.data?.message || 'Failed to save.']);
    } finally {
      setSaving(false);
    }
  };

  const deleteShipment = async (s) => {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/shipments/${s._id}`, { headers: authHeader });
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  // ── Inline status update — right from the row, no need to open Edit ───────
  const updateStatusInline = async (s, newStatus) => {
    if (newStatus === s.status) return;
    setStatusUpdatingId(s._id);
    try {
      await axios.put(`${API_BASE}/api/shipments/${s._id}`, { status: newStatus, orderId: s.orderId || null }, { headers: authHeader });
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const resetFilters = () => {
    setSearch(''); setFrom(''); setTo('');
    setFilterPartner(''); setFilterCountry(''); setFilterState(''); setFilterCity('');
  };
  const hasActiveFilters = search || from || to || filterPartner || filterCountry || filterState || filterCity;

  const partnerOptions = useMemo(() => partners.map(p => p.name).sort(), [partners]);
  const countryOptions = useMemo(() => distinctSorted(shipments, 'country'), [shipments]);
  const stateOptions = useMemo(() => distinctSorted(shipments, 'state'), [shipments]);
  const cityOptions = useMemo(() => distinctSorted(shipments, 'city'), [shipments]);

  const activeCount = shipments.filter(s => !COMPLETED_STATUSES.includes(s.status)).length;
  const completedCount = shipments.filter(s => COMPLETED_STATUSES.includes(s.status) && !isArchived(s)).length;
  const archiveCount = shipments.filter(isArchived).length;

  const rows = shipments.filter(s => {
    if (tab === 'active' && COMPLETED_STATUSES.includes(s.status)) return false;
    if (tab === 'completed' && (!COMPLETED_STATUSES.includes(s.status) || isArchived(s))) return false;
    if (tab === 'archive' && !isArchived(s)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${s.recipientName} ${s.trackingId} ${s.city} ${s.state}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterPartner && s.shippingPartner !== filterPartner) return false;
    if (filterCountry && s.country !== filterCountry) return false;
    if (filterState && s.state !== filterState) return false;
    if (filterCity && s.city !== filterCity) return false;
    const anchor = new Date(s.shippedDate || s.createdAt);
    if (from && anchor < new Date(from)) return false;
    if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); if (anchor > end) return false; }
    return true;
  });

  const filterSelectStyle = { ...selectStyle, minWidth: 100, maxWidth: 130, fontSize: 11, padding: '6px 8px' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Jost', sans-serif" }}>
      <style>{MARQLAND_THEME_CSS}</style>

      <nav className="nav" style={{ background: 'rgba(14,21,32,0.94)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" className="nav-logo sf" style={{ textDecoration: 'none' }}>Marqland Studios</Link>
        <div className="nav-links">
          <button onClick={onLogout} className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '108px 24px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <span className="pill">Courier Portal</span>
            <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, marginTop: 10 }}>Welcome, {session.user.name}</h1>
          </div>
          <button onClick={openCreate} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={14} /> New Shipment
          </button>

          {/* Search + filters — compact single bar, wraps under the heading on narrow screens */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
              <Search size={12} style={{ position: 'absolute', left: 0, top: 11, color: 'rgba(255,255,255,0.4)' }} />
              <input className="fi" style={{ paddingLeft: 18, fontSize: 12, padding: '6px 0 6px 18px' }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="fi" style={filterSelectStyle} value={filterPartner} onChange={e => setFilterPartner(e.target.value)}>
              <option value="" style={optionStyle}>All Partners</option>
              {partnerOptions.map(p => <option key={p} value={p} style={optionStyle}>{p}</option>)}
            </select>
            <select className="fi" style={filterSelectStyle} value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
              <option value="" style={optionStyle}>All Countries</option>
              {countryOptions.map(c => <option key={c} value={c} style={optionStyle}>{c}</option>)}
            </select>
            <select className="fi" style={filterSelectStyle} value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="" style={optionStyle}>All States</option>
              {stateOptions.map(s => <option key={s} value={s} style={optionStyle}>{s}</option>)}
            </select>
            <select className="fi" style={filterSelectStyle} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="" style={optionStyle}>All Cities</option>
              {cityOptions.map(c => <option key={c} value={c} style={optionStyle}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} color="rgba(255,255,255,0.4)" />
              <input className="fi" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...selectStyle, width: 108, fontSize: 11, padding: '6px 6px' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>to</span>
              <input className="fi" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...selectStyle, width: 108, fontSize: 11, padding: '6px 6px' }} />
            </div>
            {hasActiveFilters && (
              <button onClick={resetFilters} title="Reset filters" style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'none',
                border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)',
                padding: '6px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', borderRadius: 2, flexShrink: 0,
              }}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
              <t.icon size={13} /> {t.label} ({t.id === 'active' ? activeCount : t.id === 'completed' ? completedCount : archiveCount})
            </button>
          ))}
        </div>

        {loadError && <p style={{ color: '#ffb4ab', fontSize: 12, marginBottom: 16 }}>{loadError}</p>}

        {/* Row list — compact, single-line-per-shipment */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
            <Loader2 size={16} className="animate-spin" style={{ marginRight: 8, verticalAlign: 'middle' }} /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>No shipments in {tab}.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 1160, display: 'flex', flexDirection: 'column' }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '150px 1fr 170px 130px 140px 150px 110px',
                gap: 12, padding: '0 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
              }}>
                <span>Tracking / Partner</span>
                <span>Recipient / Address</span>
                <span>Location</span>
                <span>Phone</span>
                <span>Status</span>
                <span>Shipped</span>
                <span>Actions</span>
              </div>

              {rows.map(s => (
                <div key={s._id} style={{
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr 170px 130px 140px 150px 110px',
                  gap: 12, alignItems: 'center',
                  padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: '#d4b06a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.trackingId}>
                      {s.trackingId || '—'}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.shippingPartner}>
                      {s.shippingPartner || 'No partner'}
                    </p>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.recipientName}>
                      <Truck size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />{s.recipientName}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.recipientAddress}>
                      {s.recipientAddress || '—'}
                    </p>
                  </div>

                  <div style={{ minWidth: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={[s.city, s.state, s.country].filter(Boolean).join(', ')}>
                    {[s.city, s.state, s.country].filter(Boolean).join(', ') || '—'}
                  </div>

                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.phone || '—'}
                  </div>

                  {/* Inline status update — active/completed only; archive is read-only */}
                  <div>
                    {tab !== 'archive' ? (
                      <select
                        className="fi"
                        style={{ ...selectStyle, fontSize: 11, padding: '6px 8px' }}
                        value={s.status}
                        disabled={statusUpdatingId === s._id}
                        onChange={e => updateStatusInline(s, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} style={optionStyle}>{opt}</option>)}
                      </select>
                    ) : (
                      <span style={{
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
                        color: '#7ec98a', border: '1px solid rgba(126,201,138,0.4)', display: 'inline-block',
                      }}>
                        {s.status}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtDate(s.shippedDate)}</div>

                  {/* Edit/Delete — active tab only; never available on completed/archive */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {tab === 'active' && (
                      <>
                        <button onClick={() => openEdit(s)} title="Edit" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteShipment(s)} title="Delete" style={{ background: 'none', border: 'none', color: '#e08585', cursor: 'pointer', display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create/Edit form modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(14,21,32,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--navy)', border: '1px solid rgba(184,151,90,0.25)', width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', padding: 32, position: 'relative' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X size={18} />
            </button>
            <h2 className="sf" style={{ fontSize: 22, color: '#b8975a', fontWeight: 500, marginBottom: 20 }}>
              {editingId ? 'Edit Shipment' : 'New Shipment'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
              <div>
                <label className="lbl">Shipped Date *</label>
                <input className="fi" type="date" style={selectStyle} value={form.shippedDate} onChange={e => setForm(f => ({ ...f, shippedDate: e.target.value }))} />
              </div>
              <div>
                <label className="lbl">Status</label>
                <select className="fi" style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s} style={optionStyle}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Recipient Name *</label>
                <input className="fi" value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
              </div>
              <div>
                <label className="lbl">Phone</label>
                <input className="fi" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="lbl">Recipient Address</label>
                <input className="fi" style={{ width: '100%' }} value={form.recipientAddress} onChange={e => setForm(f => ({ ...f, recipientAddress: e.target.value }))} />
              </div>

              {/* State first, then City — city stays disabled until a state is picked */}
              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: 4 }}>State</label>
                <SearchableSelect
                  value={form.state}
                  onChange={handleStateChange}
                  options={INDIA_STATES}
                  placeholder="Select State"
                />
              </div>
              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: 4 }}>
                  City {form.state && (
                    <button type="button" onClick={() => setCityManual(m => !m)}
                      style={{ background: 'none', border: 'none', color: '#d4b06a', cursor: 'pointer', fontSize: 10, textTransform: 'none', letterSpacing: 0, marginLeft: 8, textDecoration: 'underline' }}>
                      {cityManual ? 'choose from list' : "can't find it? enter manually"}
                    </button>
                  )}
                </label>
                {cityManual ? (
                  <input className="fi" style={{ width: '100%' }} value={form.city} placeholder="Enter city"
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                ) : (
                  <SearchableSelect
                    value={form.city}
                    onChange={(c) => setForm(f => ({ ...f, city: c }))}
                    options={form.state ? (CITIES_BY_STATE[form.state] || []) : []}
                    placeholder={form.state ? 'Select City' : 'Select a state first'}
                    disabled={!form.state}
                  />
                )}
              </div>

              <div>
                <label className="lbl">Country</label>
                <input className="fi" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
              <div>
                <label className="lbl">Tracking ID</label>
                <input className="fi" value={form.trackingId} onChange={e => setForm(f => ({ ...f, trackingId: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="lbl">Shipping Partner</label>
                <input className="fi" style={{ width: '100%' }} list="courier-shipping-partners" value={form.shippingPartner}
                  onChange={e => setForm(f => ({ ...f, shippingPartner: e.target.value }))} />
                <datalist id="courier-shipping-partners">
                  {partners.map(p => <option key={p._id} value={p.name} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="lbl">Notes</label>
                <textarea className="fi" rows={2} style={{ width: '100%', resize: 'none' }} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: sanitizeMessage(e.target.value) }))} />
              </div>
            </div>

            {formErrors.length > 0 && (
              <div style={{ margin: '16px 0' }}>
                {formErrors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#ffb4ab' }}>{e}</p>)}
              </div>
            )}

            <button onClick={submitForm} disabled={saving} className="btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Shipment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierPortal;
