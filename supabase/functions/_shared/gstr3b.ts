// Shared by the mobile editor and server validation. Never defaults missing amounts to zero.
export type Obj = Record<string, unknown>;
export const TAX = ['iamt','camt','samt','csamt'] as const;
export const SECTION_NAMES:Record<string,string> = {
  eco_dtls:'3.1.1 · Supplies through ecommerce operators',
  sup_details:'3.1 · Outward supplies and reverse charge', inter_sup:'3.2 · Interstate customer breakdown',
  itc_elg:'4 · Input tax credit', inward_sup:'5 · Exempt / nil / non-GST purchases', intr_ltfee:'5.1 · Interest',
};
export const ROW_NAMES:Record<string,string> = {
  eco_sup:'3.1.1(i) Platform operator liability',eco_reg_sup:'3.1.1(ii) Seller supplies · platform pays GST',
  osup_det:'3.1(a) Taxable outward supplies',osup_zero:'3.1(b) Zero-rated outward supplies',osup_nil_exmp:'3.1(c) Nil-rated and exempt outward supplies',isup_rev:'3.1(d) Inward supplies liable to reverse charge',osup_nongst:'3.1(e) Non-GST outward supplies',
  itc_avl:'4(A) ITC available',itc_rev:'4(B) ITC reversed',itc_net:'4(C) Net ITC: A minus B',itc_inelg:'4(D) Other ITC disclosures',
  IMPG:'Import of goods',IMPS:'Import of services',ISRC:'Inward reverse-charge supplies',ISD:'Input Service Distributor',OTH:'Other',RUL:'Rule / statutory category',
  unreg_details:'Unregistered customers',comp_details:'Composition taxpayers',uin_details:'UIN holders',
  isup_details:'Inward supply values',GST:'Composition / exempt / nil-rated purchases',NONGST:'Non-GST purchases',intr_details:'Interest payable',
  iamt:'IGST ₹',camt:'CGST ₹',samt:'SGST / UTGST ₹',csamt:'Cess ₹',txval:'Taxable value ₹',inter:'Interstate value ₹',intra:'Intrastate value ₹',pos:'Place of supply · state code',
};
const row=(keys:readonly string[])=>Object.fromEntries(keys.map(k=>[k,'']));
export function blank3b(gstin:string,period:string):Obj {
  const typed=(types:string[])=>types.map(ty=>({ty,...row(TAX)}));
  return {gstin,ret_period:period,
    sup_details:{osup_det:row(['txval',...TAX]),osup_zero:row(['txval','iamt','csamt']),osup_nil_exmp:row(['txval']),isup_rev:row(['txval',...TAX]),osup_nongst:row(['txval'])},
    inter_sup:{unreg_details:[],comp_details:[],uin_details:[]},
    itc_elg:{itc_avl:typed(['IMPG','IMPS','ISRC','ISD','OTH']),itc_rev:typed(['RUL','OTH']),itc_net:row(TAX),itc_inelg:typed(['RUL','OTH'])},
    inward_sup:{isup_details:[{ty:'GST',inter:'',intra:''},{ty:'NONGST',inter:'',intra:''}]},intr_ltfee:{intr_details:row(TAX)}};
}
export function record(value:unknown,label='section'):Obj {if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`Complete ${label}.`);return value as Obj;}
export function amount(value:unknown,label:string,negative=false):number {
  if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e12||(!negative&&value<0)||Math.abs(value*100-Math.round(value*100))>0.0001)throw Error(`${label}: enter an amount with up to two decimals; blanks are not zero.`);
  return value;
}
export function zeroBlanks(value:unknown):unknown {
  if(value==='')return 0;
  if(Array.isArray(value))return value.map(zeroBlanks);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,zeroBlanks(v)]));
  return value;
}
export function netItc(data:Obj):Obj {
  const itc=record(data.itc_elg);const available=itc.itc_avl as Obj[],reversed=itc.itc_rev as Obj[];
  if(!Array.isArray(available)||!Array.isArray(reversed))throw Error('Complete ITC availability and reversal tables.');
  return Object.fromEntries(TAX.map(key=>[key,Math.round((available.reduce((n,r)=>n+amount(r[key],key),0)-reversed.reduce((n,r)=>n+amount(r[key],key),0))*100)/100]));
}
export function validate3b(data:Obj) {
  const template=blank3b(String(data.gstin),String(data.ret_period));
  if(data.eco_dtls!==undefined)template.eco_dtls={eco_sup:row(['txval',...TAX]),eco_reg_sup:row(['txval'])};
  const allowed=Object.keys(template);
  if(Object.keys(data).some(k=>!allowed.includes(k)))throw Error('This GSTR-3B contains unsupported sections. Nothing will be silently removed.');
  function check(value:unknown,shape:unknown,path:string) {
    if(shape===''){amount(value,path,path.startsWith('eco_dtls')||path.startsWith('sup_details')||path==='itc_elg.itc_net');return;}
    if(typeof shape==='string'){if(value!==shape)throw Error(`Invalid category at ${path}.`);return;}
    if(Array.isArray(shape)) {
      if(!Array.isArray(value))throw Error(`Complete ${path}.`);
      if(shape.length){if(value.length!==shape.length)throw Error(`Complete all categories in ${path}.`);shape.forEach((s,i)=>check(value[i],s,`${path}[${i}]`));}
      else {
        const seen=new Set<string>();
        value.forEach(v=>{const r=record(v,path);if(Object.keys(r).some(k=>!['pos','txval','iamt'].includes(k))||typeof r.pos!=='string'||!/^(0[1-9]|[12][0-9]|3[0-8]|97)$/.test(r.pos)||r.pos===String(data.gstin).slice(0,2)||seen.has(r.pos))throw Error(`Check unique interstate place-of-supply codes in ${path}.`);seen.add(r.pos);amount(r.txval,path+' taxable value');amount(r.iamt,path+' IGST');});
      }return;
    }
    const obj=record(value,path),schema=record(shape);
    if(Object.keys(obj).some(k=>!(k in schema)))throw Error(`Unsupported field in ${path}; nothing was dropped.`);
    for(const [k,v] of Object.entries(schema))check(obj[k],v,path?`${path}.${k}`:k);
  }
  for(const key of Object.keys(SECTION_NAMES).filter(k=>k!=='eco_dtls'||data.eco_dtls!==undefined))check(data[key],template[key],key);
  const net=netItc(data),entered=record(record(data.itc_elg).itc_net);
  for(const key of TAX)if(Math.abs(Number(net[key])-Number(entered[key]))>0.01)throw Error(`Net ITC ${key} must equal available ITC minus reversals.`);
  const inter=record(data.inter_sup),sup=record(record(data.sup_details).osup_det);
  const rows=Object.values(inter).flat() as Obj[];
  if(rows.reduce((n,r)=>n+Number(r.iamt),0)>Math.max(0,Number(sup.iamt))+0.01||rows.reduce((n,r)=>n+Number(r.txval),0)>Math.max(0,Number(sup.txval))+0.01)throw Error('Table 3.2 exceeds the corresponding taxable outward supply totals.');
  return data;
}
