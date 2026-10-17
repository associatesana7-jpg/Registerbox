import { Tabs } from 'expo-router';
import { Image, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/design';

const icons: Record<string, ImageSourcePropType> = {
  index: require('../../../assets/images/action-icons/tab-home.png'),
  compliance: require('../../../assets/images/action-icons/tab-compliance.png'),
  documents: require('../../../assets/images/action-icons/tab-documents.png'),
  ai: require('../../../assets/images/action-icons/tab-ai.png'),
  account: require('../../../assets/images/action-icons/tab-account.png'),
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: palette.blue,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { height: 62 + bottom, paddingTop: 8, paddingBottom: bottom, borderTopColor: palette.line, backgroundColor: palette.white },
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
