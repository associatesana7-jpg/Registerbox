import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBanner, Screen } from './registerbox-ui';
import { WorkspaceHeading, EmptyState, LoadingCards, JourneyRail } from './workspace-ui';
import { Segmented } from './flow-parts';
import { SectionHeading } from './experience';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationCategories } from '@/data/application-categories';
import { applicationStage } from '@/lib/workspace-journey';
import { palette } from '@/constants/design';

export default function CustomerApplications(){
  const {data,loading,error,refresh}=useBusinessRecords();const [filter,setFilter]=useState('In progress');
  const rows=(data?.applications||[]).filter(row=>filter==='All'||(filter==='Completed'?row.status==='APPROVED':!['APPROVED','CANCELLED','REJECTED'].includes(row.status)));
  const drafts=filter==='Completed'?[]:data?.drafts||[];
  return <Screen><WorkspaceHeading eyebrow="REGISTRATIONS & SERVICES" title="Your applications." detail="From the first detail to the final certificate. Know where things stand—and what comes next." action="Start an application" onAction={()=>router.push('/onboarding/intent')}/>
    <Segmented options={['In progress','Completed','All']} selected={filter} onSelect={setFilter}/><ErrorBanner message={error}/>
    {loading?<LoadingCards/>:error?<Button title="Try loading again" variant="secondary" onPress={()=>void refresh()}/>:<>
      {data?.actions.length?<View style={{gap:12}}><SectionHeading title="Your attention needed"/>{data.actions.map(action=><Card key={action.id} style={{backgroundColor:palette.amberBg,borderColor:'#ECDEC6'}}><Badge label="Action needed" tone="amber"/><Text style={{fontSize:18,lineHeight:25,fontWeight:'600',color:palette.ink}}>{action.title}</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>{action.description}</Text><Button title="Open document vault" variant="secondary" onPress={()=>router.push('/(tabs)/documents')}/></Card>)}</View>:null}
      {drafts.length?<View style={{gap:12}}><SectionHeading title="Ready to continue"/>{drafts.map(draft=><Card key={draft.category}><Badge label="Saved draft" tone="gray"/><Text style={{fontSize:19,lineHeight:26,fontWeight:'600',color:palette.ink}}>{applicationCategories[draft.category].title}</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>Your answers are saved. Continue from the next unanswered question.</Text><Button title="Continue application" onPress={()=>router.push({pathname:'/onboarding/application',params:{category:draft.category,resume:'1'}})}/></Card>)}</View>:null}
      {rows.map(row=>{const stage=applicationStage(row.status);return <Card key={row.id}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}><Text style={{fontSize:11,letterSpacing:0.8,color:palette.muted}}>APPLICATION</Text><Badge label={stage.label} tone={stage.tone}/></View><Text style={{fontSize:21,lineHeight:28,fontWeight:'600',color:palette.ink}}>{row.services?.name||'Registration application'}</Text><Text selectable style={{fontSize:12,color:palette.muted}}>{row.application_number||'Reference pending'} · {new Date(row.created_at).toLocaleDateString('en-IN')}</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>{stage.next}</Text><Button title="View progress & next step" variant="secondary" onPress={()=>router.push({pathname:'/application-details',params:{id:row.id}})}/></Card>;})}
      {!rows.length&&!drafts.length?<EmptyState icon="pending" title={filter==='Completed'?'Your milestones will live here.':'Your next chapter starts here.'} detail={filter==='Completed'?'Completed applications and issued certificates will appear as they become available.':'Choose a service and answer a few simple questions. Your progress is saved as you go.'} action="Explore services" onAction={()=>router.push('/onboarding/intent')}/>:null}
    </>}
    <Card><Text style={{fontSize:16,fontWeight:'600',color:palette.ink}}>How the journey works</Text><JourneyRail steps={['Details','Team review','Processing','Certificate']} current={0}/><Text style={{fontSize:13,lineHeight:21,color:palette.muted}}>Sending an application to RegisterBox starts our review. It is not a government submission. Any OTP, signature or payment comes back to you for approval.</Text></Card>
  </Screen>;
}
