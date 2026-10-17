import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { categoryFromLegacyPrompt } from '@/data/application-categories';
import { Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { ActionRow, EmptyState } from '@/components/workspace-ui';
import { services, servicePath } from '@/components/website/content';
import { palette } from '@/constants/design';

export default function IntentScreen(){
  const {prompt}=useLocalSearchParams<{prompt?:string}>();
  const [search,setSearch]=useState('');
  if(prompt){const category=categoryFromLegacyPrompt(prompt);return category==='gst'?<Redirect href="/gst"/>:<Redirect href={{pathname:'/onboarding/application',params:{category}}}/>;}
  const visible=services.filter(service=>`${service.title} ${service.detail}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Screen><PageHeader title="Make your next move." subtitle="Choose a service. We’ll guide you through the details and documents, one step at a time." back={()=>router.back()}/><Field accessibilityLabel="Search services" placeholder="Search GST, FSSAI, company…" value={search} onChangeText={setSearch}/>{['Start a business','Registrations','Manage & comply'].map(group=>{const items=visible.filter(service=>service.group===group);return items.length?<View key={group} style={{gap:12}}><Text accessibilityRole="header" style={{fontSize:11,letterSpacing:1.4,fontWeight:'700',color:palette.muted,paddingTop:12}}>{group.toUpperCase()}</Text>{items.map(service=><ActionRow key={service.category} title={service.title} detail={service.detail} icon={service.category==='gst'?'receipt':group==='Start a business'?'business':'verified'} onPress={()=>router.push(servicePath(service.category) as Href)}/>)}</View>:null;})}{!visible.length?<EmptyState icon="search" title="Let’s try another search" detail="Try a service name such as GST, food or shop." action="Clear search" onAction={()=>setSearch('')}/>:null}</Screen>;
}
