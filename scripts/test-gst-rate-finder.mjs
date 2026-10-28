import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const data = readFileSync(new URL('../src/lib/gst-rate-data.ts', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/lib/gst-rate-finder.ts', import.meta.url), 'utf8').replace("import { GST_GOODS_DATA, GST_HEADING_LABELS } from './gst-rate-data';", data);
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const { GST_RATE_ENTRIES: entries, GST_RATE_COVERAGE: coverage, GST_RATE_SOURCES: sources, searchGstRates: search, parseTariffCodes, gstRateSplit } = api;
const find = (query, kind = 'all') => search({ query, kind, limit: 200 }).entries;

test('the complete enumerated goods schedules and exemptions have stable coverage and provenance', () => {
  assert.equal(coverage.taxableGoods, 1196);
  assert.equal(coverage.exemptGoods, 172);
  assert.equal(entries.length, coverage.total);
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  assert.equal(entries.filter(e => e.schedule === 'Exempt').length, 172);
  assert.equal(entries.filter(e => e.schedule === 'VII').length, 0);
  for (const entry of entries) {
    assert.ok(entry.description.trim().length > 2, entry.id);
    assert.ok(entry.codeText.trim().length > 0, entry.id);
    assert.ok(Number.isFinite(entry.rate) && entry.rate >= 0 && entry.rate <= 40, entry.id);
    assert.ok(sources[entry.sourceId], entry.id);
    if (entry.sourceId === 'services-base' || entry.sourceId === 'services-exempt-base') assert.equal(entry.effectiveFrom, '', 'Do not invent a later-amended service entry effective date from the original2017 notification date');
    else assert.match(entry.effectiveFrom, /^20\d\d-\d\d-\d\d$/);
    assert.ok(!/Corrected vide Notification|Printed from https|\bnot w\b/.test(entry.description + entry.codeText), entry.id);
  }
  for (const source of Object.values(sources)) {
    const url = new URL(source.url); assert.equal(url.protocol, 'https:');
    assert.match(url.hostname, /(?:^|\.)(?:cbic(?:-gst)?|dgft)\.gov\.in$/);
  }
});

test('taxable goods schedule serials are complete including the inserted tobacco rows', () => {
  const counts = { I: 516, II: 641, III: 19, IV: 15, V: 3, VI: 2 };
  for (const [schedule, count] of Object.entries(counts)) assert.equal(entries.filter(e => e.schedule === schedule).length, count, schedule);
  assert.equal(entries.find(e => e.id === 'I-298').codeText, '4408');
  assert.match(entries.find(e => e.id === 'I-298').description, /end-jointed/);
  assert.equal(entries.find(e => e.id === 'II-6').codeText, '24049100, 24049200, 24049900');
  assert.equal(entries.find(e => e.id === 'V-2').codeText, '7103');
  assert.match(entries.find(e => e.id === 'V-2').description, /whether or not worked/);
});

test('rice and paneer show competing taxable/exempt descriptions rather than one guessed default', () => {
  const rice = find('1006');
  assert.ok(rice.some(e => e.rate === 5 && /pre-packaged and labelled/.test(e.description)));
  assert.ok(rice.some(e => e.rate === 0 && /other than pre-packaged and labelled/.test(e.description)));
  assert.ok(find('0406').some(e => e.rate === 0 && /paneer/.test(e.description)));
  assert.ok(find('0406').some(e => e.rate === 5 && /other than chena or paneer/.test(e.description)));
});

test('leading zeroes, localized digits and specific subheadings match broader legal headings', () => {
  assert.ok(find('0401').some(e => e.rate === 0 && /UHT milk/.test(e.description)));
  assert.deepEqual(find('१००६').map(e => e.id), find('1006').map(e => e.id));
  assert.deepEqual(find('೧೦೦೬').map(e => e.id), find('1006').map(e => e.id));
  assert.ok(find('1006 30 90').some(e => e.id === 'I-55' || e.description.toLowerCase().includes('rice')));
  assert.equal(search({ query: '401' }).error !== null, true);
});

test('2026 tobacco amendments replace the old 28% goods schedule', () => {
  const biri = find('24031921');
  assert.ok(biri.some(e => e.rate === 18 && e.id === 'II-4A'));
  assert.ok(!biri.some(e => e.id === 'III-17'));
  assert.ok(find('2402').some(e => e.rate === 40 && e.sourceId === 'tobacco-2026'));
  assert.ok(find('21069020').some(e => e.rate === 40 && /Pan masala/.test(e.description)));
  assert.ok(!find('2402').some(e => e.rate === 28));
});

test('May2026 beverage tariff amendments and corrected code99 are applied', () => {
  const fruit = entries.find(e => e.id === 'I-150');
  assert.equal(fruit.codeText, '2202 99 21, 2202 99 29');
  assert.equal(fruit.effectiveFrom, '2026-05-01');
  assert.ok(find('22029921').some(e => e.id === 'I-150' && e.rate === 5));
  assert.equal(entries.find(e => e.id === 'III-3').codeText, '2202 99 91, 2202 99 99');
  assert.ok(find('22029999').some(e => e.rate === 40));
});

test('rate parsing keeps exclusions, multi-code cells and code precision intact', () => {
  assert.deepEqual(parseTariffCodes('2403 (other than 2403 19 21, 2403 19 29)'), { included: ['2403'], excluded: ['24031921', '24031929'] });
  assert.deepEqual(parseTariffCodes('9606 21 00, 9606 22 00, 9606 29, 9606 30').included, ['96062100', '96062200', '960629', '960630']);
  assert.ok(!find('050790').some(e => e.id === 'I-15'));
});

test('inclusive tariff ranges match every interior heading, including chapter ranges', () => {
  assert.ok(find('5005').some(e => e.id === 'I-325'));
  assert.ok(find('5108').some(e => e.id === 'I-329'));
  assert.ok(find('3908').some(e => e.id === 'II-114'));
  assert.ok(find('8106').some(e => e.id === 'II-360'));
  assert.ok(find('5201').some(e => e.id === 'exempt-145'));
  assert.ok(!find('5601').some(e => e.id === 'exempt-145'));
});

test('annexures are searchable and remain conditional exemptions', () => {
  assert.ok(find('Gene Therapy').some(e => e.id === 'exempt-113' && e.rate === 0));
  assert.ok(find('Sitar').some(e => e.id === 'exempt-161' && /indigenous handmade/.test(e.description)));
  assert.ok(entries.find(e => e.id === 'exempt-161').description.includes('Kashtha tarang'));
});

test('special brick standard and noITC rates coexist with sand-lime5percent entry', () => {
  assert.ok(find('69041000').some(e => e.rate === 12 && e.sourceId === 'bricks-standard'));
  assert.ok(find('69041000').some(e => e.rate === 6 && e.sourceId === 'bricks-concessional' && e.notes.some(n => /not be taken/.test(n))));
  assert.ok(find('sand lime').some(e => e.rate === 5));
});

test('service changes preserve ITC options, exact hotel boundary and insurance groups', () => {
  assert.ok(find('accounting', 'services').some(e => e.rate === 18));
  assert.ok(find('tailoring').some(e => e.rate === 5));
  assert.ok(find('diamond', 'services').some(e => e.rate === 1.5));
  assert.ok(find('hotel accommodation').some(e => e.rate === 5 && /or less/.test(e.description)));
  assert.ok(find('hotel accommodation').some(e => e.rate === 18 && /above/.test(e.description)));
  assert.ok(find('rail containers').some(e => e.rate === 5));
  assert.ok(find('health insurance').some(e => e.rate === 0 && /not a group/.test(e.description)));
  assert.ok(find('beauty').some(e => e.rate === 5 && e.notes.some(n => /Mandatory/.test(n))));
});

test('common item searches find actual schedule entries and preserve conditions', () => {
  assert.ok(find('mobile phone').some(e => e.codeText.includes('8517')));
  assert.ok(find('laptop').some(e => e.codeText.includes('8471')));
  assert.ok(find('cement').some(e => e.rate === 18));
  assert.ok(find('tea').some(e => e.codeText.includes('0902')));
});

test('unknowns, punctuation and injection-like queries never invent a rate', () => {
  for (const query of ['xyzzy-plugh-unobtanium', '00000000', '<script>alert(1)</script>']) {
    assert.equal(search({ query }).total, 0);
  }
  assert.equal(search({ query: '' }).total, 0);
  assert.ok(search({ query: 'GST rate' }).error);
  assert.equal(search({ query: 'rice', kind: 'services' }).total, 0);
  assert.equal(search({ query: 'rice', rate: 40 }).total, 0);
  assert.ok(search({ query: '1006', limit: 1 }).total > 1);
  assert.equal(search({ query: '1006', limit: 1 }).entries.length, 1);
});

test('GST splits handle special decimal rates exactly', () => {
  assert.deepEqual(gstRateSplit(.25), { cgst: .125, sgstOrUtgst: .125, igst: .25 });
  assert.deepEqual(gstRateSplit(1.5), { cgst: .75, sgstOrUtgst: .75, igst: 1.5 });
  assert.deepEqual(gstRateSplit(40), { cgst: 20, sgstOrUtgst: 20, igst: 40 });
  assert.throws(() => gstRateSplit(NaN), RangeError);
});
