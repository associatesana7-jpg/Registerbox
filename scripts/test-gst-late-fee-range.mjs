import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/lib/gst-late-fee-range.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {calculateGstLateFeeRange:calc}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const base={firstPeriod:'2026-01',lastPeriod:'2026-10',filingDate:'2026-10-29',gstr1Frequency:'monthly',qrmpStart:'',state:'29',nilCategory:'nil',turnover:'up-to-1.5cr'};
test('January–October 2026 calculates both forms and combined, excludes not-due October',()=>{
 const r=calc(base);assert.equal(r.rows.length,20);
 // Jan–Aug each capped ₹500; September: 18 days ×20 for GSTR-1,9×20 for3B.
 assert.deepEqual(r.totals,{gstr1:4360,gstr3b:4180,combined:8540,cgst:4270,sgst:4270});
 assert.equal(r.rows.filter(row=>row.status==='not-due').length,2);
 assert.equal(r.rows.find(row=>row.id==='GSTR-3B-2026-01').dueDate,'2026-02-20');
});
test('last January already filed means range starts February, not January',()=>{
 const r=calc({...base,firstPeriod:'2026-02'});assert.equal(r.rows.length,18);assert.equal(r.totals.combined,7540);
});
test('January–November future filing uses each real ordinary due and a projection note',()=>{
 const r=calc({...base,lastPeriod:'2026-11',filingDate:'2026-11-30'});
 assert.equal(r.rows.length,22);assert.equal(r.rows.filter(row=>row.status==='not-due').length,2);
 assert.deepEqual(r.totals,{gstr1:4880,gstr3b:4700,combined:9580,cgst:4790,sgst:4790});
 assert.ok(r.notes.some(note=>note.includes('Future projection')));
});
test('QRMP uses quarter once, State22/24 and whole-quarter note',()=>{
 const r=calc({...base,qrmpStart:'2021-01',gstr1Frequency:'quarterly',firstPeriod:'2026-02'});
 assert.equal(r.rows.length,8);const row=r.rows.find(row=>row.id==='GSTR-3B-2026-01');
 assert.equal(row.dueDate,'2026-04-22');assert.match(row.label,/whole quarter/);
 assert.equal(calc({...base,qrmpStart:'2021-01',gstr1Frequency:'quarterly',state:'07'}).rows.find(row=>row.id==='GSTR-3B-2026-01').dueDate,'2026-04-24');
});
test('2018 quarterly GSTR-1 keeps all 3B months and legacy cap10000',()=>{
 const r=calc({...base,firstPeriod:'2018-11',lastPeriod:'2019-03',gstr1Frequency:'quarterly'});
 assert.equal(r.rows.filter(row=>row.form==='GSTR-3B').length,5);assert.equal(r.rows.filter(row=>row.form==='GSTR-1').length,2);
 assert.equal(r.totals.combined,70000);assert.ok(r.rows.every(row=>row.filingRestrictionReview));
 assert.throws(()=>calc({...base,qrmpStart:'2018-01'}),/QRMP/);
});
test('2020 quarterly GSTR-1 due changes at Oct-Dec quarter; 2020 small3B State date',()=>{
 const r=calc({...base,firstPeriod:'2020-07',lastPeriod:'2020-12',gstr1Frequency:'quarterly'});
 assert.equal(r.rows.find(row=>row.id==='GSTR-1-2020-07').dueDate,'2020-10-31');
 assert.equal(r.rows.find(row=>row.id==='GSTR-1-2020-10').dueDate,'2021-01-13');
 assert.equal(r.rows.find(row=>row.id==='GSTR-3B-2020-07').dueDate,'2020-08-22');
});
test('per-row due/category/turnover/exclusion corrections recalculate totals and reconcile heads',()=>{
 const row='GSTR-3B-2026-09';const r=calc({...base,overrides:{[row]:{dueDate:'2026-10-25',nilCategory:'other',turnover:'above-5cr'},'GSTR-1-2026-01':{excluded:true}}});
 assert.equal(r.rows.find(r=>r.id===row).fee,200);assert.equal(r.excludedCount,1);
 assert.equal(r.totals.combined,r.totals.gstr1+r.totals.gstr3b);assert.equal(r.totals.cgst+r.totals.sgst,r.totals.combined);
 assert.throws(()=>calc({...base,overrides:{[row]:{dueDate:'2026-09-01'}}}),/after/);
});
test('unsupported early/cancelled partial periods remain unpriced instead of zero payables',()=>{
 const r=calc({...base,firstPeriod:'2017-07',lastPeriod:'2017-09'});assert.equal(r.unpricedCount,6);assert.equal(r.reviewCount,6);
 const c=calc({...base,qrmpStart:'2021-01',gstr1Frequency:'quarterly',cancelledEffective:'2026-10-15'});
 assert.equal(c.unpricedCount,2);assert.ok(c.rows.filter(row=>row.fee===null).every(row=>row.status==='review'));
});
test('input validation and exact due-day boundary',()=>{
 for(const patch of [{firstPeriod:'2017-06'},{firstPeriod:'2026-11'},{filingDate:'2026-02-30'},{state:'99'},{nilCategory:'guess'},{qrmpStart:'2021-02'}])assert.throws(()=>calc({...base,...patch}));
 const r=calc({...base,firstPeriod:'2026-01',lastPeriod:'2026-01',filingDate:'2026-02-20'});
 assert.equal(r.rows.find(row=>row.form==='GSTR-3B').fee,0);assert.equal(r.rows.find(row=>row.form==='GSTR-1').fee,180);
});

