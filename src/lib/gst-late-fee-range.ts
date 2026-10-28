/** Normal-fee range estimate; not GST portal liability, relief eligibility or permission to file. */
export const GST_LATE_FEE_RANGE_REVIEWED = '2026-10-29';
export const GST_LATE_FEE_RANGE_RULE_VERSION = '2026-10-29.1';
export const GST_LATE_FEE_RANGE_SOURCES = [
  {title:'GST portal GSTR-1 FAQ: monthly 11th and quarterly 13th',url:'https://tutorial.gst.gov.in/userguide/returns/GSTR1.htm'},
  {title:'GST portal GSTR-3B FAQ: monthly 20th, quarterly 22nd/24th and cancellation',url:'https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm'},
  {title:'GSTN QRMP FAQ: quarterly GSTR-3B began January 2021',url:'https://tutorial.gst.gov.in/downloads/news/faq_on_qrmp_iff.pdf'},
  {title:'CBIC notifications index: 7/2020, 29/2020, 74/2020, 76/2020, 82/2020 and 83/2020',url:'https://cbic-gst.gov.in/hindi/central-tax-notifications.html'},
  {title:'West Bengal government: historical ordinary and extended GSTR-1 / GSTR-3B dates',url:'https://comtax.wb.gov.in/GST/GST_PPU/GST_Forms_Extended%20dates_upto_29.02.2024.pdf'},
  {title:'CBIC Notification 19/2021: GSTR-3B caps from June 2021 / quarter ending June 2021',url:'https://cbic-gst.gov.in/pdf/central-tax/notfctn-19-central-tax-english-2021.pdf'},
  {title:'CBIC Notification 20/2021: GSTR-1 caps from June 2021 / quarter ending June 2021',url:'https://cbic-gst.gov.in/pdf/central-tax/notfctn-20-central-tax-english-2021.pdf'},
  {title:'Notification 76/2018: GSTR-3B normal reduced daily fee',url:'https://www.gstcouncil.gov.in/en/node/4083'},
  {title:'Notification 4/2018: GSTR-1 normal reduced daily fee',url:'https://gstcouncil.gov.in/node/4006'},
  {title:'CGST Act: sections 37(5), 39(11), 47 and cancellation liability',url:'https://www.indiacode.nic.in/indiacode/bitstream/123456789/15689/1/A2017-12.pdf'},
  {title:'GSTN three-year filing restriction advisory',url:'https://www.mahagst.gov.in/public/uploads/gstnadvisory/1760530698_359%20Advisory%20to%20file%20pending%20returns%20before%20expiry%20of%20three%20years.pdf'},
] as const;
export type LateFeeCategory = 'nil'|'other';
export type LateFeeTurnover = 'up-to-1.5cr'|'1.5-to-5cr'|'above-5cr';
export type LateFeeForm = 'GSTR-1'|'GSTR-3B';
export type LateFeeRangeOverride = {dueDate?:string;nilCategory?:LateFeeCategory;turnover?:LateFeeTurnover;excluded?:boolean};
export type GstLateFeeRangeInput = {
  firstPeriod:string;lastPeriod:string;filingDate:string;/** GSTR-1 frequency before January 2021. Later quarterly filing follows the verified QRMP start. */ gstr1Frequency:'monthly'|'quarterly';
  /** Verified quarter-start month. Once selected, assumed unchanged through the range. */
  qrmpStart:string;state:string;nilCategory:LateFeeCategory;turnover:LateFeeTurnover;
  overrides?:Record<string,LateFeeRangeOverride>;cancelledEffective?:string;
};
export type GstLateFeeRangeRow = {
  id:string;form:LateFeeForm;start:string;end:string;label:string;frequency:'monthly'|'quarterly';periodEnd:string;
  dueDate:string;daysLate:number|null;daily:number;cap:number|null;fee:number|null;cgst:number|null;sgst:number|null;
  nilCategory:LateFeeCategory;turnover:LateFeeTurnover;previousFy:string;excluded:boolean;
  notes:string[];status:'estimate'|'not-due'|'review';filingRestrictionReview:boolean;
};
export type GstLateFeeRangeResult = {
  rows:GstLateFeeRangeRow[];totals:{gstr1:number;gstr3b:number;combined:number;cgst:number;sgst:number};
  notes:string[];reviewCount:number;unpricedCount:number;excludedCount:number;
};
const DAY=86400000;
const GROUP_22=new Set(['22','23','24','25','26','27','29','30','31','32','33','34','35','36','37']);
const STATES=new Set(['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','29','30','31','32','33','34','35','36','37','38']);
const CATEGORIES:LateFeeCategory[]=['nil','other'];
const BANDS:LateFeeTurnover[]=['up-to-1.5cr','1.5-to-5cr','above-5cr'];
function dateDay(value:string,label:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error(`${label}: choose a complete date.`);
  const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  if(y<2017||y>2101||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw new Error(`${label}: enter a real calendar date between 2017 and 2100.`);
  return date.getTime()/DAY;
}
function monthIndex(value:string,label:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw new Error(`${label}: choose a month and year.`);const [y,m]=value.split('-').map(Number);if(y<2017||y>2100)throw new Error(`${label}: choose a year from 2017 to 2100.`);return y*12+m-1;}
const month=(m:number)=>`${Math.floor(m/12)}-${String(m%12+1).padStart(2,'0')}`;
const iso=(day:number)=>new Date(day*DAY).toISOString().slice(0,10);
const monthEnd=(m:number)=>new Date(Date.UTC(Math.floor(m/12),m%12+1,0)).toISOString().slice(0,10);
const quarterStart=(m:number)=>Math.floor(m/3)*3;
const quarterEnd=(m:number)=>quarterStart(m)+2;
const after=(m:number,day:number)=>`${month(m+1)}-${String(day).padStart(2,'0')}`;
const labelMonth=(m:number)=>new Date(Date.UTC(Math.floor(m/12),m%12,1)).toLocaleDateString('en-IN',{month:'short',year:'numeric',timeZone:'UTC'});
const prevFy=(m:number)=>{const y=Math.floor(m/12)-(m%12<3?1:0)-1;return`${y}–${String(y+1).slice(-2)}`;};
function addYears(value:string,years:number){const [y,m,d]=value.split('-').map(Number),last=new Date(Date.UTC(y+years,m,0)).getUTCDate();return`${y+years}-${String(m).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function calculateGstLateFeeRange(input:GstLateFeeRangeInput):GstLateFeeRangeResult {
  const first=monthIndex(input.firstPeriod,'First missed tax month'),requestedLast=monthIndex(input.lastPeriod,'Last missed tax month');
  if(input.firstPeriod<'2017-07')throw new Error('GST return periods begin in July 2017. Choose July 2017 or later.');
  if(requestedLast<first)throw new Error('The last missed tax month must be the same as or after the first missed month.');
  if(requestedLast-first>1200)throw new Error('Choose a range of no more than 100 years.');
  const filing=dateDay(input.filingDate,'Filing / calculation date');
  if(input.filingDate>'2100-12-31'||input.filingDate<'2017-07-01')throw new Error('Choose a filing / calculation date from July 2017 through 2100.');
  if(!['monthly','quarterly'].includes(input.gstr1Frequency))throw new Error('Choose the GSTR-1 filing frequency.');
  if(!CATEGORIES.includes(input.nilCategory)||!BANDS.includes(input.turnover))throw new Error('Choose the nil / other fee category and preceding-year turnover band.');
  if(!STATES.has(input.state))throw new Error('Choose the State / Union territory of the GST registration.');
  const qrmp=input.qrmpStart?monthIndex(input.qrmpStart,'QRMP start'):Infinity;
  if(qrmp!==Infinity&&(input.qrmpStart<'2021-01'||qrmp%3!==0))throw new Error('QRMP can start only in January, April, July or October from January 2021 onward. GSTR-3B was monthly before January 2021.');
  let last=requestedLast,cancelDay:number|null=null,cancelMonth=Infinity;
  const notes=[
    'This is a normal-fee estimate using ordinary due dates and the selected facts. It is not the final GST portal payable amount. Extensions, waivers, amnesties, court orders and jurisdiction-specific relief can change it; edit a row’s effective due date where verified.',
    'The same nil category and turnover band are initially applied to every row. Change individual rows if the facts differ by period / preceding financial year. GSTR-1 nil means no outward supplies; GSTR-3B follows the notification’s nil-tax-payable category. Zero cash after ITC alone does not prove that category.',
    'GSTR-1 and GSTR-3B are separate returns. Before January 2021, quarterly GSTR-1 never made GSTR-3B quarterly. A supplied QRMP start is assumed verified and unchanged thereafter; this worksheet does not infer frequency from a last-filed month.',
    'The combined amount assumes corresponding State/UT late fee mirrors the central amount. Tax, interest, penalties, prior fees paid and GSTR-10 are separate and excluded. All fee arithmetic is in whole rupees; the CGST and State/UT halves reconcile exactly.',
  ];
  if(input.filingDate>GST_LATE_FEE_RANGE_REVIEWED||input.lastPeriod>GST_LATE_FEE_RANGE_REVIEWED.slice(0,7))notes.push(`Future projection: assumes the normal rules reviewed ${GST_LATE_FEE_RANGE_REVIEWED} continue unchanged. Check subsequent legislation and due-date notifications before relying on a future result.`);
  if(input.cancelledEffective){cancelDay=dateDay(input.cancelledEffective,'Effective cancellation date');if(input.cancelledEffective<'2017-07-01')throw new Error('Effective cancellation cannot be before GST began in July 2017.');cancelMonth=monthIndex(input.cancelledEffective.slice(0,7),'Cancellation month');if(cancelMonth<first)throw new Error('The selected first missed month is after effective cancellation. Check the cancellation date or period range.');if(cancelMonth<last){last=cancelMonth;notes.push(`The history stops in ${labelMonth(last)} because of the entered effective cancellation date; later selected months were not added.`);}notes.push('Cancellation does not erase earlier return or fee obligations. The effective cancellation date is used here; the cancellation order date and GSTR-10 deadline are separate.');}
  if(input.state==='25')notes.push('State code 25 is a legacy Daman and Diu registration code. Confirm the jurisdiction and GSTIN transition history, and use verified effective due-date overrides where needed.');
  const rows:GstLateFeeRangeRow[]=[];
  function append(form:LateFeeForm){
    let cursor=first;
    while(cursor<=last){
      const quarterly=cursor>=qrmp||(form==='GSTR-1'&&cursor<monthIndex('2021-01','QRMP commencement')&&input.gstr1Frequency==='quarterly');
      const start=quarterly?quarterStart(cursor):cursor,nominalEnd=quarterly?quarterEnd(cursor):cursor;
      const cancelledThisPeriod=cancelDay!==null&&cancelMonth>=start&&cancelMonth<=nominalEnd;
      const end=cancelledThisPeriod?cancelMonth:nominalEnd;
      const periodEnd=cancelledThisPeriod?input.cancelledEffective!:monthEnd(end);
      const id=`${form}-${month(start)}`,override=input.overrides?.[id]??{};
      const category=override.nilCategory??input.nilCategory,turnover=override.turnover??input.turnover;
      if(!CATEGORIES.includes(category)||!BANDS.includes(turnover))throw new Error(`${form} ${labelMonth(start)}: choose a valid fee category and turnover band.`);
      const rowNotes:string[]=[];
      const partialCancellation=cancelledThisPeriod&&quarterly&&(end!==nominalEnd||periodEnd!==monthEnd(nominalEnd));
      const cancelledOnFirst=cancelledThisPeriod&&periodEnd.endsWith('-01');
      const fullQuarterOutsideRange=quarterly&&(start<first||nominalEnd>last)&&!cancelledThisPeriod;
      if(fullQuarterOutsideRange)rowNotes.push('The selected month range touches this return quarter. The entire quarter is included once; a quarterly late fee cannot be divided into individual selected months. Exclude it if the quarter is already filed.');
      let ordinaryDue:string;
      if(form==='GSTR-1')ordinaryDue=quarterly?(month(end)>='2020-12'?after(end,13):monthEnd(end+1)):after(end,month(end)>='2018-07'?11:10);
      else ordinaryDue=after(end,quarterly||(month(end)>='2020-01'&&month(end)<='2020-12'&&turnover!=='above-5cr')?(GROUP_22.has(input.state)?22:24):20);
      if(partialCancellation){ordinaryDue='';rowNotes.push('Cancellation ends this quarterly return early. GSTN requires the final partial GSTR-3B in the following month, rather than waiting for the original quarter end. Verify the exact final GSTR-1 / GSTR-3B period and notified due date on the portal; enter a due-date override to price this row.');}
      const overriddenDue=typeof override.dueDate==='string'&&override.dueDate.trim()!=='';
      const dueDate=overriddenDue?override.dueDate!.trim():ordinaryDue;
      const earliest=iso(dateDay(periodEnd,'Return period end')+1);
      let due:number|null=null;
      if(dueDate){due=dateDay(dueDate,`${form} ${labelMonth(start)} due date`);if(dueDate<earliest)throw new Error(`${form} ${labelMonth(start)}: the effective due date must be after the return period ends (${periodEnd}).`);}
      rowNotes.push(overriddenDue?'Uses your entered effective due date. Keep the supporting extension / notification for this return.':'Uses an ordinary scheduled due date; relevant extensions have not been automatically assumed.');
      const legacy=month(end)<'2021-06',daily=category==='nil'?20:50,cap=legacy?10000:category==='nil'?500:turnover==='up-to-1.5cr'?2000:turnover==='1.5-to-5cr'?5000:10000;
      let daysLate=due===null?null:Math.max(0,filing-due),fee:number|null=daysLate===null?null:Math.min(daysLate*daily,cap);
      let status:GstLateFeeRangeRow['status']='estimate';
      let filingRestrictionReview=false;
      if(legacy)rowNotes.push('Legacy period: this normal calculation uses the combined ₹10,000 ceiling before the June 2021 / quarter-ending June 2021 caps. Historical filing-window relief is separate.');
      if(month(start)>='2020-02'&&month(start)<='2021-06'||month(end)>='2020-02'&&month(end)<='2021-06'){rowNotes.push('COVID-period return: due-date extensions and conditional fee / interest relief need a separate notification and filing-window check. No COVID waiver is automatically applied.');status='review';}
      if(month(start)<'2018-10'){rowNotes.push('Early GST history had major all-India, migration and local extensions. The displayed date is only a nominal schedule unless you supply the effective notified due date.');if(!overriddenDue)status='review';}
      if(form==='GSTR-1'&&quarterly&&month(end)<'2021-01'&&turnover!=='up-to-1.5cr'){rowNotes.push('Verify historical quarterly GSTR-1 eligibility: the pre-QRMP turnover threshold was ₹1.5 crore, with the notified preceding/current-FY conditions. A larger entered band does not establish quarterly eligibility.');status='review';}
      if(cursor>=qrmp&&turnover==='above-5cr'){rowNotes.push('The entered turnover band exceeds the normal QRMP eligibility ceiling. Verify the actual frequency and exit history; a single assumed QRMP start may not describe this period.');status='review';}
      if(cancelledOnFirst){rowNotes.push('Cancellation is effective on the first day of this month. Verify whether the final tax period is actually required; exclude it if not shown as required on the portal / order.');status='review';if(!overriddenDue)fee=null;}
      if(month(start)<'2017-10'){rowNotes.push('July–September 2017 initial-period waivers require a dedicated fee-rule check. No fee is asserted or included for this row.');status='review';fee=null;}
      if(partialCancellation&&start===monthIndex('2021-04','Quarter')){rowNotes.push('Partial April–June 2021 cancellation period: confirm the cap transition separately. No amount is asserted for this special period.');status='review';fee=null;}
      if(due===null){rowNotes.push('A verified effective due date is needed before an amount can be calculated.');status='review';fee=null;}
      if(due!==null&&input.filingDate>='2023-10-01'&&input.filingDate>addYears(dueDate,3)){filingRestrictionReview=true;rowNotes.push('More than three years have elapsed from the entered due date. Statutory / portal filing restrictions and any notified exception must be checked. The normal fee estimate is not permission to file or a final demand.');status='review';}
      // An open or not-yet-overdue period cannot accrue a late filing fee.
      if(filing<=dateDay(periodEnd,'Return period end')||(due!==null&&filing<=due)){daysLate=0;fee=0;status='not-due';rowNotes.push(filing<=dateDay(periodEnd,'Return period end')?'This return period has not closed by the calculation date. Late fee is zero; it is not an overdue return.':'The effective due date has not passed by the calculation date. Late fee is zero.');}
      const excluded=override.excluded===true;
      if(excluded){fee=0;daysLate=0;status='not-due';filingRestrictionReview=false;rowNotes.push('Excluded by you, for example because this return was already filed or is not required. Any earlier fee paid is outside this worksheet.');}
      rows.push({id,form,start:month(start),end:month(end),label:start===end?labelMonth(start):`${labelMonth(start)} – ${labelMonth(end)}${partialCancellation?' (final partial quarter)':fullQuarterOutsideRange?' (whole quarter)':''}`,frequency:quarterly?'quarterly':'monthly',periodEnd,dueDate,daysLate,daily,cap:month(start)<'2017-10'?null:cap,fee,cgst:fee===null?null:fee/2,sgst:fee===null?null:fee/2,nilCategory:category,turnover,previousFy:prevFy(start),excluded,notes:rowNotes,status,filingRestrictionReview});
      cursor=nominalEnd+1;
    }
  }
  append('GSTR-1');append('GSTR-3B');
  rows.sort((a,b)=>a.start.localeCompare(b.start)||a.form.localeCompare(b.form));
  const totals={gstr1:0,gstr3b:0,combined:0,cgst:0,sgst:0};
  for(const row of rows){if(row.fee!==null){if(row.form==='GSTR-1')totals.gstr1+=row.fee;else totals.gstr3b+=row.fee;totals.cgst+=row.cgst!;totals.sgst+=row.sgst!;}}
  totals.combined=totals.gstr1+totals.gstr3b;
  const reviewCount=rows.filter(r=>r.status==='review'&&!r.excluded).length,unpricedCount=rows.filter(r=>r.fee===null&&!r.excluded).length,excludedCount=rows.filter(r=>r.excluded).length;
  if(reviewCount)notes.push(`${reviewCount} return row${reviewCount===1?' needs':'s need'} review. Numeric normal-fee estimates in review rows are included in the totals; they are not confirmed payable fees.`);
  if(unpricedCount)notes.push(`${unpricedCount} row${unpricedCount===1?' has':'s have'} no reliable priced amount and ${unpricedCount===1?'is':'are'} omitted from the totals. The displayed sum is incomplete until those rows are resolved.`);
  if(rows.some(r=>r.filingRestrictionReview))notes.push('Some old returns may be blocked by the three-year filing restriction. A computed normal fee does not establish that those returns can be filed.');
  return{rows,totals,notes,reviewCount,unpricedCount,excludedCount};
}
