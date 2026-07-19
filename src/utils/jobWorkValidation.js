/**
 * src/utils/jobWorkValidation.js
 *
 * Small numeric validators for the Job Work form, layered on top of the
 * existing src/utils/inputValidation.js (reused, not modified) for the
 * description field.
 */
export { isValidMessage, sanitizeMessage, GENERIC_INVALID_MESSAGE } from './inputValidation';

export const isValidQuantity = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

export const isValidPrice = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

export const JOB_WORK_GST_RATE = 18;

/** Display-only estimate — the backend always recomputes the authoritative total. */
export const computeJobWorkTotal = (quantity, pricePerUnit) => {
  const qty = Number(quantity) || 0;
  const price = Number(pricePerUnit) || 0;
  return Math.round(qty * price * (1 + JOB_WORK_GST_RATE / 100) * 100) / 100;
};
