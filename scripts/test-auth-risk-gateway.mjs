import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import * as policy from '../workers/auth-gateway/risk.mjs';

const normal = { attempts: 1, failures: 0, emailAttempts: 1, remembered: false, userAgent: 'RegisterBox fixture browser' };
assert.equal(policy.decideAuthRisk(normal), 'allow');
assert.equal(policy.decideAuthRisk({ ...normal, attempts: 6 }), 'challenge');
assert.equal(policy.decideAuthRisk({ ...normal, failures: 3 }), 'challenge');
assert.equal(policy.decideAuthRisk({ ...normal, emailAttempts: 20 }), 'challenge', 'Recipient volume must never lock an account out');
assert.equal(policy.decideAuthRisk({ ...normal, attempts: 81, remembered: true }), 'deny');
assert.equal(policy.decideAuthRisk({ ...normal, failures: 26, remembered: true }), 'deny');
assert.throws(() => policy.decideAuthRisk({ ...normal, attempts: NaN }));
assert.equal(policy.reserveAttempt({ started: 0, attempts: 80, failures: 30 }, policy.RISK_WINDOW_MS).attempts, 1);

function load(file, modules, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require: name => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return exports;
}
const upstream = [], redemptions = new Set();
let allowedHostname = 'registerbox.in', expectedAction = 'customer_email';
const fakeFetch = async (url, options = {}) => {
  upstream.push({ url, options });
  if (url.includes('siteverify')) {
    const token = options.body.get('response');
    const success = token === 'valid-fixture' && !redemptions.has(token);
    redemptions.add(token);
    return Response.json({ success, action: expectedAction, hostname: allowedHostname });
  }
  if (url.endsWith('/user')) return Response.json({ id: 'fixture', email: 'fixture@example.invalid', email_confirmed_at: '2026-01-01', is_anonymous: false });
  return Response.json({});
};
class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }
const worker = load('workers/auth-gateway/worker.mjs', { 'cloudflare:workers': { DurableObject }, './risk.mjs': policy }, {
  crypto, TextEncoder, TextDecoder, URL, URLSearchParams, Request, Response, AbortSignal, setTimeout, clearTimeout, atob, btoa, fetch: fakeFetch,
});
const buckets = new Map();
const env = { AUTH_GATEWAY_ACTIVE: 'true', AUTH_CAPTCHA_BACKSTOP_VERIFIED: 'true', SUPABASE_URL: 'https://qbubmmwtycupfqbbmqpu.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'not-a-real-service-role', TURNSTILE_SECRET: 'not-a-real-secret',
  AUTH_RISK_SECRET: 'fixture-secret-longer-than-thirty-two-characters', TURNSTILE_HOSTNAMES: 'registerbox.in,www.registerbox.in,admin.registerbox.in',
  AUTH_RISK: { getByName(name) {
    if (!buckets.has(name)) {
      const db = new DatabaseSync(':memory:');
      // Cloudflare executes sql.exec immediately; adapt Node SQLite to that API.
      const execute = { exec(query, ...args) { const statement = db.prepare(query); const rows = statement.columns().length ? statement.all(...args) : (statement.run(...args), []); return { toArray: () => rows }; } };
      const ctx = { blockConcurrencyWhile: callback => callback(), storage: {
        sql: execute,
        transactionSync(callback) { db.exec('BEGIN'); try { const result = callback(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } },
        setAlarm: async () => {},
      } };
      buckets.set(name, new worker.AuthRiskBucket(ctx, env));
    }
    return buckets.get(name);
  } },
};
let address = 0;
function request(body, { ip = `192.0.2.${++address}`, headers = {}, path = '/auth', trusted = true } = {}) {
  const request = new Request(`https://registerbox-auth-gateway.fixture.workers.dev${path}`, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'CF-Connecting-IP': ip, 'User-Agent': normal.userAgent, ...headers,
  }, body: JSON.stringify(body) });
  if (trusted) Object.defineProperty(request, 'cf', { value: { country: 'IN' } });
  return request;
}
const credentials = { action: 'customer_email', email: 'fixture@example.invalid' };
const statusRequest = new Request('https://registerbox-auth-gateway.fixture.workers.dev/status');
Object.defineProperty(statusRequest, 'cf', { value: { country: 'IN' } });
let status = await worker.default.fetch(statusRequest, { ...env, AUTH_GATEWAY_ACTIVE: 'false' });
assert.equal((await status.json()).active, false);
status = await worker.default.fetch(statusRequest, env);
assert.equal((await status.json()).active, true);
let result = await worker.default.fetch(request(credentials), { ...env, AUTH_GATEWAY_ACTIVE: 'false' });
assert.equal(result.status, 503); assert.equal(upstream.length, 0);
result = await worker.default.fetch(request({}, { path: '/__readiness' }), { ...env, AUTH_GATEWAY_ACTIVE: 'false' });
assert.equal(result.status, 404); assert.equal(upstream.length, 0, 'Readiness must not expose a public privileged probe');
result = await worker.default.fetch(request({}, { path: '/__readiness', headers: { Authorization: `Bearer ${'a'.repeat(64)}` } }), { ...env, AUTH_GATEWAY_ACTIVE: 'false', AUTH_PROBE_SECRET: `${Date.now()+300000}.fixture` });
assert.equal(result.status, 404); assert.equal(upstream.length, 0, 'Forged probe signatures must not call upstream');
result = await worker.default.fetch(request(credentials), { ...env, AUTH_CAPTCHA_BACKSTOP_VERIFIED: 'false' });
assert.equal(result.status, 503); assert.equal(upstream.length, 0, 'Do not activate on mocked proof of origin protection');
result = await worker.default.fetch(request(credentials, { trusted: false }), env);
assert.equal(result.status, 403); assert.equal(upstream.length, 0);
result = await worker.default.fetch(request(credentials, { headers: { Origin: 'https://attacker.invalid' } }), env);
assert.equal(result.status, 403); assert.equal(upstream.length, 0);
result = await worker.default.fetch(request(credentials, { headers: { Authorization: 'Bearer attacker', apikey: 'attacker', 'X-Forwarded-For': '1.1.1.1' } }), env);
assert.equal(result.status, 200);
assert.ok(!upstream.at(-1).url.includes('siteverify'), 'Low risk must go straight to Auth');
assert.equal(upstream.at(-1).options.headers.Authorization, 'Bearer not-a-real-service-role');
assert.equal(JSON.parse(upstream.at(-1).options.body).create_user, true);
await worker.default.fetch(request({ ...credentials, email: 'staff@example.invalid', action: 'admin_email' }), env);
assert.equal(JSON.parse(upstream.at(-1).options.body).create_user, false);

