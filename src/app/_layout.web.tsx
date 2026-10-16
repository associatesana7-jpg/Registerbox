import { Stack } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { AppProvider } from '@/providers/app-provider';
import { WebShell } from '@/components/website/shell.web';
import '@/components/website/website.css';
import '@/components/website/service-experience.css';
// The navigator must own the shell so loading/auth changes cannot reset its state.
function renderShell({ children }: PropsWithChildren) {
  return <WebShell>{children}</WebShell>;
}
export default function WebLayout() {
  return <AppProvider><Stack layout={renderShell} screenOptions={{headerShown:false,animation:'none',contentStyle:{backgroundColor:'#F6F8FC'}}}/></AppProvider>;
}
