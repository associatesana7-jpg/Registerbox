import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { TownIllustration } from '@/components/illustrations';
import { Brand, Button, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function SplashScreen() {
  const { session, loadingSession } = useApp();
  useEffect(() => {
    if (loadingSession || !session) return;
    router.replace('/(tabs)');
  }, [loadingSession, session]);
  return <LinearGradient colors={['#FFFFFF', '#F0F8FF', '#E6F4FF']} style={{ flex: 1 }}>
    <Screen footer={<Button title={loadingSession ? 'Loading your account…' : 'Get Started'} icon="→" disabled={loadingSession} onPress={() => router.push('/auth')} />}>
      <View style={{ alignItems: 'center', paddingTop: 32 }}><Brand /></View>
      <View style={{ alignItems: 'center', paddingTop: 72, gap: 16 }}>
        <View style={{ width: 86, height: 86, backgroundColor: '#E0EFFF', borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.blue, fontSize: 55, fontWeight: '900' }}>◇</Text></View>
        <Text selectable style={{ color: palette.ink, fontSize: 33, fontWeight: '900', letterSpacing: -1.4 }}>Register<Text style={{ color: palette.blue }}>Box</Text></Text>
        <Text selectable style={{ color: palette.muted, fontSize: 15 }}>Start. Run. Stay Compliant.</Text>
      </View>
      <View style={{ flex: 1, minHeight: 270, justifyContent: 'flex-end', paddingTop: 26 }}><TownIllustration /></View>
      <Text selectable style={{ color: palette.muted, textAlign: 'center', fontSize: 11, paddingTop: 14 }}>Registrations · Licences · Compliance, in one place</Text>
    </Screen>
  </LinearGradient>;
}