// Recipient rotation across IPs requires proof, not an account lockout.
await worker.default.fetch(request(credentials), env);
await worker.default.fetch(request(credentials), env);
const before = upstream.length;
result = await worker.default.fetch(request(credentials), env);
assert.equal(result.status, 403); assert.equal((await result.json()).code, 'challenge_required');
assert.equal(upstream.length, before, 'Medium risk must not hit Auth before verification');
result = await worker.default.fetch(request({ ...credentials, captchaToken: 'valid-fixture' }), env);
assert.equal(result.status, 200);
assert.ok(upstream.at(-2).url.includes('siteverify'));
result = await worker.default.fetch(request({ ...credentials, captchaToken: 'valid-fixture' }), env);
assert.equal(result.status, 403, 'Replay must fail');
allowedHostname = 'localhost'; redemptions.clear();
result = await worker.default.fetch(request({ ...credentials, captchaToken: 'valid-fixture' }), env);
assert.equal(result.status, 403, 'A local token must not protect production');
allowedHostname = 'registerbox.in'; expectedAction = 'admin_email'; redemptions.clear();
result = await worker.default.fetch(request({ ...credentials, captchaToken: 'valid-fixture' }), env);
assert.equal(result.status, 403, 'Action mismatch must fail');

// Reserves persist under concurrent requests. High risk is denied before either
// Siteverify or OTP Auth even when a token/device-known flag is supplied.
const floodIp = '198.51.100.1';
await Promise.all(Array.from({ length: 81 }, (_, index) => worker.default.fetch(request({ ...credentials, email: `flood${index}@example.invalid` }, { ip: floodIp }), env)));
const afterFlood = upstream.length;
result = await worker.default.fetch(request({ action: 'customer_email', email: 'target@example.invalid', captchaToken: 'valid-fixture', remembered: true, score: 0 }, { ip: floodIp }), env);
assert.equal(result.status, 429); assert.equal(upstream.length, afterFlood);
result = await worker.default.fetch(request({ action: 'customer_password', email: 'password@example.invalid', password: 'fixture-password' }), env);
assert.equal(result.status, 400, 'Password actions are unsupported and must never reach Auth');
assert.equal(upstream.length, afterFlood);
result = await worker.default.fetch(request({}, { path: '/remember', headers: { Authorization: `Bearer ${'a'.repeat(32)}` } }), env);
assert.equal(result.status, 200);
const rememberedDevice = await result.json();
assert.ok(rememberedDevice.deviceProof);
assert.ok(!JSON.stringify(rememberedDevice).includes('not-a-real-service-role'));

