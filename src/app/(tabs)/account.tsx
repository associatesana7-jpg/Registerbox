import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Button, Card, ErrorBanner, Screen } from '@/components/registerbox-ui';
import { BusinessProfilePicker } from '@/components/business-profile-picker';
import { ActionRow, Disclosure, WorkspaceHeading } from '@/components/workspace-ui';
import { AppIcon } from '@/components/app-icon';
import { contact } from '@/components/website/content';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { business, session, demoMode } = useApp();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function signOut(){setBusy(true);setError('');try{const result=await supabase.auth.signOut();if(result.error)throw result.error;router.replace('/auth');}catch{setError('Could not sign out. Please try again.');}finally{setBusy(false);}}
  return <Screen>
    <WorkspaceHeading eyebrow="YOUR ACCOUNT" title="Everything in its place." detail="Your business, connected tools and privacy controls."/>
    <Card><View style={{flexDirection:'row',gap:14,alignItems:'center'}}><View style={{width:48,height:48,borderRadius:16,backgroundColor:palette.sky,alignItems:'center',justifyContent:'center'}}><AppIcon name="person" color={palette.blue}/></View><View style={{flex:1,gap:5}}><Text style={{fontSize:16,fontWeight:'600',color:palette.ink}}>Signed in as</Text><Text selectable style={{fontSize:14,lineHeight:21,color:palette.muted}}>{session?.user.email||'Demo account'}</Text></View></View></Card>
    <BusinessProfilePicker compact/>
    {business.id?<Card><Text style={{fontSize:17,fontWeight:'600',color:palette.ink}}>{business.tradeName||business.legalName}</Text>{business.entityType?<Text style={{fontSize:14,color:palette.muted}}>{business.entityType.replaceAll('_',' ')}</Text>:null}{[business.city,business.state,business.pincode].some(Boolean)?<Text selectable style={{fontSize:14,lineHeight:22,color:palette.muted}}>{[business.city,business.state,business.pincode].filter(Boolean).join(' · ')}</Text>:null}{business.gstin?<Text selectable style={{fontSize:13,color:palette.muted}}>GSTIN · {business.gstin}</Text>:null}</Card>:null}
    <ActionRow icon="business" title="Connect Tally" detail="Bring your accounting records into your workspace." onPress={()=>router.push('/tally')}/>
    <ActionRow icon="shield" title="Privacy centre" detail="Review permissions, consent and your data rights." onPress={()=>router.push('/privacy')}/>
    <ActionRow icon="help" title="A human when you need one" detail="Contact the RegisterBox team for help with your case." onPress={()=>void Linking.openURL(contact.whatsapp).catch(()=>setError('Could not open WhatsApp. Email '+contact.email))}/>
    <Card><Disclosure title="Your data & account" detail="Privacy information and account deletion"><Button title="Privacy & retention information" variant="secondary" onPress={()=>router.push('/policies')}/><Button title="Request account or data deletion" variant="ghost" onPress={()=>router.push('/delete-account')}/></Disclosure></Card>
    <Text style={{fontSize:12,lineHeight:19,color:palette.muted,textAlign:'center'}}>Government filing, payments and signatures always need your explicit approval.</Text>
    <ErrorBanner message={error}/>{!demoMode?<Button title="Sign out" variant="secondary" loading={busy} onPress={()=>void signOut()}/>:null}
  </Screen>;
}
