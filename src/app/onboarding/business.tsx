import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function BusinessDetailsScreen() {
  const { business } = useApp();
  const rows = [
    ['PAN', business.pan],
    ['GSTIN', business.gstin],
    ['Entity', business.entityType || 'To be confirmed'],
    ['Taxpayer type', business.taxpayerType || '—'],
    ['Status', business.registrationStatus || 'Verified'],
    ['Location', [business.city, business.state].filter(Boolean).join(', ') || 'To be confirmed'],
  ].filter(([, value]) => value && !String(value).startsWith('DEMO-'));
  return (
    <Screen footer={<Button title="Looks Correct" icon="→" onPress={() => router.push('/onboarding/questions')} />}>
      <PageHeader title="We found your business!" subtitle="Please confirm the details below." back={() => router.back()} />
      <Card>
        <View style={styles.business}><View style={styles.avatar}><Text style={{ fontSize: 23 }}>♠</Text></View><View style={{ flex: 1 }}><Text selectable style={styles.name}>{business.tradeName || business.legalName}</Text><Text style={styles.type}>{business.legalName}</Text></View></View>
        <View style={styles.divider} />
        {rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>)}
      </Card>
      <Button title="Edit Details" variant="ghost" onPress={() => router.back()} />
      <View style={styles.source}><Text style={styles.sourceTitle}>✓ Source traceability</Text><Text style={styles.sourceText}>{business.verifiedAt ? `Verified against government registry data via Sandbox.co.in on ${new Date(business.verifiedAt).toLocaleString()}. You can correct any field before continuing.` : 'These values have not yet been verified against a trusted source.'}</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  business: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.navy, alignItems: 'center', justifyContent: 'center' },
  name: { color: palette.ink, fontSize: 18, fontWeight: '900' }, type: { color: palette.muted, fontSize: 11, paddingTop: 3 }, divider: { height: 1, backgroundColor: palette.line },
  row: { flexDirection: 'row', gap: 12 }, label: { width: 98, color: palette.muted, fontSize: 11 }, value: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '700' },
  source: { marginTop: 12, backgroundColor: palette.sky, borderRadius: 12, padding: 14, gap: 5 }, sourceTitle: { color: palette.blue, fontWeight: '800', fontSize: 12 }, sourceText: { color: palette.muted, fontSize: 11, lineHeight: 16 },
});
