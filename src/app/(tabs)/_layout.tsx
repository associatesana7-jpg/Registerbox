import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { palette } from '@/constants/design';

const icons: Record<string, string> = { index: '⌂', compliance: '✓', documents: '▤', ai: '◉', account: '☰' };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: palette.blue,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { height: 72, paddingTop: 7, paddingBottom: 9, borderTopColor: palette.line, backgroundColor: palette.white },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19, fontWeight: '900' }}>{icons[route.name] ?? '•'}</Text>,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="compliance" options={{ title: 'Compliance' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
