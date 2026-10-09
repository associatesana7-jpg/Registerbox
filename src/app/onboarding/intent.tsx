import { Redirect, useLocalSearchParams } from 'expo-router';
import { categoryFromLegacyPrompt } from '@/data/application-categories';

// Keep older links working without routing a service selection through AI.
export default function IntentScreen(){
  const {prompt}=useLocalSearchParams<{prompt?:string}>();
  if(!prompt)return <Redirect href="/(tabs)"/>;
  const category=categoryFromLegacyPrompt(prompt);
  return category==='gst'?<Redirect href="/gst"/>:<Redirect href={{pathname:'/onboarding/application',params:{category}}}/>;
}
