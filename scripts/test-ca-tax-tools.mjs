import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import ts from 'typescript';

const source=readFileSync(new URL('../src/lib/ca-tax-tools.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {caMoney,caDate,calculatePresumptive:presumptive,calculateAdvanceTax:advance,calculateDepreciation:depreciation,calculateMcaFee:mca,calculateKarnatakaPt:pt,calculateFinancialStatements:statements,parseTrialBalance:parseTb}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const p={year:'2025-26',scheme:'44AD',entity:'individual',resident:true,activityEligible:true,lockoutApplies:false,receipts:'5000000',cashReceipts:'1000000',qualifyingDigital:'4000000',declaredProfit:'320000'};
const a={year:'2025-26',returnedTax:'100000',assessedTax:'100000',payments:[],calculationDate:'2026-04-30',scheme:'regular',seniorExempt:false,noExceptionConfirmed:true};
const d={year:'2025-26',assetClass:'plant',openingWdv:'500000',additions:[],businessUse:'100'};
const m={form:'AOC-4',dueDate:'2025-10-30',filingDate:'2025-11-09',normalFee:'400',reliefReviewed:true};

test('money parser accepts Indian and international grouping but rejects partial numeric data',()=>{
  for(const value of ['1,00,000.25','100000.25','100,000.25'])assert.equal(caMoney(value),100000.25);
  for(const value of ['','1x','12,34','1,00,00','NaN','Infinity','-1','+2','1e3','0.001','₹100','1 000','1,2,3'])assert.throws(()=>caMoney(value));
});
test('date parser rejects rollover and non-ISO dates',()=>{
  assert.equal(caDate('2024-02-29').toISOString().slice(0,10),'2024-02-29');
  for(const value of ['2025-02-29','2026-04-31','1/1/2026','2026-1-01',''])assert.throws(()=>caDate(value));
});
test('44AD uses separate 6% and 8% portions and higher declared income',()=>{
  const r=presumptive(p);assert.equal(r.minimum,320000);assert.equal(r.sixPercent,240000);assert.equal(r.eightPercent,80000);assert.equal(r.presumptiveIncome,320000);
  assert.equal(presumptive({...p,declaredProfit:'400000'}).presumptiveIncome,400000);
});
test('44AD enhanced limit includes exactly 5% cash, excludes one paise above',()=>{
  const r=presumptive({...p,receipts:'30000000',cashReceipts:'1500000',qualifyingDigital:'28500000',declaredProfit:'1830000'});assert.equal(r.eligible,true);assert.equal(r.limit,30000000);
  const above=presumptive({...p,receipts:'30000000',cashReceipts:'1500000.01',qualifyingDigital:'0'});assert.equal(above.limit,20000000);assert.equal(above.eligible,false);
  assert.equal(presumptive({...p,receipts:'30000000.01',cashReceipts:'0',qualifyingDigital:'0'}).eligible,false);
});
test('44ADA uses 50%, enhanced ₹75 lakh threshold and excludes HUF/LLP',()=>{
  const input={...p,scheme:'44ADA',receipts:'7500000',cashReceipts:'375000',qualifyingDigital:'0',declaredProfit:'3750000'};
  assert.equal(presumptive(input).eligible,true);assert.equal(presumptive(input).minimum,3750000);
  assert.equal(presumptive({...input,cashReceipts:'375000.01'}).eligible,false);
  for(const entity of ['huf','llp','company'])assert.equal(presumptive({...input,entity}).eligible,false);
  assert.equal(presumptive({...input,entity:'firm'}).eligible,true);
});
test('presumptive lower margin and unsupported facts never become a valid declaration',()=>{
  assert.equal(presumptive({...p,declaredProfit:'1'}).presumptiveIncome,null);
  for(const change of [{resident:false},{activityEligible:false},{lockoutApplies:true},{entity:'llp'}])assert.equal(presumptive({...p,...change}).eligible,false);
  assert.throws(()=>presumptive({...p,cashReceipts:'2000000',qualifyingDigital:'4000000'}));
  assert.throws(()=>presumptive({...p,year:'2023-24'}));
});
test('ordinary advance-tax example independently gives ₹5,050 + one April ₹1,000',()=>{
  const r=advance(a);assert.deepEqual(r.instalments.map(i=>i.interest),[450,1350,2250,1000]);assert.equal(r.defermentInterest,5050);assert.equal(r.defaultInterest,1000);assert.equal(r.totalInterest,6050);
});
test('advance-tax first-two instalment tolerances are inclusive and do not change targets',()=>{
  const june=advance({...a,payments:[{date:'2025-06-15',amount:'12000'}]});assert.equal(june.instalments[0].required,15000);assert.equal(june.instalments[0].interest,0);
  assert.equal(advance({...a,payments:[{date:'2025-06-15',amount:'11999.99'}]}).instalments[0].interest,90);
  const sept=advance({...a,payments:[{date:'2025-09-15',amount:'36000'}]});assert.equal(sept.instalments[1].interest,0);assert.equal(sept.instalments[1].required,45000);
});
test('44AD/44ADA is the only special schedule; March 31 prevents default but not March deferment',()=>{
  const r=advance({...a,scheme:'44AD-44ADA',payments:[{date:'2026-03-31',amount:'100000'}]});assert.equal(r.instalments.length,1);assert.equal(r.defermentInterest,1000);assert.equal(r.defaultInterest,0);
  assert.throws(()=>advance({...a,scheme:'44AE'}));
});
test('advance tax exact 90% avoids default and one paise below triggers it',()=>{
  assert.equal(advance({...a,payments:[{date:'2026-03-31',amount:'90000'}]}).defaultInterest,0);
  assert.equal(advance({...a,payments:[{date:'2026-03-31',amount:'89999.99'}]}).defaultInterest,100);
});
test('advance-tax future instalments do not accrue and date boundary includes due day',()=>{
  const r=advance({...a,calculationDate:'2025-06-14'});assert.equal(r.totalInterest,0);assert.equal(r.instalments[0].elapsed,false);
  assert.equal(advance({...a,calculationDate:'2025-06-15'}).defermentInterest,450);
  assert.equal(advance({...a,payments:[{date:'2025-06-16',amount:'15000'}],calculationDate:'2025-06-16'}).instalments[0].interest,450);
});
test('234B counts payment month once and reduces following month; same-month payments do not duplicate interest',()=>{
  const r=advance({...a,calculationDate:'2026-06-30',payments:[{date:'2026-04-15',amount:'20000'},{date:'2026-04-20',amount:'30000'},{date:'2026-05-31',amount:'10000'}]});
  assert.deepEqual(r.interestMonths.map(i=>i.interest),[1000,500,400]);assert.equal(r.defaultInterest,1900);
  assert.equal(advance({...a,calculationDate:'2026-04-01'}).defaultInterest,1000);
});
test('interest rounds shortfall down to ₹100 and uses separate returned vs assessed bases',()=>{
  const r=advance({...a,returnedTax:'100099',assessedTax:'200099'});assert.equal(r.instalments[3].interestBase,100000);assert.equal(r.defaultInterest,2000);
});
test('₹10,000 threshold and verified senior exemption',()=>{
  const below=advance({...a,returnedTax:'9999',assessedTax:'9999'});assert.equal(below.totalInterest,0);assert.equal(below.instalments[0].required,0);
  assert.ok(advance({...a,returnedTax:'10000',assessedTax:'10000'}).totalInterest>0);
  assert.equal(advance({...a,seniorExempt:true}).totalInterest,0);
});
test('advance tax rejects unresolved exceptions, wrong payment dates and unsupported year',()=>{
  assert.throws(()=>advance({...a,noExceptionConfirmed:false}));
  assert.throws(()=>advance({...a,seniorExempt:true,scheme:'44AD-44ADA'}));
  for(const date of ['2025-03-31','2026-05-01'])assert.throws(()=>advance({...a,payments:[{date,amount:'1'}]}));
  assert.throws(()=>advance({...a,year:'2024-25'}));
});
test('new Act tax-year labels are explicit',()=>{
  const r=advance({...a,year:'2026-27',calculationDate:'2027-04-30'});assert.equal(r.sectionB,'424');assert.equal(r.sectionC,'425');assert.equal(r.totalInterest,6050);
  assert.match(presumptive({...p,year:'2026-27'}).section,/58/);
});
test('ordinary plant WDV and business proportion reconcile',()=>{
  const r=depreciation(d);assert.equal(r.depreciation,75000);assert.equal(r.closingWdv,425000);
  const half=depreciation({...d,businessUse:'50'});assert.equal(half.depreciation,37500);assert.equal(half.closingWdv,462500);
});
test('computer 180-day boundary is inclusive, 179 days is half and not used is zero',()=>{
  const base={...d,assetClass:'computer',openingWdv:'0'};
  const r=depreciation({...base,additions:[{cost:'100000',acquired:'2025-10-03',used:'2025-10-03'},{cost:'100000',acquired:'2025-10-04',used:'2025-10-04'},{cost:'100000',acquired:'2026-03-31',used:'2026-04-01'}]});
  assert.deepEqual(r.rows.map(v=>v.daysUsed),[180,179,0]);assert.deepEqual(r.rows.map(v=>v.depreciation),[40000,20000,0]);assert.equal(r.closingWdv,240000);
});
test('depreciation rejects acquisition outside year, use before acquisition and invalid rates',()=>{
  assert.throws(()=>depreciation({...d,additions:[{cost:'1',acquired:'2024-04-01',used:'2025-04-01'}]}));
  assert.throws(()=>depreciation({...d,additions:[{cost:'1',acquired:'2025-05-01',used:'2025-04-01'}]}));
  assert.throws(()=>depreciation({...d,assetClass:'goodwill'}));assert.throws(()=>depreciation({...d,businessUse:'101'}));
});
test('MCA annual fee includes filing day, excludes due date and keeps relief separate',()=>{
  assert.equal(mca(m).additional,1000);assert.equal(mca(m).total,1400);
  assert.equal(mca({...m,filingDate:m.dueDate}).additional,0);
  assert.equal(mca({...m,filingDate:'2025-10-29'}).additional,0);
  const review=mca({...m,reliefReviewed:false});assert.equal(review.normalAdditional,1000);assert.equal(review.total,null);assert.equal(review.additional,null);
});
test('MCA ordinary-form boundaries and ADT-1 first band',()=>{
  const due=Date.UTC(2025,0,1),base={...m,form:'MGT-14',dueDate:'2025-01-01'};
  for(const [days,multiple] of [[0,0],[1,2],[15,2],[30,2],[31,4],[60,4],[61,6],[90,6],[91,10],[180,10],[181,12]]){
    const filingDate=new Date(due+days*86400000).toISOString().slice(0,10);assert.equal(mca({...base,filingDate}).multiplier,multiple);
  }
  assert.equal(mca({...base,form:'ADT-1',filingDate:'2025-01-16'}).multiplier,1);
  assert.equal(mca({...base,form:'ADT-1',filingDate:'2025-01-17'}).multiplier,2);
});
test('MCA unsupported forms and legacy dates are rejected',()=>{
  assert.throws(()=>mca({...m,form:'LLP-11'}));assert.throws(()=>mca({...m,dueDate:'2018-06-30'}));assert.throws(()=>mca({...m,filingDate:'2027-04-01'}));assert.throws(()=>mca({...m,dueDate:'2028-01-01'}));
});
test('Karnataka PT ₹25,000 inclusive and February distinction yield ₹2,500',()=>{
  const r=pt({year:'2026-27',salaries:Array(12).fill('25000'),exempt:false});assert.equal(r.total,2500);assert.equal(r.rows[10].month,'2027-02');assert.equal(r.rows[10].tax,300);assert.equal(r.rows[0].tax,200);
  assert.equal(pt({year:'2025-26',salaries:Array(12).fill('24999.99'),exempt:false}).total,0);
});
test('PT variable pay and full-year exemption do not use annual-average salary',()=>{
  const salaries=Array(12).fill('0');salaries[10]='25000';assert.equal(pt({year:'2025-26',salaries,exempt:false}).total,300);
  assert.equal(pt({year:'2026-27',salaries:Array(12).fill('50000'),exempt:true}).total,0);
  assert.throws(()=>pt({year:'2026-27',salaries:['25000'],exempt:false}));
});
const tb=[{name:'Bank',category:'asset',debit:'70000',credit:'0'},{name:'Equipment',category:'asset',debit:'100000',credit:'0'},{name:'Accumulated depreciation',category:'asset',debit:'0',credit:'20000'},{name:'Payables',category:'liability',debit:'0',credit:'30000'},{name:'Opening capital',category:'equity',debit:'0',credit:'80000'},{name:'Sales',category:'income',debit:'0',credit:'100000'},{name:'Expenses',category:'expense',debit:'60000',credit:'0'}];
test('balanced adjusted trial balance produces profit, contra asset and equity transfer',()=>{
  const r=statements(tb);assert.equal(r.profit,40000);assert.equal(r.assets,150000);assert.equal(r.liabilities,30000);assert.equal(r.closingEquity,120000);assert.equal(r.balanceDifference,0);assert.equal(r.rows[2].amount,-20000);
});
test('drawings, losses and debit-side income retain signs',()=>{
  const rows=[{name:'Cash',category:'asset',debit:'700',credit:'0'},{name:'Capital',category:'equity',debit:'0',credit:'1000'},{name:'Loss expense',category:'expense',debit:'200',credit:'0'},{name:'Drawings',category:'drawings',debit:'100',credit:'0'}];
  const r=statements(rows);assert.equal(r.profit,-200);assert.equal(r.drawings,100);assert.equal(r.closingEquity,700);assert.equal(r.balanceDifference,0);
  const contra=statements([{name:'Bank',category:'asset',debit:'900',credit:'0'},{name:'Capital',category:'equity',debit:'0',credit:'1000'},{name:'Sales returns',category:'income',debit:'100',credit:'0'}]);assert.equal(contra.income,-100);assert.equal(contra.closingEquity,900);
});
test('unbalanced, mixed-sided and unknown-category trial balances are blocked',()=>{
  assert.throws(()=>statements([...tb,{name:'Missing credit',category:'asset',debit:'0.01',credit:'0'}]),/not balanced/);
  assert.throws(()=>statements([{...tb[0],debit:'1',credit:'1'},tb[1]]),/not both/);
  assert.throws(()=>statements([{...tb[0],category:'suspense'},tb[1]]),/category/);
});
test('trial-balance parser accepts copied Excel tabs and never evaluates a formula',()=>{
  const rows=parseTb('Account\tCategory\tDebit\tCredit\nBank\tASSET\t100\t\nCapital\tequity\t\t100');assert.equal(statements(rows).assets,100);
  assert.throws(()=>parseTb('Bank,asset,100,0'),/four tab-separated/);
  assert.throws(()=>statements(parseTb('Bank\tasset\t=SUM(1)\t0\nCapital\tequity\t0\t1')));
});
