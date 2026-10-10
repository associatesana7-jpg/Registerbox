import { Stack } from 'expo-router';
import { AppProvider } from '@/providers/app-provider';
import { WebShell } from '@/components/website/shell.web';
import '@/components/website/website.css';
export default function WebLayout() {
  return <AppProvider><WebShell><Stack screenOptions={{headerShown:false,animation:'none',contentStyle:{backgroundColor:'#F6F8FC'}}}/></WebShell></AppProvider>;
}
