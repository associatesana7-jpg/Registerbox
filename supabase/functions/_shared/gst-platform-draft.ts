import {validatePlatformRow,reviewPlatformImport,type PlatformRow,type PlatformContext} from './gst-platform-import.ts';
/** Verified against Sandbox GSTR-1 save-v4.1 SUPECO worksheet. */
export function sellerPlatformSection(rows:PlatformRow[],context:PlatformContext) {
  if(context.role!=='seller'||!rows.length)throw Error('Select a seller workspace with imported documents.');
  const groups=new Map<string,{etin:string;suppval:number;igst:number;cgst:number;sgst:number;cess:number}>();
  for(const row of rows) {
    validatePlatformRow(row,context);
    if(row.treatment!=='section9_5')throw Error('Section 52 sales also need ordinary sales entries. Complete that mapping before adding this mixed report.');
    if(row.kind==='amendment')throw Error('Prior-period amendments need the separate table 14A workflow.');
    const g=groups.get(row.operatorGstin)??{etin:row.operatorGstin,suppval:0,igst:0,cgst:0,sgst:0,cess:0};
    const sign=row.kind==='credit_note'?-1:1;
    for(const [from,to] of [['taxable','suppval'],['igst','igst'],['cgst','cgst'],['sgst','sgst'],['cess','cess']] as const)g[to]+=sign*Math.round(row[from]*100);
    groups.set(row.operatorGstin,g);
  }
  return {paytx:[...groups.values()].sort((a,b)=>a.etin.localeCompare(b.etin)).map(g=>Object.fromEntries(Object.entries(g).map(([k,v])=>[k,typeof v==='number'?v/100:v])))};
}
export function addSellerPlatformDraft(payload:Record<string,unknown>,rows:PlatformRow[],context:PlatformContext) {
  if(payload.gstin!==context.gstin||payload.fp!==context.period||payload.registerbox_nil)throw Error('Open a regular GSTR-1 draft for this GST account and period.');
  if(payload.supeco!==undefined||payload.supecoa!==undefined)throw Error('This draft already has platform figures. Review them before replacing anything.');
  return {...payload,supeco:sellerPlatformSection(rows,context)};
}
export function validateSupplierPlatformSections(payload:Record<string,unknown>) {
  if(payload.supeco===undefined)return;
  const section=payload.supeco;
  if(!section||typeof section!=='object'||Array.isArray(section)||Object.keys(section).some(k=>k!=='paytx'))throw Error('Only reviewed seller section 9(5) platform summaries are supported in this draft builder.');
  const rows=(section as {paytx:unknown}).paytx;
  if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('Provide 1–500 platform summaries.');
  const seen=new Set<string>();
  for(const row of rows) {
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['etin','suppval','igst','cgst','sgst','cess'].includes(k)))throw Error('Unexpected platform summary field.');
    if(typeof row.etin!=='string'||!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(row.etin)||seen.has(row.etin))throw Error('Use one summary per valid platform GSTIN.');
    seen.add(row.etin);
    for(const key of ['suppval','igst','cgst','sgst','cess'])if(typeof row[key]!=='number'||!Number.isFinite(row[key])||Math.abs(row[key])>1e11||Math.abs(row[key]*100-Math.round(row[key]*100))>0.0001)throw Error('Platform summary amounts must have at most two decimal places.');
  }
}
/** GSTR-3B save-v6.0: eco_reg_sup carries taxable value only. */
export function addSellerPlatform3b(payload:Record<string,unknown>,rows:PlatformRow[],context:PlatformContext) {
  if(payload.gstin!==context.gstin||payload.ret_period!==context.period||payload.registerbox_nil)throw Error('Open a regular GSTR-3B draft for this GST account and period.');
  if(payload.eco_dtls!==undefined)throw Error('This draft already contains ecommerce figures. Review them before replacing anything.');
  const section=sellerPlatformSection(rows,context);
  const taxable=section.paytx.reduce((sum,row)=>sum+Math.round(Number(row.suppval)*100),0)/100;
  return {...payload,eco_dtls:{eco_sup:{txval:0,iamt:0,camt:0,samt:0,csamt:0},eco_reg_sup:{txval:taxable}}};
}

