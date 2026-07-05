/**
 * src/utils/inputValidation.js
 *
 * Client-side mirror of the backend's utils/inputValidation.js — same
 * rules, so the person sees an error immediately instead of waiting for a
 * server round-trip. This is a UX layer only; the server re-validates
 * everything from scratch and is the actual security boundary.
 *
 * - Name-like fields (company name, contact name, "how did you hear about
 *   us", message) -> alphanumeric + spaces only.
 * - Email -> standard email format.
 * - Phone -> digits, spaces, +, -, ( ) only.
 * - Website -> must be a well-formed http(s) URL.
 * - Password -> NOT alphanumeric-restricted (see note in the backend file —
 *   restricting password charset would weaken security, not improve it).
 */

export const NAME_REGEX    = /^[a-zA-Z0-9 ]*$/;
export const EMAIL_REGEX   = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX   = /^[0-9+\-() ]*$/;
export const MESSAGE_REGEX = /^[a-zA-Z0-9 \r\n]*$/;

// Strip-as-you-type helpers — used in onChange handlers so invalid
// characters simply never appear in the field, rather than being rejected
// only on submit.
export const sanitizeName    = (v) => v.replace(/[^a-zA-Z0-9 ]/g, '');
export const sanitizePhone   = (v) => v.replace(/[^0-9+\-() ]/g, '');
export const sanitizeMessage = (v) => v.replace(/[^a-zA-Z0-9 \r\n]/g, '');

export const isValidName    = (v) => NAME_REGEX.test(v || '');
export const isValidEmail   = (v) => !!v && v.length <= 254 && EMAIL_REGEX.test(v);
export const isValidPhone   = (v) => !v || PHONE_REGEX.test(v);
export const isValidMessage = (v) => !v || MESSAGE_REGEX.test(v);
// NOT alphanumeric-restricted — see the backend file's note on why
// restricting a password's character set would weaken, not strengthen,
// security. Only a length check is applied, matching the User model's
// existing 8-character minimum.
export const isValidPassword = (v) => typeof v === 'string' && v.length >= 8 && v.length <= 200;

export const isSafeUrl = (v) => {
  if (!v) return true; // optional field
  if (/[<>"'`]/.test(v)) return false;
  // Protocol is optional — "www.example.com" or "example.com" work, same as
  // "https://example.com". Mirrors the backend's isSafeUrl exactly.
  const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidate);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Normalizes a website value before sending to the server — prepends
// https:// if the person left the protocol off.
export const normalizeUrl = (v) => {
  if (!v) return '';
  const trimmed = v.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const GENERIC_INVALID_MESSAGE = 'Please use only letters, numbers, and spaces.';