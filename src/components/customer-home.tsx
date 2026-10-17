import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Brand, Button, ErrorBanner, Screen } from './registerbox-ui';
import { WorkspaceHeading, NextStepCard, ActionRow, LoadingCards } from './workspace-ui';
import { SectionHeading } from './experience';
import { AppIcon } from './app-icon';
import { BusinessProfilePicker } from './business-profile-picker';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationCategories } from '@/data/application-categories';
import { palette } from '@/constants/design';

export default function CustomerHome(){
  const {business}=useApp();const {data,loading,error,refresh}=useBusinessRecords();
  const draft=data?.drafts[0],request=data?.actions[0];
  const active=data?.applications.find(row=>!['APPROVED','CANCELLED','REJECTED'].includes(row.status));
  const begin=()=>router.push('/onboarding/intent');
  const openApplication=(id:string)=>router.push({pathname:'/application-details',params:{id}});
  const next=!business.id?{title:'Let’s build your next chapter.',detail:'Start an application or add an existing GST business. We’ll guide you through the right steps.',action:'Find my service',onPress:begin}
    :request?{title:request.title,detail:request.description,action:'Review what’s needed',onPress:()=>router.push('/(tabs)/compliance')}
    :draft?{title:'Pick up where you left off.',detail:applicationCategories[draft.category].title,action:'Continue application',onPress:()=>router.push({pathname:'/onboarding/application',params:{category:draft.category,resume:'1'}})}
    :active?{title:'Your application is moving.',detail:`${active.services?.name||'Application'} · See the current stage and what happens next.`,action:'View application',onPress:()=>openApplication(active.id)}
    :{title:business.gstin?'Your GST, one step at a time.':'Ready for your next move?',detail:business.gstin?'Start with GSTR-1. We’ll guide you to GSTR-3B after its filing is confirmed.':'Explore registrations and services for your next business milestone.',action:business.gstin?'Open GST workspace':'Explore services',onPress:business.gstin?()=>router.push('/gst'):begin};
  return <Screen><View style={{gap:26}}>
    {process.env.EXPO_OS!=='web'?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Brand compact/><Pressable accessibilityRole="button" accessibilityLabel="Open account settings" onPress={()=>router.push('/(tabs)/account')} style={{width:44,height:44,borderRadius:15,borderWidth:1,borderColor:palette.line,backgroundColor:palette.white,alignItems:'center',justifyContent:'center'}}><AppIcon name="person"/></Pressable></View>:null}
    <WorkspaceHeading eyebrow="YOUR BUSINESS WORKSPACE" title={business.id?'A little clarity.\nA lot of possibility.':'Big plans.\nOne clear starting point.'} detail={business.id?'Everything your business needs, connected.':'Your registrations, documents and next steps. Together.'}/>
    <BusinessProfilePicker compact/>
    <ErrorBanner message={error}/>{error?<Button title="Retry loading my workspace" variant="secondary" onPress={()=>void refresh()}/>:loading&&business.id?<LoadingCards/>:<NextStepCard {...next}/>}
    {data&&business.id?<View style={{flexDirection:'row',gap:12}}>{[{label:'Applications',value:data.applications.length,action:()=>router.push('/(tabs)/compliance')},{label:'Documents',value:data.documents.length,action:()=>router.push('/(tabs)/documents')}].map(item=><Pressable key={item.label} accessibilityRole="button" onPress={item.action} style={{flex:1,padding:18,gap:8,borderRadius:20,backgroundColor:palette.white,borderWidth:1,borderColor:palette.line}}><Text style={{fontSize:28,fontWeight:'600',letterSpacing:-1,color:palette.ink,fontVariant:['tabular-nums']}}>{item.value}</Text><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:13,color:palette.muted}}>{item.label}</Text><AppIcon name="chevron" size={16} color={palette.muted}/></View></Pressable>)}</View>:null}
    <View style={{gap:12}}><SectionHeading title="Your workspaces"/><ActionRow title="GST returns" detail="GSTR-1, GSTR-3B, nil returns & records" icon="receipt" onPress={()=>router.push('/gst')}/><ActionRow title="Registrations & licences" detail="Choose a service. We’ll handle the journey." icon="business" onPress={begin}/><ActionRow title="Documents" detail="Your reusable records and certificates" icon="folder" onPress={()=>router.push('/(tabs)/documents')}/></View>
    <View style={{padding:22,gap:14,borderRadius:22,backgroundColor:'#EAF0F1'}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><AppIcon name="spark" color={palette.navy}/><Text style={{fontSize:18,fontWeight:'600',color:palette.ink,flex:1}}>A little help, when you need it.</Text></View><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>Ask a business question or turn a bill photo into a reviewable draft.</Text><Button title="Ask RegisterBox AI" variant="secondary" onPress={()=>router.push('/(tabs)/ai')}/></View>
  </View></Screen>;
}
