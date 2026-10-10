import { Tabs } from 'expo-router';
import { Image, type ImageSourcePropType } from 'react-native';

import { palette } from '@/constants/design';

const icons: Record<string, ImageSourcePropType> = {
  index: require('../../../assets/images/action-icons/tab-home.png'),
  compliance: require('../../../assets/images/action-icons/tab-compliance.png'),
  documents: require('../../../assets/images/action-icons/tab-documents.png'),
  ai: require('../../../assets/images/action-icons/tab-ai.png'),
  account: require('../../../assets/images/action-icons/tab-account.png'),
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: palette.blue,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { height: 72, paddingTop: 7, paddingBottom: 9, borderTopColor: palette.line, backgroundColor: palette.white },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      tabBarIcon: ({ color }) => <Image source={icons[route.name] ?? icons.index} resizeMode="contain" style={{width:24,height:24,tintColor:color}} />,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="compliance" options={{ title: 'Compliance' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
