#!/usr/bin/env node
// Build-time only. Never import this module into the Expo client bundle.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readBlogArticles } from './blog-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'src/data/blog');
const outputPath = path.join(dataDirectory, 'regional.generated.json');
const endpoint = 'https://translation.googleapis.com/language/translate/v2';
const policyVersion = 'plain-text-nmt-preserved-tokens-v1';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const points = value => Array.from(value).length;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const readJson = async filename => JSON.parse(await fs.readFile(filename, 'utf8'));
const targetScripts = {
  kn: 'Kannada', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', mr: 'Devanagari',
  bn: 'Bengali', gu: 'Gujarati', pa: 'Gurmukhi', or: 'Oriya', as: 'Bengali',
  ur: 'Arabic', ne: 'Devanagari', sa: 'Devanagari', mai: 'Devanagari',
  doi: 'Devanagari', gom: 'Devanagari', sd: 'Arabic', 'mni-Mtei': 'Meetei_Mayek',
  sat: 'Ol_Chiki', brx: 'Devanagari', ks: 'Arabic',
};

function options(args) {
  const result = { dryRun: false, languages: null, importPath: null };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--dry-run') result.dryRun = true;
    else if (argument === '--languages' || argument === '--import') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      if (argument === '--languages') result.languages = [...new Set(value.split(',').map(code => code.trim()).filter(Boolean))];
      else result.importPath = path.resolve(value);
    } else if (argument === '--help') {
      console.log('Usage: node scripts/translate-blog.mjs [--dry-run] [--languages kn,ta] [--import /path/bundle.json]');
      console.log('Without --import, GOOGLE_TRANSLATE_API_KEY is required for new translations. --dry-run makes no requests or writes.');
      process.exit(0);
    } else throw new Error(`Unknown option: ${argument}`);
  }
  return result;
}

function sourceTranslation(article) {
  return {
    title: article.title,
    description: article.description,
    intro: article.intro,
    sections: Object.fromEntries(article.sections.map(section => [section.id, {
      heading: section.heading,
      paragraphs: section.paragraphs,
      ...(section.bullets ? { bullets: section.bullets } : {}),
    }])),
    faqs: article.faqs,
    ...(article.availabilityNote ? { availabilityNote: article.availabilityNote } : {}),
    imageAlt: article.imageAlt,
    searchQuestions: article.searchQuestions,
  };
}

function strings(value, location = []) {
  if (typeof value === 'string') return [{ location, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, [...location, index]));
  if (object(value)) return Object.entries(value).flatMap(([key, item]) => strings(item, [...location, key]));
  throw new Error('Translation source contains an unsupported value.');
}

function put(value, location, translated) {
  let cursor = value;
  for (const key of location.slice(0, -1)) cursor = cursor[key];
  cursor[location.at(-1)] = translated;
}

function text(value, label, original) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must contain text.`);
  if (/\uFFFD|<\/?(?:script|iframe|style)\b|__RBX_\d+__/i.test(value)) throw new Error(`${label} contains invalid translation content.`);
  if (points(value) > Math.max(1_000, points(original || '') * 12)) throw new Error(`${label} exceeds the expected translation length.`);
  const expected = (original || '').match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) || [];
  const actual = value.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) || [];
  if (JSON.stringify([...expected].sort()) !== JSON.stringify([...actual].sort())) throw new Error(`${label} changed a UI variable.`);
}

function stringList(value, label, original) {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a non-empty text list.`);
  value.forEach((item, index) => text(item, `${label}[${index}]`, original?.[index] || original?.[0]));
}

function checkScript(value, code, label) {
  const script = targetScripts[code];
  if (script && !(new RegExp(`\\p{Script=${script}}`, 'u')).test(value)) {
    throw new Error(`${label} does not contain the expected ${script} script.`);
  }
}

