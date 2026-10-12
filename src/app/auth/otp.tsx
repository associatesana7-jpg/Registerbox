import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OtpOrbit, type OtpOrbitHandle } from '@/components/otp-orbit';
import { ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { useOtpFeedback } from '@/hooks/use-otp-feedback';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/registerbox-api';

export default function OtpScreen() {
  const { email, refreshAccount } = useApp();
  const feedback = useOtpFeedback();
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(20);
  const [phase, setPhase] = useState<'entry' | 'checking' | 'verified'>('entry');
  const [resending, setResending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<TextInput>(null);
  const orbit = useRef<OtpOrbitHandle>(null);
  const mounted = useRef(true);
  const requestActive = useRef(false);
  const busy = phase !== 'entry';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (phase === 'entry' && !resending) input.current?.focus();
  }, [phase, resending]);

  async function verify(code: string) {
    if (requestActive.current || code.length !== 6) return;
    requestActive.current = true;
    setPhase('checking');
    setError('');
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility('Checking your code.');
    const motion = orbit.current?.begin();
    try {
      const auth = await verifyEmailOtp(email, code);
      if (!mounted.current) return;
      await refreshAccount(auth.session);
      if (!mounted.current) return;
      const finished = await motion;
      if (!mounted.current || finished === false) return;
      setPhase('verified');
      AccessibilityInfo.announceForAccessibility('Email verified. Signing you in.');
      const settled = await orbit.current?.succeed(() => {
        if (mounted.current) feedback.success();
      });
      if (mounted.current && settled !== false) router.replace('/(tabs)');
    } catch (cause) {
      if (!mounted.current) return;
      orbit.current?.reset();
      const message = cause instanceof Error ? cause.message : 'That code did not work. Try again.';
      setError(message);
      setOtp('');
      setPhase('entry');
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      requestActive.current = false;
    }
  }

  async function resend() {
    if (requestActive.current || seconds > 0 || busy) return;
    requestActive.current = true;
    setResending(true);
    setError('');
    setOtp('');
    orbit.current?.reset();
    try {
      await sendEmailOtp(email);
      if (!mounted.current) return;
      setSeconds(20);
      input.current?.focus();
      AccessibilityInfo.announceForAccessibility('A new code has been sent.');
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'We could not resend the code.');
    } finally {
      requestActive.current = false;
      if (mounted.current) setResending(false);
    }
  }

  function changeCode(value: string) {
    if (requestActive.current || busy) return;
    const code = value.replace(/\D/g, '').slice(0, 6);
    // One tap for pasted/autofilled codes; no buzz for deletion or rejected text.
    if (code.length > otp.length) feedback.digit();
    setOtp(code);
    setError('');
    if (code.length === 6) void verify(code);
  }

  return (
    <Screen>
      <PageHeader title="Enter OTP" subtitle={`We sent a 6-digit code to ${email || 'your email'}.`} back={() => router.back()} />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>EMAIL VERIFICATION</Text>
        <View style={styles.inputStage}>
          <OtpOrbit ref={orbit} value={otp} focused={focused} invalid={!!error} busy={busy || resending} />
          <TextInput
            ref={input}
            accessibilityLabel="Six digit email verification code"
            accessibilityHint="Verification starts automatically when all six digits are entered."
            accessibilityState={{ disabled: busy || resending, busy }}
            autoFocus keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
            autoCorrect={false} caretHidden editable={!busy && !resending} value={otp}
            onChangeText={changeCode} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            selectionColor="transparent" style={styles.input}
          />
        </View>
        <Text style={[styles.status, phase === 'verified' && styles.success]}>
          {phase === 'verified' ? 'Verified. You’re in.' : phase === 'checking' ? 'Checking your code…' : error ? 'Let’s try that again.' : 'Six digits. One secure sign-in.'}
        </Text>
        <Text style={styles.helper}>{phase === 'verified' ? 'Opening your RegisterBox workspace.' : phase === 'checking' ? 'This usually takes a moment.' : 'Enter the last digit to continue automatically.'}</Text>
      </View>
      <View style={styles.feedback}><ErrorBanner message={error} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={seconds > 0 ? `Resend code available in ${seconds} seconds` : 'Resend code'}
        disabled={seconds > 0 || busy || resending} onPress={resend}
        style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}>
        <Text style={styles.resend}>{resending ? 'Sending a new code…' : seconds > 0 ? `Resend code in 00:${String(seconds).padStart(2, '0')}` : 'Didn’t get it? Resend code'}</Text>
      </Pressable>
      <Text style={styles.notice}>Your sign-in code is separate from the OTP used for GST filing.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 18, paddingTop: 24, paddingBottom: 26, paddingHorizontal: 10, borderRadius: 24, backgroundColor: '#F5F5F6', borderWidth: 1, borderColor: '#E5E6E8', alignItems: 'center' },
  eyebrow: { color: '#737982', fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  inputStage: { width: '100%', position: 'relative' },
  input: { position: 'absolute', left: 0, right: 0, top: 84, height: 56, color: 'transparent', backgroundColor: 'transparent', fontSize: 24, opacity: 0.02 },
  status: { color: '#252A32', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  success: { color: '#008653' },
  helper: { color: '#737982', fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  feedback: { marginTop: 16 },
  resendButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  resend: { color: '#626973', textAlign: 'center', fontSize: 13, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  notice: { color: '#737982', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 22, marginTop: 20 },
});
