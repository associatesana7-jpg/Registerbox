import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/gst-late-fee-history.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildReturnHistory: build, calculateHistoryFee: calculate, emptyHistoryFacts, historyAddMonths, historyDate } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const base = { registered: '2017-07-01', asOf: '2026-10-29', cancelled: true, effectiveCancellation: '2022-10-31', cancellationOrder: '2022-10-31', lastGstr1: '2018-09', neverGstr1: false, gstr1Frequency: 'quarterly', lastGstr3b: '2018-10', neverGstr3b: false, qrmpStart: '', frequencyConfirmed: true, finalReturnFiled: false };
const facts = { ...emptyHistoryFacts, due: '2018-12-20', dueConfirmed: true, category: 'other', turnover: 'up-to-1.5cr' };

test('October 2018 case: 48 monthly 3B, 9 old quarterly 1, 22 monthly 1, and one final return', () => {
  const { rows } = build(base);
  assert.equal(rows.length, 80);
  assert.equal(rows.filter(r => r.form === 'GSTR-3B').length, 48);
  assert.equal(rows.filter(r => r.form === 'GSTR-1' && r.frequency === 'quarterly').length, 9);
  assert.equal(rows.filter(r => r.form === 'GSTR-1' && r.frequency === 'monthly').length, 22);
  assert.ok(rows.filter(r => r.form === 'GSTR-1' && r.start >= '2021-01').every(r => r.frequency === 'monthly'));
  assert.equal(rows.find(r => r.form === 'GSTR-3B').start, '2018-11');
  assert.equal(rows.find(r => r.form === 'GSTR-10').suggestedDue, '2023-01-31');
});
test('last filed validation follows the actual pre-2021, monthly and QRMP regimes', () => {
  assert.doesNotThrow(() => build({ ...base, lastGstr1: '2021-02' }));
  assert.throws(() => build({ ...base, lastGstr1: '2020-11' }), /quarter-ending/);
  assert.throws(() => build({ ...base, lastGstr1: '2021-02', qrmpStart: '2021-01' }), /quarter-ending/);
  const laterQrmp = build({ ...base, lastGstr1: '2021-02', lastGstr3b: '2021-02', qrmpStart: '2021-04' }).rows;
  assert.equal(laterQrmp.find(r => r.form === 'GSTR-1').start, '2021-03');
  assert.equal(laterQrmp.find(r => r.form === 'GSTR-1').frequency, 'monthly');
  assert.equal(laterQrmp.find(r => r.id === 'GSTR-1-2021-04').frequency, 'quarterly');
  assert.equal(laterQrmp.find(r => r.id === 'GSTR-3B-2021-04').frequency, 'quarterly');
  assert.throws(() => build({ ...base, lastGstr3b: '2017-06' }), /registration history/);
});
test('monthly pre-2021 GSTR-1 stays monthly until a verified QRMP start', () => {
  const rows = build({ ...base, gstr1Frequency: 'monthly', lastGstr1: '2020-11', qrmpStart: '2021-04' }).rows;
  assert.equal(rows.find(r => r.id === 'GSTR-1-2020-12').frequency, 'monthly');
  assert.equal(rows.find(r => r.id === 'GSTR-1-2021-01').frequency, 'monthly');
  assert.equal(rows.find(r => r.id === 'GSTR-1-2021-04').frequency, 'quarterly');
});
test('confirmed January 2021 QRMP changes only subsequent periods', () => {
  const { rows } = build({ ...base, qrmpStart: '2021-01' });
  assert.equal(rows.length, 52);
  assert.equal(rows.filter(r => r.form === 'GSTR-3B' && r.frequency === 'monthly').length, 26);
  assert.equal(rows.filter(r => r.form === 'GSTR-3B' && r.frequency === 'quarterly').length, 8);
  const last = rows.filter(r => r.form === 'GSTR-3B').at(-1);
  assert.equal(last.end, '2022-10'); assert.ok(last.review.some(s => s.includes('cuts this quarter')));
});
test('unknown GSTR-1 and frequency stay unknown rather than silently counted', () => {
  const draft = build({ ...base, gstr1Frequency: 'unknown', lastGstr1: '', frequencyConfirmed: false });
  assert.equal(draft.rows.length, 49); assert.equal(draft.notes.length, 2);
  assert.equal(calculate(draft.rows[0], facts, base.asOf, false).fee, null);
});
test('rejects impossible periods, QRMP before 2021, invalid dates and future review', () => {
  for (const changes of [{ lastGstr3b: '2022-11' }, { lastGstr1: '2018-10' }, { qrmpStart: '2020-10' }, { qrmpStart: '2021-02' }, { effectiveCancellation: '2016-10-01' }, { cancellationOrder: '2027-01-01' }, { registered: '2017-02-30' }, { asOf: '2026-10-30' }]) assert.throws(() => build({ ...base, ...changes }));
  assert.doesNotThrow(() => build({ ...base, asOf: '2026-10-29' }));
});
test('order and effective dates differ: final due uses later date plus three calendar months', () => {
  const { rows } = build({ ...base, cancellationOrder: '2023-02-15' });
  assert.equal(rows.find(r => r.form === 'GSTR-10').suggestedDue, '2023-05-15');
  assert.equal(rows.filter(r => r.form === 'GSTR-3B').at(-1).end, '2022-10');
  assert.equal(historyAddMonths('2023-11-30', 3), '2024-02-29');
  assert.equal(historyAddMonths('2024-11-30', 3), '2025-02-28');
});
test('legacy nil and other caps remain 10000; modern caps use exact category', () => {
  const old = build(base).rows.find(r => r.form === 'GSTR-3B');
  assert.equal(calculate(old, facts, base.asOf, true).fee, 10000);
  assert.equal(calculate(old, { ...facts, category: 'nil' }, base.asOf, true).cap, 10000);
  const modern = { ...old, start: '2021-06', end: '2021-06', earliestDue: '2021-07-01', review: [] };
  for (const [turnover, cap] of [['up-to-1.5cr', 2000], ['1.5-to-5cr', 5000], ['above-5cr', 10000]]) assert.equal(calculate(modern, { ...facts, turnover, due: '2021-07-20' }, base.asOf, true).fee, cap);
  assert.equal(calculate(modern, { ...facts, category: 'nil', turnover: 'unknown', due: '2021-07-20' }, base.asOf, true).fee, 500);
});
test('unknown inputs and relief never become zero fees', () => {
  const row = build(base).rows.find(r => r.form === 'GSTR-3B');
  for (const patch of [{ due: '' }, { dueConfirmed: false }, { category: 'unknown' }, { relief: true }]) assert.equal(calculate(row, { ...facts, ...patch }, base.asOf, true).fee, null);
  assert.throws(() => calculate(row, { ...facts, due: '2018-11-15' }, base.asOf, true), /period/);
  for (const paid of ['-1', '12oops', '1,000', 'Infinity', '1.001']) assert.throws(() => calculate(row, { ...facts, paid }, base.asOf, true));
});
test('due date excluded; same-day zero; normal fee split and earlier paid reconcile', () => {
  const row = build(base).rows.find(r => r.form === 'GSTR-3B');
  assert.equal(calculate(row, facts, facts.due, true).fee, 0);
  assert.equal(calculate(row, { ...facts, paid: '20' }, '2018-12-21', true).remaining, 30);
  assert.equal(calculate(row, { ...facts, paid: '500' }, '2018-12-21', true).remaining, 0);
});
test('three-year anniversary flag does not certify permission or apply to final return', () => {
  const row = build(base).rows.find(r => r.form === 'GSTR-3B');
  assert.equal(calculate(row, facts, '2021-12-20', true).filingRestricted, false);
  assert.equal(calculate(row, facts, '2021-12-21', true).filingRestricted, true);
  const final = build(base).rows.find(r => r.form === 'GSTR-10');
  const result = calculate(final, { ...facts, category: 'unknown', due: '2023-01-31' }, '2026-10-29', true);
  assert.equal(result.filingRestricted, false); assert.equal(result.fee, 10000);
  assert.throws(() => calculate(final, { ...facts, due: '2023-01-30' }, base.asOf, true), /three months/);
});
test('open active monthly or quarterly period not included before period end', () => {
  const { rows } = build({ ...base, cancelled: false, lastGstr3b: '2026-09', gstr1Frequency: 'unknown', qrmpStart: '' });
  assert.equal(rows.length, 0);
  assert.equal(historyDate('2024-03-01') - historyDate('2024-02-28'), 2);
});
test('first-day cancellation and April-May 2021 cap transition require review', () => {
  const list = build({ ...base, qrmpStart: '2021-01', effectiveCancellation: '2021-05-01', cancellationOrder: '2021-05-01' }).rows;
  const row = list.filter(r => r.form === 'GSTR-3B').at(-1);
  assert.ok(row.review.length >= 2);
  assert.equal(calculate(row, { ...facts, due: '2021-06-22', periodConfirmed: true }, base.asOf, true).fee, null);
});
