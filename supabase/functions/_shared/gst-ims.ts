export const imsSections = {b2b:'B2B',b2ba:'B2BA',b2bcn:'CN',b2bcna:'CNA',b2bdn:'DN',b2bdna:'DNA',ecom:'ECOM',ecoma:'ECOMA'} as const;
export type ImsInvoice = {id:string;section:string;record:Record<string,unknown>};
export function imsRows(data:Record<string,unknown>,section:string):ImsInvoice[]{
  const value=data[section];
  if(value===undefined&&Object.keys(data).length===0)return [];
  if(!Array.isArray(value))throw Error('GST returned an incomplete IMS invoice list. Refresh before taking action.');
  return value.map(record=>{
    if(!record||typeof record!=='object'||typeof record.hash!=='string'||!record.hash||typeof record.stin!=='string'||typeof record.rtnprd!=='string'||!['A','R','P','N'].includes(record.action))throw Error('An IMS invoice is missing its identity or current status. Review it on GST.');
    return {id:section+':'+record.hash,section,record};
  });
}
export function imsSavePayload(gstin:string,rows:ImsInvoice[],choices:Record<string,string>){
  const keys=Object.keys(choices);
  if(!keys.length||keys.length>500)throw Error('Choose between 1 and 500 invoices per save.');
  const invdata:Record<string,unknown[]>={};
  for(const id of keys){
    const row=rows.find(item=>item.id===id),action=choices[id];
    if(!row||!['A','R','P'].includes(action))throw Error('The invoice selection is invalid. Refresh and review.');
    if(action==='P'&&row.record.ispendactblocked==='Y')throw Error('GST does not allow Pending for this invoice.');
    // Newer IMS credit-note/amendment acceptance can require an explicit ITC-reduction declaration.
    // Never guess it from the invoice amount or apply bulk acceptance to those records.
    if(action==='A'&&!['b2b','ecom','b2bdn'].includes(row.section))throw Error('Accept this amendment or credit note on GST after reviewing its ITC-reduction declaration. Then refresh here.');
    const fields=['stin','inum','inv_typ','srcform','rtnprd','idt','val','pos','txval','iamt','camt','samt','cess','oinum','oidt','nt_num','nt_dt','ont_num','ont_dt'];
    const item=Object.fromEntries(fields.filter(key=>row.record[key]!==undefined).map(key=>[key,row.record[key]]));
    (invdata[row.section]??=[]).push({...item,action,prev_status:row.record.action});
  }
  return {rtin:gstin,reqtyp:'SAVE',invdata};
}
export function imsProcessed(result:Record<string,unknown>,expected:number){
  if(result.err_cd||result.err_msg||Number(result.err_cnt||0)>0||['PE','ER','E'].includes(String(result.status_cd)))return 'failed';
  if(['P','S'].includes(String(result.status_cd))&&Number(result.proc_cnt)>=expected)return 'succeeded';
  return 'pending';
}
