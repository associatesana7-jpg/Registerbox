import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/tds-calculator.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { calculateTds: calculate, TDS_TOOL_SOURCES } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const baseline = { year: '2026-27', kind: 'professional', payer: 'entity', recipient: 'individual-huf', currentAmount: 100000, previousAmount: 0, previousTds: 0, panProvided: true, seniorCitizen: false, resident: true, specialCase: false };
const run = (changes = {}) => calculate({ ...baseline, ...changes });

test('2026 Act table mappings and 2025 legacy codes are explicit', () => {
  const pairs = [['contractor','194C','6(i)'],['professional','194J','6(iii)'],['technical','194J','6(iii)'],['commission','194H','1(ii)'],['rent-building','194-I','2(ii)'],['rent-plant','194-I','2(ii)'],['interest-bank','194A','5(ii)'],['interest-other','194A','5(iii)'],['property','194-IA','3(i)']];
  for (const [kind, legacySection, table] of pairs) {
    const extra = kind === 'property' ? { stampDutyValue: 6000000 } : {};
    assert.equal(run({kind,...extra}).section, `393(1), Table ${table}`);
    assert.equal(run({kind,year:'2025-26',...extra}).section, legacySection);
  }
});
test('contractors: strict single/annual boundaries, different payees, and catch-up', () => {
  assert.equal(run({kind:'contractor',currentAmount:30000}).tdsNow,0);
  assert.equal(run({kind:'contractor',currentAmount:30001}).tdsNow,300.01);
  assert.equal(run({kind:'contractor',currentAmount:30001,recipient:'other'}).tdsNow,600.02);
  assert.equal(run({kind:'contractor',currentAmount:20000,previousAmount:80000}).tdsNow,0);
  assert.equal(run({kind:'contractor',currentAmount:20001,previousAmount:80000}).tdsNow,1000.01);
  assert.equal(run({kind:'contractor',currentAmount:20001,previousAmount:80000,previousTds:800}).tdsNow,200.01);
  assert.equal(run({kind:'contractor',currentAmount:35000,previousAmount:30000}).taxableBase,35000);
  assert.equal(run({kind:'contractor',currentAmount:20000,expectedAnnualAmount:120000}).tdsNow,200);
});
test('professional, technical, commission and annual cumulative bases are not excess-only', () => {
  assert.equal(run({currentAmount:50000}).tdsNow,0);
  assert.equal(run({currentAmount:1,previousAmount:50000}).tdsNow,5000.1);
  assert.equal(run({kind:'technical',currentAmount:50001}).tdsNow,1000.02);
  assert.equal(run({kind:'commission',currentAmount:20000}).tdsNow,0);
  assert.equal(run({kind:'commission',currentAmount:20001}).tdsNow,400.02);
  assert.equal(run({currentAmount:10000,previousAmount:100000,previousTds:10000}).tdsNow,1000);
});
test('small individual/HUF payer uses 194M equivalents only for eligible payment categories', () => {
  for (const kind of ['contractor','professional','commission']) {
    assert.equal(run({kind,payer:'other-individual',currentAmount:5000000}).tdsNow,0);
    const result=run({kind,payer:'other-individual',currentAmount:5000001});
    assert.equal(result.tdsNow,100000.02);
    assert.equal(result.section,'393(1), Table 6(ii)');
    assert.equal(result.legacySection,'194M');
  }
  assert.equal(run({kind:'technical',payer:'other-individual',currentAmount:6000000}).tdsNow,0);
  // Same resident: ₹30 lakh contractor work followed by ₹25 lakh professional work shares one 194M aggregate.
  assert.equal(run({kind:'professional',payer:'other-individual',currentAmount:2500000,previousAmount:3000000}).tdsNow,110000);
  assert.ok(run({kind:'professional',payer:'other-individual',currentAmount:2500000,previousAmount:3000000}).notes.some((note)=>note.includes('Do not split')));
});
test('rent uses the monthly ₹50000 boundary and correct asset rates', () => {
  assert.equal(run({kind:'rent-building',currentAmount:50000}).tdsNow,0);
  assert.equal(run({kind:'rent-building',currentAmount:50001}).tdsNow,5000.1);
  assert.equal(run({kind:'rent-plant',currentAmount:50001}).tdsNow,1000.02);
  assert.equal(run({kind:'rent-plant',payer:'other-individual',currentAmount:100000}).tdsNow,0);
  assert.equal(run({kind:'rent-furniture',currentAmount:50001}).tdsNow,5000.1);
  assert.equal(run({kind:'rent-furniture',payer:'other-individual',currentAmount:100000}).tdsNow,0);
});
test('small individual/HUF tenant annual computation, last-month timing and PAN cap', () => {
  const rental={kind:'rent-building',payer:'other-individual',currentAmount:720000,monthlyRent:60000,lastMonthRent:60000};
  assert.equal(run(rental).tdsNow,14400);
  assert.equal(run(rental).section,'393(1), Table 2(i)');
  assert.equal(run({...rental,panProvided:false}).tdsNow,60000);
  assert.equal(run({...rental,panProvided:false,lastMonthRent:30000}).tdsNow,30000);
  assert.equal(run({...rental,currentAmount:600000,monthlyRent:50000,lastMonthRent:50000}).tdsNow,0);
  assert.throws(()=>run({...rental,currentAmount:1000000}),/12 months/);
});
test('bank senior and non-senior limits, other interest and missing PAN', () => {
  assert.equal(run({kind:'interest-bank',currentAmount:50000}).tdsNow,0);
  assert.equal(run({kind:'interest-bank',currentAmount:50001}).tdsNow,5000.1);
  assert.equal(run({kind:'interest-bank',seniorCitizen:true,currentAmount:100000}).tdsNow,0);
  assert.equal(run({kind:'interest-bank',seniorCitizen:true,currentAmount:100001}).tdsNow,10000.1);
  assert.equal(run({kind:'interest-other',currentAmount:10000}).tdsNow,0);
  assert.equal(run({kind:'interest-other',currentAmount:10001,panProvided:false}).tdsNow,2000.2);
  assert.equal(run({kind:'interest-other',payer:'other-individual',currentAmount:100000}).tdsNow,0);
});
test('property uses higher whole transaction value at the inclusive ₹50 lakh threshold', () => {
  assert.equal(run({kind:'property',currentAmount:4999999,stampDutyValue:4999999}).tdsNow,0);
  assert.equal(run({kind:'property',currentAmount:5000000,stampDutyValue:4900000}).tdsNow,50000);
  assert.equal(run({kind:'property',currentAmount:4900000,stampDutyValue:5100000}).tdsNow,51000);
  assert.equal(run({kind:'property',currentAmount:6000000,stampDutyValue:6000000,panProvided:false}).tdsNow,1200000);
});
test('exact half-paise rounds up at every supported rate without binary floating-point loss', () => {
  assert.equal(run({kind:'contractor',currentAmount:100000.49}).tdsNow,1000);
  assert.equal(run({kind:'contractor',currentAmount:100000.5}).tdsNow,1000.01);
  assert.equal(run({kind:'contractor',currentAmount:100000.51}).tdsNow,1000.01);
  assert.equal(run({kind:'technical',currentAmount:100000.25}).tdsNow,2000.01);
  assert.equal(run({kind:'professional',currentAmount:100000.05}).tdsNow,10000.01);
  assert.equal(run({kind:'property',currentAmount:5000000.5,stampDutyValue:5000000.5}).tdsNow,50000.01);
  const high=run({kind:'contractor',currentAmount:999999999999.5});
  assert.equal(high.tdsNow,10000000000);
  assert.equal(high.netCurrentPayment,989999999999.5);
  // The percentage is rounded after exact earlier + current aggregation, then prior TDS is subtracted in paise.
  const cumulative=run({kind:'contractor',currentAmount:0.2,previousAmount:100000.3,previousTds:1000});
  assert.equal(cumulative.taxableBase,100000.5);
  assert.equal(cumulative.cumulativeTds,1000.01);
  assert.equal(cumulative.tdsNow,0.01);
  assert.equal(cumulative.netCurrentPayment,0.19);
});
test('review cases never assert a zero payable amount or calculate non-resident tax', () => {
  for (const changes of [{resident:false},{specialCase:true}]) { const result=run(changes); assert.equal(result.status,'review'); assert.equal(result.tdsNow,null); assert.equal(result.cumulativeTds,null); assert.equal(result.netCurrentPayment,null); }
  assert.equal(run({panProvided:false}).tdsNow,20000);
  const catchup=run({currentAmount:1,previousAmount:50000});
  assert.ok(catchup.netCurrentPayment<0);
  assert.ok(catchup.notes.some((note)=>note.includes('Catch-up exceeds')));
});
test('invalid or inconsistent amounts, unsupported years and unsafe values fail', () => {
  for (const currentAmount of [0,-1,NaN,Infinity,1e13,1.001]) assert.throws(()=>run({currentAmount}));
  assert.throws(()=>run({expectedAnnualAmount:1}),/cannot be less/);
  assert.throws(()=>run({previousTds:1}),/cannot exceed/);
  assert.throws(()=>run({year:'2024-25'}),/supported/);
  assert.throws(()=>run({kind:'salary'}),/supported/);
  assert.throws(()=>run({kind:'property'}),/stamp-duty/);
  assert.ok(TDS_TOOL_SOURCES.every((source)=>new URL(source.url).protocol==='https:'));
});
