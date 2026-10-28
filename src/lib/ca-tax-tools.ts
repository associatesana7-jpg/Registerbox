/** Deterministic, browser-only CA worksheets. Rule review: 28 October 2026. */
export const CA_TAX_REVIEWED = '2026-10-28';
export const CA_TAX_YEARS = ['2025-26', '2026-27'] as const;
export type CaTaxYear = typeof CA_TAX_YEARS[number];
export const caRound = (value:number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function caMoney(value:string|number, label='Amount'):number {
  const text = String(value).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(text)) throw new Error(`${label}: enter a non-negative amount with at most two decimal places.`);
  const amount = Number(text.replaceAll(',',''));
  if (!Number.isFinite(amount) || amount > 1_000_000_000_000) throw new Error(`${label}: amount is too large.`);
  return amount;
}
export function caDate(value:string,label='Date'):Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: choose a valid date.`);
  const result = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0,10)!==value) throw new Error(`${label}: choose a valid date.`);
  return result;
}
function yearStart(year:string) {
  if (!(CA_TAX_YEARS as readonly string[]).includes(year)) throw new Error('Choose a supported year: 2025-26 or 2026-27.');
  return Number(year.slice(0,4));
}
const dateText=(date:Date)=>date.toISOString().slice(0,10);
const day=86_400_000;

export type PresumptiveInput={year:string;scheme:'44AD'|'44ADA';entity:'individual'|'huf'|'firm'|'llp'|'company';resident:boolean;activityEligible:boolean;lockoutApplies:boolean;receipts:string;cashReceipts:string;qualifyingDigital:string;declaredProfit:string};
export function calculatePresumptive(input:PresumptiveInput) {
  yearStart(input.year);
  if (!['44AD','44ADA'].includes(input.scheme)) throw new Error('Choose 44AD or 44ADA.');
  const receipts=caMoney(input.receipts,'Turnover / gross receipts');
  const cash=caMoney(input.cashReceipts,'Cash receipts (including non-account-payee instruments)');
  const digital=caMoney(input.qualifyingDigital,'Qualifying receipts for 6%');
  const declared=caMoney(input.declaredProfit,'Profit to declare');
  if (cash>receipts || digital>receipts || (input.scheme==='44AD'&&cash+digital>receipts)) throw new Error('Cash and qualifying digital receipts cannot exceed the total.');
  const reasons:string[]=[];
  if (!input.resident) reasons.push('This presumptive scheme requires a resident eligible assessee.');
  if (!['individual','huf','firm','llp','company'].includes(input.entity)) throw new Error('Choose a valid entity type.');
  if (['llp','company'].includes(input.entity) || (input.scheme==='44ADA'&&input.entity==='huf')) reasons.push('This entity type is outside the selected presumptive scheme.');
  if (!input.activityEligible) reasons.push(input.scheme==='44AD'?'Specified profession, agency, commission/brokerage and goods-carriage business under 44AE are outside 44AD.':'44ADA requires a profession specified in section 44AA(1), or its corresponding new-Act provision.');
  if (input.scheme==='44AD'&&input.lockoutApplies) reasons.push('The 44AD five-year restriction needs a separate eligibility review.');
  // At exactly 5%, the enhanced receipt limit applies. Cash includes non-account-payee cheques/drafts.
  const enhanced = cash*100 <= receipts*5;
  const limit=input.scheme==='44AD'?(enhanced?30_000_000:20_000_000):(enhanced?7_500_000:5_000_000);
  if(receipts>limit) reasons.push(`Receipts exceed the applicable ₹${limit.toLocaleString('en-IN')} limit.`);
  const sixPercent=input.scheme==='44AD'?caRound(digital*.06):0;
  const eightPercent=input.scheme==='44AD'?caRound((receipts-digital)*.08):0;
  const minimum=input.scheme==='44ADA'?caRound(receipts*.5):caRound(sixPercent+eightPercent);
  return {eligible:reasons.length===0,reasons,limit,enhanced,cashPercentage:receipts?Number((cash/receipts*100).toFixed(8)):0,receipts,sixPercent,eightPercent,minimum,declared,belowMinimum:declared<minimum,presumptiveIncome:reasons.length===0&&declared>=minimum?declared:null,section:input.year==='2026-27'?'Income-tax Act, 2025 section 58(2)':`Income-tax Act, 1961 section ${input.scheme}`,notes:['This is business/professional income, not your final income-tax bill. Other income, deductions, losses, tax regime and special-rate income require a separate computation.','No further business expenses, depreciation or partner remuneration/interest are deducted from this presumptive income. The deemed depreciation affects written-down value.','A lower profit is not automatically disallowed: books, audit and total-income facts must be reviewed under the applicable provisions.']};
}

export type AdvancePayment={date:string;amount:string};
export type AdvanceInput={year:string;returnedTax:string;assessedTax:string;payments:AdvancePayment[];calculationDate:string;scheme:'regular'|'44AD-44ADA';seniorExempt:boolean;noExceptionConfirmed:boolean};
export function calculateAdvanceTax(input:AdvanceInput) {
  const startYear=yearStart(input.year);
  if(!['regular','44AD-44ADA'].includes(input.scheme)) throw new Error('Select the ordinary schedule or 44AD / 44ADA schedule.');
  if(input.seniorExempt&&input.scheme==='44AD-44ADA') throw new Error('The senior exemption requires no business or professional income; it cannot be combined with 44AD / 44ADA income.');
  if(!input.noExceptionConfirmed) throw new Error('Review the listed unexpected-income exceptions before calculating normal deferment interest.');
  const returnedTax=caMoney(input.returnedTax,'Tax due on returned income');
  const assessedTax=caMoney(input.assessedTax,'Assessed tax for default interest');
  const end=caDate(input.calculationDate,'Calculation / tax payment date');
  const fyStart=new Date(Date.UTC(startYear,3,1)), nextApril=new Date(Date.UTC(startYear+1,3,1));
  if(end<fyStart||end>new Date(Date.UTC(startYear+6,2,31))) throw new Error('Calculation date must be within the selected year or the following five years.');
  if(input.payments.length>100) throw new Error('Use at most 100 payment rows.');
  const payments=input.payments.map((p,i)=>({date:caDate(p.date,`Payment ${i+1} date`),amount:caMoney(p.amount,`Payment ${i+1} tax component`)})).sort((a,b)=>a.date.getTime()-b.date.getTime());
  for(const p of payments) if(p.date<fyStart||p.date>end) throw new Error('Payment dates must fall between the year start and calculation date.');
  const paidBy=(date:Date)=>caRound(payments.filter(p=>p.date<=date).reduce((sum,p)=>sum+p.amount,0));
  const liable=!input.seniorExempt&&returnedTax>=10_000;
  const instalments=(input.scheme==='44AD-44ADA'?[[2,100,100,1]]:[[5,15,12,3],[8,45,36,3],[11,75,75,3],[2,100,100,1]]).map(([month,percent,tolerance,months])=>{
    const due=new Date(Date.UTC(month===2?startYear+1:startYear,month,15));
    const paid=paidBy(due),required=liable?caRound(returnedTax*percent/100):0,shortfall=caRound(Math.max(0,required-paid));
    const elapsed=end>=due,trigger=liable&&elapsed&&paid<returnedTax*tolerance/100;
    const interestBase=trigger?Math.floor(shortfall/100)*100:0;
    return {due:dateText(due),percent,required,paid,stillToPay:caRound(Math.max(0,required-paid)),shortfall,interestBase,interest:caRound(interestBase*.01*months),months,elapsed};
  });
  const advancePaid=paidBy(new Date(nextApril.getTime()-day));
  const liableB=!input.seniorExempt&&assessedTax>=10_000&&advancePaid<assessedTax*.9;
  const interestMonths:{month:string;balance:number;base:number;interest:number}[]=[];
  if(liableB&&end>=nextApril){
    // Charge each calendar month once. Payments in a month reduce next month's opening balance;
    // the payment month is already charged on the pre-payment shortfall (month or part thereof).
    for(let date=new Date(nextApril);date<=end;date=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1))){
      const balance=caRound(Math.max(0,assessedTax-paidBy(new Date(date.getTime()-day))));
      const base=Math.floor(balance/100)*100;
      if(balance<=0) break;
      interestMonths.push({month:dateText(date).slice(0,7),balance,base,interest:caRound(base*.01)});
    }
  }
  const defermentInterest=caRound(instalments.reduce((s,r)=>s+r.interest,0));
  const defaultInterest=caRound(interestMonths.reduce((s,r)=>s+r.interest,0));
  return {liable,advancePaid,returnedTax,assessedTax,instalments,interestMonths,defermentInterest,defaultInterest,totalInterest:caRound(defermentInterest+defaultInterest),balanceTax:caRound(Math.max(0,assessedTax-paidBy(end))),sectionB:input.year==='2026-27'?'424':'234B',sectionC:input.year==='2026-27'?'425':'234C',notes:['Enter tax after eligible TDS/TCS, relief and MAT/AMT credit, including surcharge and cess; this worksheet does not compute annual income tax.','After 31 March, enter only the amount appropriated towards income tax after any interest/fee allocation, not the gross challan. It does not calculate section 234A or assessment/reassessment adjustments.','The 12% / 36% tolerances waive interest for the first two instalments only; the target remains 15% / 45%.','Unexpected capital gains, lottery-type income, first-time business income and specified dividend exceptions, special extensions and bank-holiday adjustments require a separate review.']};
}

export const DEPRECIATION_CLASSES=[{id:'residential',label:'Residential building (excluding hotels / boarding houses)',rate:5},{id:'building',label:'Ordinary non-residential building',rate:10},{id:'furniture',label:'Furniture and electrical fittings',rate:10},{id:'plant',label:'Ordinary machinery / plant',rate:15},{id:'car',label:'Ordinary motor car, not run on hire (no special acquisition window)',rate:15},{id:'computer',label:'Computers and computer software',rate:40},{id:'intangible',label:'Eligible intangible rights (excluding goodwill)',rate:25}] as const;
export type DepreciationInput={year:string;assetClass:string;openingWdv:string;additions:{cost:string;acquired:string;used:string}[];businessUse:string};
export function calculateDepreciation(input:DepreciationInput){
  const startYear=yearStart(input.year),start=new Date(Date.UTC(startYear,3,1)),end=new Date(Date.UTC(startYear+1,2,31));
  const selected=DEPRECIATION_CLASSES.find(c=>c.id===input.assetClass);
  if(!selected)throw new Error('Choose a supported asset block.');
  const opening=caMoney(input.openingWdv,'Opening tax WDV'),businessUse=caMoney(input.businessUse,'Business use percentage');
  if(businessUse>100)throw new Error('Business use cannot exceed 100%.');
  if(input.additions.length>50)throw new Error('Use at most 50 additions in one block.');
  const rows=input.additions.map((r,i)=>{
    const cost=caMoney(r.cost,`Addition ${i+1} cost`),acquired=caDate(r.acquired,`Addition ${i+1} acquired date`),used=caDate(r.used,`Addition ${i+1} put-to-use date`);
    if(acquired<start||acquired>end)throw new Error('Additions must be acquired within the selected year. Put prior-year assets in the opening WDV.');
    if(used<acquired)throw new Error('Put-to-use date cannot precede acquisition.');
    const daysUsed=used>end?0:Math.floor((end.getTime()-used.getTime())/day)+1;
    const effectiveRate=daysUsed===0?0:daysUsed<180?selected.rate/2:selected.rate;
    return {cost,acquired:r.acquired,used:r.used,daysUsed,effectiveRate,depreciation:caRound(cost*effectiveRate/100*businessUse/100)};
  });
  const openingDepreciation=caRound(opening*selected.rate/100*businessUse/100),additions=caRound(rows.reduce((s,r)=>s+r.cost,0));
  const depreciation=caRound(openingDepreciation+rows.reduce((s,r)=>s+r.depreciation,0));
  return {rate:selected.rate,opening,openingDepreciation,additions,rows,depreciation,closingWdv:caRound(opening+additions-depreciation),notes:['Income-tax WDV worksheet for a continuing block with no disposals, transfers, subsidies or block cessation. Acquisition cost must already reflect tax-law adjustments and recoverable GST/ITC.','An acquired addition used for fewer than 180 days receives half the ordinary rate. The put-to-use day is included; a not-yet-used addition receives zero current depreciation.','Opening WDV is assumed eligible and put to business use during the year. No additional depreciation, unabsorbed depreciation, Companies Act useful-life schedule, goodwill or special rate windows are calculated.']};
}

export const MCA_FORMS=[{id:'AOC-4',label:'AOC-4 / AOC-4 XBRL / AOC-4 CFS',kind:'annual'},{id:'MGT-7',label:'MGT-7 / MGT-7A annual return',kind:'annual'},{id:'ADT-1',label:'ADT-1 — auditor appointment',kind:'auditor'},{id:'MGT-14',label:'MGT-14 — supported ordinary filing',kind:'ordinary'}] as const;
export type McaInput={form:string;dueDate:string;filingDate:string;normalFee:string;reliefReviewed:boolean};
export function calculateMcaFee(input:McaInput){
  const form=MCA_FORMS.find(f=>f.id===input.form);
  if(!form)throw new Error('Choose a supported company form. LLP, charge and capital forms have separate regimes.');
  const due=caDate(input.dueDate,'Effective due date'),filing=caDate(input.filingDate,'Filing date'),normal=caMoney(input.normalFee,'Normal filing fee');
  if(due<caDate('2018-07-01')||due>caDate('2027-03-31')||filing<caDate('2018-07-01')||filing>caDate('2027-03-31'))throw new Error('Supported due/filing dates run from 1 July 2018 to 31 March 2027. Older defaults need separate legacy rules.');
  const days=Math.max(0,Math.floor((filing.getTime()-due.getTime())/day));
  const multiplier=days===0?0:form.kind==='auditor'&&days<=15?1:days<=30?2:days<=60?4:days<=90?6:days<=180?10:12;
  const normalAdditional=caRound(form.kind==='annual'?days*100:normal*multiplier);
  return {form:form.label,days,normal,multiplier:form.kind==='annual'?null:multiplier,normalAdditional,additional:input.reliefReviewed?normalAdditional:null,total:input.reliefReviewed?caRound(normal+normalAdditional):null,reviewRequired:!input.reliefReviewed,notes:['The statutory/effective due date is supplied by you, including the correct AGM or event facts. A fee-waiver window is not automatically a change to the statutory due date.','Normal additional fee is separate from statutory penalties, adjudication, compounding, stamp duty and professional fees. Filing/payment acceptance does not remove another default.','MCA relief and facilitation schemes can depend on form, financial year, company status and actual filing date. Confirm the latest official circular and portal fee before treating this normal fee as payable.']};
}

export type PtInput={year:string;salaries:string[];exempt:boolean};
export function calculateKarnatakaPt(input:PtInput){
  const start=yearStart(input.year);
  if(input.salaries.length!==12)throw new Error('Enter exactly 12 monthly salary/wage amounts, April to March.');
  const rows=input.salaries.map((s,index)=>{
    const month=(index+3)%12,year=start+(month<3?1:0),salary=caMoney(s,`Salary for month ${index+1}`);
    return {month:`${year}-${String(month+1).padStart(2,'0')}`,salary,tax:input.exempt||salary<25_000?0:month===1?300:200};
  });
  return {rows,total:rows.reduce((sum,r)=>sum+r.tax,0),notes:['Salary/wage earners in Karnataka only: from 1 April 2025, monthly gross salary/wages of ₹25,000 or above attract ₹200 except February ₹300.','An exemption requires the applicable statutory/notification conditions and evidence; age 60+, disability and other categories must be verified. The exemption switch represents an already verified full-year exemption.','Enrolment tax for firms, directors, professionals or traders is a separate schedule. This tool does not compute employer interest, penalties, filing dates or multiple-employer reconciliation.']};
}

export const STATEMENT_CATEGORIES=['asset','liability','equity','income','expense','drawings'] as const;
export type StatementCategory=typeof STATEMENT_CATEGORIES[number];
export type TrialBalanceRow={name:string;category:string;debit:string;credit:string};
export function calculateFinancialStatements(input:TrialBalanceRow[]){
  if(input.length<2||input.length>250)throw new Error('Use between 2 and 250 adjusted trial-balance rows.');
  const rows=input.map((r,i)=>{
    const name=r.name.trim();
    if(!name||name.length>120)throw new Error(`Row ${i+1}: enter an account name of 1–120 characters.`);
    if(!(STATEMENT_CATEGORIES as readonly string[]).includes(r.category))throw new Error(`Row ${i+1}: choose an account category.`);
    const debit=caMoney(r.debit,`Row ${i+1} debit`),credit=caMoney(r.credit,`Row ${i+1} credit`);
    if(debit>0&&credit>0)throw new Error(`Row ${i+1}: enter a net debit or credit balance, not both.`);
    const category=r.category as StatementCategory;
    const net=caRound(debit-credit);
    // Contra balances retain their signs: accumulated depreciation is a credit in assets, etc.
    return {name,category,debit,credit,amount:['liability','equity','income'].includes(category)?-net:net};
  });
  const debits=caRound(rows.reduce((s,r)=>s+r.debit,0)),credits=caRound(rows.reduce((s,r)=>s+r.credit,0));
  if(debits>9_000_000_000_000||credits>9_000_000_000_000)throw new Error('Trial-balance totals exceed this worksheet’s safe calculation range.');
  const difference=caRound(debits-credits);
  if(difference!==0)throw new Error(`Trial balance is not balanced: debits ₹${debits.toLocaleString('en-IN')}; credits ₹${credits.toLocaleString('en-IN')}; difference ₹${difference.toLocaleString('en-IN')}. Correct the source; no balancing figure is added.`);
  const total=(cat:StatementCategory)=>caRound(rows.filter(r=>r.category===cat).reduce((s,r)=>s+r.amount,0));
  const income=total('income'),expenses=total('expense'),profit=caRound(income-expenses),assets=total('asset'),liabilities=total('liability'),openingEquity=total('equity'),drawings=total('drawings'),closingEquity=caRound(openingEquity+profit-drawings);
  return {rows,debits,credits,income,expenses,profit,assets,liabilities,openingEquity,drawings,closingEquity,liabilitiesAndEquity:caRound(liabilities+closingEquity),balanceDifference:caRound(assets-liabilities-closingEquity),notes:['Draft management statements from an adjusted, unclosed trial balance. Revenue/expense balances must not also be included in an already-closed current-year profit reserve.','Record closing inventory, depreciation, accruals, provisions, taxes and other adjustments in the trial balance before generating. Category choices determine presentation.','This summary does not supply Schedule III disclosures, notes, cash flow, comparatives, audit opinion or an ICAI-compliant complete set of statutory statements.']};
}

/** Tab-separated paste is intentionally data-only; values are never evaluated as formulas. */
export function parseTrialBalance(text:string):TrialBalanceRow[]{
  if(text.length>100_000)throw new Error('Paste at most 100,000 characters.');
  const lines=text.split(/\r?\n/).filter(line=>line.trim());
  if(lines[0]&&/^account\tcategory\tdebit\tcredit$/i.test(lines[0].trim()))lines.shift();
  return lines.map((line,i)=>{const fields=line.split('\t');if(fields.length!==4)throw new Error(`Line ${i+1}: paste four tab-separated columns: account, category, debit, credit.`);return {name:fields[0],category:fields[1].trim().toLowerCase(),debit:fields[2].trim()||'0',credit:fields[3].trim()||'0'};});
}
