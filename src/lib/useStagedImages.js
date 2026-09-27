/**
 * src/lib/useStagedImages.js
 *
 * Image list state for a product form. Every picked image uploads straight
 * away (max 3 at a time, with per-image progress) to POST /api/v2/media/images,
 * so saving the product only sends { key, url } references and returns fast.
 *
 *   const imgs = useStagedImages(initialImages);
 *   imgs.addFiles(fileList); imgs.move(id, -1); imgs.makePrimary(id); imgs.remove(id); imgs.retry(id)
 *   const list = await imgs.settle();   // waits for in-flight uploads
 *   imgs.payload(list)                  // → [{ key, url }] for the API
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import v2 from './apiV2';

export const MAX_IMAGES = 20;
let seq = 0;
const localId = () => `img_${Date.now().toString(36)}_${(seq += 1)}`;

const createPool = (limit) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active -= 1; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
};

const fromExisting = (images = []) => images.filter((i) => i?.url).map((i) => ({
  id: localId(), key: i.key || '', url: i.url, preview: '', status: 'ready', progress: 100, error: '',
}));

export default function useStagedImages(initial = []) {
  const [images, setImages] = useState(() => fromExisting(initial));
  const uploads = useRef(new Map());
  const pool = useRef(createPool(3));
  const mounted = useRef(true);
  const listRef = useRef(images);
  listRef.current = images;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      listRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    };
  }, []);

  const patch = (id, p) => mounted.current && setImages((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const upload = useCallback((id, file) => {
    const promise = pool.current(async () => {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await v2.post('/v2/media/images', fd, {
        timeout: 45_000,
        retries: 2,
        onUploadProgress: (e) => e.total && patch(id, { progress: Math.round((e.loaded / e.total) * 100) }),
      });
      return data;
    })
      .then((data) => { patch(id, { key: data.key, url: data.url, status: 'ready', progress: 100, error: '' }); return data; })
      .catch((err) => { patch(id, { status: 'error', error: err.message }); throw err; })
      .finally(() => uploads.current.delete(id));
    uploads.current.set(id, promise);
    promise.catch(() => {});
  }, []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    const room = Math.max(0, MAX_IMAGES - listRef.current.length);
    const added = files.slice(0, room).map((file) => ({
      id: localId(), key: '', url: '', preview: URL.createObjectURL(file), file, status: 'uploading', progress: 0, error: '',
    }));
    if (!added.length) return files.length > room ? `You can add up to ${MAX_IMAGES} images.` : '';
    setImages((list) => [...list, ...added]);
    added.forEach((img) => upload(img.id, img.file));
    return files.length > room ? `Only ${room} more image(s) could be added (limit ${MAX_IMAGES}).` : '';
  };

  const remove = (id) => setImages((list) => list.filter((i) => i.id !== id));
  const retry = (id) => {
    const img = listRef.current.find((i) => i.id === id);
    if (!img?.file) return;
    patch(id, { status: 'uploading', progress: 0, error: '' });
    upload(id, img.file);
  };
  const move = (id, delta) => setImages((list) => {
    const i = list.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const makePrimary = (id) => setImages((list) => {
    const img = list.find((x) => x.id === id);
    return img ? [img, ...list.filter((x) => x.id !== id)] : list;
  });
  const reset = (next = []) => setImages(fromExisting(next));

  /** Wait for in-flight uploads and return the latest list. */
  const settle = async () => {
    if (uploads.current.size) await Promise.allSettled([...uploads.current.values()]);
    return new Promise((resolve) => setImages((list) => { resolve(list); return list; }));
  };

  const payload = (list) => list.map((i) => ({ key: i.key || '', url: i.url }));

  return {
    images, addFiles, remove, retry, move, makePrimary, reset, settle, payload,
    pending: images.filter((i) => i.status === 'uploading').length,
    hasErrors: images.some((i) => i.status === 'error'),
  };
}
