import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GstSelect } from '@/components/gst-ui';
import { Button, ErrorBanner, Field } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { verifyBusinessIdentity, type BusinessIdentityResult } from '@/lib/registerbox-api';
import { saveVerifiedGstProfile } from '@/lib/business-profiles';

export function BusinessProfilePicker({onSaved}:{onSaved?:()=>void}) {
  const {business,businessProfiles,selectBusiness}=useApp();
  const [adding,setAdding]=useState(!business.id),[gstin,setGstin]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [verified,setVerified]=useState<BusinessIdentityResult|null>(null);
  async function fetchAndSave(){setBusy(true);setError('');try{const result=verified||await verifyBusinessIdentity('GSTIN',gstin);if(!result.valid)throw new Error('GST could not verify this registration. Check the GSTIN.');setVerified(result);const id=await saveVerifiedGstProfile(result);await selectBusiness(id);setAdding(false);setGstin('');setConsent(false);setVerified(null);onSaved?.();}catch(cause){setError(cause instanceof Error?cause.message:'Could not save the business profile.');}finally{setBusy(false);}}
  async function choose(id:string){setBusy(true);setError('');try{await selectBusiness(id);}catch{setError('Could not switch businesses. Please try again.');}finally{setBusy(false);}}
  return <View style={{gap:11,padding:13,borderWidth:1,borderColor:palette.line,borderRadius:12,backgroundColor:palette.white}}>
    {businessProfiles.length?<GstSelect label="Business profile" value={business.id||''} options={businessProfiles.map(profile=>({value:profile.id,label:profile.name+(profile.gstin?` · ${profile.gstin}`:'')}))} disabled={busy} onChange={id=>void choose(id)}/>:null}
    {!adding?<Pressable accessibilityRole="button" onPress={()=>setAdding(true)}><Text style={{fontSize:12,fontWeight:'800',color:palette.blue}}>＋ Add another GST business</Text></Pressable>:<>
      <Text style={{fontSize:14,fontWeight:'800',color:palette.ink}}>Fetch your business with GSTIN</Text>
      <Field label="GSTIN" placeholder="Enter 15-character GSTIN" value={gstin} editable={!busy} maxLength={15} autoCapitalize="characters" autoCorrect={false} onChangeText={value=>{setGstin(value.toUpperCase().replace(/\s/g,''));setVerified(null);setConsent(false);}}/>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent,disabled:busy}} disabled={busy} onPress={()=>setConsent(!consent)} style={{flexDirection:'row',gap:8,paddingVertical:5}}><Text style={{color:palette.blue,fontSize:18}}>{consent?'☑':'☐'}</Text><Text style={{flex:1,color:palette.muted,fontSize:11,lineHeight:17}}>Fetch this GST registration and save its business details as a profile in my account.</Text></Pressable>
      <Button title={verified?'Retry saving profile':'Fetch & Save Business'} loading={busy} disabled={!consent||!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)} onPress={fetchAndSave}/>
      {business.id?<Button title="Cancel" variant="ghost" disabled={busy} onPress={()=>{setAdding(false);setError('');}}/>:null}
    </>}
    <ErrorBanner message={error}/>
  </View>;
}
