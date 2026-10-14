import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useApp } from '@/hooks/use-app';
import { Button, Card, Choice, ErrorBanner, Field } from '@/components/registerbox-ui';
import { PrivacyNotice } from '@/components/privacy-notice';
import { privacyPurposeNotices } from '@/data/privacy-notice';
import { PRIVACY_PURPOSES, PRIVACY_RIGHTS, privacyConsentDecision, type PrivacyPurpose, type PrivacyRight } from '../../supabase/functions/_shared/privacy-domain';
import { changePrivacyPurpose, createPrivacyCase, loadPrivacyState, type PrivacyState } from '@/lib/privacy-center';

const labels={access:'Access: personal-data and recipient summary',correction:'Correct, complete or update data',grievance:'Privacy grievance',nomination:'Review a privacy-rights nominee',withdrawal:'Withdraw service-processing permission',guardian_review:'Ask about verified parental / lawful-guardian access'};
export function PrivacyCenter(){const {session,demoMode}=useApp();return <PrivacyCenterForm key={`${session?.user.id??'signed-out'}:${demoMode}`}/>;}
function PrivacyCenterForm(){
  const {session,demoMode,loadingSession}=useApp();
  const [language,setLanguage]=useState<'en'|'hi'>('en'),[state,setState]=useState<PrivacyState|null>(null);
  const [adult,setAdult]=useState(false),[kind,setKind]=useState<PrivacyRight>('access'),[details,setDetails]=useState(''),[confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const userId=session?.user.id;
  useEffect(()=>{let active=true;if(userId&&!demoMode)loadPrivacyState().then(data=>{if(active)setState(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[userId,demoMode]);
  async function reload(){setError('');try{setState(await loadPrivacyState());}catch(e){setError((e as Error).message);}}
  async function choose(purpose:PrivacyPurpose,allowed:boolean){
    if(busy||!state)return;setBusy(true);setError('');setMessage('');
    try{const result=await changePrivacyPurpose(purpose,allowed,language,adult,state.preferences.find(p=>p.purpose===purpose)?.changed_at);setState(current=>current?{...current,preferences:[result.preference,...current.preferences.filter(p=>p.purpose!==purpose)]}:current);setMessage(allowed?'Permission recorded for this purpose. Other permissions were not changed.':'Permission withdrawn. New AI requests for this purpose are blocked; existing records are not automatically erased.');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function submit(){
    if(busy||!confirmed)return;setBusy(true);setError('');setMessage('');
    try{const result=await createPrivacyCase(kind,details);setState(current=>current?{...current,requests:[result.request,...current.requests]}:current);setMessage(`Request received: ${result.request.id}. Target response ${new Date(result.request.target_at).toLocaleDateString()}. This is a request receipt, not confirmation of correction, erasure or guardian verification.`);setDetails('');setConfirmed(false);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <View style={{gap:16}}>
    <PrivacyNotice language={language} onLanguage={setLanguage}/>
    {loadingSession?<Text>Checking account…</Text>:!session||demoMode?<Card><Text>Sign in to manage your own permissions and track privacy requests. Email privacy support if you cannot sign in.</Text><Link href={{pathname:'/auth',params:{next:'/privacy'}}}>Sign in to Privacy Centre</Link></Card>:<>
      <Card><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700'}}>Optional AI permissions</Text><Text>Both purposes are optional and off unless current permission is recorded. Account and manual-service access do not require these AI permissions.</Text><Choice label="I am at least 18 and can give consent for my own optional AI processing. This is not parental or lawful-guardian verification." selected={adult} onPress={()=>setAdult(!adult)}/></Card>
      {PRIVACY_PURPOSES.map(purpose=>{const allowed=privacyConsentDecision(state?.preferences.find(p=>p.purpose===purpose));return <Card key={purpose}><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700'}}>{purpose==='ai_assistance'?'AI assistance':'Bill-image AI'}</Text><Text selectable style={{lineHeight:24}}>{privacyPurposeNotices[purpose][language]}</Text><Text>{state?(allowed?'Current permission: allowed':'Current permission: not allowed'):'Loading current choice. No permission is assumed.'}</Text><Button title={allowed?'Withdraw this permission':'Give permission for this purpose'} variant={allowed?'secondary':'primary'} disabled={busy||!state||(!allowed&&!adult)} onPress={()=>void choose(purpose,!allowed)}/></Card>;})}
      <Card><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700'}}>Exercise a privacy right</Text>{PRIVACY_RIGHTS.map(value=><Choice key={value} label={labels[value]} selected={kind===value} onPress={()=>{setKind(value);setConfirmed(false);}}/>)}<Field label="Request details (optional for access summary)" multiline maxLength={1500} value={details} onChangeText={setDetails} placeholder="Use record references. No passwords, OTPs or full government ID numbers."/><Text>A nominee request does not give account access. A guardian request does not enable child processing until authority and consent are verified.</Text><Choice label="I confirm this request relates to my own account or a lawful authority I can establish." selected={confirmed} onPress={()=>setConfirmed(!confirmed)}/><Button title="Submit privacy request" disabled={busy||!state||!confirmed||(kind!=='access'&&!details.trim())} loading={busy} onPress={()=>void submit()}/><Link href="/delete-account">Request erasure / account deletion instead</Link></Card>
      <Button title="Refresh choices and request status" variant="secondary" disabled={busy} onPress={()=>void reload()}/>
      {state?.processorTasks.map(task=><Card key={task.id}><Text selectable>Processor review: {task.id}</Text><Text>{task.purpose} · {task.status} · target {new Date(task.target_at).toLocaleDateString()}</Text><Text>{task.response||'New processing is blocked. Provider-copy erasure and legal retention remain under operator review.'}</Text>{task.retained_until?<Text>Retention end: {task.retained_until}</Text>:null}</Card>)}
      {state?.requests.map(request=><Card key={request.id}><Text selectable>Reference: {request.id}</Text><Text>{labels[request.kind]} · {request.status}</Text><Text>Target response: {new Date(request.target_at).toLocaleDateString()}</Text>{request.response?<Text selectable>{request.response}</Text>:<Text>Awaiting operator review. No requested action is assumed complete.</Text>}</Card>)}
      <Card><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700'}}>Recorded choice history</Text>{state?.events.length?state.events.map(event=><Text selectable key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.purpose} · {event.allowed?'given':'withdrawn'} · {event.notice_version}</Text>):<Text>No recorded choices returned. Refresh after changing a permission.</Text>}</Card>
    </>}
    <ErrorBanner message={error}/>{message?<Text accessibilityRole="alert" selectable>{message}</Text>:null}
  </View>;
}
