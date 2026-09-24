import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen, SectionTitle } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

const docs = [['PAN Card', 'Verified', 'green'], ['GST Certificate', 'Verified', 'green'], ['Rent Agreement', 'Review needed', 'amber'], ['FSSAI Certificate', 'Issued 15 Sep 2024', 'blue']] as const;

export default function DocumentsTab() {
  return (
    <Screen>
      <PageHeader title="Document Wallet" subtitle="Your reusable business documents and certificates." />
      <SectionTitle action="Upload">Business documents</SectionTitle>
      <View style={styles.stack}>{docs.map(([name, status, tone]) => <Card key={name} style={{ padding: 13 }}><View style={styles.row}><View style={styles.icon}><Text>▤</Text></View><View style={{ flex: 1 }}><Text selectable style={styles.name}>{name}</Text><Text style={[styles.status, { color: tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : palette.blue }]}>{status}</Text></View><Text style={styles.more}>•••</Text></View></Card>)}</View>
      <SectionTitle>Latest certificate</SectionTitle>
      <Card><Text style={styles.cert}>✓  FSSAI Licence approved</Text><Text selectable style={styles.certDetail}>Licence No: 1122S44S566</Text><Button title="View Certificate" variant="secondary" onPress={() => router.push('/certificate')} /></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 34, height: 34, borderRadius: 8, backgroundColor: palette.sky, alignItems: 'center', justifyContent: 'center' }, name: { color: palette.ink, fontWeight: '900', fontSize: 12 }, status: { fontSize: 10, paddingTop: 4, fontWeight: '700' }, more: { color: palette.muted }, cert: { color: palette.green, fontSize: 14, fontWeight: '900' }, certDetail: { color: palette.muted, fontSize: 11 } });
