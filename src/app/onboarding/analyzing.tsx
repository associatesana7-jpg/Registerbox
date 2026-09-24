import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotIllustration } from '@/components/illustrations';
import { Button, ErrorBanner, Screen, StepDot } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { runComplianceScan, saveBusiness } from '@/lib/registerbox-api';

const steps = ['Identifying business activity', 'Checking state & city rules', 'Evaluating licence requirements', 'Preparing your compliance plan'];

export default function AnalyzingScreen() {
  const { business, updateBusiness, demoMode, setCompliances } = useApp();
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setInterval(() => setActive((value) => Math.min(3, value + 1)), 700);
    async function analyse() {
      try {
        if (!demoMode) {
          const businessId = business.id ?? await saveBusiness(business);
          updateBusiness({ id: businessId });
          setCompliances(await runComplianceScan(businessId));
        }
        setDone(true);
        setTimeout(() => router.replace('/onboarding/report'), 500);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not complete the scan.'); }
    }
    const work = setTimeout(analyse, 2700);
    return () => { clearInterval(timer); clearTimeout(work); };
  }, [business, demoMode, setCompliances, updateBusiness]);

  return (
    <Screen>
      <BotIllustration />
      <Text selectable style={styles.title}>Analysing your business...</Text>
      <Text selectable style={styles.sub}>Our rules engine is checking verified compliance rules based on your business details.</Text>
      <View style={styles.steps}>{steps.map((step, index) => <View key={step} style={styles.step}><StepDot state={index < active || done ? 'done' : index === active ? 'active' : 'todo'} /><Text style={[styles.stepText, index <= active && { color: palette.ink }]}>{step}</Text>{index < active && <Text style={styles.tick}>✓</Text>}</View>)}</View>
      <ErrorBanner message={error} />
      {error ? <Button title="View sample report" onPress={() => router.replace('/onboarding/report')} /> : null}
      <Text style={styles.wait}>This will just take a few seconds...</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: palette.ink, textAlign: 'center', fontWeight: '900', fontSize: 22 }, sub: { color: palette.muted, textAlign: 'center', lineHeight: 20, fontSize: 13, paddingHorizontal: 16, paddingBottom: 12 },
  steps: { gap: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 18 }, step: { flexDirection: 'row', alignItems: 'center', gap: 10 }, stepText: { flex: 1, color: '#9AA7BF', fontSize: 12, fontWeight: '700' }, tick: { color: palette.green, fontWeight: '900' }, wait: { color: palette.muted, fontSize: 11, textAlign: 'center', paddingTop: 24 },
});
