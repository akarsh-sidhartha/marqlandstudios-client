/**
 * src/pages/partner/ProductMediaFields.js
 *
 * Image grid + video picker used by the Partner portal's add and edit forms.
 *
 *   <ImageGrid images={useStagedImages()} />
 *     every image uploads as soon as it's picked; first image = primary;
 *     arrows reorder, ★ makes primary, bin removes; failed uploads can be retried
 *
 *   <VideoPicker value={video} onChange={setVideo} current={product.video} />
 *     value: { mode: 'keep'|'none'|'youtube'|'upload', url, file }
 *     'upload' files are sent after the product is saved, in the background
 *     task tray (chunked, resumable) and then stored on OneDrive.
 */
import React, { useRef, useState } from 'react';
import { Upload, Star, Trash2, ChevronLeft, ChevronRight, AlertCircle, Video, Link2, Ban, CheckCircle2, Loader2, PlayCircle } from 'lucide-react';
import { MAX_IMAGES } from '../../lib/useStagedImages';
import { VIDEO_ACCEPT, validateVideoFile } from '../../lib/chunkedUpload';

const GOLD = '#d4b06a';
const RED = '#e08585';
const MUTED = 'rgba(255,255,255,0.45)';

const YT = [/youtu\.be\/([\w-]{6,})/, /youtube\.com\/watch\?[^#]*v=([\w-]{6,})/, /youtube\.com\/embed\/([\w-]{6,})/, /youtube\.com\/shorts\/([\w-]{6,})/];
export const youTubeId = (url) => {
  for (const re of YT) { const m = String(url || '').match(re); if (m) return m[1]; }
  return null;
};

const tileBtn = {
  width: 20, height: 20, border: 'none', background: 'rgba(0,0,0,0.45)', color: 'white', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginRight: 2, borderRadius: 2,
};

export const ImageGrid = ({ images: imgs, error, size = 96 }) => {
  const input = useRef(null);
  const [notice, setNotice] = useState('');
  const add = (files) => setNotice(imgs.addFiles(files) || '');

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
      >
        {imgs.images.map((img, idx) => (
          <div key={img.id} style={{ position: 'relative', width: size, height: size, border: `${idx === 0 ? 2 : 1}px solid ${idx === 0 ? GOLD : 'rgba(255,255,255,0.15)'}`, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
            <img src={img.preview || img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: img.status === 'ready' ? 1 : 0.5 }} />
            {idx === 0 && (
              <span style={{ position: 'absolute', top: 3, left: 3, background: GOLD, color: '#0e1520', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 5px' }}>Primary</span>
            )}
            {img.status === 'uploading' && (
              <div style={{ position: 'absolute', left: 5, right: 5, bottom: 26, height: 3, background: 'rgba(255,255,255,0.15)' }}>
                <div style={{ width: `${Math.max(5, img.progress)}%`, height: '100%', background: GOLD, transition: 'width .2s' }} />
              </div>
            )}
            {img.status === 'error' && (
              <button type="button" onClick={() => imgs.retry(img.id)} title={img.error}
                style={{ position: 'absolute', inset: 0, background: 'rgba(224,133,133,0.25)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <AlertCircle size={16} color={RED} /> Retry
              </button>
            )}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 3, display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
              <span>
                <button type="button" title="Move left" disabled={idx === 0} onClick={() => imgs.move(img.id, -1)} style={tileBtn}><ChevronLeft size={12} /></button>
                <button type="button" title="Move right" disabled={idx === imgs.images.length - 1} onClick={() => imgs.move(img.id, 1)} style={tileBtn}><ChevronRight size={12} /></button>
                {idx !== 0 && <button type="button" title="Make primary" onClick={() => imgs.makePrimary(img.id)} style={tileBtn}><Star size={11} /></button>}
              </span>
              <button type="button" title="Remove" onClick={() => imgs.remove(img.id)} style={tileBtn}><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
        {imgs.images.length < MAX_IMAGES && (
          <button type="button" onClick={() => input.current?.click()} style={{
            width: size, height: size, border: `1px dashed ${error ? RED : 'rgba(255,255,255,0.25)'}`, background: 'none', color: MUTED, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <Upload size={18} /> Add images
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <p style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>
        First image is the primary image. {imgs.pending ? `Uploading ${imgs.pending}…` : 'Drag & drop or click to add — up to 20.'}
      </p>
      {(notice || error) && <p style={{ fontSize: 11, color: RED, marginTop: 4 }}>{error || notice}</p>}
    </div>
  );
};

const modeBtn = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
  border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.18)'}`, background: active ? 'rgba(212,176,106,0.12)' : 'none', color: active ? GOLD : 'rgba(255,255,255,0.6)',
});

export const VideoPicker = ({ value, onChange, current, error }) => {
  const set = (patch) => onChange({ ...value, ...patch });
  const ytId = value.mode === 'youtube' ? youTubeId(value.url) : null;
  const fileError = value.mode === 'upload' && value.file ? validateVideoFile(value.file) : '';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {current?.source && <button type="button" style={modeBtn(value.mode === 'keep')} onClick={() => set({ mode: 'keep' })}><CheckCircle2 size={12} /> Keep current</button>}
        <button type="button" style={modeBtn(value.mode === 'none')} onClick={() => set({ mode: 'none' })}><Ban size={12} /> No video</button>
        <button type="button" style={modeBtn(value.mode === 'youtube')} onClick={() => set({ mode: 'youtube' })}><PlayCircle size={12} /> YouTube link</button>
        <button type="button" style={modeBtn(value.mode === 'upload')} onClick={() => set({ mode: 'upload' })}><Video size={12} /> Upload video</button>
      </div>

      {value.mode === 'keep' && current?.source && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {current.source === 'upload' ? <Video size={12} color={GOLD} /> : <Link2 size={12} color={GOLD} />}
          {current.source === 'upload' ? `Uploaded video: ${current.fileName || 'video file'}` : current.url}
        </p>
      )}
      {current?.upload?.status === 'processing' && (
        <p style={{ fontSize: 11, color: GOLD, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Loader2 size={12} className="animate-spin" /> A new video ({current.upload.fileName}) is still processing.
        </p>
      )}
      {current?.upload?.status === 'failed' && (
        <p style={{ fontSize: 11, color: RED, marginTop: 6 }}>Last video upload failed: {current.upload.error}</p>
      )}

      {value.mode === 'youtube' && (
        <div>
          <input className="fi" value={value.url || ''} onChange={(e) => set({ url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…" style={{ width: '100%' }} />
          {ytId && (
            <div style={{ marginTop: 10, maxWidth: 320, aspectRatio: '16 / 9', background: '#000' }}>
              <iframe title="YouTube preview" src={`https://www.youtube.com/embed/${ytId}?rel=0`} allowFullScreen
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" style={{ width: '100%', height: '100%', border: 'none' }} />
            </div>
          )}
        </div>
      )}

      {value.mode === 'upload' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px dashed ${error || fileError ? RED : 'rgba(255,255,255,0.25)'}`, cursor: 'pointer' }}>
          <Upload size={18} color={GOLD} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            {value.file ? `${value.file.name} · ${(value.file.size / 1048576).toFixed(1)} MB` : 'Choose a video (MP4, MOV, WEBM · up to 500 MB)'}
            <span style={{ display: 'block', fontSize: 10, color: MUTED, marginTop: 2 }}>Uploads in the background after you save — you can keep working.</span>
          </span>
          <input type="file" accept={VIDEO_ACCEPT} hidden onChange={(e) => set({ file: e.target.files[0] || null })} />
        </label>
      )}
      {(error || fileError) && <p style={{ fontSize: 11, color: RED, marginTop: 6 }}>{error || fileError}</p>}
    </div>
  );
};

/** Validates a VideoPicker value; returns an error message or ''. */
export const videoError = (value) => {
  if (value.mode === 'youtube') {
    if (!value.url?.trim()) return 'Paste a YouTube link.';
    if (!youTubeId(value.url.trim())) return 'That does not look like a YouTube link.';
  }
  if (value.mode === 'upload') return validateVideoFile(value.file);
  return '';
};

/** VideoPicker value → API `video` field (undefined = leave unchanged). */
export const videoPayload = (value, { isEdit }) => {
  if (value.mode === 'keep') return undefined;
  if (value.mode === 'none') return isEdit ? { source: 'none' } : undefined;
  if (value.mode === 'youtube') {
    const url = value.url.trim();
    return { source: 'youtube', url: /^https?:\/\//i.test(url) ? url : `https://${url}` };
  }
  return { source: 'upload' };
};
