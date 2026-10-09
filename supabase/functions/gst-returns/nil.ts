type Obj = Record<string, unknown>;
export function isNil(value: Obj) { return value.registerbox_nil === true; }
export function validateNil(value: Obj, form: string) {
  const checks = value.declarations as Obj | undefined;
  const required = ['noSales','noAdjustments','completeBooks',...(form === 'gstr-3b' ? ['noPurchases','noItc','noLiability','noAutoPopulation','gstr1FiledNil'] : [])];
  if (!checks || required.some(key => checks[key] !== true)) throw new Error('Confirm every nil eligibility statement or use a regular return.');
  if (Object.keys(value).some(key => !['gstin','ret_period','registerbox_nil','declarations'].includes(key))) throw new Error('Nil drafts cannot contain invoice or tax fields.');
  if (!['gstr-1','gstr-3b'].includes(form)) throw new Error('Unsupported return.');
  return value;
}
export function reviewNil(snapshot: Obj, form: string) {
  const differences: {field:string;expected:number|null;actual:number|null}[] = [];
  function walk(value: unknown, path: string) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value !== 0)) differences.push({field:path,expected:0,actual:value});
    else if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) && Number(value) !== 0) differences.push({field:path,expected:0,actual:Number(value)});
    else if (Array.isArray(value)) value.forEach((v,i)=>walk(v,`${path}[${i}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v])=>{if (!['chksum','sec_nm','ty','pos','ctin','gstin','ret_period','fp','liab_ldg_id','trans_typ'].includes(k)) walk(v,path+'.'+k);});
  }
  if (form === 'gstr-1') {
    if (!Array.isArray(snapshot.sec_sum) || !snapshot.sec_sum.length) differences.push({field:'GST summary unavailable',expected:0,actual:null});
    else snapshot.sec_sum.forEach((section: Obj)=> {
      if (typeof section.ttl_rec !== 'number') differences.push({field:String(section.sec_nm)+' record count unavailable',expected:0,actual:null});
      walk(section,String(section.sec_nm));
    });
  } else {
    for (const key of ['sup_details','itc_elg','inward_sup','inter_sup','intr_ltfee']) {
      const value = snapshot[key];
      if (!value || typeof value !== 'object' || !Object.keys(value).length) differences.push({field:key+' evidence unavailable',expected:0,actual:null});
      else walk(value,key);
    }
    if (snapshot.eco_dtls) walk(snapshot.eco_dtls,'Ecommerce supplies');
    if (snapshot.tx_pmt) walk(snapshot.tx_pmt,'Payment/liability');
  }
  return {matched:!differences.length,differences,scope:'Nil contradiction check against fetched return only. Books, GSTR-2B, prior filings and outstanding liability eligibility remain taxpayer declarations, not independently verified.'};
}
export function nilFilingPayload(form: string, gstin: string, period: string) {
  return {gstin,ret_period:period,...(form==='gstr-1'?{isnil:'Y'}:{isNil:'Y'})};
}
