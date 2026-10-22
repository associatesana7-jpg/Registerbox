import fs from 'node:fs';
import path from 'node:path';

// Usage: node scripts/check-public-links.mjs <export-directory> [--external]
// External 401/403/429 and network failures are inconclusive, not broken links.
const root = path.resolve(process.argv.find((arg, index) => index > 1 && !arg.startsWith('--')) || 'dist');
const checkExternal = process.argv.includes('--external');
const origin = 'https://www.registerbox.in';
const internalHosts = new Set(['www.registerbox.in', 'registerbox.in']);
const errors = new Set();
const warnings = new Set();
const external = new Map();
const pages = new Map();
let checkedLinks = 0;

function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity.slice(2, -1);
    return String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code));
  });
}
function attributes(text) {
  const result = {};
  for (const match of text.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}
function exportedFile(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const relative = decoded.replace(/^\/+/, '');
  const candidates = relative ? [relative, `${relative}.html`, path.join(relative, 'index.html')] : ['index.html'];
  for (const candidate of candidates) {
    const file = path.resolve(root, candidate);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}
function readPage(file) {
  if (pages.has(file)) return pages.get(file);
  const html = fs.readFileSync(file, 'utf8');
  // Script/style contents can contain markup-like string literals; skip their bodies.
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const tags = [...markup.matchAll(/<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)]
    .map(match => ({ name: match[1].toLowerCase(), attrs: attributes(match[2]) }));
  const result = { html, tags, ids: new Set(tags.flatMap(tag => [tag.attrs.id, tag.name === 'a' ? tag.attrs.name : null].filter(Boolean))) };
  pages.set(file, result);
  return result;
}
function publicPath(pathname) {
  return pathname === '/' || /^\/(?:blog|hi\/blog|services)(?:\/|$)/.test(pathname) || /^\/(?:contact|policies|privacy|delete-account)\/?$/.test(pathname);
}
function auditLink(raw, base, context, { asset = false, navigation = false } = {}) {
  checkedLinks += 1;
  if (!raw.trim()) { errors.add(`${context}: empty URL`); return; }
  let url;
  try { url = new URL(raw, base); } catch { errors.add(`${context}: invalid URL ${raw}`); return; }
  if (url.protocol === 'tel:') {
    const phone = decodeURIComponent(url.pathname).replace(/[\s().-]/g, '');
    if (!/^\+?[\d]{7,15}$/.test(phone)) errors.add(`${context}: invalid telephone link ${raw}`);
    return;
  }
  if (url.protocol === 'mailto:') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decodeURIComponent(url.pathname))) errors.add(`${context}: invalid email link ${raw}`);
    return;
  }
  if (['data:', 'blob:'].includes(url.protocol)) return;
  if (!['http:', 'https:'].includes(url.protocol)) { errors.add(`${context}: unsupported URL scheme ${raw}`); return; }
  if (!internalHosts.has(url.hostname)) {
    if (/^(?:localhost|127\.0\.0\.1)$/.test(url.hostname)) errors.add(`${context}: development URL ${raw}`);
    else external.set(url.href.split('#')[0], [...(external.get(url.href.split('#')[0]) || []), context]);
    return;
  }
  const file = exportedFile(url.pathname);
  if (!file) { errors.add(`${context}: missing ${asset ? 'asset' : 'route'} ${raw}`); return; }
  if (url.hash && !asset && file.endsWith('.html') && publicPath(url.pathname)) {
    let fragment;
    try { fragment = decodeURIComponent(url.hash.slice(1)); } catch { errors.add(`${context}: invalid fragment ${raw}`); return; }
    if (fragment && !readPage(file).ids.has(fragment)) errors.add(`${context}: missing anchor ${raw}`);
  }
  // Authentication destinations need to preserve a real post-sign-in route.
  if (navigation && url.searchParams.has('next')) {
    const next = url.searchParams.get('next');
    if (!next?.startsWith('/') || next.startsWith('//')) errors.add(`${context}: invalid next destination ${raw}`);
    else auditLink(next, origin, `${context} (next destination)`);
  }
}

