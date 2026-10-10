import { startDesktop } from './desktop.mjs';
import html from './setup.html';
import { parseTallyCsv, voucherTemplate } from '../src/lib/tally-core.ts';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

async function selfTest() {
  const directory = mkdtempSync(join(tmpdir(), 'registerbox-exe-self-test-'));
  writeFileSync(join(directory, 'settings.json'), JSON.stringify({ tallyUrl: 'http://127.0.0.1:9000/', connectorPort: 9123, origins: [], publicUrl: '', cert: '', key: '', tallyExecutable: '', launchOnLogin: false, autoConnect: false, token: randomBytes(32).toString('hex') }));
  let desktop;
  try {
    if (parseTallyCsv(voucherTemplate, 'vouchers').vouchers.length !== 1) throw Error('Accounting validation failed.');
    desktop = await startDesktop({ html, dataDir: directory, setupPort: 0, openBrowser: false });
    const url = new URL(desktop.dashboardUrl);
    const page = await fetch(url.origin); if (!(await page.text()).includes('Connect your books')) throw Error('Embedded dashboard is missing.');
    const settings = await fetch(`${url.origin}/api/settings`, { headers: { Authorization: `Bearer ${url.hash.slice(1)}` } });
    if ((await settings.json()).state !== 'STOPPED') throw Error('Setup state is incorrect.');
    console.log(`PASS: embedded runtime, dashboard, local HTTP, setup authentication and CSV validation (${process.platform}-${process.arch}). No Tally writes were sent.`);
  } finally { await desktop?.close(); rmSync(directory, { recursive: true, force: true }); }
}


(process.argv.includes('--self-test') ? selfTest() : startDesktop({ html })).then(desktop => {
  if (!desktop) return;
  console.log('RegisterBox Tally Connector is running. Keep this window open. Setup has opened in your browser.');
  console.log('Accounting data and settings stay in your Windows user profile.');
  const stop = () => desktop.close().then(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}).catch(error => {
  console.error(`Could not start RegisterBox: ${error.message}`);
  console.error('If the setup port is already used, close the existing connector window before launching another copy.');
  process.exitCode = 1;
  // Keep the error visible when launched by double-click.
  if (process.platform === 'win32' && process.stdin.isTTY) { console.log('Press Enter to close.'); process.stdin.resume(); process.stdin.once('data', () => process.exit(1)); }
});
