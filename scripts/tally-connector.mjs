/** Run with Node 22.18+ on the Windows computer hosting Tally. */
import http from 'node:http';
import https from 'node:https';
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTallyCsv, collectionXml, assertExport, nodes, values, voucherXml, ledgerXml, importResult } from '../src/lib/tally-core.ts';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const name = object => String(object.NAME || object['@_NAME'] || '');
const scalar = (object, key) => String(object[key] || '');
const now = () => new Date().toISOString();
const publicJob = job => ({ id: job.id, company: job.company, state: job.state, total: job.operations.length, applied: job.operations.filter(o => o.state === 'APPLIED').length, message: job.message, updatedAt: job.updatedAt });

export function createConnector(config) {
  const { tallyUrl, token, dataDir, origins = [], timeoutMs = 15000 } = config;
  if (!token || token.length < 32) throw Error('Set TALLY_CONNECTOR_TOKEN to a random secret of at least 32 characters.');
  const target = new URL(tallyUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw Error('Invalid TALLY_URL.');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const lock = resolve(dataDir, 'writer.lock');
  try { mkdirSync(lock); } catch {
    // Recover only a verifiably dead local owner; an unreadable or live owner remains locked.
    let dead = false;
    try { const owner = JSON.parse(readFileSync(resolve(lock, 'owner.json'), 'utf8')); if (Number.isInteger(owner.pid) && owner.pid > 0) { try { process.kill(owner.pid, 0); } catch (e) { dead = e.code === 'ESRCH'; } } } catch {}
    if (!dead) throw Error('Connector data directory is locked. Stop the other connector or follow the stale-lock recovery instructions.');
    rmSync(lock, { recursive: true }); mkdirSync(lock);
  }
  writeFileSync(resolve(lock, 'owner.json'), JSON.stringify({ pid: process.pid }), { mode: 0o600, flush: true });
  const file = resolve(dataDir, 'journal.json');
  let store;
  try { store = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') { rmSync(lock, { recursive: true }); throw e; } store = { target: tallyUrl, jobs: {}, operations: {} }; }
  if (store.target !== tallyUrl) { rmSync(lock, { recursive: true }); throw Error('TALLY_URL changed. Use a separate data directory for a different installation.'); }
  function save() { writeFileSync(`${file}.tmp`, JSON.stringify(store), { mode: 0o600, flush: true }); renameSync(`${file}.tmp`, file); }
  for (const op of Object.values(store.operations)) if (op.state === 'SENT') op.state = 'OUTCOME_UNKNOWN';
  for (const job of Object.values(store.jobs)) {
    if (job.state === 'SENT') { job.state = 'OUTCOME_UNKNOWN'; job.message = 'Connector restarted during a write. Reconcile before importing more entries.'; }
    if (job.state === 'QUEUED') { job.state = 'REJECTED'; job.message = 'Connector restarted before dispatch. Upload the same file to resume safely.'; }
  }
  save();
  let chain = Promise.resolve(); let closing = false;
  const exclusive = task => { const result = chain.then(task); chain = result.catch(() => {}); return result; };
  async function post(xml) {
    const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8' }, body: xml, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    if (!response.ok) throw Error(`Tally HTTP ${response.status}.`);
    const reader = response.body.getReader(); const parts = []; let length = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 10_000_000) { await reader.cancel(); throw Error('Tally response exceeds 10 MB.'); } parts.push(value); }
    return new TextDecoder().decode(Buffer.concat(parts));
  }
  async function collection(type, company = '', from = '', to = '') { return nodes(assertExport(await post(collectionXml(type, company, from, to))), type.toUpperCase()); }
  async function companies() {
    return (await collection('Company')).map(o => ({ name: name(o), guid: scalar(o, 'GUID') })).filter(c => c.name && c.guid);
  }
  async function verifyCompany(company) {
    if (!company || typeof company.name !== 'string' || typeof company.guid !== 'string' || !(await companies()).some(c => c.name === company.name && c.guid === company.guid)) throw Error('Company identity does not match a loaded Tally company. Reload the company list.');
  }
  async function reconcile(op, company) {
    await verifyCompany(company);
    if (op.kind === 'ledger') {
      const matches = (await collection('Ledger', company.name)).filter(l => name(l) === op.object.name);
      if (!matches.length) return { found: false };
      return { found: true, matches: matches.length === 1 && !!scalar(matches[0], 'GUID') && scalar(matches[0], 'PARENT') === op.object.parent, identity: scalar(matches[0], 'GUID') };
    }
    const v = op.object;
    const objects = await collection('Voucher', company.name, v.date, v.date);
    const matches = objects.filter(o => scalar(o, 'GUID') === op.remoteId || scalar(o, '@_REMOTEID') === op.remoteId);
    if (!matches.length) {
      if (objects.some(o => scalar(o, 'DATE') === v.date.replace(/-/g, '') && scalar(o, 'VOUCHERTYPENAME') === v.voucherType && scalar(o, 'VOUCHERNUMBER') === v.voucherNumber)) throw Error('A voucher with this number, type and date already exists under a different identity.');
      return { found: false };
    }
    const actual = matches[0];
    const lineKey = lines => lines.map(l => `${l.ledger}\u0000${l.amount}`).sort().join('\n');
    const actualLines = nodes(actual, 'ALLLEDGERENTRIES.LIST').map(l => {
      const amount = scalar(l, 'AMOUNT');
      if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) throw Error('Unrecognized Tally amount; reconciliation needs review.');
      const negative = amount.startsWith('-'); const [whole, fraction = ''] = amount.replace(/^-/, '').split('.');
      return { ledger: scalar(l, 'LEDGERNAME'), amount: (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (negative ? -1 : 1) };
    });
    return { found: true, matches: matches.length === 1 && scalar(actual, 'DATE') === v.date.replace(/-/g, '') && scalar(actual, 'VOUCHERTYPENAME') === v.voucherType && scalar(actual, 'VOUCHERNUMBER') === v.voucherNumber && scalar(actual, 'NARRATION') === v.narration && !['Yes', 'yes'].includes(scalar(actual, 'ISCANCELLED')) && !['Yes', 'yes'].includes(scalar(actual, 'ISOPTIONAL')) && lineKey(actualLines) === lineKey(v.lines), identity: scalar(actual, 'MASTERID') || scalar(actual, 'GUID') };
  }
  function update(job, state, message) { job.state = state; job.message = message; job.updatedAt = now(); save(); }
  async function preflight(batch, company) {
    await verifyCompany(company);
    if (batch.mode === 'ledgers') {
      const groups = new Set((await collection('Group', company.name)).map(name));
      const missing = batch.ledgers.filter(l => !groups.has(l.parent));
      if (missing.length) throw Error(`Missing parent groups: ${[...new Set(missing.map(l => l.parent))].join(', ')}`);
    } else {
      const ledgers = new Set((await collection('Ledger', company.name)).map(name));
      const types = new Set((await collection('VoucherType', company.name)).map(name));
      const missing = [...new Set(batch.vouchers.flatMap(v => v.lines.map(l => l.ledger)).filter(l => !ledgers.has(l)))];
      if (missing.length) throw Error(`Missing ledgers: ${missing.join(', ')}. Import or map these first.`);
      if (batch.vouchers.some(v => !types.has(v.voucherType))) throw Error('A requested voucher type is missing in Tally.');
    }
  }
  async function run(job, batch) {
    try {
      const own = new Set(job.operations.map(o => o.id));
      if (Object.entries(store.operations).some(([id, op]) => !own.has(id) && op.companyGuid === job.company.guid && ['SENT', 'OUTCOME_UNKNOWN'].includes(op.state))) throw Error('Another import has an unresolved write. Reconcile it first.');
      await preflight(batch, job.company);
      update(job, 'SENT', 'Import in progress.');
      for (const reference of job.operations) {
        const op = store.operations[reference.id];
        if (op.state === 'APPLIED') { reference.state = 'APPLIED'; continue; }
        const before = await reconcile(op, job.company);
        if (before.found) {
          if (!before.matches || op.kind === 'ledger' && !op.dispatched) { op.state = op.dispatched ? 'OUTCOME_UNKNOWN' : 'REJECTED'; reference.state = op.state; update(job, op.state, 'An existing object needs review. No overwrite was sent.'); return; }
          op.state = 'APPLIED'; op.identity = before.identity; reference.state = op.state; save(); continue;
        }
        if (op.state === 'OUTCOME_UNKNOWN' || op.state === 'SENT') { update(job, 'OUTCOME_UNKNOWN', 'Previous write outcome is unknown. No retry was sent.'); return; }
        // The durable dispatch marker is saved BEFORE the Tally POST.
        op.state = 'SENT'; op.dispatched = true; reference.state = op.state; save();
        let result;
        try {
          result = importResult(await post(op.kind === 'voucher' ? voucherXml(job.company.name, op.object, op.remoteId) : ledgerXml(job.company.name, op.object)));
          op.result = result; save();
          const after = await reconcile(op, job.company);
          if (!after.found || !after.matches) {
            op.state = result.created === 0 && result.errors > 0 && !after.found ? 'REJECTED' : 'OUTCOME_UNKNOWN';
            reference.state = op.state;
            update(job, op.state, result.messages.join('; ') || 'Tally did not return a matching saved object. Review Tally import exceptions.'); return;
          }
          // Logical errors/partial writes cannot be hidden by a matching object.
          if (!result.ok) { op.state = 'OUTCOME_UNKNOWN'; reference.state = op.state; update(job, 'OUTCOME_UNKNOWN', 'Object exists, but Tally reported an import exception. Review the result in Tally.'); return; }
          op.state = 'APPLIED'; op.identity = after.identity; reference.state = op.state; save();
        } catch {
          op.state = 'OUTCOME_UNKNOWN'; reference.state = op.state; update(job, 'OUTCOME_UNKNOWN', 'Write acknowledgement or read-back failed. Reconcile; do not upload a replacement with a new ID.'); return;
        }
      }
      update(job, 'APPLIED', 'All entries were saved and verified in Tally.');
    } catch (e) {
      const uncertain = job.operations.some(r => ['SENT', 'OUTCOME_UNKNOWN'].includes(store.operations[r.id].state));
      update(job, uncertain ? 'OUTCOME_UNKNOWN' : 'REJECTED', e.message);
    }
  }
  async function submit(body) {
    if (!body || !['vouchers', 'ledgers'].includes(body.mode) || typeof body.csv !== 'string') throw Error('Choose ledger or voucher CSV.');
    await verifyCompany(body.company);
    const batch = parseTallyCsv(body.csv, body.mode);
    const id = hash([body.company.guid, batch]);
    const existing = store.jobs[id];
    if (existing && existing.state !== 'REJECTED') return publicJob(existing);
    if (Object.values(store.operations).some(o => o.companyGuid === body.company.guid && ['SENT', 'OUTCOME_UNKNOWN'].includes(o.state))) throw Error('This company has an unresolved write. Reconcile it before further imports.');
    const objects = batch.mode === 'vouchers' ? batch.vouchers : batch.ledgers;
    const kind = batch.mode === 'vouchers' ? 'voucher' : 'ledger';
    const operations = objects.map(object => {
      const key = hash([body.company.guid, kind, object.externalId]);
      const contentHash = hash(object); const previous = store.operations[key];
      if (previous && previous.contentHash !== contentHash) throw Error(`External ID ${object.externalId} was already used with different entries.`);
      return { key, contentHash, object, previous };
    });
    // Detect identity conflicts before mutating the journal.
    for (const o of operations) if (!o.previous) store.operations[o.key] = { kind, object: o.object, contentHash: o.contentHash, companyGuid: body.company.guid, remoteId: `${o.key.slice(0, 8)}-${o.key.slice(8, 12)}-${o.key.slice(12, 16)}-${o.key.slice(16, 20)}-${o.key.slice(20, 32)}`, state: 'NEW' };
    const job = { id, company: body.company, state: 'QUEUED', operations: operations.map(o => ({ id: o.key, state: store.operations[o.key].state })), message: 'Queued for validation.', updatedAt: now() };
    store.jobs[id] = job; save();
    // submit itself runs under the exclusive writer; append work to that same queue.
    exclusive(() => run(job, batch));
    return publicJob(job);
  }
  async function reconcileJob(id) {
    const job = store.jobs[id]; if (!job) throw Error('Import not found.');
    if (job.state !== 'OUTCOME_UNKNOWN') return publicJob(job);
    let unresolved = false;
    for (const reference of job.operations) {
      const op = store.operations[reference.id];
      if (!['SENT', 'OUTCOME_UNKNOWN'].includes(op.state)) continue;
      const result = await reconcile(op, job.company);
      if (result.found && result.matches && (!op.result || op.result.ok)) { op.state = 'APPLIED'; op.identity = result.identity; reference.state = op.state; }
      else unresolved = true;
    }
    const complete = job.operations.every(r => store.operations[r.id].state === 'APPLIED');
    update(job, unresolved ? 'OUTCOME_UNKNOWN' : complete ? 'APPLIED' : 'REJECTED', unresolved ? 'Still unresolved. Check Tally import exceptions and connector journal; no retry was sent.' : complete ? 'All entries verified by read-back.' : 'Previously dispatched entries verified. Upload the same file to continue remaining entries.');
    return publicJob(job);
  }
  async function body(req) {
    let length = 0; const chunks = [];
    for await (const chunk of req) { length += chunk.length; if (length > 1_100_000) throw Error('Request exceeds 1 MB.'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const handler = async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) { res.writeHead(403); res.end(); return; }
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    const presented = Buffer.from(req.headers.authorization || ''); const expected = Buffer.from(`Bearer ${token}`);
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) { res.writeHead(401); res.end(JSON.stringify({ error: 'Invalid pairing token.' })); return; }
    if (closing) { res.writeHead(503); res.end(JSON.stringify({ error: 'Connector is shutting down.' })); return; }
    try {
      const url = new URL(req.url, 'http://connector'); let result;
      if (req.method === 'GET' && url.pathname === '/health') result = { protocol: 'xml', connectorVersion: 1, message: 'Tally XML connector; release compatibility requires installation testing.' };
      else if (req.method === 'GET' && url.pathname === '/companies') result = { companies: await companies() };
      else if (req.method === 'GET' && url.pathname === '/jobs') result = { jobs: Object.values(store.jobs).map(publicJob).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100) };
      else if (req.method === 'POST' && url.pathname === '/imports') { const input = await body(req); result = await exclusive(() => submit(input)); res.statusCode = 202; }
      else if (req.method === 'POST' && /^\/jobs\/[a-f0-9]{64}\/reconcile$/.test(url.pathname)) result = await exclusive(() => reconcileJob(url.pathname.split('/')[2]));
      else { res.statusCode = 404; result = { error: 'Not found.' }; }
      res.end(JSON.stringify(result));
    } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message || 'Connector request failed.' })); }
  };
  return { handler, close: async () => { if (closing) { await chain; return; } closing = true; await chain; rmSync(lock, { recursive: true }); } };
}

