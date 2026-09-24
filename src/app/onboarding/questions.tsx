import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/flow-parts';
import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function QuestionsScreen() {
  const { business, updateBusiness } = useApp();
  return (
    <Screen footer={<Button title="Continue" icon="→" onPress={() => router.push('/onboarding/analyzing')} />}>
      <PageHeader title="A few quick questions" subtitle="This helps us find the exact licences for your business." back={() => router.back()} />
      <View style={styles.stack}>
        <Question label="Do customers dine at this location?"><Segmented options={['Yes', 'No']} selected={business.dineIn ? 'Yes' : 'No'} onSelect={(v) => updateBusiness({ dineIn: v === 'Yes' })} /></Question>
        <Question label="Do you sell alcohol?"><Segmented options={['Yes', 'No']} selected={business.alcohol ? 'Yes' : 'No'} onSelect={(v) => updateBusiness({ alcohol: v === 'Yes' })} /></Question>
        <Question label="Number of employees"><View style={styles.counter}><Text onPress={() => updateBusiness({ employees: Math.max(0, business.employees - 1) })} style={styles.control}>−</Text><Text selectable style={styles.number}>{business.employees}</Text><Text onPress={() => updateBusiness({ employees: business.employees + 1 })} style={styles.control}>＋</Text></View></Question>
        <Question label="Estimated annual turnover"><Segmented options={['< ₹20L', '₹20–50L', '> ₹50L']} selected={business.turnover === 4000000 ? '₹20–50L' : business.turnover < 2000000 ? '< ₹20L' : '> ₹50L'} onSelect={(v) => updateBusiness({ turnover: v === '< ₹20L' ? 1500000 : v === '₹20–50L' ? 4000000 : 7500000 })} /></Question>
        <Card><Text style={styles.saved}>✓ These answers are saved to your Business Profile and reused across services.</Text></Card>
      </View>
    </Screen>
  );
}

function Question({ label, children }: PropsWithChildren<{ label: string }>) { return <View style={{ gap: 8 }}><Text selectable style={styles.label}>{label}</Text>{children}</View>; }

const styles = StyleSheet.create({
  stack: { gap: 22 }, label: { color: palette.ink, fontSize: 13, fontWeight: '800' }, counter: { flexDirection: 'row', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: 'hidden' },
  control: { width: 62, paddingVertical: 15, color: palette.blue, textAlign: 'center', fontSize: 20, fontWeight: '800' }, number: { flex: 1, paddingVertical: 16, textAlign: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.line, color: palette.ink, fontWeight: '900', fontVariant: ['tabular-nums'] }, saved: { color: palette.green, fontSize: 11, lineHeight: 17, fontWeight: '700' },
});
