export const CONSENT_VERSION = 'gst-v1-2026-09-24';
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function validPeriod(year: unknown, month: unknown, now = new Date()) {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return false;
  const y = year as number, m = month as number;
  return y >= 2017 && m >= 1 && m <= 12 && !(y === 2017 && m < 7)
    && y * 12 + m <= now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
}

export function periodIsClosed(year: number, month: number, now = new Date()) {
  const india = new Date(now.getTime() + 330 * 60 * 1000);
  return year < india.getUTCFullYear() || (year === india.getUTCFullYear() && month < india.getUTCMonth() + 1);
}

export function expiryIso(value: unknown, now = Date.now()) {
  const timestamp = Number(value);
  // Sandbox documents Unix milliseconds. Reject absent, expired, or implausible expiry.
  if (!Number.isFinite(timestamp) || timestamp <= now || timestamp > now + 7 * 3600000) {
    throw new Error('GST returned an invalid session expiry. Please reconnect.');
  }
  return new Date(timestamp).toISOString();
}

async function encryptionKey(secret: string) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('registerbox-gst-v1'), info: encoder.encode('taxpayer-session-storage') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

export async function encryptToken(token: string, secret: string, owner: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(owner) }, await encryptionKey(secret), new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(bytes)));
}

export async function decryptToken(encoded: string, secret: string, owner: string) {
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0,12), additionalData: new TextEncoder().encode(owner) }, await encryptionKey(secret), bytes.slice(12));
  return new TextDecoder().decode(plain);
}
