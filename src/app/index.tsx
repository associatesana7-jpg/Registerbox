import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Button, Screen } from '@/components/registerbox-ui';
import { TownIllustration } from '@/components/illustrations';
import { palette } from '@/constants/design';

export default function SplashScreen() {
  return (
    <LinearGradient colors={['#06143B', '#0B2460', '#0E3375']} style={{ flex: 1 }}>
      <Screen dark footer={<Button title="Get Started" icon="→" onPress={() => router.push('/auth')} />}>
        <View style={styles.top}><Brand light /></View>
        <View style={styles.copy}>
          <Text selectable style={styles.hero}>Start.{`\n`}Run.{`\n`}Stay Compliant.</Text>
          <Text selectable style={styles.sub}>Your AI-powered partner for all business registrations and licences.</Text>
        </View>
        <TownIllustration />
        <View style={styles.trust}><Text style={styles.trustText}>◉  Trusted by 10,000+ Businesses</Text></View>
      </Screen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: 6 },
  copy: { flex: 1, justifyContent: 'center', paddingVertical: 44 },
  hero: { color: palette.white, fontSize: 42, lineHeight: 48, letterSpacing: -1.2, fontWeight: '900' },
  sub: { color: '#E1E9FF', fontSize: 16, lineHeight: 23, maxWidth: 320, paddingTop: 18 },
  trust: { alignItems: 'center', paddingTop: 18 },
  trustText: { color: '#C6D5FB', fontSize: 11, fontWeight: '700' },
});
