import { addOperatorPlatformGstr1 } from '../../supabase/functions/_shared/gst-ecom';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBanner, Field, Screen } from '@/components/registerbox-ui';
import { FlowProgress, SoftNotice } from '@/components/experience';
import { GstHeader } from '@/components/gst-ui';
import { GstFilingHistory } from '@/components/gst-filing-history';
import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';
import { GstReturnReview } from '@/components/gst-return-review';
import { GstGuidedEditor } from '@/components/gst-guided-editor';
import { GstPaymentReview } from '@/components/gst-payment-review';
import { emptyCredit, type PaymentContext, type preparePayment } from '../../supabase/functions/_shared/gst-payment';
import { periodIsClosed } from '../../supabase/functions/gst-workspace/domain';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { returnAction, type ReturnDraft } from '@/lib/gst-returns-api';
import { blank3b } from '../../supabase/functions/_shared/gstr3b';
import { GstNilReturn } from '@/components/gst-nil-return';
import { addSellerPlatformDraft, addSellerPlatform3b, addOperatorPlatform3b } from '../../supabase/functions/_shared/gst-platform-draft';
import { GstPlatformReview } from '@/components/gst-platform-review';
import { validFilingOtp } from '../../supabase/functions/_shared/gst-filing-otp';

const labels: Record<string,string> = {draft:'Save private draft',save:'Save to GST portal',proceed:'Prepare GSTR-1 for filing',poll:'Check processing status',reconcile:'Fetch & reconcile',ledger:'Fetch ledger balances',preview_offset:'Review allocation',offset:'Authorize liability offset',evc:'Request filing OTP',file:'Verify OTP & file return'};
const declarations: Record<string,string> = {
  draft:'I approve saving this draft privately to RegisterBox. It will not be sent to GST.',
  save:'I reviewed the complete return against my books and approve saving this exact version to the GST portal. This is not filing.',
  proceed:'I approve preparing this saved GSTR-1 for filing on GST.',
  poll:'I approve checking the outcome of the previous operation without repeating it.',
  reconcile:'I approve fetching GST records for this period and comparing them with my saved draft.',
  ledger:'I approve fetching cash, credit and liability balances. Do not use any funds.',
  preview_offset:'I approve preparing this allocation for review. Do not send it to GST.',
  offset:'I reviewed this exact allocation and authorize using these cash and ITC ledger balances to offset my liability.',
  evc:'I reviewed this exact GST snapshot and authorize sending a filing OTP to my authorized signatory.',
  file:'I am authorized to file. I confirm this exact GSTIN, period and return snapshot are complete and correct and authorize filing using this OTP.',
};
function Check({label,checked,onPress,disabled=false}:{label:string;checked:boolean;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{checked,disabled}} disabled={disabled} onPress={onPress} style={{flexDirection:'row',gap:9,paddingVertical:9}}><Text style={{color:palette.blue,fontSize:18}}>{checked?'☑':'☐'}</Text><Text style={{flex:1,color:palette.ink,fontSize:12,lineHeight:18}}>{label}</Text></Pressable>;
}
export default function ReturnScreen() {
  const {business,session,loadingSession,demoMode}=useApp();
  const route=useLocalSearchParams<{form?:string;year?:string;month?:string;mode?:string}>();
  if (loadingSession) return <Screen><Text>Loading account…</Text></Screen>;
  if (!session || demoMode) return <Redirect href="/auth"/>;
  if (!business.id) return <Redirect href="/gst"/>;
  if (route.mode==='nil') return <GstNilReturn key={session.user.id+business.id+JSON.stringify(route)} businessId={business.id} form={route.form==='gstr-3b'?'gstr-3b':'gstr-1'} year={Number(route.year)} month={Number(route.month)}/>;
  return <Workspace key={session.user.id+business.id+JSON.stringify(route)} businessId={business.id}/>;
}
function Workspace({businessId}:{businessId:string}) {
  const params=useLocalSearchParams<{form?:string;year?:string;month?:string;mode?:string}>();
  const initialParams=useRef(params);
  const [phase,setPhase]=useState<'start'|'prepare'|'compare'|'payment'|'review'|'authorize'>(params.form?'prepare':'start');
  const [drafts,setDrafts]=useState<ReturnDraft[]>([]), [selected,setSelected]=useState<ReturnDraft|null>(null);
  const [gstin,setGstin]=useState(''), [advanced,setAdvanced]=useState(false);
  const [filingHistory,setFilingHistory]=useState<FilingHistory|null>(null);
  const [form,setForm]=useState<'gstr-1'|'gstr-3b'>(params.form==='gstr-3b'?'gstr-3b':'gstr-1'), [year,setYear]=useState(params.year||''), [month,setMonth]=useState(params.month||'');
  const [payload,setPayload]=useState(''), [allocationHash,setAllocationHash]=useState('');
  const [payment,setPayment]=useState<PaymentContext|null>(null),[paymentReview,setPaymentReview]=useState<ReturnType<typeof preparePayment>|null>(null);
  const [choices,setChoices]=useState<Record<string,string>>(()=>Object.fromEntries(Object.keys(emptyCredit()).map(k=>[k,'0']))),[minimumCash,setMinimumCash]=useState(''),[paymentRules,setPaymentRules]=useState(false);
  function resetPayment(){setPayment(null);setPaymentReview(null);setAllocationHash('');setPaymentRules(false);setMinimumCash('');setChoices(Object.fromEntries(Object.keys(emptyCredit()).map(k=>[k,'0'])));}
  function invalidatePayment(){setAllocationHash('');setPaymentReview(null);setApproved('');}
  const [pan,setPan]=useState(''), [otp,setOtp]=useState('');
  const [approved,setApproved]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [writes,setWrites]=useState(false), [books,setBooks]=useState(false), [itc,setItc]=useState(false), [prior,setPrior]=useState(false);
  const [evidence,setEvidence]=useState<unknown>(null);
  const active=useRef(true), running=useRef(false);
  useEffect(()=>{
    active.current=true;
    returnAction(businessId,'list').then(data=>{if(active.current){setDrafts(data.drafts||[]);setWrites(data.writesEnabled);setGstin(data.gstin||'');const input=initialParams.current;const period=(input.month||'').padStart(2,'0')+(input.year||'');
      const existing=input.mode==='nil'?data.drafts?.find(d=>d.form===input.form&&d.year===Number(input.year)&&d.month===Number(input.month)):undefined;
      if(existing){setSelected(existing);setPayload(JSON.stringify(existing.payload,null,2));setPan(existing.signatory_pan||'');setPhase('prepare');}
      else if(data.gstin&&/^\d{6}$/.test(period)&&['nil','regular','payment'].includes(input.mode||'')){setPayload(JSON.stringify(input.mode==='nil'?{gstin:data.gstin,ret_period:period,registerbox_nil:true,declarations:{}}:input.form==='gstr-1'?{gstin:data.gstin,fp:period,b2b:[]}:blank3b(data.gstin,period),null,2));}}}).catch(cause=>{if(active.current)setError(cause.message);});
    return()=>{active.current=false;};
  },[businessId]);
  function choose(draft:ReturnDraft){setSelected(draft);setForm(draft.form);setYear(String(draft.year));setMonth(String(draft.month).padStart(2,'0'));setPayload(JSON.stringify(draft.payload,null,2));setApproved('');setBooks(false);setItc(false);setPrior(false);setPan(draft.signatory_pan||'');setOtp('');resetPayment();setEvidence(null);setPhase(draft.state==='filed'||draft.state==='otp_sent'?'authorize':draft.state==='draft'||draft.state==='blocked'?'prepare':'compare');}
  async function importJson() {
    setError('');
    try {
      const picked=await DocumentPicker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true,multiple:false});
      if(picked.canceled)return;
      const asset=picked.assets[0];
      if((asset.size??0)>900000)throw new Error('Choose JSON smaller than 900 KB.');
      const text=asset.file ? await asset.file.text() : await new File(asset.uri).text();
      if(text.length>900000)throw new Error('JSON is too large.');
      const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Import a JSON object.');
      {setPayload(JSON.stringify(parsed,null,2)); const period=parsed.fp||parsed.ret_period;if(typeof period==='string'&&/^\d{6}$/.test(period)){setMonth(period.slice(0,2));setYear(period.slice(2));}}
      setApproved('');
    }catch(cause){setError(cause instanceof Error?cause.message:'Import failed.');}
  }
  async function run(action:string){
    if(running.current)return;running.current=true;setBusy(true);setError('');
    try{
      if(['preview_offset','offset'].includes(action)&&(!/^\d+(\.\d{1,2})?$/.test(minimumCash)||Object.values(choices).some(v=>!/^\d+(\.\d{1,2})?$/.test(v))))throw new Error('Complete every credit amount and the minimum cash requirement. Enter 0 where applicable.');
      const data=await returnAction(businessId,action,{consent:approved===action,draftId:selected?.id,revision:selected?.revision,approvedHash:['evc','file'].includes(action)?selected?.snapshot_hash:selected?.payload_hash,
        ...(action==='draft'?{form,year:Number(year),month:Number(month),payload:JSON.parse(payload)}:{}),
        ...(['offset','preview_offset'].includes(action)?{paymentChoices:Object.fromEntries(Object.entries(choices).map(([k,v])=>[k,Number(v)])),minimumCash:Number(minimumCash),paymentRulesReviewed:paymentRules,allocationHash}:{}),pan,otp,booksReviewed:books,itcReviewed:itc,priorReturnsReviewed:prior});
      if(!active.current)return;
      if(data.draft){setSelected(data.draft);setPayload(JSON.stringify(data.draft.payload,null,2));setDrafts(rows=>[data.draft!,...rows.filter(row=>row.id!==data.draft!.id)]);}
      if(data.paymentContext)setPayment(data.paymentContext);
      if(data.paymentReview)setPaymentReview(data.paymentReview);
      if(['draft','save','reconcile','ledger','offset'].includes(action)){setAllocationHash('');setPaymentReview(null);}
      if(data.allocationHash)setAllocationHash(data.allocationHash);
      if(action==='reconcile'){setBooks(false);setItc(false);setPrior(false);}
      setEvidence(data.ledger||data.providerStatus||null);setWrites(data.writesEnabled);setApproved('');setOtp('');
      if(action==='draft'||action==='save'||action==='proceed'||action==='poll')setPhase('compare');
      if(action==='reconcile'&&data.draft?.reconciliation?.matched)setPhase(data.draft.form==='gstr-3b'&&data.draft.payload.registerbox_nil!==true&&data.draft.state==='saved'?'payment':'review');
      if(action==='ledger'||action==='preview_offset')setPhase('payment');
      if(action==='offset')setPhase('compare');
      if(action==='evc'||action==='file')setPhase('authorize');
    }catch(cause){if(active.current)setError(cause instanceof Error?cause.message:'Operation failed.');}
    finally{running.current=false;if(active.current)setBusy(false);}
  }
  const dirty=!!selected && payload!==JSON.stringify(selected.payload,null,2);
  const nil=selected?.payload.registerbox_nil===true;
  const periodOpen=!!selected&&!periodIsClosed(selected.year,selected.month);
  const nextPeriodStart=selected?new Date(Date.UTC(selected.year,selected.month,1)).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';
  function action(name:string,disabled=false,reason?:string){
    const portalRecord=filingHistory?.records.find(row=>row.form===form.replace(/-/g,'').toUpperCase());
    const historyReason=['draft','save','proceed','offset','evc','file'].includes(name)?(!filingHistory||filingHistory.period!==month.padStart(2,'0')+year?'Check GST portal filing status before continuing.':portalRecord?`GST reports ${portalRecord.status} for this return. A duplicate filing is blocked.`:undefined):undefined;
    const blocked=disabled||(name!=='draft'&&dirty)||!!historyReason;
    return <View key={name} style={{gap:6}}>
      <Check disabled={busy} checked={approved===name} onPress={()=>setApproved(approved===name?'':name)} label={declarations[name]}/>
      {blocked?<Text accessibilityRole="alert" style={{color:palette.muted,fontSize:13,lineHeight:19}}>{historyReason||(dirty&&name!=='draft'?'Save your changed draft before continuing.':reason||'Complete the earlier GST steps before continuing.')}</Text>:null}
      <Button title={labels[name]} loading={busy&&approved===name} disabled={busy||blocked||approved!==name} onPress={()=>run(name)}/>
    </View>;
  }
  const otpBlockReason=periodOpen?`The ${selected?.month}/${selected?.year} tax period is still open. Filing can start from ${nextPeriodStart}.`
    :!writes?'Live GST writes are unavailable. Reload this screen to check the current setting.'
    :!selected?.reconciliation?.matched?'Fetch and reconcile this return. The saved GST comparison must match.'
    :!['prepared','otp_sent'].includes(selected?.state||'draft')?`This return is still ${selected?.state||'draft'}. Complete GST preparation and any payment offset first.`
    :!books||!itc||!prior?'Confirm the books, ITC and prior-return checks above.'
    :!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)?'Enter the 10-character PAN registered for the authorized signatory on GST.'
    :undefined;
  const fileBlockReason=periodOpen?`This period is still open. Filing can start from ${nextPeriodStart}.`
    :selected?.state!=='otp_sent'?'Request a filing OTP after GST preparation is complete.'
    :!validFilingOtp(otp)?'Enter the GST filing code exactly as received (letters and numbers).'
    :!books||!itc||!prior?'Confirm the books, ITC and prior-return checks above.'
    :undefined;
  const heading={fontSize:15,fontWeight:'800' as const,color:palette.ink};
  const muted={color:palette.muted,fontSize:12,lineHeight:18};
  const phases=[['start','Returns'],['prepare','Prepare'],['compare','Reconcile'],['payment','Payment'],['review','Review'],['authorize','Authorize']] as const;
  if(params.mode==='nil'||nil) return <GstNilReturn key={businessId+form+year+month} businessId={businessId} form={form} year={Number(year)} month={Number(month)}/>;
  return <Screen key={phase}><Stack.Screen options={{headerShown:false}}/><GstHeader title={phase==='start'?'Your GST Returns':phase==='authorize'?'Authorize Filing':phase==='review'?`Review ${form.toUpperCase()}`:phase==='compare'?'Reconciliation':phase==='payment'?'Payment & Setoff':payload.includes('"registerbox_nil": true')?'Nil Return Eligibility':`Prepare ${form.toUpperCase()}`} onBack={()=>phase==='start'?router.back():setPhase('start')}/><View style={{gap:16}}>
    <FlowProgress current={Math.max(1,phases.findIndex(([key])=>key===phase)+1)} total={phases.length} labels={phases.map(([,label])=>label)} />
    <View accessibilityRole="progressbar" style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{phases.map(([key,label],index)=>{const current=phases.findIndex(([value])=>value===phase),done=index<current,active=index===current;return <View key={key} style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:7,paddingHorizontal:9,borderRadius:9,borderWidth:1,borderColor:active?palette.blue:done?palette.green:palette.line,backgroundColor:active?palette.sky:palette.white}}><Text style={{color:done?palette.green:active?palette.blue:palette.muted,fontSize:11,fontWeight:'900'}}>{done?'✓':index+1}</Text><Text style={{color:active?palette.blue:done?palette.ink:palette.muted,fontSize:10,fontWeight:'800'}}>{label}</Text></View>;})}</View>
    {!writes?<Badge label="Draft mode · live actions unavailable" tone="amber"/>:null}
    <ErrorBanner message={error}/>
    {phase!=='start'&&selected?.source_evidence?<Card><Text style={{fontWeight:'700'}}>Amendment original links</Text><Text>{selected.source_evidence.matched?'Original records linked to acknowledged filed archives. Review each change below.':'Original linkage is incomplete. This draft cannot be submitted.'}</Text>{selected.source_evidence.issues.map((issue,index)=><Text key={index} style={{color:palette.red}}>{issue}</Text>)}{selected.source_evidence.links.map((link,index)=><View key={index} style={{gap:4}}><Text>{link.section.toUpperCase()} · {link.reference} · original period {link.originalPeriod}</Text><Text>Taxable value: ₹{link.original.txval.toFixed(2)} → ₹{link.revised.txval.toFixed(2)}. Change: ₹{link.delta.txval.toFixed(2)}.</Text><Text>Tax change: IGST ₹{link.delta.iamt.toFixed(2)}, CGST ₹{link.delta.camt.toFixed(2)}, SGST ₹{link.delta.samt.toFixed(2)}, cess ₹{link.delta.csamt.toFixed(2)}.</Text></View>)}<Text>Linked against app filing archives only. GST amendment history verification is still pending. These changes have not been added automatically to GSTR-3B.</Text></Card>:null}

    {gstin?<GstFilingHistory businessId={businessId} year={year} month={month} onStatus={setFilingHistory}/>:null}
    {phase==='start'?<Card><Text style={heading}>Saved returns</Text>{drafts.length?drafts.map(draft=><Button key={draft.id} title={`${draft.form.toUpperCase()} · ${draft.month}/${draft.year} · ${draft.state}`} variant="secondary" disabled={busy} onPress={()=>choose(draft)}/>):<Text style={muted}>No saved drafts yet.</Text>}<Button title="Create a new return" disabled={busy} onPress={()=>{setSelected(null);resetPayment();setPayload('');setYear('');setMonth('');setApproved('');setEvidence(null);setBooks(false);setItc(false);setPrior(false);setPhase('prepare');}}/><Text style={muted}>Guided GSTR-1 sections, standard GSTR-3B tables and nil declarations are available. Purchase matching is under GST → ITC/2B. Special scenarios still require review; bank challan payments use the official GST portal.</Text></Card>:null}
    {phase==='prepare'?<Card><Text style={heading}>1. Prepare your return</Text><Text style={muted}>Choose the period, then nil or regular. Linked GSTIN: {gstin||'Loading…'}</Text><View style={{flexDirection:'row',gap:8}}>{(['gstr-1','gstr-3b'] as const).map(value=><View key={value} style={{flex:1}}><Button title={value.toUpperCase()} variant={form===value?'primary':'secondary'} disabled={busy||!!selected||!!payload} onPress={()=>{setForm(value);setApproved('');}}/></View>)}</View>
      <Field label="Year (YYYY)" value={year} keyboardType="number-pad" maxLength={4} editable={!busy&&!selected&&!payload} onChangeText={value=>{setYear(value.replace(/\D/g,''));setApproved('');}}/><Field label="Month (MM)" value={month} keyboardType="number-pad" maxLength={2} editable={!busy&&!selected&&!payload} onChangeText={value=>{setMonth(value.replace(/\D/g,''));setApproved('');}}/>
      <GstGuidedEditor payload={payload} gstin={gstin} period={month.padStart(2,'0')+year} form={form} disabled={busy||!!selected&&!['draft','blocked'].includes(selected.state)} onChange={text=>{setPayload(text);setApproved('');setBooks(false);setItc(false);setPrior(false);}}/>
      <GstPlatformReview form={form} onAddToDraft={(rows,role)=>{setPayload(JSON.stringify((form==='gstr-1'?(role==='operator'?addOperatorPlatformGstr1:addSellerPlatformDraft):role==='operator'?addOperatorPlatform3b:addSellerPlatform3b)(JSON.parse(payload||'{}'),rows,{gstin,period:month.padStart(2,'0')+year,role}),null,2));setApproved('');setBooks(false);setItc(false);setPrior(false);}} businessId={businessId} key={businessId+gstin+year+month} gstin={gstin} period={month.padStart(2,'0')+year} disabled={busy||!!selected&&!['draft','blocked'].includes(selected.state)}/>
      <Button title={advanced?'Hide accountant tools':'Advanced · accountant import'} variant="ghost" onPress={()=>setAdvanced(!advanced)}/>
      {advanced?<><Button title="Import return JSON" variant="secondary" disabled={busy||!!selected&&!['draft','blocked'].includes(selected.state)} onPress={()=>importJson()}/>
      <Field label="Complete return JSON · includes GSTIN and period" multiline style={{minHeight:180,fontFamily:'monospace',fontSize:12}} value={payload} editable={!busy&&(!selected||['draft','blocked'].includes(selected.state))} onChangeText={value=>{setPayload(value);setApproved('');setBooks(false);setItc(false);setPrior(false);}}/>
      </>:null}
      {dirty?<Text style={muted}>Save your changes before continuing to GST actions.</Text>:null}
      {action('draft',!payload||!!selected&&!['draft','blocked'].includes(selected.state))}
    </Card>:null}
    {selected?<>
      {phase!=='start'?<Card><Text selectable style={heading}>{selected.gstin} · {selected.month}/{selected.year}</Text><Badge label={`Version ${selected.revision} · ${selected.state}`}/>{periodOpen?<Text selectable style={muted}>This tax period is still open. You can prepare a draft now. Nil-return checks and filing can begin from {nextPeriodStart}; GST may not provide a final snapshot yet.</Text>:null}<ErrorBanner message={selected.last_error||undefined}/>{selected.reference_id?<Text selectable style={muted}>GST reference: {selected.reference_id}</Text>:null}{selected.acknowledgement?<Text selectable style={heading}>GST acknowledgement: {selected.acknowledgement}</Text>:null}</Card>:null}
      {phase==='compare'?<>
      <Card><Text style={heading}>2. Save & compare</Text>{nil?<Text style={muted}>Nil returns skip invoice upload and payment offset. Fetch records to check for contradictory amounts before proceeding.</Text>:action('save',!writes||selected.state!=='draft')}{action('poll',!selected.reference_id||!['save_pending','proceed_pending','offset_pending','unknown'].includes(selected.state))}{selected.form==='gstr-1'?action('proceed',!writes||selected.state!==(nil?'draft':'saved')||(nil&&!selected.reconciliation?.matched)||(nil&&periodOpen),nil&&periodOpen?`Wait until ${nextPeriodStart} to prepare a nil return.`:undefined):null}{action('reconcile',!['draft','saved','prepared','otp_sent'].includes(selected.state)||(nil&&periodOpen),nil&&periodOpen?`Wait until ${nextPeriodStart} to check nil eligibility against GST.`:undefined)}</Card>
      {selected.reconciliation?<Card><Badge label={selected.reconciliation.matched?'Compared fields match':'Differences need review'} tone={selected.reconciliation.matched?'green':'red'}/><Text style={muted}>{selected.reconciliation.scope}</Text>{selected.reconciliation.differences.map((difference,index)=><Text selectable key={index} style={muted}>{difference.field}: draft {difference.expected??'not supplied'} / GST {difference.actual??'not supplied'}</Text>)}<Text style={muted}>A match is not a tax-compliance certification or approval to file.</Text></Card>:null}
      {selected.snapshot?<GstReturnReview result={{details:selected.snapshot,gstin:selected.gstin,form:selected.form,year:selected.year,month:selected.month,fetchedAt:selected.snapshot_at!,filed:false}}/>:null}
      </>:null}
      {phase==='payment'?(selected.form==='gstr-3b'&&!nil?<Card><Text style={heading}>3. Review payment & setoff</Text>{action('ledger',!['draft','saved'].includes(selected.state))}<GstPaymentReview context={payment} review={paymentReview} choices={choices} onChoices={v=>{setChoices(v);invalidatePayment();}} minimumCash={minimumCash} onMinimumCash={v=>{setMinimumCash(v);invalidatePayment();}} rulesReviewed={paymentRules} onRulesReviewed={()=>{setPaymentRules(!paymentRules);invalidatePayment();}} disabled={busy} />{action('preview_offset',!payment||!paymentRules||!minimumCash)}{action('offset',!writes||!allocationHash||!paymentReview?.ready||selected.state!=='saved'||!paymentRules)}{['prepared','offset_pending'].includes(selected.state)?<Text style={muted}>After offset completes, fetch and reconcile again before requesting the filing OTP.</Text>:null}</Card>:<SoftNotice title="No payment offset for this return" detail="Nil declarations and GSTR-1 do not use the regular GSTR-3B payment review." />):null}
      {phase==='review'?<>
        {selected.snapshot?<GstReturnReview result={{details:selected.snapshot,gstin:selected.gstin,form:selected.form,year:selected.year,month:selected.month,fetchedAt:selected.snapshot_at!,filed:false}}/>:null}
        <Card><Text style={heading}>Review your return</Text><Check checked={books} disabled={busy} onPress={()=>{setBooks(!books);setApproved('');}} label="I reconciled all invoices and amounts with my complete books."/><Check checked={itc} disabled={busy} onPress={()=>{setItc(!itc);setApproved('');}} label="I verified ITC eligibility and GSTR-2B where relevant."/><Check checked={prior} disabled={busy} onPress={()=>{setPrior(!prior);setApproved('');}} label="I checked prior-return requirements, including GSTR-1 before GSTR-3B."/><Button title="Proceed to Authorize" disabled={!books||!itc||!prior} onPress={()=>setPhase('authorize')}/></Card>
      </>:null}
      {phase==='authorize'?<>{selected.state==='filed'&&selected.acknowledgement?<Card><View style={{alignItems:'center',paddingVertical:22,gap:15}}><Text style={{fontSize:64,color:palette.green}}>✓</Text><Text style={{...heading,color:palette.green}}>{selected.form.toUpperCase()} filed successfully</Text></View><Text selectable style={muted}>ARN / acknowledgement: {selected.acknowledgement}</Text><Text selectable style={muted}>Return period: {selected.month}/{selected.year}</Text><Button title="View GST account" variant="secondary" onPress={()=>router.push('/gst')}/></Card>:<Card>
        <View style={{backgroundColor:'#EDF4FF',padding:13,borderRadius:10,gap:5}}><Text style={heading}>◉ EVC (OTP)</Text><Text style={muted}>GST sends the filing OTP to the authorized signatory’s registered contact.</Text></View>
        <Field label="Authorized signatory PAN" value={pan} autoCapitalize="characters" maxLength={10} editable={!busy} onChangeText={value=>{setPan(value.toUpperCase());setApproved('');}}/>
        <Text style={muted}>Use the signatory PAN registered on GST.</Text>
        {action('evc',!!otpBlockReason,otpBlockReason)}
        {selected.state==='otp_sent'?<><Field label="Enter GST filing OTP" value={otp} keyboardType="default" autoCapitalize="none" autoCorrect={false} maxLength={32} secureTextEntry editable={!busy} onChangeText={value=>{setOtp(value.trim());setApproved('');}}/>{action('file',!!fileBlockReason||!writes,fileBlockReason)}</>:null}
        <Button title="Back to review" variant="ghost" onPress={()=>setPhase('review')}/>
      </Card>}{evidence&&advanced?<Card><Text style={heading}>Latest provider response</Text><Text selectable style={{...muted,fontFamily:'monospace',fontSize:12}}>{JSON.stringify(evidence,null,2)}</Text></Card>:null}</>:null}
    </>:null}
    <Button title="Back to GST connection" variant="ghost" onPress={()=>router.back()}/>
  </View></Screen>;
}
