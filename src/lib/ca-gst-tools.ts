/** Offline GST decision rules. Inputs are supplied facts, never GST portal records. */
export const CA_GST_REVIEWED = '2026-10-28';
export const CA_GST_RULE_VERSION = '2026-10-28.1';
export const GST_STATES = [
  ['01','Jammu and Kashmir'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],['09','Uttar Pradesh'],['10','Bihar'],['11','Sikkim'],['12','Arunachal Pradesh'],['13','Nagaland'],['14','Manipur'],['15','Mizoram'],['16','Tripura'],['17','Meghalaya'],['18','Assam'],['19','West Bengal'],['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],['24','Gujarat'],['26','Dadra and Nagar Haveli and Daman and Diu'],['27','Maharashtra'],['29','Karnataka'],['30','Goa'],['31','Lakshadweep'],['32','Kerala'],['33','Tamil Nadu'],['34','Puducherry'],['35','Andaman and Nicobar Islands'],['36','Telangana'],['37','Andhra Pradesh'],['38','Ladakh'],
] as const;
export type GstDecision = {status:'applies'|'not-applicable'|'review';title:string;explanation:string;rule:string;notes:string[]};
const DIGITS = ['०१२३४५६७८९','೦೧೨೩೪೫೬೭೮೯'];
export function gstMoney(value:string, label='Amount'):bigint {
  let text = value.trim();
  for (const script of DIGITS) text = text.replace(new RegExp(`[${script}]`,'g'), char => String(script.indexOf(char)));
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(text)) throw new Error(`${label}: enter a non-negative rupee amount with up to two decimal places.`);
  const [whole, fraction=''] = text.replaceAll(',','').split('.');
  const paise = BigInt(whole)*100n + BigInt(fraction.padEnd(2,'0'));
  if(paise>100000000000000n) throw new Error(`${label}: enter no more than ₹1,00,000 crore.`);
  return paise;
}
const min=(a:bigint,b:bigint)=>a<b?a:b;
const positive=(n:bigint)=>n>0n?n:0n;
export type TaxHeads = {igst:bigint;cgst:bigint;sgst:bigint};
export type ItcInput = {liability:{igst:string;cgst:string;sgst:string};credit:{igst:string;cgst:string;sgst:string};eligibleConfirmed:boolean;restrictions:boolean};
export type ItcResult = {status:'calculated';liability:TaxHeads;credit:TaxHeads;allocation:{from:keyof TaxHeads;to:keyof TaxHeads;amount:bigint}[];cash:TaxHeads;remaining:TaxHeads;totalCash:bigint;notes:string[]};
export function calculateItc(input:ItcInput):ItcResult {
  if(!input.eligibleConfirmed) throw new Error('Confirm that the entered credit is legally eligible and available in the credit ledger. GSTR-2B matching alone is not enough.');
  if(input.restrictions) throw new Error('Rule 86A/86B, a cash-payment restriction or another ledger restriction needs a separate computation. This ordinary set-off worksheet cannot decide the permitted debit.');
  const heads=(v:{igst:string;cgst:string;sgst:string},name:string):TaxHeads=>({igst:gstMoney(v.igst,`${name} IGST`),cgst:gstMoney(v.cgst,`${name} CGST`),sgst:gstMoney(v.sgst,`${name} SGST / UTGST`)});
  const liability=heads(input.liability,'Output liability'),credit=heads(input.credit,'Available ITC'),cash={...liability},remaining={...credit};
  const allocation:ItcResult['allocation']=[];
  const allocate=(from:keyof TaxHeads,to:keyof TaxHeads,limit?:bigint)=>{const amount=min(min(remaining[from],cash[to]),limit??remaining[from]);if(amount){remaining[from]-=amount;cash[to]-=amount;allocation.push({from,to,amount});}};
  allocate('igst','igst');
  // Rule 88A allows remaining IGST to local heads in either order/proportion.
  // First cover local deficits that their own credits cannot cover, avoiding stranded credit.
  allocate('igst','cgst',positive(cash.cgst-remaining.cgst));
  allocate('igst','sgst',positive(cash.sgst-remaining.sgst));
  allocate('igst','cgst');allocate('igst','sgst');
  allocate('cgst','cgst');allocate('sgst','sgst');
  allocate('cgst','igst');allocate('sgst','igst');
  return {status:'calculated',liability,credit,allocation,cash,remaining,totalCash:cash.igst+cash.cgst+cash.sgst,notes:['IGST credit is used first against IGST, then against CGST and SGST/UTGST before local credits are used. The local allocation shown is one cash-minimising permitted allocation.','CGST and SGST/UTGST credits are first applied to their own tax; remaining credit can pay IGST in the prescribed order. CGST credit never pays SGST/UTGST and SGST/UTGST credit never pays CGST.','Cash required is before using any electronic cash-ledger balance. Reverse-charge tax, interest, fees, penalties and compensation cess are excluded. This is a worksheet, not a GST portal set-off or eligibility approval.']};
}

