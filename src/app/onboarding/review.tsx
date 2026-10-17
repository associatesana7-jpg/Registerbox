import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { EmptyState } from '@/components/workspace-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
export default function ReviewScreen(){
  const {compliances}=useApp();
  const selected=compliances.filter(item=>item.status!=='OPTIONAL');
  return <Screen footer={<Button title="Choose the service to apply for" onPress={()=>router.push('/onboarding/intent')}/>}><PageHeader title="Review your plan" subtitle="Recommendations to review—not applications already filed." back={()=>router.back()}/>{selected.length?selected.map(item=><Card key={item.id}><Text style={{fontSize:19,lineHeight:26,fontWeight:'600',color:palette.ink}}>{item.name}</Text><Text style={{fontSize:14,lineHeight:22,color:palette.muted}}>{item.reason}</Text><Text style={{fontSize:12,lineHeight:19,color:palette.muted}}>Applicability and any service or government fee must be confirmed before payment.</Text></Card>):<EmptyState title="Start with your business details" detail="Choose a service to get the relevant questions and document checklist."/>}<Text style={{fontSize:13,lineHeight:21,color:palette.muted}}>An application is sent to the RegisterBox team only after you review and submit it. Government filing is a separate authorized step.</Text></Screen>;
}
