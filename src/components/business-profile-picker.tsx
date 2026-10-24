import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GstSelect } from '@/components/gst-ui';
import { Button, ErrorBanner, Field } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { verifyBusinessIdentity, type BusinessIdentityResult } from '@/lib/registerbox-api';
import { saveVerifiedGstProfile } from '@/lib/business-profiles';
import { GstCheckbox } from './gst-checkbox';
import { AppIcon } from './app-icon';

export function BusinessProfilePicker({onSaved,compact=false}:{onSaved?:()=>void;compact?:boolean}) {
  const {business,businessProfiles,selectBusiness}=useApp();
  const [adding,setAdding]=useState(!business.id),[gstin,setGstin]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [verified,setVerified]=useState<BusinessIdentityResult|null>(null);
  const [expanded,setExpanded]=useState(false);
  async function fetchAndSave(){setBusy(true);setError('');try{const result=verified||await verifyBusinessIdentity('GSTIN',gstin);if(!result.valid)throw new Error('GST could not verify this registration. Check the GSTIN.');setVerified(result);const id=await saveVerifiedGstProfile(result);await selectBusiness(id);setAdding(false);setGstin('');setConsent(false);setVerified(null);onSaved?.();}catch{setError('We could not save this business profile. Check the GSTIN and your internet connection, then try again.');}finally{setBusy(false);}}
  async function choose(id:string){setBusy(true);setError('');try{await selectBusiness(id);}catch{setError('Could not switch businesses. Please try again.');}finally{setBusy(false);}}
  if(compact&&!expanded&&business.id)return <Pressable accessibilityRole="button" accessibilityLabel="Switch or add business" onPress={()=>setExpanded(true)} style={{minWidth:0,flexDirection:'row',gap:12,alignItems:'center',padding:16,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.white}}><View style={{width:38,height:38,borderRadius:12,backgroundColor:palette.sky,alignItems:'center',justifyContent:'center'}}><AppIcon name="business" size={21} color={palette.blue}/></View><View style={{flex:1,minWidth:0,gap:4}}><Text style={{fontSize:10,letterSpacing:1.1,color:palette.muted,fontWeight:'600'}}>ACTIVE BUSINESS</Text><Text numberOfLines={1} style={{fontSize:14,fontWeight:'600',color:palette.ink}}>{business.tradeName||business.legalName||'Your business'}</Text></View><AppIcon name="settings" size={20} color={palette.muted}/></Pressable>;
  if(compact&&!expanded&&!business.id)return <Pressable accessibilityRole="button" onPress={()=>setExpanded(true)} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:9}}><AppIcon name="add" color={palette.blue}/><Text style={{fontSize:14,fontWeight:'600',color:palette.blue}}>Already registered? Add your GST business</Text></Pressable>;
  return <View style={{gap:14,padding:20,borderWidth:1,borderColor:palette.line,borderRadius:20,backgroundColor:palette.white}}>
    {businessProfiles.length?<GstSelect label="Business profile" value={business.id||''} options={businessProfiles.map(profile=>({value:profile.id,label:profile.name+(profile.gstin?` · ${profile.gstin}`:'')}))} disabled={busy} onChange={id=>void choose(id)}/>:null}
    {!adding?<Pressable accessibilityRole="button" onPress={()=>setAdding(true)}><Text style={{fontSize:12,fontWeight:'800',color:palette.blue}}>＋ Add another GST business</Text></Pressable>:<>
      <Text style={{fontSize:14,fontWeight:'800',color:palette.ink}}>Fetch your business with GSTIN</Text>
      <Field label="GSTIN" placeholder="Enter 15-character GSTIN" value={gstin} editable={!busy} maxLength={15} autoCapitalize="characters" autoCorrect={false} onChangeText={value=>{setGstin(value.toUpperCase().replace(/\s/g,''));setVerified(null);setConsent(false);}}/>
      <GstCheckbox checked={consent} disabled={busy} onPress={()=>setConsent(!consent)} label="Fetch this GST registration and save its business details as a profile in my account."/>
      <Button title={verified?'Retry saving profile':'Fetch & Save Business'} loading={busy} disabled={!consent||!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)} onPress={fetchAndSave}/>
      {business.id?<Button title="Cancel" variant="ghost" disabled={busy} onPress={()=>{setAdding(false);setError('');}}/>:null}
    </>}
    <ErrorBanner message={error}/>
    {compact?<Button title="Done managing businesses" variant="ghost" disabled={busy} onPress={()=>setExpanded(false)}/>:null}
  </View>;
}
