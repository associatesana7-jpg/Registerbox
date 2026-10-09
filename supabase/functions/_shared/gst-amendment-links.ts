import {sectionFingerprint} from './gstr1-sections.ts';
import {validateEcomSections} from './gst-ecom.ts';
type Obj=Record<string,unknown>;
export type FiledGstArchive={id:string;gstin:string;form:string;year:number;month:number;state:string;acknowledgement:string|null;payload:Obj;payload_hash:string;snapshot:Obj|null;reconciliation:{matched:boolean}|null};
type Values={txval:number;iamt:number;camt:number;samt:number;csamt:number};
export type AmendmentEvidence={version:string;scope:'local_filed_archives';portalHistoryVerified:false;checkedAt:string;matched:boolean;issues:string[];links:{section:string;reference:string;originalDraftId:string;originalPeriod:string;originalPayloadHash:string;acknowledgement:string;original:Values;revised:Values;delta:Values}[]};
const heads=['txval','iamt','camt','samt','csamt'] as const;
const obj=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
const list=(v:unknown):Obj[]=>Array.isArray(v)?v.map(obj):[];
const index=(p:string)=>Number(p.slice(2))*12+Number(p.slice(0,2));
const rowsPeriod=(a:FiledGstArchive)=>String(a.month).padStart(2,'0')+a.year;
function values(lines:Obj[]):Values {const result={txval:0,iamt:0,camt:0,samt:0,csamt:0};for(const line of lines)for(const h of heads){const value=line[h]??0;if(typeof value!=='number'||!Number.isFinite(value))throw Error('Original archive has incomplete amounts.');result[h]+=Math.round(value*100);}for(const h of heads){if(!Number.isSafeInteger(result[h]))throw Error('Amendment totals exceed supported precision.');result[h]/=100;}return result;}
const documentLines=(invoice:Obj)=>list(invoice.itms).map(line=>obj(line.itm_det));
/** Only server-owned, acknowledged filed archives may be supplied here.
 * First amendment linkage is supported. Earlier corrections are explicit blockers
 * until the provider supplies a verified latest-original chain.
 */
export function linkEcommerceAmendments(payload:Obj,archives:FiledGstArchive[],checkedAt=new Date().toISOString()):AmendmentEvidence{
  const result:AmendmentEvidence={version:'gst-amendments-v1',scope:'local_filed_archives',portalHistoryVerified:false,checkedAt,matched:true,issues:[],links:[]};
  if(payload.ecoma===undefined)return result;
  const fp=String(payload.fp);validateEcomSections(payload,fp);
  const filed=archives.filter(a=>a.gstin===payload.gstin&&a.form==='gstr-1'&&a.state==='filed'&&a.acknowledgement&&a.reconciliation?.matched&&index(rowsPeriod(a))<index(fp));
  if(filed.some(a=>a.payload.ecoma!==undefined&&sectionFingerprint(a.payload.ecoma)!==sectionFingerprint(obj(a.snapshot?.registerbox_sections).ecoma)))result.issues.push('Earlier amendment snapshot is incomplete or differs from its filed payload. Verify that archive first.');
  function originalArchive(period:string){const candidates=filed.filter(a=>rowsPeriod(a)===period);if(candidates.length!==1)throw Error('Original period needs one acknowledged, reconciled filed archive. Fetch and verify the original return first.');const a=candidates[0];const sections=obj(a.snapshot?.registerbox_sections);if(sectionFingerprint(sections.ecom)!==sectionFingerprint(a.payload.ecom))throw Error('Original snapshot differs from the filed draft.');if(!sections.ecom)throw Error('Original archive has no complete portal table 15 snapshot.');return {archive:a,ecom:obj(sections.ecom)};}
  function record(section:string,reference:string,a:FiledGstArchive,original:Values,revised:Values){const delta={...original};for(const head of heads)delta[head]=(Math.round(revised[head]*100)-Math.round(original[head]*100))/100;result.links.push({section,reference,originalDraftId:a.id,originalPeriod:rowsPeriod(a),originalPayloadHash:a.payload_hash,acknowledgement:a.acknowledgement!,original,revised,delta});}
  const amendments=obj(payload.ecoma);
  for(const category of ['b2ba','urp2ba'])for(const group of list(amendments[category]))for(const inv of list(group.inv)){
    const reference=String(inv.oinum)+' / '+String(inv.oidt);
    try{
      const p=String(inv.oidt).slice(3,5)+String(inv.oidt).slice(6),{archive,ecom}=originalArchive(p);
      const candidates=list(ecom[category==='b2ba'?'b2b':'urp2b']).filter(g=>g.stin===group.stin).flatMap(g=>list(g.inv).filter(i=>String(i.inum).toUpperCase()===String(inv.oinum).toUpperCase()&&i.idt===inv.oidt).map(i=>({g,i})));
      if(candidates.length!==1)throw Error('Original invoice is missing or ambiguous in the filed snapshot.');
      if(candidates[0].g.rtin!==group.rtin)throw Error('Recipient changes require a verified provider amendment workflow.');
      const prior=filed.some(a=>list(obj(obj(a.snapshot?.registerbox_sections).ecoma)[category]).some(g=>g.stin===group.stin&&list(g.inv).some(i=>String(i.oinum).toUpperCase()===String(inv.oinum).toUpperCase()&&i.oidt===inv.oidt)));
      if(prior)throw Error('This invoice was amended earlier. Verify the latest original before another correction.');
      record(category,reference,archive,values(documentLines(candidates[0].i)),values(documentLines(inv)));
    }catch(e){result.issues.push(`${category} ${reference}: ${e instanceof Error?e.message:'Original could not be linked.'}`);}
  }
  for(const category of ['b2ca','urp2ca'])for(const group of list(amendments[category]))for(const entry of category==='b2ca'?list(group.posItms):[group]){
    const pos=category==='b2ca'?group.pos:entry.pos,reference=[entry.omon,entry.ostin??'unregistered',pos,entry.sply_ty].join(' / ');
    try{
      const {archive,ecom}=originalArchive(String(entry.omon));
      if(category==='b2ca'&&entry.stin!==entry.ostin)throw Error('Supplier changes require separate provider verification.');
      const original=list(ecom[category==='b2ca'?'b2c':'urp2c']).filter(r=>r.pos===pos&&r.sply_ty===entry.sply_ty&&(category!=='b2ca'||r.stin===entry.ostin));
      if(!original.length)throw Error('Original supplier/POS summary was not found in the filed snapshot.');
      const prior=filed.some(a=>list(obj(obj(a.snapshot?.registerbox_sections).ecoma)[category]).some(g=>(category==='b2ca'?list(g.posItms):[g]).some(i=>(category==='b2ca'?g.pos:i.pos)===pos&&i.omon===entry.omon&&i.sply_ty===entry.sply_ty&&(category!=='b2ca'||i.ostin===entry.ostin))));
      if(prior)throw Error('This summary was amended earlier. Verify its latest replacement first.');
      record(category,reference,archive,values(original),values(list(entry.itms)));
    }catch(e){result.issues.push(`${category} ${reference}: ${e instanceof Error?e.message:'Original could not be linked.'}`);}
  }
  result.matched=result.issues.length===0&&result.links.length>0;return result;
}