function validateUi(ui, original, code) {
  if (!object(ui)) throw new Error(`${code} UI must be an object.`);
  for (const [key, source] of Object.entries(original)) text(ui[key], `${code}.ui.${key}`, source);
  if (Object.keys(ui).some(key => !own(original, key))) throw new Error(`${code} UI contains an unknown key.`);
  checkScript(Object.values(ui).join(' '), code, `${code} UI`);
}

function validateArticle(value, original, code, slug) {
  const label = `${code}.${slug}`;
  if (!object(value) || !object(value.sections)) throw new Error(`${label} must contain translated article sections.`);
  const allowed = ['title', 'description', 'intro', 'sections', 'faqs', 'availabilityNote', 'imageAlt', 'searchQuestions'];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${label} contains an unknown article field.`);
  text(value.title, `${label}.title`, original.title);
  text(value.description, `${label}.description`, original.description);
  stringList(value.intro, `${label}.intro`, original.intro);
  if (Object.keys(value.sections).some(key => !own(original.sections, key))) throw new Error(`${label} contains an unknown section ID.`);
  for (const [id, section] of Object.entries(original.sections)) {
    const translated = value.sections[id];
    if (!object(translated)) throw new Error(`${label} is missing section ${id}.`);
    if (Object.keys(translated).some(key => !['heading', 'paragraphs', 'bullets'].includes(key))) throw new Error(`${label}.${id} contains an unknown field.`);
    text(translated.heading, `${label}.${id}.heading`, section.heading);
    stringList(translated.paragraphs, `${label}.${id}.paragraphs`, section.paragraphs);
    if (translated.bullets !== undefined) stringList(translated.bullets, `${label}.${id}.bullets`, section.bullets);
  }
  if (!Array.isArray(value.faqs) || !value.faqs.length) throw new Error(`${label} is missing translated FAQs.`);
  value.faqs.forEach((faq, index) => {
    if (!object(faq) || Object.keys(faq).some(key => !['question', 'answer'].includes(key))) throw new Error(`${label} contains an invalid FAQ.`);
    text(faq.question, `${label}.faqs[${index}].question`, original.faqs[index]?.question || original.faqs[0]?.question);
    text(faq.answer, `${label}.faqs[${index}].answer`, original.faqs[index]?.answer || original.faqs[0]?.answer);
  });
  if (original.availabilityNote || value.availabilityNote !== undefined) text(value.availabilityNote, `${label}.availabilityNote`, original.availabilityNote);
  if (value.imageAlt !== undefined) text(value.imageAlt, `${label}.imageAlt`, original.imageAlt);
  if (value.searchQuestions !== undefined) stringList(value.searchQuestions, `${label}.searchQuestions`, original.searchQuestions);
  checkScript([value.title, value.description, ...value.intro].join(' '), code, label);
}

// URLs and IDs outside this projection never go to the provider. These tokens
// inside prose also keep their exact spelling, digits, and template variables.
const tokens = /https?:\/\/[^\s<>"')]+|(?:tel:|mailto:)[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\{[A-Za-z][A-Za-z0-9_]*\}|\b(?:RegisterBox|Aadhaar|FoSCoS|TallyPrime|GSTR[-– ]?\d[A-Z]?|GSTIN|GST|FSSAI|MSME|Udyam|UDYAM|EPFO|EPF|ESIC|ESI|MCA|PAN|TAN|DIN|DSC|OTP|ITC|ARN|LLP|NIL|SPICe\+|DIR[-– ]?\d|14A)\b|(?:₹|\$)?\d[\d,.]*(?:(?:[-–/:]|\s?%)[\d,.]+)*(?:\s?%)?/g;

function protect(value) {
  const preserved = [];
  const masked = value.replace(tokens, match => {
    const placeholder = `__RBX_${preserved.length}__`;
    preserved.push(match);
    return placeholder;
  });
  return { masked, preserved };
}

function restore(value, preserved) {
  let result = value;
  for (let index = 0; index < preserved.length; index++) {
    const placeholder = `__RBX_${index}__`;
    if (result.split(placeholder).length !== 2) throw new Error('Translation changed a protected token; output was not saved.');
    result = result.replace(placeholder, preserved[index]);
  }
  if (/__RBX_\d+__/.test(result)) throw new Error('Translation contains an unexpected protected token.');
  return result;
}

function chunks(value) {
  const result = [];
  let remaining = value;
  while (points(remaining) > 4_500) {
    const prefix = Array.from(remaining).slice(0, 4_500).join('');
    let boundary = prefix.lastIndexOf(' ');
    if (boundary < 500) boundary = prefix.length;
    // Never cut the placeholder sequence in the middle.
    const open = prefix.lastIndexOf('__RBX_');
    if (open >= 0 && open < boundary && prefix.indexOf('__', open + 6) >= boundary) boundary = open;
    result.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary).trimStart();
  }
  if (remaining) result.push(remaining);
  return result;
}

async function request(url, key, body) {
  let response;
  try {
    response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-goog-api-key': key, ...(body ? { 'content-type': 'application/json; charset=utf-8' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45_000),
      redirect: 'error',
    });
  } catch {
    // Do not include network errors, response bodies, or headers: credentials
    // must never appear in build logs even when the provider rejects a request.
    throw new Error('Google Translation could not be reached; existing translations were preserved.');
  }
  if (!response.ok) throw new Error(`Google Translation returned HTTP ${response.status}; existing translations were preserved. Check API enablement, key restrictions, billing and quotas.`);
  try { return await response.json(); }
  catch { throw new Error('Google Translation returned invalid JSON; existing translations were preserved.'); }
}

async function translateObject(original, target, key) {
  const output = structuredClone(original);
  const entries = strings(original).map(entry => ({ ...entry, ...protect(entry.text) }));
  const tasks = entries.flatMap((entry, entryIndex) => chunks(entry.masked).map((value, chunkIndex) => ({ value, entryIndex, chunkIndex })));
  const translated = entries.map(() => []);
  for (let offset = 0; offset < tasks.length;) {
    const batch = [];
    let characterCount = 0;
    while (offset < tasks.length && batch.length < 128) {
      const task = tasks[offset];
      if (batch.length && characterCount + points(task.value) > 5_000) break;
      batch.push(task);
      characterCount += points(task.value);
      offset++;
    }
    const body = { q: batch.map(task => task.value), source: 'en', target, format: 'text', model: 'nmt' };
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 90_000) throw new Error('Translation batch exceeds the configured byte limit.');
    const response = await request(endpoint, key, body);
    const results = response?.data?.translations;
    if (!Array.isArray(results) || results.length !== batch.length) throw new Error('Google Translation returned an incomplete batch; output was not saved.');
    results.forEach((result, index) => {
      const task = batch[index];
      if (typeof result?.translatedText !== 'string' || !result.translatedText.trim()
        || points(result.translatedText) > Math.max(1_000, points(task.value) * 12)
        || /\uFFFD|<\/?(?:script|iframe|style)\b/i.test(result.translatedText)) {
        throw new Error('Google Translation returned invalid text; output was not saved.');
      }
      translated[task.entryIndex][task.chunkIndex] = result.translatedText;
    });
  }
  entries.forEach((entry, index) => put(output, entry.location, restore(translated[index].join(' '), entry.preserved)));
  return output;
}

async function atomicSave(value) {
  const temporary = `${outputPath}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, outputPath);
  } finally {
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function main() {
  const settings = options(process.argv.slice(2));
  process.chdir(root); // The existing catalogue resolves its TS files from cwd.
  const locales = await readJson(path.join(dataDirectory, 'locales.json'));
  const sourceUi = await readJson(path.join(dataDirectory, 'ui-en.json'));
  const articles = readBlogArticles();
  const sources = Object.fromEntries(articles.map(article => [article.slug, sourceTranslation(article)]));
  const current = await readJson(outputPath);
  if (current.version !== 1 || !object(current.locales)) throw new Error('Unsupported generated translation bundle version.');
  const next = structuredClone(current);
  next.metadata ??= { policyVersion, locales: {} };
  next.metadata.locales ??= {};
  const selected = settings.languages || (settings.importPath ? null : locales.filter(locale => !['en', 'hi'].includes(locale.code)).map(locale => locale.code));
  if (selected?.some(code => !locales.some(locale => locale.code === code) || ['en', 'hi'].includes(code))) throw new Error('Select configured regional languages only; English and Hindi are preserved.');
  const timestamp = new Date().toISOString();
  const uiHash = hash({ policyVersion, sourceUi });
  const articleHashes = Object.fromEntries(Object.entries(sources).map(([slug, source]) => [slug, hash({ policyVersion, source })]));

  if (settings.importPath) {
    const imported = await readJson(settings.importPath);
    if (imported.version !== 1 || !object(imported.locales)) throw new Error('Import requires {"version":1,"locales":{...}}.');
    let count = 0;
    for (const [code, bundle] of Object.entries(imported.locales)) {
      if (selected && !selected.includes(code)) continue;
      if (!locales.some(locale => locale.code === code) || ['en', 'hi'].includes(code)) throw new Error(`Cannot import locale ${code}.`);
      if (!object(bundle) || !object(bundle.articles)) throw new Error(`${code} import must contain articles.`);
      validateUi(bundle.ui, sourceUi, code);
      const slugs = Object.keys(bundle.articles);
      if (!slugs.length) throw new Error(`${code} import has no completed articles.`);
      const meta = next.metadata.locales[code] ??= { articles: {} };
      const saved = next.locales[code] ??= { ui: {}, articles: {} };
      saved.ui = bundle.ui;
      meta.ui = { sourceHash: uiHash, translatedAt: timestamp, provider: 'import' };
      meta.articles ??= {};
      for (const slug of slugs) {
        if (!own(sources, slug)) throw new Error(`Unknown imported article: ${slug}`);
        validateArticle(bundle.articles[slug], sources[slug], code, slug);
        saved.articles[slug] = bundle.articles[slug];
        meta.articles[slug] = { sourceHash: articleHashes[slug], translatedAt: timestamp, provider: 'import' };
        count++;
      }
    }
    if (!count) throw new Error('No completed translations matched this import.');
    if (!settings.dryRun) await atomicSave(next);
    console.log(`${settings.dryRun ? 'Validated' : 'Imported'} ${count} complete regional articles. English/Hindi and authored translations are preserved.`);
    return;
  }

  // Authored locales are already supplied by editors. Do not pay to translate
  // text that the runtime intentionally gives authored content precedence over.
  const authorFiles = { kn: 'kannada.json', ta: 'tamil.json' };
  const authoredComplete = new Set();
  for (const [code, filename] of Object.entries(authorFiles)) {
    try {
      const authored = await readJson(path.join(dataDirectory, filename));
      const ui = await readJson(path.join(dataDirectory, `ui-${code}.json`));
      validateUi(ui, sourceUi, code);
      for (const [slug, source] of Object.entries(sources)) validateArticle(authored[slug], source, code, slug);
      authoredComplete.add(code);
    } catch { /* Missing or incomplete authored locales may use the provider. */ }
  }
  const active = locales.filter(locale => selected.includes(locale.code) && locale.translationCode && !authoredComplete.has(locale.code));
  if (authoredComplete.size) console.log(`Using committed authored translations: ${[...authoredComplete].filter(code => selected.includes(code)).join(', ') || '(none requested)'}.`);
  const blocked = locales.filter(locale => selected.includes(locale.code) && !locale.translationCode);
  if (blocked.length) console.log(`Provider unavailable (no automatic pages generated): ${blocked.map(locale => `${locale.name} (${locale.code})`).join(', ')}.`);
  const plans = active.map(locale => {
    const saved = current.locales[locale.code], meta = current.metadata?.locales?.[locale.code];
    let uiCurrent = false;
    try { validateUi(saved?.ui, sourceUi, locale.code); uiCurrent = meta?.ui?.sourceHash === uiHash; } catch { /* Rebuild invalid or stale content. */ }
    const slugs = Object.keys(sources).filter(slug => {
      try { validateArticle(saved?.articles?.[slug], sources[slug], locale.code, slug); return meta?.articles?.[slug]?.sourceHash !== articleHashes[slug]; }
      catch { return true; }
    });
    const sourceCharacters = (!uiCurrent ? strings(sourceUi).reduce((sum, entry) => sum + points(entry.text), 0) : 0)
      + slugs.reduce((sum, slug) => sum + strings(sources[slug]).reduce((total, entry) => total + points(entry.text), 0), 0);
    const requestCharacters = (!uiCurrent ? strings(sourceUi).reduce((sum, entry) => sum + points(protect(entry.text).masked), 0) : 0)
      + slugs.reduce((sum, slug) => sum + strings(sources[slug]).reduce((total, entry) => total + points(protect(entry.text).masked), 0), 0);
    return { locale, uiCurrent, slugs, sourceCharacters, requestCharacters };
  });
  console.log(JSON.stringify({ dryRun: settings.dryRun, requestedLanguages: selected.length, supportedTargets: active.length,
    articles: articles.length, sourceCharacters: plans.reduce((sum, plan) => sum + plan.sourceCharacters, 0),
    estimatedProviderCharacters: plans.reduce((sum, plan) => sum + plan.requestCharacters, 0),
    languages: plans.map(plan => ({ code: plan.locale.code, articlesToTranslate: plan.slugs.length, translateUi: !plan.uiCurrent, estimatedProviderCharacters: plan.requestCharacters })) }, null, 2));
  if (settings.dryRun) return;
  if (!plans.some(plan => !plan.uiCurrent || plan.slugs.length)) { console.log('All requested supported translations are current.'); return; }
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured. Existing translations were preserved. Use --dry-run or --import without a provider account.');
  const support = await request(`${endpoint}/languages?model=nmt`, key);
  const supported = support?.data?.languages;
  if (!Array.isArray(supported)) throw new Error('Could not verify provider language support; existing translations were preserved.');
  const unavailable = active.filter(locale => !supported.some(item => item.language === locale.translationCode));
  if (unavailable.length) throw new Error(`Provider does not currently support: ${unavailable.map(locale => locale.code).join(', ')}. No translations were saved; update locales.json before retrying.`);
  for (const plan of plans) {
    const { locale } = plan;
    if (plan.uiCurrent && !plan.slugs.length) continue;
    const saved = next.locales[locale.code] ??= { ui: {}, articles: {} };
    const meta = next.metadata.locales[locale.code] ??= { articles: {} };
    meta.articles ??= {};
    if (!plan.uiCurrent) {
      saved.ui = await translateObject(sourceUi, locale.translationCode, key);
      validateUi(saved.ui, sourceUi, locale.code);
      meta.ui = { sourceHash: uiHash, translatedAt: timestamp, provider: 'google-basic-nmt' };
    }
    for (const slug of plan.slugs) {
      const translated = await translateObject(sources[slug], locale.translationCode, key);
      validateArticle(translated, sources[slug], locale.code, slug);
      saved.articles[slug] = translated;
      meta.articles[slug] = { sourceHash: articleHashes[slug], translatedAt: timestamp, provider: 'google-basic-nmt' };
      console.log(`Completed ${locale.code}/${slug}.`);
    }
  }
  next.metadata.policyVersion = policyVersion;
  await atomicSave(next);
  console.log('Saved the complete translation bundle atomically. Rebuild the website to publish these pages.');
}

main().catch(error => { console.error(`Blog translation: ${error.message}`); process.exitCode = 1; });
