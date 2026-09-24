import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function ReviewScreen() {
  const { compliances } = useApp();
  const selected = compliances.filter((item) => item.status !== 'OPTIONAL');
  return (
    <Screen footer={<Button title="Proceed to Documents" icon="→" onPress={() => router.push('/onboarding/documents')} />}>
      <PageHeader title="Review Your Plan" subtitle="Selected compliances and transparent pricing." back={() => router.back()} />
      <Card>{selected.map((item) => <View key={item.id} style={styles.item}><Text style={styles.check}>✓</Text><Text selectable style={styles.name}>{item.name}</Text><Text selectable style={styles.price}>₹{item.fee.toLocaleString('en-IN')}</Text></View>)}<View style={styles.total}><Text style={styles.totalLabel}>Bundle total (inclusive of GST)</Text><Text style={styles.totalValue}>₹4,999</Text></View></Card>
      <Card><Text selectable style={styles.featuresTitle}>What RegisterBox handles</Text>{['End-to-end filing', 'Document preparation', 'Government fee guidance', 'Application tracking', 'Query handling', '1 year compliance monitoring'].map((item) => <Text key={item} style={styles.feature}>✓  {item}</Text>)}</Card>
      <Text style={styles.note}>Government fees, where applicable, are shown before payment and may vary by authority.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 9 }, check: { color: palette.green, fontWeight: '900' }, name: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '700' }, price: { color: palette.ink, fontSize: 11, fontWeight: '700' }, total: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }, totalLabel: { color: palette.ink, fontSize: 12, fontWeight: '800' }, totalValue: { color: palette.ink, fontWeight: '900', fontSize: 17 }, featuresTitle: { color: palette.ink, fontWeight: '900', fontSize: 14 }, feature: { color: palette.green, fontSize: 11, fontWeight: '700' }, note: { color: palette.muted, fontSize: 10, lineHeight: 15, paddingHorizontal: 8 },
});
