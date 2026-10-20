import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as policy from '../workers/auth-gateway/risk.mjs';

// Run the actual Worker handler with edge metadata supplied by the harness.
// There is deliberately no production test flag or missing-country bypass.
const upstream = [], buckets = new Map();
let reservations = 0;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') return { url: 'data:text/javascript,export class DurableObject {}', shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const worker = await import('../workers/auth-gateway/worker.mjs');
hooks.deregister();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  upstream.push({ url, options });
  if (url.includes('siteverify')) return Response.json({ success: options.body.get('response') === 'country-fixture-token', action: 'customer_email', hostname: 'www.registerbox.in' });
  if (url.endsWith('/user')) return Response.json({ id: 'fixture', email: 'fixture@example.invalid', email_confirmed_at: '2026-01-01', is_anonymous: false });
  return Response.json({});
};
const env = {
  AUTH_GATEWAY_ACTIVE: 'true', AUTH_CAPTCHA_BACKSTOP_VERIFIED: 'true',
  SUPABASE_URL: 'https://qbubmmwtycupfqbbmqpu.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'not-a-real-service-role', TURNSTILE_SECRET: 'not-a-real-secret',
  AUTH_RISK_SECRET: 'fixture-secret-longer-than-thirty-two-characters', TURNSTILE_HOSTNAMES: 'www.registerbox.in',
  AUTH_RISK: { getByName(name) {
    if (!buckets.has(name)) {
      let attempts = 0, failures = 0;
      buckets.set(name, { reserve: async () => { reservations++; return { started: 1, attempts: ++attempts, failures }; }, failed: async () => { failures++; } });
    }
    return buckets.get(name);
  } },
};
let serial = 0;
function request({ path = '/auth', method = 'POST', country = 'IN', cf = true, headers = {}, body } = {}) {
  const id = ++serial;
  const req = new Request(`https://gateway.fixture.workers.dev${path}`, {
    method,
    headers: { Origin: 'https://www.registerbox.in', 'CF-Connecting-IP': `192.0.2.${id}`, 'User-Agent': 'RegisterBox country fixture', 'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body: JSON.stringify(body || { action: 'customer_email', email: `fixture${id}@example.invalid` }) } : {}),
  });
  if (cf) Object.defineProperty(req, 'cf', { value: cf === true ? { country } : cf });
  return req;
}
async function blocked(options, settings = env) {
  const before = { upstream: upstream.length, reservations };
  const response = await worker.default.fetch(request(options), settings);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'region_not_allowed');
  assert.equal(upstream.length, before.upstream, 'Regional denial must occur before CAPTCHA or Supabase requests');
  assert.equal(reservations, before.reservations, 'Regional denial must occur before risk reservations');
}

assert.equal(policy.isAllowedAuthCountry('IN'), true, 'Default policy must allow India');
assert.equal(policy.isAllowedAuthCountry(undefined), false);
for (const country of ['US', 'SG', undefined, null, '', 'XX', 'T1', 'in']) {
  await blocked({ country: country === undefined ? null : country });
}
await blocked({ cf: false, headers: { 'CF-IPCountry': 'IN', 'X-Country': 'IN', 'X-Forwarded-For': '49.0.0.1' } });
await blocked({ cf: {}, headers: { 'CF-IPCountry': 'IN' } });
await blocked({ country: 'US', headers: { 'CF-IPCountry': 'IN', 'X-Country': 'IN' }, body: { action: 'customer_email', email: 'spoof@example.invalid', cf: { country: 'IN' }, country: 'IN', captchaToken: 'country-fixture-token' } });
await blocked({ path: '/remember', country: 'US', headers: { Authorization: `Bearer ${'a'.repeat(32)}`, 'CF-IPCountry': 'IN' } });
await blocked({ path: '/remember', cf: false, headers: { Authorization: `Bearer ${'a'.repeat(32)}` } });
await blocked({ path: '/status', method: 'GET', country: 'US' });
await blocked({ path: '/status', method: 'GET', cf: false });
await blocked({ path: '/status', method: 'GET', country: 'US', headers: { 'CF-IPCountry': 'IN' } }, { ...env, AUTH_GATEWAY_ACTIVE: 'false', AUTH_CAPTCHA_BACKSTOP_VERIFIED: 'false' });
for (const value of ['', '*', 'IN,*', 'IN,,SG', 'XX', null]) await blocked({}, { ...env, ALLOWED_AUTH_COUNTRIES: value });
await blocked({ country: 'US' }, { ...env, ALLOWED_AUTH_COUNTRIES: 'IN,SG' });

let response = await worker.default.fetch(request({ headers: { 'CF-IPCountry': 'US' } }), env);
assert.equal(response.status, 200, 'Only trusted country metadata controls the decision');
assert.equal((await response.json()).sent, true);
response = await worker.default.fetch(request({ country: 'SG' }), { ...env, ALLOWED_AUTH_COUNTRIES: 'IN, SG' });
assert.equal(response.status, 200, 'An explicit valid country list can extend the policy');
response = await worker.default.fetch(request({ path: '/remember', headers: { Authorization: `Bearer ${'a'.repeat(32)}` } }), env);
assert.equal(response.status, 200);
assert.ok((await response.json()).deviceProof, 'India may still create a verified remembered-device proof');

for (const path of ['/auth', '/remember', '/status', '/health']) {
  response = await worker.default.fetch(request({ path, method: 'OPTIONS', cf: false }), env);
  assert.equal(response.status, 200, 'Preflight must remain available without geolocation');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://www.registerbox.in');
}
response = await worker.default.fetch(request({ path: '/status', method: 'GET' }), env);
assert.equal(response.status, 200);
let status = await response.json();
assert.equal(status.active, true);
assert.deepEqual(status.allowedCountries, ['IN']);
response = await worker.default.fetch(request({ path: '/status', method: 'GET' }), { ...env, AUTH_GATEWAY_ACTIVE: 'false' });
assert.equal((await response.json()).active, false, 'India may use the intentional pre-rollout flow');
response = await worker.default.fetch(request({ path: '/health', method: 'GET', cf: false }), env);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true }, 'Health checks remain accessible without geolocation or Auth configuration');
response = await worker.default.fetch(request({ path: '/', method: 'GET', cf: false }), env);
assert.equal(response.status, 404, 'The gateway must not add routing for the public website');

// The country check does not weaken the existing risk-driven challenge path.
const challengeBody = { action: 'customer_email', email: 'challenge@example.invalid' };
const before = upstream.length;
response = await worker.default.fetch(request({ headers: { 'User-Agent': '' }, body: challengeBody }), env);
assert.equal(response.status, 403);
assert.equal((await response.json()).code, 'challenge_required');
assert.equal(upstream.length, before);
response = await worker.default.fetch(request({ headers: { 'User-Agent': '' }, body: { ...challengeBody, captchaToken: 'country-fixture-token' } }), env);
assert.equal(response.status, 200);
assert.ok(upstream.at(-2).url.includes('siteverify'));
assert.ok(upstream.at(-1).url.endsWith('/otp'));
globalThis.fetch = realFetch;

console.log('Passed: default India-only auth/remember/status, deny missing/foreign geo before inactive fallback, spoof-resistant metadata, strict country configuration, public health/preflight, remembered device and existing challenge path.');