// Real client transport: challenge callback is lazy and cannot fail open.
const storage = new Map();
const configuration = { EXPO_PUBLIC_AUTH_GATEWAY_URL: 'https://registerbox-auth-gateway.fixture.workers.dev' };
let mode = 'allow', challengeCount = 0, sendCount = 0;
const client = load('src/lib/auth-gateway.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => storage.get(key), setItem: async (key, value) => storage.set(key, value) } } }, {
  process: { env: configuration }, URL, AbortSignal,
  fetch: async (url, options) => {
    if (mode === 'offline') throw new Error('offline');
    if (url.endsWith('/status')) return mode === 'foreign' ? Response.json({ code: 'region_not_allowed' }, { status: 403 }) : Response.json({ active: mode !== 'inactive' });
    sendCount++;
    const body = JSON.parse(options.body);
    if (mode === 'deny') return Response.json({ error: 'Too many attempts' }, { status: 429 });
    if (mode === 'challenge' && !body.captchaToken) return Response.json({ code: 'challenge_required' }, { status: 403 });
    return Response.json({ sent: true });
  },
});
const verify = async () => { challengeCount++; return 'client-fixture-token'; };
await client.adaptiveAuthRequest('customer_email', credentials.email, verify);
assert.equal(challengeCount, 0); assert.equal(sendCount, 1);
mode = 'challenge';
await client.adaptiveAuthRequest('customer_email', credentials.email, verify);
assert.equal(challengeCount, 1); assert.equal(sendCount, 3);
mode = 'deny'; await assert.rejects(client.adaptiveAuthRequest('customer_email', credentials.email, verify));
mode = 'offline'; await assert.rejects(client.adaptiveAuthRequest('customer_email', credentials.email, verify));
mode = 'foreign'; await assert.rejects(client.adaptiveAuthRequest('customer_email', credentials.email, verify), /India only/);
assert.equal(challengeCount, 1);
delete configuration.EXPO_PUBLIC_AUTH_GATEWAY_URL;
mode = 'inactive';
assert.equal(await client.adaptiveAuthRequest('customer_email', credentials.email, verify), null, 'Only explicit server inactive status permits the pre-rollout flow');
console.log('Passed: policy, real SQLite reservations, low/medium/high dispatch, no CAPTCHA on low risk, replay/hostname/action rejection, fixed upstream, atomic flood budget, normal user session response, lazy UI challenge and no gateway-error fallback. Hosted activation remains unverified.');
