import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { categoryFromLegacyPrompt } from '@/data/application-categories';
import { NavTile } from '@/components/experience';
import { PageHeader, Screen } from '@/components/registerbox-ui';
import { services, servicePath } from '@/components/website/content';

// Keep older links working without routing a service selection through AI.
export default function IntentScreen(){
  const {prompt}=useLocalSearchParams<{prompt?:string}>();
  if(!prompt)return <Screen><PageHeader title="What would you like to do?" subtitle="Choose your service to open its own application or workspace." back={()=>router.back()}/>{services.map(service=><NavTile key={service.category} title={service.title} detail={service.detail} icon={service.category==='gst'?'₹':'→'} onPress={()=>router.push(servicePath(service.category) as Href)}/>)}</Screen>;
  const category=categoryFromLegacyPrompt(prompt);
  return category==='gst'?<Redirect href="/gst"/>:<Redirect href={{pathname:'/onboarding/application',params:{category}}}/>;
}
