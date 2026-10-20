import { DurableObject } from 'cloudflare:workers';
import { allowedAuthCountries, decideAuthRisk, isAllowedAuthCountry, reserveAttempt, RISK_WINDOW_MS } from './risk.mjs';

const origin = 'https://qbubmmwtycupfqbbmqpu.supabase.co';
const webOrigins = new Set(['https://registerbox.in', 'https://www.registerbox.in', 'https://admin.registerbox.in']);
const actions = new Set(['customer_email', 'admin_email']);
const encode = value => new TextEncoder().encode(value);

export class AuthRiskBucket extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY, started INTEGER NOT NULL, attempts INTEGER NOT NULL, failures INTEGER NOT NULL)');
    });
  }
  async reserve() {
    const next = this.ctx.storage.transactionSync(() => {
      const current = this.ctx.storage.sql.exec('SELECT started,attempts,failures FROM counter WHERE id=1').toArray()[0];
      const next = reserveAttempt(current, Date.now());
      this.ctx.storage.sql.exec('INSERT OR REPLACE INTO counter VALUES (1,?,?,?)', next.started, next.attempts, next.failures);
      return next;
    });
    await this.ctx.storage.setAlarm(next.started + RISK_WINDOW_MS + 60_000);
    return next;
  }
  async failed(started) {
    this.ctx.storage.sql.exec('UPDATE counter SET failures=MIN(failures+1,1000000) WHERE id=1 AND started=?', started);
  }
  async alarm() { this.ctx.storage.sql.exec('DELETE FROM counter WHERE started <= ?', Date.now() - RISK_WINDOW_MS); }
}

function reply(request, status, body) {
  const caller = request.headers.get('Origin');
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store', Vary: 'Origin',
    ...(webOrigins.has(caller) ? { 'Access-Control-Allow-Origin': caller } : {}),
    'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...(status === 429 ? { 'Retry-After': '300' } : {}),
  } });
}

async function boundedJson(response, max = 8192) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing body');
  let total = 0, timer;
  const chunks = [];
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > max) throw new Error('Body too large');
          chunks.push(value);
        }
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        return JSON.parse(new TextDecoder().decode(bytes));
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Read timed out')), 5000); }),
    ]);
  } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); }
}
async function getKey(secret) {
  return crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function digest(key, value) {
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function deviceProof(key, email, ua) {
  const body = btoa(JSON.stringify({ id: crypto.randomUUID(), account: await digest(key, `email:${email}`), ua: await digest(key, `ua:${ua}`), expires: Date.now() + 30 * 86400_000 }));
  return `${body}.${await digest(key, body)}`;
}
async function remembered(key, token, email, ua) {
  if (typeof token !== 'string' || token.length > 1024) return false;
  try {
    const [body, signature, extra] = token.split('.');
    if (extra !== undefined || !/^[a-f0-9]{64}$/.test(signature)) return false;
    if (!await crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/../g), hex => parseInt(hex, 16)), encode(body))) return false;
    const data = JSON.parse(atob(body));
    return typeof data.expires === 'number' && data.expires > Date.now() && data.expires <= Date.now() + 31 * 86400_000
      && data.account === await digest(key, `email:${email}`) && data.ua === await digest(key, `ua:${ua}`);
  } catch { return false; }
}
async function challengeValid(token, action, ip, env) {
  if (typeof token !== 'string' || !token.length || token.length > 2048) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  if (!response.ok) return false;
  const data = await boundedJson(response);
  const allowed = new Set(env.TURNSTILE_HOSTNAMES.split(',').map(host => host.trim()).filter(Boolean));
  if (!allowed.size || allowed.has('localhost') || allowed.has('127.0.0.1')) return false;
  return data.success === true && data.action === action && allowed.has(data.hostname);
}



