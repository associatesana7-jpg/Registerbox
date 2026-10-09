import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { runComplianceScan } from '@/lib/registerbox-api';

export default function AnalyzingScreen() {
  const { business, setCompliances } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const scan = useCallback(async () => {
    if (busy.current) return;
    if (!business.id) { setError('Complete your business profile before running a scan.'); return; }
    busy.current = true; setLoading(true); setError('');
    try {
      setCompliances(await runComplianceScan(business.id));
      router.replace('/onboarding/report');
    } catch (cause) { setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Could not complete the scan. Please retry.'); }
    finally { busy.current = false; setLoading(false); }
  }, [business.id, setCompliances]);
  useEffect(() => { const timer = setTimeout(() => { void scan(); }, 0); return () => clearTimeout(timer); }, [scan]);
  return <Screen>
    <PageHeader title="Checking your business" subtitle="Matching your saved business details against available compliance rules." />
    {loading ? <Text>Checking…</Text> : null}
    <ErrorBanner message={error} />
    {error ? <><Button title="Retry scan" onPress={scan} /><Button title="Update business details" variant="secondary" onPress={() => router.replace('/onboarding/intent')} /></> : null}
  </Screen>;
}
