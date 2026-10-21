import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Badge, Button, Card, ErrorBanner, Screen } from './registerbox-ui';
import { GstHeader, GstSelect } from './gst-ui';
import { GstCheckbox } from './gst-checkbox';
import { palette } from '@/constants/design';
import type { ImsInvoice } from '../../supabase/functions/_shared/gst-ims';

type Operation={id:string;action:'save'|'compute';outcome:string;reference_id:string|null;result?:{err_msg?:string;err_cnt?:number;err_cd?:string}};
type Workspace={invoices:ImsInvoice[];snapshot_hash:string|null;fetched_at:string|null};
export type ImsResponse={workspace:Workspace;operation:Operation|null;ready?:boolean;message?:string};
const titles={load:'Load IMS workspace',refresh:'Load invoices from GST',save:'Save invoice decisions',compute:'Compute / recompute GSTR-2B',poll:'Check processing status',verify:'Check GSTR-2B & continue to my return'};
const heading={fontSize:18,fontWeight:'800' as const,color:palette.ink};
const body={fontSize:14,lineHeight:22,color:palette.muted};

export function GstImsRecovery({businessId,year,month,visible,onClose,onComplete,onReconnect}:{businessId:string;year:number;month:number;visible:boolean;onClose:()=>void;onComplete:()=>void;onReconnect?:()=>void}){
  return <Modal visible={visible} animationType="none" onRequestClose={onClose} presentationStyle="fullScreen">{visible?<ImsWorkspace key={businessId+year+month} {...{businessId,year,month,onClose,onComplete,onReconnect}}/>:null}</Modal>;
}
export function ImsWorkspace({businessId,year,month,onClose,onComplete,onReconnect,request=imsRequest}:{businessId:string;year:number;month:number;onClose:()=>void;onComplete:()=>void;onReconnect?:()=>void;request?:(body:Record<string,unknown>)=>Promise<ImsResponse>}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null),[operation,setOperation]=useState<Operation|null>(null);
  const [choices,setChoices]=useState<Record<string,string>>({}),[approved,setApproved]=useState('');
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(false),[query,setQuery]=useState('all');
  const [notice,setNotice]=useState(''),[pollingPaused,setPollingPaused]=useState(false);
  const [limit,setLimit]=useState(50);
  const running=useRef(false),active=useRef(true);
  const polls=useRef(0);
  const pending=!!operation&&['started','pending','unknown'].includes(operation.outcome);
  const rows=workspace?.invoices||[];
  const selected=Object.keys(choices).length;
  async function run(action:keyof typeof titles){
    if(running.current)return;running.current=true;setBusy(action);setError('');
    let resumeCompleted=false;
    try{
      const response=await request({businessId,year,month,action,consent:true,consentVersion:'gst-ims-v1',snapshotHash:workspace?.snapshot_hash,choices});
      if(!active.current)return;
      setWorkspace(response.workspace);setOperation(response.operation);setReady(response.ready===true);setApproved('');setNotice(response.message||'');
      if(action==='save'||action==='compute'||action==='load'){polls.current=0;setPollingPaused(false);}
      if(action==='save'||action==='refresh')setChoices({});
      // Reopening a completed computation re-checks its existing reference and
      // matching document. It never recomputes or repeats invoice decisions.
      resumeCompleted=action==='load'&&response.operation?.action==='compute'&&response.operation.outcome==='succeeded'&&!!response.operation.reference_id;
      // A confirmed generated document is the only automatic return point. This never files a return.
      if(response.ready)onComplete();
    }catch(cause){
      if(active.current){setError(cause instanceof Error?cause.message:'IMS request failed.');setPollingPaused(true);}
      // A timed-out write may already have reached GST. Restore its tracked
      // operation before offering any next step; never replay it in this catch.
      if(action==='save'||action==='compute'){
        try{const restored=await request({businessId,year,month,action:'load'});if(active.current){setWorkspace(restored.workspace);setOperation(restored.operation);}}catch{}
      }
    }
    finally{running.current=false;if(active.current){setBusy('');if(resumeCompleted)queueMicrotask(()=>{if(active.current)void run('poll');});}}
  }
  useEffect(()=>{active.current=true;queueMicrotask(()=>{if(active.current)void run('load');});return()=>{active.current=false;};
    // The modal is keyed to account and period. Reads never send invoice decisions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{
    if(!operation?.reference_id||operation.outcome!=='pending'||busy||pollingPaused)return;
    if(polls.current>=20){setPollingPaused(true);return;}
    const timer=setTimeout(()=>{polls.current++;void run('poll');},4000);
    return()=>clearTimeout(timer);
    // Poll only the stored reference, never replay a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[operation,busy,pollingPaused]);
  const checkProcessing=()=>{polls.current=0;setPollingPaused(false);void run('poll');};
  const choose=(id:string,value:string)=>{setChoices(current=>{const next={...current};if(value==='keep')delete next[id];else next[id]=value;return next;});setApproved('');setReady(false);};
  function confirmAction(action:'save'|'compute'){
    return <View style={{gap:4}}><GstCheckbox checked={approved===action} disabled={!!busy||pending} onPress={()=>setApproved(approved===action?'':action)} label={action==='save'?`I reviewed these ${selected} invoice decisions and authorize saving them to GST IMS. This does not claim ITC or file my return.`:`I authorize computing GSTR-2B for ${String(month).padStart(2,'0')}/${year} using the saved IMS decisions. Then check availability, refresh my saved return for review and return me to filing.`}/><Button title={titles[action]} loading={busy===action} disabled={!!busy||pending||approved!==action||(action==='save'&&!selected)||(action==='compute'&&selected>0)} onPress={()=>void run(action)}/></View>;
  }
  return <Screen><GstHeader title="Invoice management" onBack={onClose}/><View style={{gap:18}}>
    <View style={{gap:8}}><Badge label={`IMS → GSTR-2B → GSTR-3B · ${String(month).padStart(2,'0')}/${year}`} tone="blue"/><Text style={{...heading,fontSize:28,lineHeight:34}}>Review bills. Continue filing.</Text><Text style={body}>Your return and checklist are kept in place. GSTR-2B is generated, not filed.</Text></View>
    <ErrorBanner message={error}/>
    {error&&/reconnect|session.*expir|sign in again|token.*expir/i.test(error)?<Button title={onReconnect?'Reconnect GST & continue':'Back to my return to reconnect'} disabled={!!busy} onPress={()=>{onClose();onReconnect?.();}}/>:null}
    {notice?<Text accessibilityLiveRegion="polite" style={body}>{notice}</Text>:null}
    {!workspace&&!busy?<Button title="Retry opening invoice management" onPress={()=>void run('load')}/>:null}
    {pending?<Card><Badge label={operation?.outcome==='unknown'?'Outcome needs verification':'Processing on GST'} tone="amber"/><Text style={heading}>{operation?.action==='compute'?'Computing GSTR-2B':'Saving invoice decisions'}</Text><Text style={body}>Check the existing request. We will not send it twice. You can leave and return without losing its tracking reference.</Text>{pollingPaused&&operation?.reference_id?<Text style={body}>Automatic checks are paused. Your request is still saved. Continue checking below; this does not repeat the GST action.</Text>:null}<Button title={pollingPaused?'Continue checking GST status':'Check processing status'} loading={!!busy} disabled={!!busy||!operation?.reference_id} onPress={checkProcessing}/>{!operation?.reference_id?<><Text style={body}>GST did not return a tracking reference, so we cannot safely repeat this action. Your saved return is unchanged. Share this operation ID with RegisterBox support for reconciliation.</Text><Text selectable style={body}>{operation?.id}</Text></>:null}</Card>:null}
    {operation?.outcome==='failed'?<Card><Text style={heading}>Some decisions need review</Text><Text style={body}>{operation.result?.err_msg||'GST rejected one or more records. Refresh the list to see current actions before saving again.'}</Text></Card>:null}
    {operation?.action==='save'&&operation.outcome==='succeeded'&&!pending&&selected===0?<Card><Badge label="Invoice decisions saved" tone="green"/><Text style={heading}>Next: compute GSTR-2B</Text><Text style={body}>Your decisions are saved on GST. Approve computation here, then we’ll check the document and take you back to your return automatically.</Text>{confirmAction('compute')}</Card>:null}
    {!pending&&operation?.action==='compute'&&operation.outcome==='succeeded'?<Card><Text style={heading}>Continue with the computed statement</Text><Text style={body}>Check availability of this period’s GSTR-2B. You do not need to send another computation request.</Text><Button title={titles.verify} loading={busy==='verify'} disabled={!!busy} onPress={()=>void run('verify')}/></Card>:null}
    <Card><Text style={heading}>1. Review supplier invoices</Text><Text style={body}>IMS is a live queue spanning return periods. Each bill shows its source period. Accept only genuine business bills; amendments and credit notes may need an ITC-reduction declaration on GST.</Text><Button title={workspace?.fetched_at?'Refresh invoices from GST':'Load invoices from GST'} variant="secondary" loading={busy==='refresh'} disabled={!!busy||pending} onPress={()=>void run('refresh')}/>
      {workspace?.fetched_at?<><Text style={body}>{rows.length} bills loaded · {selected} decisions selected</Text><GstSelect label="Show invoices" value={query} onChange={value=>{setQuery(value);setLimit(50);}} options={[{value:'all',label:'All loaded bills'},{value:'N',label:'No action yet'},{value:'A',label:'Accepted'},{value:'R',label:'Rejected'},{value:'P',label:'Pending'}]}/><Button title="Select Accept for all eligible loaded bills" variant="secondary" disabled={!!busy||pending||rows.length===0||rows.length>500} onPress={()=>{setChoices(Object.fromEntries(rows.filter(row=>['b2b','ecom','b2bdn'].includes(row.section)&&row.record.action!=='A').map(row=>[row.id,'A'])));setApproved('');}}/>{selected?<Button title="Clear selected decisions" variant="ghost" disabled={!!busy} onPress={()=>{setChoices({});setApproved('');}}/>:null}
      {rows.length===0?<Text style={body}>GST returned no invoices in this IMS queue. You can compute GSTR-2B below.</Text>:rows.filter(row=>query==='all'||row.record.action===query).slice(0,limit).map(row=><View key={row.id} style={{paddingVertical:16,gap:8,borderTopWidth:1,borderTopColor:palette.line}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Text style={{...heading,flex:1,fontSize:16}}>{String(row.record.inum||row.record.nt_num||'Document')}</Text><Badge label={String(row.section).toUpperCase()}/></View><Text selectable style={body}>{String(row.record.stin)} · {String(row.record.idt||row.record.nt_dt)} · Period {String(row.record.rtnprd)}</Text><Text style={{...body,color:palette.ink}}>₹{Number(row.record.val||0).toLocaleString('en-IN')} · {({A:'Accepted',R:'Rejected',P:'Pending',N:'No action'})[String(row.record.action) as 'A']||'Review on GST'}</Text><GstSelect label={`Decision for ${String(row.record.inum||row.record.nt_num)}`} value={choices[row.id]||'keep'} disabled={!!busy||pending} onChange={value=>choose(row.id,value)} options={[{value:'keep',label:'Keep current action'},...(['b2b','ecom','b2bdn'].includes(row.section)?[{value:'A',label:'Accept'}]:[]),{value:'R',label:'Reject'},...(row.record.ispendactblocked==='Y'?[]:[{value:'P',label:'Pending'}])]}/></View>)}{rows.filter(row=>query==='all'||row.record.action===query).length>limit?<Button title="Show more bills" variant="secondary" onPress={()=>setLimit(value=>value+50)}/>:null}{confirmAction('save')}</>:null}
    </Card>
    {!(operation?.action==='save'&&operation.outcome==='succeeded'&&selected===0)?<Card><Text style={heading}>2. Compute GSTR-2B</Text><Text style={body}>Save any selected decisions first. Computation may take time. After GST confirms the document is available, you’ll return to your saved return. If inward activity makes nil inappropriate, choose a regular return.</Text>{selected>0?<Text style={body}>Save or clear your {selected} selected decisions before computation.</Text>:null}{confirmAction('compute')}{ready?<Text style={body}>GSTR-2B is available.</Text>:null}{operation?.action==='compute'&&operation.outcome==='pending'?<Button title="Check computation & return to filing" disabled={!!busy} onPress={checkProcessing}/>:null}<Button title={titles.verify} variant="ghost" disabled={!!busy||pending||selected>0} onPress={()=>void run('verify')}/></Card>:null}
    <Card><Text style={heading}>Prefer to complete this on GST?</Text><Text style={body}>This is optional. You can review, save and compute here. For a document needing a declaration that our provider does not support yet, open Services → Returns → Invoice Management System (IMS) → Recipient dashboard. Then check GSTR-2B in this app to continue.</Text><Button title="Open official GST portal ↗" variant="secondary" onPress={()=>void Linking.openURL('https://services.gst.gov.in/services/login').catch(()=>setError('Open gst.gov.in in your browser.'))}/></Card>
    <Button title="Back to my saved return" variant="ghost" disabled={!!busy} onPress={onClose}/>
  </View></Screen>;
}
async function imsRequest(body:Record<string,unknown>):Promise<ImsResponse>{
  const {data,error}=await supabase.functions.invoke('gst-ims',{body,timeout:75000});
  if(error){let message='Could not reach IMS. Your return is saved.';try{const value=await error.context?.json();message=value?.error||message;}catch{}throw Error(message);}
  if(!data||data.error)throw Error(data?.error||'IMS returned no response.');
  return data;
}
