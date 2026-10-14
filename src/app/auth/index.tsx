import { Link, router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Button, Card, ErrorBanner, Field, Screen } from '@/components/registerbox-ui';
import { Eyebrow, SoftNotice } from '@/components/experience';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { sendEmailOtp } from '@/lib/registerbox-api';

export default function LoginScreen() {
  const { email, setEmail, setDemoMode } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    try { setLoading(true); setError(''); setDemoMode(false); await sendEmailOtp(email); router.push('/auth/otp'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not send the OTP. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <Brand compact />
      <View style={styles.hero}>
        <Image source={require('../../../assets/images/registerbox-app-icon.png')} contentFit="contain" accessibilityLabel="RegisterBox logo" style={styles.miniLogo} />
        <Eyebrow>START YOUR BUSINESS JOURNEY</Eyebrow>
        <Text selectable style={styles.title}>Welcome to{`\n`}Register<Text style={{ color: palette.blue }}>Box</Text></Text>
        <Text selectable style={styles.sub}>Sign in to start or manage your business.</Text>
      </View>
      <Card style={{ gap: 16 }}>
        <Field label="Email address" placeholder="you@business.com" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
        <ErrorBanner message={error} />
        <Button title="Send 6-digit code" icon="→" onPress={send} loading={loading} disabled={!email.includes('@')} />
      </Card>
      <SoftNotice title="One account, every business step" detail="We email a secure sign-in code. Your saved business profile will be here when you return." icon="✉" />
      <Button title="Use an existing password account" variant="ghost" onPress={() => router.push('/auth/password')} />
      <Button title="Preview sample business" variant="ghost" onPress={() => { setDemoMode(true); router.replace('/onboarding/identify'); }} />
      <Text selectable style={styles.legal}>Your email is used for sign-in and account security. Optional AI permission is separate. Under-18 and lawful-guardian processing needs verified authority before personal information is provided.</Text>
      <Link href="/privacy" style={styles.link}>Read the privacy notice and manage your choices</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingTop: 74, paddingBottom: 36 },
  miniLogo: { width: 86, height: 86, borderRadius: 20, backgroundColor: palette.white, marginBottom: 8 },
  title: { color: palette.ink, fontSize: 31, fontWeight: '900', textAlign: 'center', lineHeight: 36, letterSpacing: -0.8 },
  sub: { color: palette.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  legal: { textAlign: 'center', color: palette.muted, fontSize: 11, lineHeight: 17, paddingTop: 20 },
  link: { color: palette.blue, fontWeight: '700' },
});