const sitemapFile = path.join(root, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) throw new Error(`Missing sitemap: ${sitemapFile}`);
const sitemap = fs.readFileSync(sitemapFile, 'utf8');
const locations = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => decode(match[1]));
if (!locations.length) errors.add('Sitemap has no URLs');
if (new Set(locations).size !== locations.length) errors.add('Sitemap has duplicate URLs');
const targets = new Map();
for (const location of locations) {
  let url;
  try { url = new URL(location); } catch { errors.add(`Sitemap has invalid URL ${location}`); continue; }
  if (url.origin !== origin || url.search || url.hash) errors.add(`Sitemap URL must use canonical origin without query/fragment: ${location}`);
  if (!publicPath(url.pathname)) { errors.add(`Sitemap exposes a non-public route: ${location}`); continue; }
  const file = exportedFile(url.pathname);
  if (!file) errors.add(`Sitemap route has no exported HTML: ${location}`);
  else targets.set(location, file);
}
// These public information pages may intentionally be absent from the sitemap.
for (const pathname of ['/privacy', '/delete-account']) {
  const file = exportedFile(pathname);
  if (file) targets.set(`${origin}${pathname}`, file);
}
for (const [url, file] of targets) {
  const { tags } = readPage(file);
  const canonical = tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'canonical').map(tag => tag.attrs.href);
  if (locations.includes(url) && (canonical.length !== 1 || canonical[0] !== url)) errors.add(`${url}: missing or incorrect canonical (${canonical.join(', ')})`);
  if (locations.includes(url) && tags.some(tag => tag.name === 'meta' && tag.attrs.name === 'robots' && /noindex/i.test(tag.attrs.content))) errors.add(`${url}: sitemap URL is noindex`);
  for (const tag of tags) {
    if ('href' in tag.attrs) auditLink(tag.attrs.href, url, `${url} <${tag.name}>`, { navigation: tag.name === 'a' });
    if ('src' in tag.attrs) auditLink(tag.attrs.src, url, `${url} <${tag.name} src>`, { asset: true });
    if (tag.attrs.srcset) {
      for (const candidate of tag.attrs.srcset.split(',')) auditLink(candidate.trim().split(/\s+/)[0], url, `${url} <${tag.name} srcset>`, { asset: true });
    }
  }
}
const robotsFile = path.join(root, 'robots.txt');
if (!fs.existsSync(robotsFile) || !fs.readFileSync(robotsFile, 'utf8').includes(`Sitemap: ${origin}/sitemap.xml`)) errors.add('robots.txt is missing the canonical sitemap URL');
for (const discovery of ['llms.txt', 'blog-feed.json']) {
  const file = path.join(root, discovery);
  if (!fs.existsSync(file)) { warnings.add(`Missing optional discovery file ${discovery}`); continue; }
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/https:\/\/(?:www\.)?registerbox\.in[^\s"\])<>]*/g)) {
    auditLink(match[0], origin, discovery);
  }
}

if (checkExternal) {
  const queue = [...external.entries()];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const [url, contexts] = queue.shift();
      try {
        const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'RegisterBox-Link-Check/1.0' } });
        await response.body?.cancel();
        const summary = `${response.status} ${url}`;
        if ([404, 410].includes(response.status)) errors.add(`External link returned ${summary} (from ${contexts[0]})`);
        else if (!response.ok) warnings.add(`External link needs manual verification: ${summary}`);
        else console.log(`External OK: ${summary}`);
      } catch (error) {
        warnings.add(`External link could not be verified: ${url} (${error.cause?.code || error.name})`);
      }
    }
  }));
}
console.log(`Checked ${targets.size} public pages, ${locations.length} sitemap URLs, ${checkedLinks} links/assets, and ${external.size} unique external URLs${checkExternal ? ' (network checks enabled)' : ' (use --external to check responses)'}.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.size) process.exitCode = 1;
else console.log('Public links, fragments, assets, telephone links, canonicals and sitemap checks passed.');
