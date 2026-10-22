import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv,parseImportRows,dueLabel } from '../src/lib/client-register.ts';

test('CSV supports quoted commas, escaped quotes and CRLF',()=>{
  assert.deepEqual(parseCsv('company_name,owner_name\r\n"A, B","Owner ""A"""\r\n'),[['company_name','owner_name'],['A, B','Owner "A"']]);
});
test('import normalizes headers, dates and service names',()=>{
  const r=parseImportRows([['Company Name','Owner Name','Phone Number','Service','Expiry Date','Registration Date'],['ABC','Owner','+91 9876543210','TM','01/12/2027',new Date('2026-01-01')]]);
  assert.deepEqual(r.errors,[]);assert.equal(r.rows[0].service,'TRADEMARK');assert.equal(r.rows[0].due_on,'2027-12-01');assert.equal(r.rows[0].phone,'919876543210');
});
test('invalid dates, reverse dates and date kinds fail preview',()=>{
  for(const due of ['2026-02-30','2025-01-01','12345'])assert.equal(parseImportRows([['company_name','registered_on','due_on'],['ABC','2026-01-01',due]]).errors.length,1);
  assert.equal(parseImportRows([['company_name','date_kind','due_on'],['ABC','none','2027-01-01']]).errors.length,1);
});
test('blank optional documents and expiry not required',()=>{
  const r=parseImportRows([['company_name','service','date_kind'],['ABC','MSME','none']]);assert.equal(r.errors.length,0);assert.equal(r.rows[0].due_on,'');
});
test('unknown service and malformed email rejected',()=>{
  assert.equal(parseImportRows([['company_name','service'],['ABC','UNKNOWN']]).errors.length,1);
  assert.equal(parseImportRows([['company_name','email'],['ABC','invalid']]).errors.length,1);
});
test('empty sheet, duplicate headers and oversized imports rejected',()=>{
  assert.equal(parseImportRows([]).errors.length,1);
  assert.equal(parseImportRows([['company_name','Company Name'],['A','B']]).errors.length,1);
  assert.equal(parseImportRows([['company_name'],...Array.from({length:101},()=>['ABC'])]).rows.length,0);
});
test('renewal boundary labels include today and missing dates',()=>{
  assert.equal(dueLabel('2026-10-11','2026-10-11'),'Due today');
  assert.equal(dueLabel('2026-10-10','2026-10-11'),'1 days overdue');
  assert.equal(dueLabel('2026-11-10','2026-10-11'),'Due in 30 days');
  assert.equal(dueLabel(null,'2026-10-11'),'No date set');
});
