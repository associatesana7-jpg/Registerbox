import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/registerbox-api';

export default function OtpScreen() {
  const { email } = useApp();
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function verify() {
    try { setLoading(true); setError(''); await verifyEmailOtp(email, otp); router.replace('/onboarding/identify'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'That code did not work. Try again.'); }
    finally { setLoading(false); }
  }

  async function resend() {
    try { setError(''); await sendEmailOtp(email); setSeconds(20); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not resend the code.'); }
  }

  return (
    <Screen>
      <PageHeader title="Check your email" subtitle={`We've sent a 6-digit sign-in code to ${email || 'you@example.com'}`} back={() => router.back()} />
      <TextInput accessibilityLabel="Six digit OTP" autoFocus keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, ''))} style={styles.otpInput} />
      <View style={styles.boxRow}>{Array.from({ length: 6 }).map((_, i) => <View key={i} style={[styles.box, i === otp.length && styles.boxActive]}><Text style={styles.digit}>{otp[i] ?? ''}</Text></View>)}</View>
      <Text style={styles.resend}>{seconds > 0 ? `Resend OTP in 00:${String(seconds).padStart(2, '0')}` : 'Didn’t receive the code?'}</Text>
      {seconds === 0 && <Button title="Resend OTP" variant="ghost" onPress={resend} />}
      <ErrorBanner message={error} />
      <Button title="Verify & Continue" icon="→" disabled={otp.length !== 6} loading={loading} onPress={verify} />
      <View style={styles.keyboard}><Text style={styles.keyHint}>Secure one-time code • Auto-detected when supported</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  otpInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  boxRow: { flexDirection: 'row', gap: 7, justifyContent: 'center', paddingTop: 36 },
  box: { width: 45, height: 56, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.white, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: palette.blue },
  digit: { color: palette.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  resend: { color: palette.muted, textAlign: 'center', fontSize: 13, paddingVertical: 20, fontVariant: ['tabular-nums'] },
  keyboard: { marginTop: 50, borderRadius: 18, padding: 22, alignItems: 'center', backgroundColor: '#EDF2F9' },
  keyHint: { color: palette.muted, fontSize: 11 },
});
