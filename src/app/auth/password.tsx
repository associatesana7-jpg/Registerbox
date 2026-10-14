import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ErrorBanner, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { signInWithAccountPassword } from '@/lib/password-sign-in';
import { safeNext } from '@/components/website/content';

export default function PasswordSignIn() {
  const { next: requested } = useLocalSearchParams<{ next?: string }>();
  const next = requested ? safeNext(requested) : '/(tabs)';
  const emailSignIn = { pathname: '/auth', params: { next } } as const;
  const { session, loadingSession, refreshAccount, setDemoMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  if (session && !loadingSession) return <Redirect href={next as Href} />;
  async function submit() {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      const signedIn = await signInWithAccountPassword(email, password);
      setPassword(''); setDemoMode(false);
      await refreshAccount(signedIn);
      router.replace(next as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.');
    } finally { running.current = false; setBusy(false); }
  }
  return <Screen>
    <PageHeader title="Sign in with password" subtitle="Use an existing account with a password. Your email-code sign-in is still available." back={() => router.replace(emailSignIn)} />
    <Card>
      <Field label="Account email" accessibilityLabel="Account email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} editable={!busy}/>
      <Field label="Account password" accessibilityLabel="Account password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" autoCapitalize="none" autoCorrect={false} editable={!busy} onSubmitEditing={() => void submit()}/>
      <ErrorBanner message={error}/>
      <Button title="Sign in" loading={busy} disabled={!email.trim() || !password || loadingSession} onPress={() => void submit()}/>
      <Button title="Use email code instead" variant="ghost" disabled={busy} onPress={() => router.replace(emailSignIn)}/>
    </Card>
    <Text>This uses your normal RegisterBox account permissions. It does not bypass government-portal consent or GST authorization.</Text>
  </Screen>;
}