export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (!['/auth', '/remember', '/status', '/health'].includes(path)) return reply(request, 404, { error: 'Not found' });
    const caller = request.headers.get('Origin');
    if (caller && !webOrigins.has(caller)) return reply(request, 403, { error: 'Request not allowed' });
    if (request.method === 'OPTIONS') return reply(request, 200, {});
    if (path === '/health') return request.method === 'GET' ? reply(request, 200, { ok: true }) : reply(request, 405, { error: 'Method not allowed' });
    // The location is supplied by Cloudflare's incoming Request, not an HTTP
    // header or body claim. Gate status too: an inactive gateway must not let a
    // foreign client enter the deliberate pre-rollout direct-Auth flow.
    if (!isAllowedAuthCountry(request.cf?.country, env.ALLOWED_AUTH_COUNTRIES)) {
      return reply(request, 403, { code: 'region_not_allowed', error: 'Sign-in is available only from supported countries. Please connect from India.' });
    }
    if (path === '/status' && request.method === 'GET') return reply(request, 200, {
      active: env.AUTH_GATEWAY_ACTIVE === 'true' && env.AUTH_CAPTCHA_BACKSTOP_VERIFIED === 'true',
      allowedCountries: allowedAuthCountries(env.ALLOWED_AUTH_COUNTRIES),
    });
    if (request.method !== 'POST') return reply(request, 405, { error: 'Method not allowed' });
    // Separate release gate: prove CAPTCHA rejects unverified direct Supabase
    // calls before activating. This is a CAPTCHA backstop, not a private origin:
    // a caller with a valid CAPTCHA can still bypass this gateway's risk score.
    if (env.AUTH_GATEWAY_ACTIVE !== 'true' || env.AUTH_CAPTCHA_BACKSTOP_VERIFIED !== 'true' || env.SUPABASE_URL !== origin || !env.SUPABASE_SERVICE_ROLE_KEY
      || !env.TURNSTILE_SECRET || typeof env.AUTH_RISK_SECRET !== 'string' || env.AUTH_RISK_SECRET.length < 32) {
      return reply(request, 503, { error: 'Secure sign-in is not ready. Please try again later.' });
    }
    // Runtime edge metadata only. Never trust JSON/header claims of risk, device
    // history or TLS fingerprints, nor fall back to caller X-Forwarded-For.
    const ip = request.cf ? request.headers.get('CF-Connecting-IP') : null;
    if (!ip || ip.length > 64 || ip === '2a06:98c0:3600::103') return reply(request, 403, { error: 'Please sign in directly from the RegisterBox app or website.' });
    const ua = request.headers.get('User-Agent')?.slice(0, 512) || '';
    try {
      const key = await getKey(env.AUTH_RISK_SECRET);
      const bucket = env.AUTH_RISK.getByName(await digest(key, `ip:${ip}`));
      const state = await bucket.reserve();
      if (state.attempts > 80 || state.failures > 25) return reply(request, 429, { error: 'Too many attempts. Please try again shortly.' });
      let body;
      try { body = await boundedJson(request); } catch { return reply(request, 400, { error: 'Invalid request' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(request, 400, { error: 'Invalid request' });
      if (path === '/remember') {
        const authorization = request.headers.get('Authorization') || '';
        if (!/^Bearer [^\s]{20,8192}$/.test(authorization)) return reply(request, 401, { error: 'Sign-in required' });
        const response = await fetch(`${origin}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: authorization }, signal: AbortSignal.timeout(10_000) });
        const user = await boundedJson(response, 65536);
        if (!response.ok || !user?.id || !user.email_confirmed_at || user.is_anonymous || typeof user.email !== 'string') {
          await bucket.failed(state.started); return reply(request, 401, { error: 'Sign-in required' });
        }
        return reply(request, 200, { deviceProof: await deviceProof(key, user.email.trim().toLowerCase(), ua) });
      }
      const { action, email, captchaToken } = body;
      if (!actions.has(action) || typeof email !== 'string' || email.length > 254 || email !== email.trim().toLowerCase()
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(request, 400, { error: 'Check your sign-in details' });
      const recipient = await env.AUTH_RISK.getByName(await digest(key, `email:${email}`)).reserve();
      const risk = decideAuthRisk({ ...state, emailAttempts: recipient.attempts, remembered: await remembered(key, body.deviceProof, email, ua), userAgent: ua });
      if (risk === 'deny') return reply(request, 429, { error: 'Too many attempts. Please try again shortly.' });
      if (risk === 'challenge' && !captchaToken) return reply(request, 403, { code: 'challenge_required', error: 'Please complete a security check.' });
      if (captchaToken || risk === 'challenge') {
        if (!await challengeValid(captchaToken, action, ip, env)) {
          await bucket.failed(state.started); return reply(request, 403, { error: 'Security check could not be verified. Please try again.' });
        }
      }
      // Fixed upstream/actions. Never forward caller authorization, apikey,
      // arbitrary paths, grant types, redirect URLs or user metadata.
      const response = await fetch(`${origin}/auth/v1/otp`, {
        method: 'POST', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ email, create_user: action === 'customer_email' }),
      });
      await boundedJson(response, 65536);
      if (!response.ok) {
        return reply(request, response.status === 429 ? 429 : 400, { error: 'Could not send the code. Please try again shortly.' });
      }
      return reply(request, 200, { sent: true });
    } catch {
      // No request bodies, credentials, tokens, email addresses or IPs in logs.
      return reply(request, 503, { error: 'Secure sign-in is temporarily unavailable. Please try again.' });
    }
  },
};