if (!globalThis.__REGISTERBOX_DESKTOP__ && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tlsCert = process.env.TALLY_CONNECTOR_TLS_CERT; const tlsKey = process.env.TALLY_CONNECTOR_TLS_KEY;
  const host = process.env.TALLY_CONNECTOR_HOST || '127.0.0.1';
  if (host !== '127.0.0.1' && (!tlsCert || !tlsKey)) throw Error('A LAN listener requires TLS certificate and key. Use a trusted HTTPS reverse proxy with a loopback listener instead.');
  const connector = createConnector({ tallyUrl: process.env.TALLY_URL || 'http://127.0.0.1:9000/', token: process.env.TALLY_CONNECTOR_TOKEN, dataDir: resolve(process.env.TALLY_CONNECTOR_DATA_DIR || '.tally-connector'), origins: (process.env.TALLY_CONNECTOR_ORIGINS || '').split(',').filter(Boolean) });
  const server = tlsCert && tlsKey ? https.createServer({ cert: readFileSync(tlsCert), key: readFileSync(tlsKey) }, connector.handler) : http.createServer(connector.handler);
  server.requestTimeout = 30000; server.headersTimeout = 15000; server.maxConnections = 32;
  server.on('error', error => { console.error(`Connector startup failed: ${error.message}`); connector.close().then(() => { process.exitCode = 1; }); });
  server.listen(Number(process.env.TALLY_CONNECTOR_PORT || 9123), host, () => console.log(`RegisterBox Tally connector listening on ${host}. Pair using your configured token. Accounting payloads are stored locally, not printed.`));
  const stop = () => { server.close(); connector.close().then(() => process.exit(0)); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