/** GSTR-3B save-v6.0: operator liability belongs in eco_sup, not sup_details.
 * Notes are accepted only with an original invoice in this reviewed workspace.
 * Amendments need original-versus-revised deltas and are deliberately excluded.
 */
export function addOperatorPlatform3b(payload:Record<string,unknown>,rows:PlatformRow[],context:PlatformContext) {
  if(context.role!=='operator'||!rows.length)throw Error('Select an operator workspace with imported documents.');
  if(payload.gstin!==context.gstin||payload.ret_period!==context.period||payload.registerbox_nil)throw Error('Open a regular GSTR-3B draft for this GST account and period.');
  if(payload.eco_dtls!==undefined)throw Error('This draft already contains ecommerce figures. Review them before replacing anything.');
  const review=reviewPlatformImport(rows,[],context);
  if(review.issues.length||review.duplicates.length)throw Error('Resolve duplicate or conflicting documents before adding operator liability.');
  const total={txval:0,iamt:0,camt:0,samt:0,csamt:0};
  const invoiceKey=(supplier:string,document:string)=>supplier+'|'+document.toUpperCase();
  const invoices=new Map(rows.filter(row=>row.kind==='invoice').map(row=>[invoiceKey(row.supplierGstin,row.document),row]));
  const creditsByInvoice=new Map<string,Record<string,number>>();
  for(const row of rows.filter(row=>row.kind==='credit_note')) {
    const key=invoiceKey(row.supplierGstin,row.originalDocument),credits=creditsByInvoice.get(key)??{};
    for(const head of ['taxable','igst','cgst','sgst','cess'] as const)credits[head]=(credits[head]??0)+Math.round(row[head]*100);
    creditsByInvoice.set(key,credits);
  }
  for(const row of rows) {
    if(row.treatment!=='section9_5')throw Error('Section 52 collections belong in the separate TCS workflow. Use a section 9(5) report for this liability draft.');
    if(row.kind==='amendment')throw Error('Operator amendments need verified original-versus-revised amounts before adjusting liability.');
    if(row.kind==='credit_note'||row.kind==='debit_note') {
      const key=invoiceKey(row.supplierGstin,row.originalDocument),original=invoices.get(key);
      if(!row.supplierGstin||!original||original.recipientGstin!==row.recipientGstin||original.pos!==row.pos||original.treatment!==row.treatment||original.date>row.date||row.originalPeriod&&row.originalPeriod!==context.period)throw Error('Link this note to a matching registered-supplier invoice in this period. Earlier-period and unregistered-supplier notes need separate review.');
      if(row.kind==='credit_note') {
        const credits=creditsByInvoice.get(key)!;
        for(const head of ['taxable','igst','cgst','sgst','cess'] as const)if(credits[head]>Math.round(original[head]*100))throw Error('Credit notes exceed the linked invoice. Review the adjustment before reducing operator liability.');
      }
    }
    const sign=row.kind==='credit_note'?-1:1;
    for(const [from,to] of [['taxable','txval'],['igst','iamt'],['cgst','camt'],['sgst','samt'],['cess','csamt']] as const) {
      total[to]+=sign*Math.round(row[from]*100);
      if(!Number.isSafeInteger(total[to])||Math.abs(total[to])>1e13)throw Error('Operator totals exceed the supported amount range.');
    }
  }
  if(Object.values(total).some(value=>value<0))throw Error('Net operator liability is negative. Review credit notes and carry-forward adjustments separately.');
  return {...payload,eco_dtls:{eco_sup:Object.fromEntries(Object.entries(total).map(([key,value])=>[key,value/100])),eco_reg_sup:{txval:0}}};
}
