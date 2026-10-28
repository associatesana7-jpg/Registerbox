import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/gst-late-fee-calculator.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { calculateGstLateFee: calculate, gstDateNumber, GST_LATE_FEE_TOOL_SOURCES } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const base={returnType:'GSTR-3B',frequency:'monthly',taxPeriod:'2026-09',effectiveDueDate:'2026-10-20',filingDate:'2026-10-28',previousFyTurnover:15000000,nilCategory:false,dueDateConfirmed:true,concessionApplies:false};
const run=(changes={})=>calculate({...base,...changes});

test('due date excluded, filing date included, same-day and early filing zero',()=>{
  assert.equal(run().daysLate,8);
  assert.equal(run().combinedLateFee,400);
  assert.equal(run({filingDate:'2026-10-21'}).combinedLateFee,50);
  assert.equal(run({filingDate:'2026-10-20'}).combinedLateFee,0);
  assert.equal(run({filingDate:'2026-10-01'}).combinedLateFee,0);
});
test('both return types use combined nil and non-nil daily rates with symmetric components',()=>{
  for(const returnType of ['GSTR-1','GSTR-3B']) {
    const regular=run({returnType}); assert.equal(regular.dailyCombined,50);assert.equal(regular.cgstLateFee,200);assert.equal(regular.stateUtLateFee,200);
    const nil=run({returnType,nilCategory:true});assert.equal(nil.dailyCombined,20);assert.equal(nil.combinedLateFee,160);assert.equal(nil.cgstLateFee,80);
  }
});
test('caps cover exact turnover boundaries and both sides of every cap-day boundary',()=>{
  const cases=[[0,2000],[15000000,2000],[15000000.01,5000],[50000000,5000],[50000000.01,10000]];
  for(const [previousFyTurnover,cap] of cases) {
    assert.equal(run({previousFyTurnover,filingDate:'2027-10-20'}).combinedLateFee,cap);
    assert.equal(run({previousFyTurnover}).capCombined,cap);
  }
  assert.equal(run({nilCategory:true,previousFyTurnover:1e10,filingDate:'2027-10-20'}).combinedLateFee,500);
  assert.equal(run({nilCategory:true,filingDate:'2026-11-13'}).combinedLateFee,480);
  assert.equal(run({nilCategory:true,filingDate:'2026-11-14'}).combinedLateFee,500);
  assert.equal(run({nilCategory:true,filingDate:'2026-11-15'}).combinedLateFee,500);
  assert.equal(run({filingDate:'2026-11-28'}).combinedLateFee,1950);
  assert.equal(run({filingDate:'2026-11-29'}).combinedLateFee,2000);
  assert.equal(run({filingDate:'2026-11-30'}).combinedLateFee,2000);
});
test('quarter ending June 2021 is covered, earlier periods and nonquarter months rejected',()=>{
  assert.equal(run({frequency:'quarterly',taxPeriod:'2021-06',effectiveDueDate:'2021-07-22',filingDate:'2021-07-23'}).combinedLateFee,50);
  assert.throws(()=>run({taxPeriod:'2021-05'}),/June 2021/);
  assert.throws(()=>run({frequency:'quarterly',taxPeriod:'2026-08'}),/quarter-ending/);
  assert.throws(()=>run({taxPeriod:'2026-11'}),/review date/);
});
test('UTC calendar arithmetic is correct across leap day, year-end and timezone transitions',()=>{
  assert.equal(run({taxPeriod:'2024-01',effectiveDueDate:'2024-02-28',filingDate:'2024-03-01'}).daysLate,2);
  assert.equal(run({taxPeriod:'2025-11',effectiveDueDate:'2025-12-31',filingDate:'2026-01-01'}).daysLate,1);
  assert.equal(gstDateNumber('2026-03-09')-gstDateNumber('2026-03-07'),2);
  assert.throws(()=>gstDateNumber('2025-02-29'),/real calendar/);
  assert.throws(()=>gstDateNumber('2026-04-31'),/real calendar/);
});
test('unconfirmed due dates and possible waivers require review without a payable amount',()=>{
  for(const flags of [{dueDateConfirmed:false},{concessionApplies:true}]) {
    const result=run(flags);assert.equal(result.status,'review');assert.equal(result.combinedLateFee,null);assert.equal(result.cgstLateFee,null);assert.equal(result.stateUtLateFee,null);
  }
});
test('invalid dates, turnover and unsupported returns fail before calculating',()=>{
  for(const previousFyTurnover of [-1,NaN,Infinity,1e13,1.001]) assert.throws(()=>run({previousFyTurnover}));
  for(const effectiveDueDate of ['', '2026-02-30', '<script>', '2026-09-30']) assert.throws(()=>run({effectiveDueDate}));
  assert.throws(()=>run({filingDate:'2026-09-01'}),/before the tax period/);
  assert.throws(()=>run({returnType:'GSTR-9'}),/Choose/);
  assert.ok(GST_LATE_FEE_TOOL_SOURCES.every((source)=>new URL(source.url).protocol==='https:'));
});
