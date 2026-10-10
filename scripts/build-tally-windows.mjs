/** Isolated build tools: npm install --prefix <tools-dir> esbuild@0.28.2 postject@1.0.0-alpha.6 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const directory = resolve(process.env.TALLY_BUILD_DIR || '/tmp/registerbox-windows-build');
const version = '22.23.3';
const requireTools = createRequire(join(directory, 'package.json'));
const esbuild = requireTools('esbuild');
const { inject } = requireTools('postject');
mkdirSync(directory, { recursive: true }); mkdirSync(join(root, 'downloads'), { recursive: true });
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const windowsRuntime = join(directory, 'node-win-x64.exe');
const hostTar = join(directory, 'node-host.tar.gz');
const expectedWindows = '9c9245166b4a8e182e0b797da9c20136117ff24368eaff1fec8343a123c8db0e';
const expectedMacArm = '23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53';
if (!existsSync(windowsRuntime) || digest(windowsRuntime) !== expectedWindows) throw Error('Windows Node 22.23.3 runtime checksum mismatch. Download the official win-x64/node.exe.');
let hostNode = process.execPath;
if (process.version !== `v${version}`) {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw Error('Use Node 22.23.3 to generate the SEA blob, or the documented matching Mac ARM runtime.');
  if (!existsSync(hostTar) || digest(hostTar) !== expectedMacArm) throw Error('Mac Node 22.23.3 runtime checksum mismatch.');
  hostNode = join(directory, `node-v${version}-darwin-arm64/bin/node`);
}
const run = (command, args) => { const result = spawnSync(command, args, { stdio: 'inherit', cwd: root }); if (result.error) throw result.error; if (result.status !== 0) throw Error(`${command} failed with status ${result.status}.`); };
const bundle = join(directory, 'connector.cjs');
const build = await esbuild.build({ entryPoints: [join(root, 'windows-connector/main.mjs')], outfile: bundle, bundle: true, platform: 'node', target: 'node22', format: 'cjs', loader: { '.html': 'text' }, banner: { js: 'globalThis.__REGISTERBOX_DESKTOP__ = true;' }, define: { 'import.meta.url': 'undefined' }, minify: false, metafile: true });
// Verify the exact self-contained payload before injecting it into Windows Node.
run(hostNode, ['--check', bundle]);
run(hostNode, [bundle, '--self-test']);
const blob = join(directory, 'connector.blob');
const seaConfig = join(directory, 'sea-config.json');
writeFileSync(seaConfig, JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false, execArgvExtension: 'none' }));
run(hostNode, ['--experimental-sea-config', seaConfig]);
const artifact = join(root, 'downloads', 'RegisterBox-Tally-Connector.exe');
// The official runtime signature does not cover our injected application. Remove the
// certificate table rather than shipping an invalid inherited Node signature.
const runtimeBytes = readFileSync(windowsRuntime);
const optionalHeader = runtimeBytes.readUInt32LE(0x3c) + 24;
const securityEntry = optionalHeader + 112 + 4 * 8;
const certificateOffset = runtimeBytes.readUInt32LE(securityEntry);
const certificateSize = runtimeBytes.readUInt32LE(securityEntry + 4);
runtimeBytes.writeUInt32LE(0, securityEntry); runtimeBytes.writeUInt32LE(0, securityEntry + 4);
runtimeBytes.writeUInt32LE(0, optionalHeader + 64);
writeFileSync(artifact, certificateOffset && certificateOffset + certificateSize === runtimeBytes.length ? runtimeBytes.subarray(0, certificateOffset) : runtimeBytes);
await inject(artifact, 'NODE_SEA_BLOB', readFileSync(blob), { sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2' });
const bytes = readFileSync(artifact);
if (bytes.toString('ascii', 0, 2) !== 'MZ' || bytes.readUInt16LE(bytes.readUInt32LE(0x3c) + 4) !== 0x8664 || !bytes.includes(readFileSync(blob)) || !bytes.includes(Buffer.from('NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2:1'))) throw Error('Windows x64 PE artifact verification failed.');
const checksum = digest(artifact);
writeFileSync(join(root, 'downloads', 'SHA256SUMS.txt'), `${checksum}  RegisterBox-Tally-Connector.exe\n`);
const report = { artifact: 'RegisterBox-Tally-Connector.exe', platform: 'win32-x64', runtime: version, sha256: checksum, bytes: bytes.length, runtimeChecksumVerified: true, bundled: true, useSnapshot: false, useCodeCache: false, codeSigned: false, windowsRuntimeTested: false, tallyInstallationTested: false };
writeFileSync(join(root, 'downloads', 'build-manifest.json'), JSON.stringify(report, null, 2));
let licenses = readFileSync(join(directory, `node-v${version}-darwin-arm64/LICENSE`), 'utf8');
const packages = new Set(Object.keys(build.metafile.inputs).filter(p => p.includes('node_modules/')).map(p => { const parts = p.split('node_modules/')[1].split('/'); return parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]; }));
for (const pkg of packages) {
  const directory = join(root, 'node_modules', pkg); const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  licenses += `\n\n--- ${pkg} ${metadata.version} (${metadata.license}) ---\n`;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT', 'license']) if (existsSync(join(directory, filename))) { licenses += readFileSync(join(directory, filename), 'utf8'); break; }
}
writeFileSync(join(root, 'downloads', 'THIRD-PARTY-LICENSES.txt'), licenses);
console.log(`Built Windows x64 executable: ${artifact}\nSHA256: ${checksum}\n${bytes.length} bytes. Unsigned; Windows and live Tally validation still required.`);