function dateParts(value:string,label:string):number[] {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: choose a valid date.`);
  const [y,m,d]=value.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
  if(dt.toISOString().slice(0,10)!==value) throw new Error(`${label}: choose a real calendar date.`);
  return [y,m,d];
}
function supportedDate(value:string,from:string,label:string){dateParts(value,label);if(value<from||value>CA_GST_REVIEWED)throw new Error(`${label}: this rule version supports ${from} through ${CA_GST_REVIEWED}.`);}
export type EInvoiceInput={date:string;turnover:string;entity:'regular'|'sez-unit'|'bank-insurer'|'gta'|'passenger'|'multiplex'|'government'|'oidar'|'unknown';document:'b2b'|'export'|'sez'|'b2c'|'bill-supply'|'commercial-note'|'recipient-self-invoice'|'unknown';registered:boolean;turnoverConfirmed:boolean};
export function checkEInvoice(input:EInvoiceInput):GstDecision & {reportingDays?:number;reportBy?:string} {
  supportedDate(input.date,'2023-08-01','Document date');
  if(!['regular','sez-unit','bank-insurer','gta','passenger','multiplex','government','oidar','unknown'].includes(input.entity)||!['b2b','export','sez','b2c','bill-supply','commercial-note','recipient-self-invoice','unknown'].includes(input.document))throw new Error('Choose a listed supplier and document category.');
  const turnover=gstMoney(input.turnover,'Highest aggregate turnover');
  const rule='CGST rule 48(4); Notification 13/2020–Central Tax as amended by 10/2023; GSTN IRP reporting advisory effective 1 April 2025.';
  const notes=['Turnover is PAN-wide across India: highest aggregate turnover in any preceding financial year from 2017–18, up to the financial year before the document date. A current-year crossing does not by itself satisfy that preceding-year test.','An IRP enablement search is a portal facility; it does not replace the legal threshold and exemption test. B2C dynamic QR requirements are a separate question.','For a credit/debit note choose the underlying covered taxable B2B/export/SEZ supply. Financial/commercial notes without GST are a different category.'];
  if(!input.turnoverConfirmed||input.entity==='unknown'||input.document==='unknown')return{status:'review',title:'Confirm these facts first',explanation:'Verify the preceding-year PAN-wide turnover, supplier category and document type before deciding e-invoice applicability.',rule,notes};
  if(!input.registered)return{status:'not-applicable',title:'Rule 48(4) supplier mandate does not apply',explanation:'This check concerns a registered supplier. An unregistered person cannot issue a GST tax invoice or collect GST as a registered supplier. Registration liability needs its own check.',rule,notes};
  if(input.entity!=='regular')return{status:'not-applicable',title:'Selected supplier class is excluded',explanation:'The selected notified supplier class is excluded from the e-invoice mandate. Confirm that the business actually falls within that legal class. SEZ developers and ordinary suppliers to an SEZ are not SEZ units for this exemption.',rule,notes};
  if(turnover<=5000000000n)return{status:'not-applicable',title:'Turnover does not exceed ₹5 crore',explanation:'For this supported date range the mandate requires aggregate turnover exceeding ₹5 crore in a preceding financial year from 2017–18. Exactly ₹5 crore does not cross that statutory wording.',rule,notes};
  if(['b2c','bill-supply','commercial-note','recipient-self-invoice'].includes(input.document))return{status:'not-applicable',title:'This document is outside the supplier IRN mandate',explanation:'The selected B2C, bill-of-supply, financial/commercial-note or recipient self-invoice category is outside this supplier e-invoice document check. Other invoice or reporting duties may still apply.',rule,notes};
  const result:GstDecision & {reportingDays?:number;reportBy?:string}={status:'applies',title:'E-invoicing applies on the entered facts',explanation:'A registered, non-excluded supplier above the preceding-year threshold must report this covered taxable B2B/export/SEZ document to an authorised IRP and obtain the IRN and signed QR code.',rule,notes};
  const reportingThreshold=input.date>='2025-04-01'?10000000000n:input.date>='2023-11-01'?100000000000n:null;
  if(reportingThreshold!==null&&turnover>=reportingThreshold){const [y,m,d]=dateParts(input.date,'Document date');result.reportingDays=30;result.reportBy=new Date(Date.UTC(y,m-1,d+29)).toISOString().slice(0,10);result.notes.push(`GSTN/IRP restricts reporting to 30 days from the document date for AATO ${input.date>='2025-04-01'?'₹10 crore':'₹100 crore'} and above for this date. Counting includes the document date; confirm the live portal cut-off before reporting.`);}
  return result;
}

export type EWayInput={distance:string;kind:'regular'|'odc'|'ship';startedAt:string};
export function calculateEWay(input:EWayInput){
  if(!/^(?:[1-9]\d{0,3})$/.test(input.distance)||Number(input.distance)>4000)throw new Error('Enter the approximate journey distance as a whole number from 1 to 4,000 km. Use the distance accepted on the e-way bill; this tool does not measure a road route or validate PIN-to-PIN distance tolerances.');
  if(!['regular','odc','ship'].includes(input.kind))throw new Error('Choose the cargo / transport category.');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.startedAt))throw new Error('Choose the date and time when e-way-bill validity starts, in Indian Standard Time.');
  const day=input.startedAt.slice(0,10);supportedDate(day,'2021-01-01','Validity-start date');
  const hours=Number(input.startedAt.slice(11,13)),minutes=Number(input.startedAt.slice(14,16));
  if(hours>23||minutes>59)throw new Error('Enter a valid Indian Standard Time.');
  const km=Number(input.distance),perDay=input.kind==='regular'?200:20,days=Math.ceil(km/perDay),[y,m,d]=dateParts(day,'Validity-start date');
  // One validity day ends at the end of the next calendar day, not 24 hours later.
  const lastDate=new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);
  return{km,perDay,days,lastDate,expiresExclusiveIst:`${new Date(Date.UTC(y,m-1,d+days+1)).toISOString().slice(0,10)}T00:00:00+05:30`,notes:['The validity period starts on the first relevant Part-B entry (vehicle or transport-document details), not from saving only Part A. Check the actual Valid Upto field on the portal.','The estimate ends at midnight after the displayed last valid date in IST. It is not calculated as a rolling 24-hour block from the entered time.','ODC and multimodal shipments with at least one leg by ship use 20 km per day or part thereof; ordinary movements use 200 km. The tool does not decide whether an e-way bill is required, generate one, extend it or check State exemptions.']};
}

export type PosKind='goods-movement'|'goods-no-movement'|'goods-bill-ship'|'goods-install'|'goods-onboard'|'service-general'|'service-property'|'service-restaurant'|'service-training'|'service-admission'|'other';
export type PosInput={date:string;kind:PosKind;supplier:string;recipient:string;location:string;delivery:string;registered:boolean;addressRecorded:boolean;deliveryRecorded:boolean;domestic:boolean;sez:boolean;specialExcluded:boolean};
export function findPlaceOfSupply(input:PosInput):GstDecision & {place?:string;tax?:string} {
  supportedDate(input.date,'2023-10-01','Supply date');
  const state=(code:string,label:string)=>{if(!GST_STATES.some(([c])=>c===code))throw new Error(`Select a valid ${label} State / Union territory.`);return code;};
  state(input.supplier,'supplier');
  const notes=['Place of supply and supplier location are separate statutory concepts. Use the location of the establishment most directly concerned with the supply; this tool does not determine establishment or registration liability.','This finder covers only the selected domestic branch. Imports, exports, territorial waters, multiple-State property/events, intermediary, online services, telecom, banking, insurance and other special service branches need their own review.'];
  if(!input.domestic||input.kind==='other')return{status:'review',title:'A specialist place-of-supply rule is needed',explanation:'One or both parties / the relevant location are outside India, or the supply is outside the supported branches. No default place or tax head has been assumed.',rule:'IGST Act sections 10–13.',notes};
  let place='',rule='';
  if(input.kind==='goods-movement'||input.kind==='goods-no-movement'){
    if(!input.registered){rule='IGST Act section 10(1)(ca), effective 1 October 2023; Circular 209/3/2024-GST.';place=input.deliveryRecorded?state(input.delivery,'delivery address recorded on invoice'):input.addressRecorded?state(input.recipient,'recipient address recorded on invoice'):input.supplier;notes.push('For unregistered buyers, use the recipient address recorded in the invoice. Where both billing and a different delivery address are recorded, Circular 209 selects the recorded delivery address. Recording the State name counts as recording an address. With no recorded address, use supplier location.');}
    else{place=state(input.location,input.kind==='goods-movement'?'delivery-termination':'goods-at-delivery');rule=input.kind==='goods-movement'?'IGST Act section 10(1)(a).':'IGST Act section 10(1)(c).';}
  }else if(input.kind==='goods-bill-ship'){place=state(input.recipient,'directing third person’s principal place of business');rule='IGST Act section 10(1)(b).';notes.push('This result concerns the supplier-to-directing-third-person leg only. A later sale by that third person is a separate supply. Confirm that the third-person direction exists before or during movement.');}
  else if(input.kind==='goods-install'){place=state(input.location,'installation / assembly site');rule='IGST Act section 10(1)(d).';}
  else if(input.kind==='goods-onboard'){place=state(input.location,'location where goods are taken on board');rule='IGST Act section 10(1)(e).';}
  else if(input.kind==='service-general'){
    if(!input.specialExcluded)return{status:'review',title:'First exclude the special service rules',explanation:'The general service rule applies only after checking sections 12(3)–12(14). Select the actual special branch where relevant.',rule:'IGST Act section 12(2).',notes};
    place=input.registered||input.addressRecorded?state(input.recipient,'recipient'):input.supplier;rule='IGST Act section 12(2).';
  }else if(input.kind==='service-property'){place=state(input.location,'single property / accommodation location in India');rule='IGST Act section 12(3).';}
  else if(input.kind==='service-restaurant'){place=state(input.location,'actual performance location');rule='IGST Act section 12(4).';}
  else if(input.kind==='service-training'){place=input.registered?state(input.recipient,'registered recipient'):state(input.location,'actual performance location');rule='IGST Act section 12(5).';}
  else if(input.kind==='service-admission'){place=state(input.location,'event / amusement park location');rule='IGST Act section 12(6).';}
  else throw new Error('Choose a supported supply type.');
  const label=GST_STATES.find(([c])=>c===place)![1],inter=input.sez||input.supplier!==place;
  return{status:'applies',title:`Place of supply: ${label}`,explanation:input.sez?'A supply to or by an SEZ developer/unit is treated as inter-State even when supplier location and place of supply are in the same State. Separately check authorised operations and zero-rating.':`Supplier location and place of supply are ${inter?'in different States / UTs':'in the same State / UT'} for this supported domestic branch.`,rule,place,tax:inter?'IGST — subject to taxability and zero-rating checks':'CGST + SGST / UTGST — subject to taxability checks',notes};
}

export type RcmInput={date:string;category:'director'|'legal'|'gta'|'other';domestic:boolean;director:'independent'|'employment'|'unclear';legalSupplier:'advocate'|'senior'|'other';legalRecipient:'business-taxable'|'business-exempt'|'non-business'|'government'|'advocate'|'unknown';gtaConsignment:boolean;gtaExemption:'yes'|'no'|'unknown';gtaForward:'yes'|'no'|'unknown';gtaRecipient:'registered'|'company'|'partnership'|'factory'|'society'|'cooperative'|'casual'|'government-tds'|'other';freightPayer:boolean};
export function checkReverseCharge(input:RcmInput):GstDecision {
  supportedDate(input.date,'2023-10-01','Supply date');
  if(!['director','legal','gta','other'].includes(input.category))throw new Error('Choose a listed RCM service category.');
  if(input.category==='director'&&!['independent','employment','unclear'].includes(input.director))throw new Error('Choose the director service capacity.');
  if(input.category==='legal'&&(!['advocate','senior','other'].includes(input.legalSupplier)||!['business-taxable','business-exempt','non-business','government','advocate','unknown'].includes(input.legalRecipient)))throw new Error('Choose the legal-service supplier and recipient category.');
  if(input.category==='gta'&&(!['yes','no','unknown'].includes(input.gtaExemption)||!['yes','no','unknown'].includes(input.gtaForward)||!['registered','company','partnership','factory','society','cooperative','casual','government-tds','other'].includes(input.gtaRecipient)))throw new Error('Choose the GTA exemption, election and recipient facts.');
  const rule='CGST Act section 9(3); Notification 13/2017–Central Tax (Rate), entries 1, 2 and 6, as amended; exemption Notification 12/2017 entry 45.';
  const notes=['This is a scoped applicability check, not a tax-rate or payable-tax calculator. It covers three domestic service categories only. Other RCM goods/services, imports, property rental, promoters and section 9(4) require separate checks.','The invoice label alone does not establish an exemption or forward-charge election. Keep contracts, supplier declarations, invoice details and the applicable notification. RCM tax is paid in cash; subsequent ITC has separate eligibility conditions.'];
  const result=(status:GstDecision['status'],title:string,explanation:string):GstDecision=>({status,title,explanation,rule,notes});
  if(!input.domestic||input.category==='other')return result('review','This transaction needs another RCM branch','No universal yes/no can be given from supplier registration status alone. Identify the exact notified supply, parties, territory, exemption and date.');
  if(input.category==='director'){
    if(input.director==='employment')return result('not-applicable','Employment services are outside GST','On the confirmed facts, this is service by an employee to the employer in the course of employment, covered by Schedule III. Independent director fees or non-salary director services are a separate supply. Circular 140/10/2020 requires separating those portions.');
    if(input.director==='independent')return result('applies','Company / body corporate pays under RCM','Taxable services supplied by a director in the capacity of director to that company or body corporate fall under entry 6. This branch excludes services in a personal capacity and genuine employment salary.');
    return result('review','Separate employment and director services','Confirm the contract, capacity in which the service is supplied, accounting treatment and salary / professional-fee withholding evidence. A director title alone does not settle the treatment.');
  }
  if(input.category==='legal'){
    if(input.legalSupplier==='other'||input.legalRecipient==='unknown')return result('review','Confirm the legal-service parties','This branch requires legal services from an individual advocate, senior advocate or firm of advocates. Other consultancy or a different entity needs separate classification.');
    if(['business-exempt','non-business','government'].includes(input.legalRecipient))return result('not-applicable','Selected legal-service exemption applies','Entry 45 exempts the selected non-business / specified government recipient or a business eligible for the preceding-year registration-exemption turnover condition. For a business, verify actual eligibility for exemption from registration, not only its GST registration status.');
    if(input.legalRecipient==='advocate'&&input.legalSupplier==='advocate')return result('not-applicable','Advocate-to-advocate legal-service exemption','Legal services from an individual advocate other than a senior advocate, or a partnership firm of advocates, to an advocate / partnership firm providing legal services fall within the entry 45 exemption.');
    if(input.legalRecipient==='advocate')return result('review','Check the recipient business exemption','The advocate-to-advocate exemption is not the same for a senior-advocate supplier. Check whether the recipient business meets another entry 45 exemption before applying RCM.');
    return result('applies','Recipient business pays under RCM','The entered facts identify taxable legal services by the specified advocate / firm to a business entity in the taxable territory, with no selected exemption. Entry 2 places GST liability on the recipient.');
  }
  if(!input.gtaConsignment)return result('review','Confirm whether the supplier is a GTA','A goods transport agency issues a consignment note, by whatever name called. Ordinary road transport without a GTA consignment note is not automatically this RCM entry.');
  if(input.gtaExemption==='yes')return result('not-applicable','The confirmed exempt freight is outside this RCM levy','An exempt supply does not become taxable merely because the recipient belongs to a notified class. Retain the exact exemption and evidence for the goods/service.');
  if(input.gtaExemption==='unknown'||input.gtaForward==='unknown')return result('review','Check the freight exemption and GTA election','Verify exemption for the actual goods/service and the registered GTA’s valid forward-charge option, GST-charging tax invoice and prescribed declaration.');
  if(input.gtaForward==='yes')return result('not-applicable','Registered GTA pays under its valid forward-charge option','This result assumes the registered GTA has validly opted for forward charge, charges applicable GST and gives the prescribed invoice declaration. A GST amount alone is insufficient evidence of the option.');
  if(input.gtaRecipient==='government-tds')return result('not-applicable','Specified TDS-only government recipient is excluded from entry 1','The entry 1 proviso excludes specified government departments / establishments, local authorities and governmental agencies registered only to deduct GST TDS and not to make taxable supplies. Confirm both the legal recipient class and the TDS-only registration facts.');
  if(!input.freightPayer||input.gtaRecipient==='other')return result('review','Identify the person liable to pay freight','The RCM recipient is the notified person located in taxable territory who pays or is liable to pay freight. This branch cannot conclude for an unlisted recipient class or a different freight payer.');
  return result('applies','The notified freight recipient pays under RCM','A taxable GTA service without the confirmed forward-charge exception is received by a notified recipient who is liable to pay freight. Entry 1 places liability on that recipient.');
}
