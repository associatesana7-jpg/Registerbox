import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { EmptyState, JourneyRail, LoadingCards, ActionRow } from '@/components/workspace-ui';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationStage } from '@/lib/workspace-journey';
import { palette } from '@/constants/design';
import { contact } from '@/components/website/content';
import { ApplicationPaymentCard } from '@/components/application-payment-card';
export default function ApplicationDetails(){
  const {id}=useLocalSearchParams<{id:string}>();const {data,loading,error,refresh}=useBusinessRecords();
  const application=data?.applications.find(row=>row.id===id),stage=applicationStage(application?.status||'');
  return <Screen><PageHeader title="Application progress" subtitle="Your case, clearly connected." back={()=>router.back()}/><ErrorBanner message={error}/>{loading?<LoadingCards/>:error?<Button title="Retry loading application" onPress={()=>void refresh()}/>:!application?<EmptyState title="Application not found" detail="This application is not available under the selected business. Switch to the correct business or return to your applications." action="My applications" onAction={()=>router.replace('/(tabs)/compliance')}/>:<>
    <Card><Badge label={stage.label} tone={stage.tone}/><Text accessibilityRole="header" style={{fontSize:26,lineHeight:33,fontWeight:'600',letterSpacing:-0.6,color:palette.ink}}>{application.services?.name||'Registration application'}</Text><Text selectable style={{fontSize:13,color:palette.muted}}>Reference · {application.application_number||'Not assigned yet'}</Text><JourneyRail steps={['Details','Team review','Processing','Certificate']} current={stage.index}/></Card>
    <View style={{padding:24,borderRadius:24,backgroundColor:palette.sky,gap:12}}><Text style={{fontSize:11,letterSpacing:1.4,fontWeight:'700',color:palette.blue}}>WHAT HAPPENS NEXT</Text><Text style={{fontSize:20,lineHeight:27,fontWeight:'600',color:palette.ink}}>{stage.next}</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>We’ll ask for your approval before any OTP, signature, payment or final filing step.</Text><Button title={application.status==='APPROVED'?'View my documents':'Upload or review documents'} onPress={()=>router.push({pathname:'/(tabs)/documents',params:{application:application.id}})}/></View>
    <Card><Text style={{fontSize:17,fontWeight:'600',color:palette.ink}}>Your application record</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>Created {new Date(application.created_at).toLocaleDateString('en-IN')}{application.submitted_at?`\nGovernment submission recorded ${new Date(application.submitted_at).toLocaleDateString('en-IN')}`:'\nNo government-submission date is recorded yet.'}</Text>{application.certificate_document_id?<Badge label="Certificate record linked" tone="green"/>:null}</Card>
    <ApplicationPaymentCard key={application.id} applicationId={application.id}/>
    <ActionRow icon="help" title="Talk to your RegisterBox team" detail="Questions, corrections or an update on this case" onPress={()=>void Linking.openURL(contact.whatsapp)}/>
    <Button title="Back to all applications" variant="ghost" onPress={()=>router.replace('/(tabs)/compliance')}/>
  </>}</Screen>;
}
