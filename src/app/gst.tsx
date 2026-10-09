import { Redirect, router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Button, ErrorBanner, Field, Screen } from '@/components/registerbox-ui';
import { GstFilingHistory } from '@/components/gst-filing-history';
import { GstActionRow, GstHeader, GstSelect, GstTabs, gstStyles as s } from '@/components/gst-ui';
import { GstReturnReview } from '@/components/gst-return-review';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { gstAction, type GstConnection, type GstReturn } from '@/lib/gst-api';
import { BusinessProfilePicker } from '@/components/business-profile-picker';
import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';
import { classifyPortalStatus, GST_RETURN_COVERAGE, portalStateCopy } from '@/lib/gst-filing-workflow';

function Consent({checked,label,onChange,disabled=false}:{checked:boolean;label:string;onChange:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{checked,disabled}} disabled={disabled} onPress={onChange} style={{flexDirection:'row',gap:9,paddingVertical:8,alignItems:'flex-start'}}><View style={{width:19,height:19,borderRadius:4,borderWidth:1.5,borderColor:palette.blue,backgroundColor:checked?palette.blue:palette.white,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.white,fontSize:12}}>{checked?'✓':''}</Text></View><Text style={{flex:1,fontSize:11,lineHeight:17,color:palette.muted}}>{label}</Text></Pressable>;
}
export default function GstScreen() {
  const {session,loadingSession,business,demoMode}=useApp();
  if(loadingSession)return <Screen><Text>Loading your account…</Text></Screen>;
  if(!session||demoMode)return <Redirect href="/auth"/>;
  if(!business.id)return <Screen><Stack.Screen options={{headerShown:false}}/><GstHeader title="GST Returns" onBack={()=>router.back()}/><BusinessProfilePicker/></Screen>;
  return <GstWorkspace key={session.user.id+business.id} businessId={business.id} initialGstin={business.gstin} name={business.tradeName||business.legalName}/>;
}
function GstWorkspace({businessId,initialGstin,name}:{businessId:string;initialGstin:string;name:string}) {
  const [connection,setConnection]=useState<GstConnection|null>(null);
  const [gstin,setGstin]=useState(initialGstin||''),[username,setUsername]=useState(''),[otp,setOtp]=useState('');
  const [consent,setConsent]=useState(false),[verifyConsent,setVerifyConsent]=useState(false),[readConsent,setReadConsent]=useState(false),[disconnectConsent,setDisconnectConsent]=useState(false);
  const [busy,setBusy]=useState(true),[error,setError]=useState('');
  const [section,setSection]=useState('GSTR-3B');
  const [page,setPage]=useState<'period'|'summary'|'connection'>('period');
  const [resumeMode,setResumeMode]=useState<string|null>(null);
  const previous=new Date();previous.setDate(1);previous.setMonth(previous.getMonth()-1);
  const [year,setYear]=useState(String(previous.getFullYear())),[month,setMonth]=useState(String(previous.getMonth()+1).padStart(2,'0'));
  const [financialYear,setFinancialYear]=useState(previous.getMonth()<3?previous.getFullYear()-1:previous.getFullYear());
  const [result,setResult]=useState<GstReturn|null>(null);
  const [filingHistory,setFilingHistory]=useState<FilingHistory|null>(null);
  const [coverageOpen,setCoverageOpen]=useState(false);
  const running=useRef(false),mounted=useRef(true);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{mounted.current=true;gstAction<{connection:GstConnection}>(businessId,'status').then(({connection:next})=>{if(mounted.current){setConnection(next);setGstin(next.gstin||initialGstin||'');setUsername(next.username||'');}}).catch(cause=>{if(mounted.current)setError(cause.message);}).finally(()=>{if(mounted.current)setBusy(false);});const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{mounted.current=false;clearInterval(timer);};},[businessId,initialGstin]);
  const linked=connection?.status==='linked'&&Date.parse(connection.expiresAt||'')>now;
  const pending=connection?.status==='otp_pending';
  const cooldown=Math.max(0,Math.ceil((Date.parse(connection?.lastOtpAt||'')+60000-now)/1000))||0;
  const gstinValid=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
  const form=section==='GSTR-1'?'gstr-1':'gstr-3b';
  const portalForm=form.replace(/-/g,'').toUpperCase();
  const selectedPeriod=month.padStart(2,'0')+year;
  const historyReady=filingHistory?.period===selectedPeriod;
  const portalRecord=historyReady?filingHistory.records.find(row=>row.form===portalForm):undefined;
  const portalState=historyReady?classifyPortalStatus(portalRecord?.status):'UNKNOWN';
  const portalBlocksPreparation=!!portalRecord&&portalState!=='NOT_FILED';
  const periodBlocked=linked&&(!historyReady||portalBlocksPreparation);
  const periodLabel=new Date(Number(year),Number(month)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  const periodOptions=Array.from({length:12},(_,index)=>{const m=(index+3)%12+1;const y=m<4?financialYear+1:financialYear;return {value:String(m).padStart(2,'0')+y,label:new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})};});
  const currentYear=new Date().getFullYear();
  const yearOptions=Array.from({length:7},(_,i)=>{const y=currentYear-i;return {value:String(y),label:`${y}-${String(y+1).slice(-2)}`};});
  async function run(action:string,input:Record<string,unknown>={}) {
    if(running.current)return;running.current=true;setBusy(true);setError('');
    try{const data=await gstAction<{connection:GstConnection}&GstReturn>(businessId,action,input);if(!mounted.current)return;if(data.connection)setConnection(data.connection);if(action==='read_return'){setResult(data);setPage('summary');}else{setResult(null);if(action==='verify_otp'){setPage('period');if(resumeMode){router.push({pathname:'/gst-returns',params:{form,year,month,mode:resumeMode}});setResumeMode(null);}}}setConsent(false);setVerifyConsent(false);setReadConsent(false);setDisconnectConsent(false);setOtp('');}
    catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'GST request failed.');}finally{running.current=false;if(mounted.current)setBusy(false);}
  }
  function prepare(mode?:string){if(!linked){setResumeMode(mode||'regular');setPage('connection');return;}if(!historyReady){setError('Wait for the GST portal filing-status check to finish, then continue.');return;}if(portalBlocksPreparation){setError(portalStateCopy(portalState));return;}router.push({pathname:'/gst-returns',params:{form,year,month,...(mode?{mode}:{})}});}
  return <Screen key={page}>
    <Stack.Screen options={{headerShown:false}}/>
    <GstHeader title={page==='summary'?`${form.toUpperCase()} · ${periodLabel}`:page==='connection'?'GST Account':'GST Returns'} onBack={()=>page==='period'?router.back():setPage('period')}/>
    <View style={s.stack}>
      <ErrorBanner message={error}/>
      {page==='summary'&&result?<GstReturnReview result={result} onContinue={()=>prepare()}/>:null}
      {page==='period'?<>
        <GstTabs items={['GSTR-1','GSTR-3B','ITC/2B','Ledgers']} value={section} onChange={value=>{setSection(value);setReadConsent(false);setResult(null);setFilingHistory(null);}}/>
        <Pressable onPress={()=>setPage('connection')} accessibilityRole="button" style={{flexDirection:'row',alignItems:'center',gap:9,padding:11,borderRadius:10,backgroundColor:palette.white,borderWidth:1,borderColor:palette.line}}><Text style={{fontSize:18,color:palette.blue}}>▣</Text><View style={{flex:1,gap:2}}><Text style={{fontSize:12,fontWeight:'800',color:palette.ink}}>{name||'Your business'}</Text><Text style={{fontSize:10,color:palette.muted}}>{gstin||'Connect your GST account'}</Text></View><Text style={{color:linked?palette.green:palette.amber,fontSize:10,fontWeight:'800'}}>{busy?'Checking':linked?'Connected':'Connect'}</Text><Text style={{color:palette.muted}}>›</Text></Pressable>
        {section==='ITC/2B'?<View style={s.card}><Text style={s.title}>Purchase reconciliation</Text><Text style={s.caption}>Add or upload purchase books, fetch GSTR-2B, and review matched, missing and different documents.</Text><GstSelect label="Financial Year" value={String(financialYear)} options={yearOptions} onChange={value=>{const fy=Number(value);setFinancialYear(fy);setYear(String(Number(month)<4?fy+1:fy));}}/><GstSelect label="Tax Period" value={month+year} options={periodOptions} onChange={value=>{setMonth(value.slice(0,2));setYear(value.slice(2));}}/><Button title="Open purchase reconciliation" onPress={()=>router.push({pathname:'/gst-purchases',params:{year,month}})}/></View>:section==='Ledgers'?<View style={s.card}><Text style={s.title}>Cash & credit ledgers</Text><Text style={s.caption}>Open a regular GSTR-3B draft to fetch ledger balances and review your payment allocation.</Text><Button title="Open payment workspace" onPress={()=>prepare('payment')}/></View>:<View style={s.card}>
          <Text style={s.title}>Select Return Period</Text>
          <GstSelect label="Financial Year" value={String(financialYear)} options={yearOptions} disabled={busy} onChange={value=>{const fy=Number(value);setFinancialYear(fy);setYear(String(Number(month)<4?fy+1:fy));setReadConsent(false);setResult(null);setFilingHistory(null);}}/>
          <GstSelect label="Tax Period" value={month+year} options={periodOptions} disabled={busy} onChange={value=>{setMonth(value.slice(0,2));setYear(value.slice(2));setReadConsent(false);setResult(null);setFilingHistory(null);}}/>
          <Text style={s.caption}>No activity to report? Confirm the nil declaration, authorize the signatory and file with OTP. No invoice upload is needed. Zero tax alone does not mean nil.</Text>
          {linked&&!historyReady?<Text accessibilityRole="alert" style={s.caption}>Checking GST portal filing status before enabling preparation…</Text>:null}
          {portalRecord?<Text accessibilityRole="alert" style={{...s.caption,color:portalState==='FILED'?palette.green:palette.amber}}>{portalStateCopy(portalState)}</Text>:null}
          <Button title={`File Nil ${form.toUpperCase()} →`} disabled={busy||periodBlocked} onPress={()=>prepare('nil')}/>
          <Button title="Prepare a regular return" variant="secondary" disabled={busy||periodBlocked} onPress={()=>prepare('regular')}/>
          {linked?<><Consent checked={readConsent} disabled={busy} onChange={()=>setReadConsent(!readConsent)} label={`Allow RegisterBox to load ${form.toUpperCase()} for ${periodLabel} from GST.`}/><Button title="View existing GST data" variant="secondary" loading={busy} disabled={!readConsent} onPress={()=>run('read_return',{form,year:Number(year),month:Number(month),consent:readConsent})}/></>:null}
        </View>}
        {linked&&['GSTR-1','GSTR-3B'].includes(section)?<GstFilingHistory businessId={businessId} year={year} month={month} onStatus={setFilingHistory}/>:null}
        <View style={s.card}><Text style={s.title}>Quick Actions</Text><View><GstActionRow icon="▤" title="Check Nil Return Eligibility" onPress={()=>prepare('nil')}/><GstActionRow icon="▧" title="View Saved & Filed Returns" onPress={()=>router.push('/gst-returns')}/><GstActionRow icon="✓" title="Check 2B vs Books" onPress={()=>setSection('ITC/2B')}/><GstActionRow icon="▥" title="View Ledgers" onPress={()=>setSection('Ledgers')}/><GstActionRow icon="＋" title="Prepare a Regular Return" onPress={()=>prepare('regular')}/></View></View>
        <View style={s.card}><Pressable accessibilityRole="button" accessibilityState={{expanded:coverageOpen}} onPress={()=>setCoverageOpen(!coverageOpen)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}><View style={{flex:1,gap:3}}><Text style={s.title}>Return coverage</Text><Text style={s.caption}>Forms are enabled only after taxpayer applicability and live provider support are verified.</Text></View><Text style={{color:palette.blue,fontSize:18}}>{coverageOpen?'⌃':'⌄'}</Text></Pressable>{coverageOpen?GST_RETURN_COVERAGE.map(item=><View key={item.form} style={{flexDirection:'row',alignItems:'center',gap:10,paddingTop:9,borderTopWidth:1,borderTopColor:palette.line}}><View style={{flex:1,gap:2}}><Text style={{fontSize:12,fontWeight:'800',color:palette.ink}}>{item.form}</Text><Text style={s.caption}>{item.purpose}</Text></View><Text style={{fontSize:10,fontWeight:'800',color:item.availability==='enabled'?palette.green:palette.amber}}>{item.availability==='enabled'?'Guided flow':'CA/provider review'}</Text></View>):null}</View>
      </>:null}
      {page==='connection'?<>
        <View style={s.card}><Text style={s.title}>{linked?'GST account connected':'Connect your GST account'}</Text>{linked?<><Text selectable style={{fontSize:16,fontWeight:'700',color:palette.ink}}>{connection?.gstin}</Text><Text style={s.caption}>Access expires {new Date(connection!.expiresAt!).toLocaleString('en-IN')}.</Text><Button title="Choose return period" onPress={()=>setPage('period')}/></>:<>
          <Text style={s.caption}>Enable API access under GST Portal → View Profile → Manage API Access.</Text><Button title="Open GST Portal" variant="ghost" onPress={()=>void Linking.openURL('https://www.gst.gov.in/').catch(()=>setError('Open gst.gov.in in your browser.'))}/>
          <Field label="GSTIN" value={gstin} editable={!busy&&!pending} autoCapitalize="characters" autoCorrect={false} maxLength={15} onChangeText={value=>{setGstin(value.toUpperCase().replace(/\s/g,''));setConsent(false);}}/>
          {gstin&&!gstinValid?<Text accessibilityRole="alert" style={{...s.caption,color:palette.red}}>Enter your 15-character GST registration number here. Your GST portal username belongs in the next field.</Text>:null}
          <Field label="GST portal username" value={username} editable={!busy&&!pending} autoCapitalize="none" autoCorrect={false} onChangeText={value=>{setUsername(value.trim());setConsent(false);}}/>
          <Consent checked={consent} disabled={busy} onChange={()=>setConsent(!consent)} label={`I am authorized to access ${gstin||'this GSTIN'} and approve sending a login OTP to its registered contact.`}/>
          <Button title={cooldown?`Request again in ${cooldown}s`:pending?'Resend GST OTP':'Send GST OTP'} disabled={busy||!consent||!!cooldown||!connection||!gstinValid||username.length<3} onPress={()=>run('request_otp',{gstin,username,consent})}/>
          {pending?<><Field label="6-digit GST login OTP" value={otp} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} editable={!busy} onChangeText={value=>setOtp(value.replace(/\D/g,''))}/><Consent checked={verifyConsent} disabled={busy} onChange={()=>setVerifyConsent(!verifyConsent)} label="Verify this OTP and save my temporary GST access session."/><Button title="Verify & Link GST" disabled={busy||!verifyConsent||otp.length!==6} onPress={()=>run('verify_otp',{otp,consent:verifyConsent})}/></>:null}
          {!connection&&!busy?<Button title="Retry connection" variant="secondary" onPress={()=>run('status')}/>:null}
        </>}</View>
        {connection&&connection.status!=='disconnected'?<View style={s.card}><Text style={s.title}>Manage connection</Text><Consent checked={disconnectConsent} disabled={busy} onChange={()=>setDisconnectConsent(!disconnectConsent)} label="Remove RegisterBox’s saved GST session. Portal API access can be revoked separately on GST."/><Button title="Disconnect" variant="secondary" disabled={busy||!disconnectConsent} onPress={()=>run('disconnect',{consent:disconnectConsent})}/></View>:null}
      </>:null}
    </View>
  </Screen>;
}