test('joining QRMP does not rewrite earlier monthly GSTR-1 history',()=>{
 const r=calc({...base,firstPeriod:'2020-10',lastPeriod:'2021-03',gstr1Frequency:'monthly',qrmpStart:'2021-01'});
 assert.equal(r.rows.filter(r=>r.form==='GSTR-1').length,4);
 assert.equal(r.rows.find(r=>r.id==='GSTR-1-2020-10').frequency,'monthly');
 assert.equal(r.rows.find(r=>r.id==='GSTR-1-2021-01').frequency,'quarterly');
});
test('old quarterly GSTR-1 stops at December 2020 without a verified QRMP start',()=>{
 const r=calc({...base,firstPeriod:'2020-10',lastPeriod:'2021-03',gstr1Frequency:'quarterly'});
 assert.equal(r.rows.filter(r=>r.form==='GSTR-1').length,4);
 assert.equal(r.rows.find(r=>r.id==='GSTR-1-2021-01').frequency,'monthly');
 assert.equal(r.rows.find(r=>r.id==='GSTR-3B-2021-01').frequency,'monthly');
});
test('nil large-business turnover still controls historical 2020 monthly due date',()=>{
 const r=calc({...base,firstPeriod:'2020-07',lastPeriod:'2020-07',turnover:'above-5cr'});
 assert.equal(r.rows.find(r=>r.form==='GSTR-3B').dueDate,'2020-08-20');
});

test('each return is capped before the combined total, at every turnover boundary',()=>{
 for(const [nilCategory,turnover,cap] of [['nil','above-5cr',500],['other','up-to-1.5cr',2000],['other','1.5-to-5cr',5000],['other','above-5cr',10000]]){
  const r=calc({...base,firstPeriod:'2025-01',lastPeriod:'2025-02',nilCategory,turnover});
  assert.equal(r.rows.length,4);
  assert.ok(r.rows.every(row=>row.cap===cap&&row.fee===cap));
  assert.equal(r.totals.gstr1,2*cap);assert.equal(r.totals.gstr3b,2*cap);
  assert.equal(r.totals.combined,4*cap);
 }
});
test('one day below a cap, exact cap and later dates never exceed maximum',()=>{
 for(const [nilCategory,turnover,cap,daily] of [['nil','up-to-1.5cr',500,20],['other','up-to-1.5cr',2000,50],['other','1.5-to-5cr',5000,50],['other','above-5cr',10000,50]]){
  for(const delta of [-1,0,1]){
   const days=cap/daily+delta,filingDate=new Date(Date.UTC(2025,1,20+days)).toISOString().slice(0,10);
   const row=calc({...base,firstPeriod:'2025-01',lastPeriod:'2025-01',nilCategory,turnover,filingDate}).rows.find(row=>row.form==='GSTR-3B');
   assert.equal(row.fee,Math.min(days*daily,cap));assert.equal(row.cgst+row.sgst,row.fee);
  }
 }
});
