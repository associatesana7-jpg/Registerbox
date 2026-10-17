import { Tabs } from 'expo-router';
import { AppIcon, type AppIconName } from '@/components/app-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/design';

const icons: Record<string, AppIconName> = {index:'home',compliance:'grid',documents:'folder',ai:'spark',account:'person'};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: palette.blue,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { height: 62 + bottom, paddingTop: 8, paddingBottom: bottom, borderTopColor: palette.line, backgroundColor: palette.white },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarIcon: ({ color }) => <AppIcon name={icons[route.name]??'home'} size={24} color={color}/>,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="compliance" options={{ title: 'Applications' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
