import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import ts from 'typescript';

const model = 'nvidia/nemotron-3.5-super-vl:free';
const token = 'unit-test-token-not-a-real-secret-0123456789';
const digest = createHash('sha256').update(token).digest('hex');
const source = fs.readFileSync('supabase/functions/harvey-brain/index.ts', 'utf8')
  .replace(/const TOKEN_HASH = '[a-f0-9]+';/, `const TOKEN_HASH = '${digest}';`);
let serve;
let upstreamCalls = 0;
let upstreamStatus = 200;
let cost = 0;
let finish = 'stop';
let keyPresent = true;
const sandbox = { exports: {}, Request, Response, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto, AbortSignal,
  Deno: { env: { get: () => keyPresent ? 'test-provider-key' : undefined }, serve: (fn) => { serve = fn; } },
  fetch: async (url, options) => {
    upstreamCalls++;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-provider-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, model);
    assert.deepEqual(body.tools, []);
    assert.equal(body.tool_choice, 'none');
    assert.equal(body.provider.allow_fallbacks, false);
    assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, request: 0 });
    assert.equal(body.plugins, undefined);
    return new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: 'draft' } }], usage: { cost } }), { status: upstreamStatus });
  },
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
const request = (body, auth = token) => new Request('https://example.test', { method: 'POST', headers: { Authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
assert.equal((await serve(request({ action: 'health' }, 'invalid'))).status, 401);
assert.equal((await serve(request({ action: 'health' }))).status, 200);
assert.equal(upstreamCalls, 0);
keyPresent = false;
assert.equal((await serve(request({ action: 'health' }))).status, 503);
keyPresent = true;
assert.equal((await serve(request({ prompt: 'draft', model: 'paid' }))).status, 400);
assert.equal((await serve(request({ prompt: 'x'.repeat(190000), model }))).status, 413);
assert.equal(upstreamCalls, 0);
assert.equal((await serve(request({ prompt: 'draft', model }))).status, 200);
upstreamStatus = 429;
assert.equal((await serve(request({ prompt: 'draft', model }))).status, 429);
upstreamStatus = 200; cost = 1;
assert.equal((await serve(request({ prompt: 'draft', model }))).status, 502);
cost = 0; finish = 'length';
assert.equal((await serve(request({ prompt: 'draft', model }))).status, 502);
console.log('Harvey proxy: auth, missing secret, size bounds, free-only routing, 429, nonzero cost and truncated output checks passed.');
