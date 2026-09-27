/**
 * src/lib/apiClient.js
 *
 * Shared axios instance for authenticated calls from the logged-in portals
 * (Partner). The access token is whatever setAuthToken() was last given —
 * SupplierPortal sets it from the Partner login session.
 *
 * A 401 means the session expired: listeners registered with
 * onAuthExpired() are told so the portal can log the user out cleanly
 * instead of failing request by request.
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

let token = null;
const expiredListeners = new Set();

export const setAuthToken = (t) => { token = t || null; };
export const onAuthExpired = (fn) => { expiredListeners.add(fn); return () => expiredListeners.delete(fn); };

const http = axios.create({ baseURL: `${API_BASE}/api`, timeout: 30_000 });

http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && token) expiredListeners.forEach((fn) => fn());
    return Promise.reject(err);
  }
);

export default http;
