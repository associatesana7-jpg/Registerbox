import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Button, ErrorBanner, Field, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { sendEmailOtp } from '@/lib/registerbox-api';

export default function LoginScreen() {
  const { email, setEmail, setDemoMode } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    try { setLoading(true); setError(''); await sendEmailOtp(email); router.push('/auth/otp'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not send the OTP. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <Brand />
      <View style={styles.hero}>
        <View style={styles.miniLogo}><Text style={{ fontSize: 26 }}>◇</Text></View>
        <Text selectable style={styles.title}>Welcome!</Text>
        <Text selectable style={styles.sub}>Use your email to set up or manage{`\n`}your business.</Text>
      </View>
      <View style={{ gap: 14 }}>
        <Field placeholder="Enter your email address" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
        <ErrorBanner message={error} />
        <Button title="Email me an OTP" onPress={send} loading={loading} />
      </View>
      <View style={styles.or}><View style={styles.line} /><Text style={styles.orText}>Or continue with</Text><View style={styles.line} /></View>
      <View style={styles.socialRow}><View style={{ flex: 1 }}><Button title="G  Google" variant="secondary" onPress={() => setError('Google sign-in needs OAuth credentials before it can be enabled.')} /></View><View style={{ flex: 1 }}><Button title="●  Apple" variant="secondary" onPress={() => setError('Apple sign-in needs Apple credentials before it can be enabled.')} /></View></View>
      <Button title="Preview sample business" variant="ghost" onPress={() => { setDemoMode(true); router.replace('/onboarding/identify'); }} />
      <Text selectable style={styles.legal}>By continuing, you agree to our <Text style={styles.link}>Terms & Privacy Policy</Text></Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingTop: 78, paddingBottom: 42 },
  miniLogo: { width: 56, height: 56, borderRadius: 18, backgroundColor: palette.sky, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.ink, fontSize: 30, fontWeight: '900' },
  sub: { color: palette.muted, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: palette.line },
  orText: { color: palette.muted, fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 12 },
  legal: { textAlign: 'center', color: palette.muted, fontSize: 11, lineHeight: 17, paddingTop: 20 },
  link: { color: palette.blue, fontWeight: '700' },
});
