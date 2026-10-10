import http from 'node:http';
import https from 'node:https';
import { randomBytes, timingSafeEqual, createHash, X509Certificate } from 'node:crypto';
import { createSecureContext } from 'node:tls';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { parseTallyCsv } from '../src/lib/tally-core.ts';
import { createConnector } from '../scripts/tally-connector.mjs';

const listen = (server, port, host) => new Promise((ok, fail) => { server.once('error', fail); server.listen(port, host, () => { server.removeListener('error', fail); ok(); }); });
const stopServer = server => server ? new Promise(r => { server.close(r); server.closeIdleConnections(); }) : Promise.resolve();
const safeToken = () => randomBytes(32).toString('hex');
export function validateSettings(input) {
  const tally = new URL(input.tallyUrl);
  if (!['http:', 'https:'].includes(tally.protocol) || tally.username || tally.password || tally.pathname !== '/' || tally.search || tally.hash) throw Error('Enter a Tally HTTP address and port, without credentials or a path.');
  const port = Number(input.connectorPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 9124) throw Error('Connector port must be 1024–65535, excluding setup port 9124.');
  const origins = String(input.origins || '').split(/[,\n]/).map(v => v.trim()).filter(Boolean).map(v => {
    const u = new URL(v); if (!['https:', 'http:'].includes(u.protocol) || u.origin !== v || u.username || u.password) throw Error('Web origins must be exact origins, such as https://app.example.com.'); return v;
  });
  const publicUrl = String(input.publicUrl || '').trim();
  if (publicUrl) { const u = new URL(publicUrl); if (u.protocol !== 'https:' || u.origin !== publicUrl || u.username || u.password) throw Error('Phone pairing requires an HTTPS origin without a path.'); }
  const cert = String(input.cert || ''); const key = String(input.key || '');
  if (cert.length > 30000 || key.length > 30000) throw Error('Certificate files must be under 30 KB.');
  if (!!cert !== !!key) throw Error('Provide both a PEM certificate and private key.');
  if (cert) {
    createSecureContext({ cert, key });
    const certificate = new X509Certificate(cert); const timestamp = Date.now();
    if (timestamp < Date.parse(certificate.validFrom) || timestamp > Date.parse(certificate.validTo)) throw Error('TLS certificate is not currently valid.');
    if (!publicUrl) throw Error('Set the HTTPS address covered by this certificate.');
    const hostname = new URL(publicUrl).hostname;
    if (!(certificate.checkHost(hostname) || certificate.checkIP(hostname))) throw Error('Certificate does not cover the HTTPS address.');
    if (Number(new URL(publicUrl).port || '443') !== port) throw Error('The HTTPS address port must match the connector port for direct TLS mode.');
  }
  return { tallyUrl: tally.href, connectorPort: port, origins, publicUrl, cert, key, tallyExecutable: String(input.tallyExecutable || '').trim(), launchOnLogin: !!input.launchOnLogin, autoConnect: !!input.autoConnect };
}
export function findTallyExecutables() {
  if (process.platform !== 'win32') return [];
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\', 'D:\\'].filter(Boolean);
  const paths = roots.flatMap(root => ['TallyPrime', 'Tally.ERP9', 'Tally', 'Tally.ERP 9'].flatMap(folder => ['tally.exe', 'tallyprime.exe'].map(exe => join(root, folder, exe))));
  return [...new Set(paths.filter(path => existsSync(path) && statSync(path).isFile()))];
}
export async function startDesktop({ html, dataDir = join(process.env.LOCALAPPDATA || homedir(), 'RegisterBox', 'TallyConnector'), setupPort = 9124, openBrowser = true } = {}) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const settingsPath = join(dataDir, 'settings.json');
  let config;
  try { config = JSON.parse(readFileSync(settingsPath, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw Error('Saved settings are unreadable. Preserve settings.json and contact support; it has not been overwritten.'); }
  if (!config) config = { tallyUrl: 'http://127.0.0.1:9000/', connectorPort: 9123, origins: [], publicUrl: '', cert: '', key: '', tallyExecutable: '', launchOnLogin: false, autoConnect: true, token: safeToken() };
  if (typeof config.token !== 'string' || config.token.length < 32) throw Error('Saved pairing token is invalid. Preserve your settings and journal.');
  const session = safeToken(); let connector; let apiServer; let state = 'STOPPED'; let diagnostic = ''; let phoneVerified = false; let stopping = false; let chain = Promise.resolve();
  const serial = task => { const promise = chain.then(task); chain = promise.catch(() => {}); return promise; };
  function save(candidate) { writeFileSync(`${settingsPath}.tmp`, JSON.stringify(candidate), { mode: 0o600, flush: true }); renameSync(`${settingsPath}.tmp`, settingsPath); }
  async function stop() { phoneVerified = false; state = 'STOPPING'; await stopServer(apiServer); apiServer = undefined; await connector?.close(); connector = undefined; state = 'STOPPED'; }
  const localOrigin = () => `${config.cert ? 'https' : 'http'}://127.0.0.1:${config.connectorPort}`;
  async function start() {
    if (connector) return;
    state = 'STARTING'; diagnostic = '';
    // Never move a journal to a different Tally installation when settings change.
    const installation = createHash('sha256').update(config.tallyUrl).digest('hex').slice(0, 24);
    try {
      connector = createConnector({ tallyUrl: config.tallyUrl, token: config.token, dataDir: join(dataDir, 'installations', installation), origins: config.origins });
      apiServer = config.cert ? https.createServer({ cert: config.cert, key: config.key }, connector.handler) : http.createServer(connector.handler);
      apiServer.requestTimeout = 30000; apiServer.headersTimeout = 15000; apiServer.maxConnections = 32;
      await listen(apiServer, config.connectorPort, config.cert ? '0.0.0.0' : '127.0.0.1');
      state = 'RUNNING'; save(config);
    } catch (e) { await stop(); diagnostic = e.code === 'EADDRINUSE' ? 'The connector port is already used. Choose another port or stop the other connector.' : e.message; throw Error(diagnostic); }
  }
  async function proxy(path, input) {
    if (!connector || state !== 'RUNNING') throw Error('Start the connector first.');
    // Invoke the same authenticated handler directly, preserving TLS verification for real phone requests.
    const { Readable } = await import('node:stream');
    const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))]); req.method = input === undefined ? 'GET' : 'POST'; req.url = path; req.headers = { authorization: `Bearer ${config.token}` };
    return new Promise((ok, fail) => {
      const res = { statusCode: 200, setHeader() {}, writeHead(code) { this.statusCode = code; }, end(body) { try { const data = JSON.parse(body); if (this.statusCode >= 400) fail(Error(data.error || 'Connector request failed.')); else ok(data); } catch (e) { fail(e); } } };
      connector.handler(req, res).catch(fail);
    });
  }
  async function readBody(req) { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > 1_100_000) throw Error('File exceeds 1 MB.'); chunks.push(chunk); } return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  function startupShortcut(enable) {
    if (process.platform !== 'win32') { if (enable) throw Error('Start with Windows is available only in the Windows executable.'); return; }
    if (!process.execPath.toLowerCase().endsWith('registerbox-tally-connector.exe')) { if (enable) throw Error('Run the packaged Windows executable before enabling start with Windows.'); return; }
    const quote = s => `'${s.replace(/'/g, "''")}'`;
    const shortcut = join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'RegisterBox Tally Connector.lnk');
    const command = enable ? `$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut(${quote(shortcut)});$s.TargetPath=${quote(process.execPath)};$s.Save()` : `Remove-Item -LiteralPath ${quote(shortcut)} -ErrorAction SilentlyContinue`;
    return new Promise((ok, fail) => { const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { windowsHide: true }); child.on('error', fail); child.on('exit', code => code === 0 ? ok() : fail(Error('Could not update the Windows startup shortcut.'))); });
  }
  const publicSettings = () => ({ ...config, token: undefined, cert: undefined, key: undefined, hasCertificate: !!config.cert, origins: config.origins.join(', '), state, diagnostic, localUrl: localOrigin(), phoneReady: state === 'RUNNING' && phoneVerified, dataDir, detectedTally: findTallyExecutables() });
  const server = http.createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`; const origin = `http://${host}`;
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.headers.host !== host || req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end('Forbidden'); return; }
    if (req.method === 'GET' && req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    if (req.method === 'GET' && req.url === '/setup.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(html.match(/<script id="app-source" type="text\/plain">([\s\S]*)<\/script>/)[1]); return; }
    res.setHeader('Content-Type', 'application/json');
    const presented = Buffer.from(req.headers.authorization || ''); const expected = Buffer.from(`Bearer ${session}`);
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) { res.writeHead(401); res.end(JSON.stringify({ error: 'Setup session expired. Open the dashboard from the running connector.' })); return; }
    try {
      let result;
      if (req.method === 'GET' && req.url === '/api/settings') result = publicSettings();
      else if (req.method === 'GET' && req.url === '/api/pairing') result = { url: config.publicUrl || localOrigin(), token: config.token, phoneReady: phoneVerified && state === 'RUNNING', note: config.publicUrl ? 'The HTTPS endpoint and certificate must be reachable and trusted from your phone.' : 'Local computer only. Configure HTTPS below for phone pairing.' };
      else if (req.method === 'POST' && req.url === '/api/settings') {
        const input = await readBody(req);
        result = await serial(async () => {
          const candidate = { ...validateSettings({ ...input, cert: input.clearCertificate ? '' : input.cert || config.cert, key: input.clearCertificate ? '' : input.key || config.key }), token: config.token };
          await startupShortcut(candidate.launchOnLogin);
          await stop(); const previous = config;
          try { save(candidate); config = candidate; if (config.autoConnect) await start(); }
          catch (e) { config = previous; save(previous); await startupShortcut(previous.launchOnLogin); diagnostic = e.message; throw e; }
          return publicSettings();
        });
      } else if (req.method === 'POST' && req.url === '/api/test-phone') {
        if (!config.publicUrl || state !== 'RUNNING') throw Error('Configure HTTPS and start the connector first.');
        phoneVerified = false;
        const check = await fetch(`${config.publicUrl}/health`, { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
        const health = await check.json();
        if (!check.ok || health.connectorVersion !== 1) throw Error('HTTPS endpoint did not return this connector. Check DNS, certificate trust, firewall and reverse proxy.');
        phoneVerified = true; result = publicSettings();
      }
      else if (req.method === 'POST' && req.url === '/api/start') result = await serial(async () => { await start(); return publicSettings(); });
      else if (req.method === 'POST' && req.url === '/api/stop') result = await serial(async () => { await stop(); return publicSettings(); });
      else if (req.method === 'GET' && req.url === '/api/companies') result = await proxy('/companies');
      else if (req.method === 'GET' && req.url === '/api/jobs') result = await proxy('/jobs');
      else if (req.method === 'POST' && req.url === '/api/preview') { const input = await readBody(req); if (!['ledgers', 'vouchers'].includes(input.mode) || typeof input.csv !== 'string') throw Error('Choose valid CSV entries.'); result = parseTallyCsv(input.csv, input.mode); }
      else if (req.method === 'POST' && req.url === '/api/imports') result = await proxy('/imports', await readBody(req));
      else if (req.method === 'POST' && /^\/api\/jobs\/[a-f0-9]{64}\/reconcile$/.test(req.url)) result = await proxy(req.url.slice(4), {});
      else if (req.method === 'POST' && req.url === '/api/open-tally') {
        if (process.platform !== 'win32') throw Error('Open Tally is available on Windows.');
        if (!/^(tally|tallyprime)\.exe$/i.test(basename(config.tallyExecutable)) || !existsSync(config.tallyExecutable) || !statSync(config.tallyExecutable).isFile()) throw Error('Choose the installed tally.exe or tallyprime.exe path in settings.');
        await new Promise((ok, fail) => { const child = spawn(config.tallyExecutable, [], { detached: true, stdio: 'ignore' }); child.once('error', fail); child.once('spawn', () => { child.unref(); ok(); }); });
        result = { message: 'Tally launched. Load your company in Tally, then refresh companies here.' };
      } else { res.statusCode = 404; result = { error: 'Not found.' }; }
      res.end(JSON.stringify(result));
    } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message })); }
  });
  server.requestTimeout = 30000; server.headersTimeout = 15000; server.maxConnections = 16;
  await listen(server, setupPort, '127.0.0.1');
  const dashboardUrl = `http://127.0.0.1:${server.address().port}/#${session}`;
  if (config.autoConnect) { try { await start(); } catch {} }
  if (openBrowser) {
    const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', dashboardUrl] : [dashboardUrl];
    const child = spawn(command, args, { detached: true, stdio: 'ignore' }); child.on('error', () => console.error('Could not open the browser. Restart the connector with a default browser configured.')); child.unref();
  }
  return { dashboardUrl, dataDir, close: async () => { if (stopping) return; stopping = true; await serial(stop); await stopServer(server); } };
}
