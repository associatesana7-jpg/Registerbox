import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorBanner, Field } from './registerbox-ui';
import { GstSelect, gstStyles as s } from './gst-ui';
import { invoiceAmounts } from '@/lib/gst-invoice';
import { validateAdditional } from '../../supabase/functions/_shared/gstr1-sections';

type Obj=Record<string,unknown>;
const sections=[{value:'b2cs',label:'Consumer sales · B2CS'},{value:'cdnr',label:'Registered credit / debit notes'},{value:'exp',label:'Exports'},{value:'nil',label:'Nil-rated, exempt & non-GST supplies'},{value:'doc_issue',label:'Documents issued'}];
const labels:Record<string,string>={customer:'Customer GSTIN',number:'Document number',date:'Document date · DD-MM-YYYY',pos:'Place of supply · state code',taxable:'Taxable value ₹',rate:'GST rate %',cess:'Cess ₹',nil_amt:'Nil-rated supplies ₹',expt_amt:'Exempt supplies ₹',ngsup_amt:'Non-GST supplies ₹',from:'First document number',to:'Last document number',totnum:'Total issued',cancel:'Cancelled',sbpcode:'Shipping port code · goods exports',sbnum:'Shipping bill number · goods exports',sbdt:'Shipping bill date · DD-MM-YYYY'};
const empty:Record<string,string>={customer:'',number:'',date:'',pos:'',taxable:'',rate:'',cess:'0',nil_amt:'0',expt_amt:'0',ngsup_amt:'0',from:'',to:'',totnum:'',cancel:'0',sbpcode:'',sbnum:'',sbdt:''};
const docNames=['Invoices for outward supply','Invoices for inward unregistered supply','Revised invoices','Debit notes','Credit notes','Receipt vouchers','Payment vouchers','Refund vouchers','Job-work delivery challans','Approval delivery challans','Liquid-gas delivery challans','Other delivery challans'];
function entrySummaries(section:string,value:unknown):string[]{
  if(section==='b2cs')return (value as Obj[]).map(r=>`Place ${r.pos} · ${r.rt}% · taxable ₹${r.txval} · IGST ₹${r.iamt||0} · CGST ₹${r.camt||0} · SGST ₹${r.samt||0}`);
  if(section==='cdnr')return (value as {ctin:string;nt:Obj[]}[]).flatMap(g=>g.nt.map(r=>`${g.ctin} · ${r.ntty==='C'?'Credit':'Debit'} ${r.nt_num} · ${r.nt_dt} · ₹${r.val}`));
  if(section==='exp')return (value as {exp_typ:string;inv:Obj[]}[]).flatMap(g=>g.inv.map(r=>`${g.exp_typ==='WOPAY'?'Without payment':'With payment'} · ${r.inum} · ${r.idt} · ₹${r.val}`));
  if(section==='nil')return (value as {inv:Obj[]}).inv.map(r=>`${r.sply_ty} · nil-rated ₹${r.nil_amt} · exempt ₹${r.expt_amt} · non-GST ₹${r.ngsup_amt}`);
  return (value as {doc_det:{doc_num:number;docs:Obj[]}[]}).doc_det.flatMap(g=>g.docs.map(r=>`${docNames[g.doc_num-1]} · ${r.from}–${r.to} · ${r.net_issue} net issued (${r.cancel} cancelled)`));
}
export function Gstr1SectionEditor({data,gstin,period,disabled,onChange}:{data:Obj;gstin:string;period:string;disabled:boolean;onChange:(v:Obj)=>void}){
  const [section,setSection]=useState('b2cs'),[input,setInput]=useState({...empty}),[kind,setKind]=useState('C'),[exportType,setExportType]=useState('WOPAY'),[supply,setSupply]=useState('INTRAB2C'),[doc,setDoc]=useState('1'),[error,setError]=useState('');
  const fields=section==='nil'?['nil_amt','expt_amt','ngsup_amt']:section==='doc_issue'?['from','to','totnum','cancel']:section==='b2cs'?['pos','taxable','rate','cess']:section==='exp'?['number','date','taxable','rate','cess','sbpcode','sbnum','sbdt']:['customer','number','date','pos','taxable','rate','cess'];
  function add(){try{
    const next=structuredClone(data),money=(k:string)=>{if(!/^\d+(\.\d{1,2})?$/.test(input[k]))throw Error('Enter '+labels[k]+'.');return Number(input[k]);};
    if(section==='nil'){
      const old=(next.nil as {inv:Obj[]}|undefined)?.inv||[];next.nil={inv:[...old,{sply_ty:supply,nil_amt:money('nil_amt'),expt_amt:money('expt_amt'),ngsup_amt:money('ngsup_amt')}]};
    }else if(section==='doc_issue'){
      const old=(next.doc_issue as {doc_det:Obj[]}|undefined)?.doc_det||[];
      const groups=old as {doc_num:number;docs:Obj[]}[],group=groups.find(g=>g.doc_num===Number(doc));
      const row={num:(group?.docs.length||0)+1,from:input.from,to:input.to,totnum:money('totnum'),cancel:money('cancel'),net_issue:money('totnum')-money('cancel')};
      if(group)group.docs.push(row);else groups.push({doc_num:Number(doc),docs:[row]});next.doc_issue={doc_det:groups};
    }else{
      const a=invoiceAmounts({...input,customer:input.customer,number:input.number,date:input.date,pos:section==='exp'?(gstin.slice(0,2)==='27'?'29':'27'):input.pos,taxable:input.taxable,rate:input.rate,cess:input.cess},gstin);
      const det={txval:a.taxable,rt:a.rate,iamt:a.igst,camt:a.cgst,samt:a.sgst,csamt:a.cess};
      if(section==='b2cs')next.b2cs=[...(next.b2cs as Obj[]||[]),{sply_ty:gstin.slice(0,2)===input.pos?'INTRA':'INTER',typ:'OE',pos:input.pos,...det}];
      if(section==='cdnr'){
        const groups=(next.cdnr||[]) as {ctin:string;nt:Obj[]}[],group=groups.find(g=>g.ctin===input.customer);
        const row={ntty:kind,nt_num:input.number,nt_dt:input.date,pos:input.pos,rchrg:'N',inv_typ:'R',val:a.total,itms:[{num:1,itm_det:det}]};
        if(group)group.nt.push(row);else groups.push({ctin:input.customer,nt:[row]});next.cdnr=groups;
      }
      if(section==='exp'){
        const groups=(next.exp||[]) as {exp_typ:string;inv:Obj[]}[],group=groups.find(g=>g.exp_typ===exportType),without=exportType==='WOPAY';
        if(without&&a.cess!==0)throw Error('Exports without payment cannot include cess.');
        const row={inum:input.number,idt:input.date,val:without?a.taxable:a.total,itms:[{txval:a.taxable,rt:a.rate,iamt:without?0:a.igst,csamt:without?0:a.cess}],...(input.sbpcode||input.sbnum||input.sbdt?{sbpcode:input.sbpcode,sbnum:input.sbnum,sbdt:input.sbdt}:{})};
        if(group)group.inv.push(row);else groups.push({exp_typ:exportType,inv:[row]});next.exp=groups;
      }
    }
    validateAdditional(next,gstin,period);onChange(next);setInput({...empty});setError('');
  }catch(e){setError(e instanceof Error?e.message:'Check section details.');}}
  return <View style={s.card}><Text style={s.title}>Other GSTR-1 sections</Text><Text style={s.caption}>Add category-specific entries without JSON. B2CS is a place-of-supply/rate summary—not a substitute for reportable B2CL invoices. Amendments, e-commerce and HSN entry are not yet supported here.</Text>
    <GstSelect label="Section" value={section} options={sections} disabled={disabled} onChange={v=>{setSection(v);setError('');}}/>
    {section==='cdnr'?<GstSelect label="Note type" value={kind} options={[{value:'C',label:'Credit note'},{value:'D',label:'Debit note'}]} onChange={setKind} disabled={disabled}/>:null}
    {section==='exp'?<><GstSelect label="Export treatment" value={exportType} options={[{value:'WOPAY',label:'Without payment (LUT / bond)'},{value:'WPAY',label:'With payment of IGST'}]} onChange={setExportType} disabled={disabled}/><Text style={s.caption}>Enter shipping details for goods; leave all three blank for services. Confirm eligibility for the selected export treatment.</Text></>:null}
    {section==='nil'?<GstSelect label="Supply category" value={supply} options={[{value:'INTRB2B',label:'Interstate · registered'},{value:'INTRB2C',label:'Interstate · unregistered'},{value:'INTRAB2B',label:'Intrastate · registered'},{value:'INTRAB2C',label:'Intrastate · unregistered'}]} onChange={setSupply} disabled={disabled}/>:null}
    {section==='doc_issue'?<GstSelect label="Document category" value={doc} options={docNames.map((label,i)=>({value:String(i+1),label}))} onChange={setDoc} disabled={disabled}/>:null}
    {fields.map(key=><Field key={key} label={labels[key]} value={input[key]} editable={!disabled} autoCapitalize={key==='customer'?'characters':'none'} onChangeText={v=>setInput({...input,[key]:key==='customer'?v.toUpperCase():v})}/>)}
    <ErrorBanner message={error}/><Button title="Add section entry" disabled={disabled} onPress={add}/>
    {sections.filter(item=>data[item.value]!==undefined).map(item=><View key={item.value} style={{gap:6}}><Text style={s.title}>{item.label} · added</Text>{entrySummaries(item.value,data[item.value]).map((text,i)=><Text key={i} selectable style={s.caption}>{text}</Text>)}<Button title={'Remove '+item.label} variant="ghost" disabled={disabled} onPress={()=>{const next={...data};delete next[item.value];onChange(next);}}/></View>)}
  </View>;
}
