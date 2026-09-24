import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { chooseAndUploadDocument } from '@/lib/registerbox-api';

const initial = [
  { icon: '▣', name: 'PAN Card', action: 'Auto-fetched', done: true },
  { icon: '▤', name: 'Aadhaar (for eSign)', action: 'Fetch from DigiLocker', done: false },
  { icon: '▥', name: 'Address Proof', action: 'Upload / Fetch', done: false },
  { icon: '▧', name: 'Rent Agreement', action: 'Upload', done: false },
  { icon: '◉', name: 'Photo', action: 'Upload', done: false },
  { icon: '▦', name: 'Premises Layout Plan', action: 'Upload', done: false },
];

export default function DocumentsScreen() {
  const { business, demoMode } = useApp();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  async function upload(index: number) {
    try {
      setError(''); setLoading(items[index].name);
      if (!demoMode) {
        if (!business.id) throw new Error('Your business profile must be saved before uploading.');
        const result = await chooseAndUploadDocument(business.id, items[index].name.toUpperCase().replace(/\s+/g, '_'));
        if (!result) return;
      }
      setItems((current) => current.map((item, i) => i === index ? { ...item, done: true, action: 'Uploaded' } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The document could not be uploaded.'); }
    finally { setLoading(''); }
  }
  return (
    <Screen footer={<Button title="Continue" icon="→" onPress={() => router.push('/onboarding/payment')} />}>
      <PageHeader title="Let’s collect your documents" subtitle="We’ll reuse what’s already available and ask only for missing items." back={() => router.back()} />
      <ErrorBanner message={error} />
      <View style={styles.stack}>{items.map((item, index) => <Card key={item.name} style={{ padding: 13 }}><View style={styles.row}><View style={styles.icon}><Text>{item.icon}</Text></View><Text selectable style={styles.name}>{item.name}</Text>{item.done ? <Text style={styles.done}>{item.action} ✓</Text> : <View style={{ minWidth: 116 }}><Button title={loading === item.name ? 'Uploading…' : item.action} variant="ghost" onPress={() => upload(index)} /></View>}</View></Card>)}</View>
      <View style={styles.security}><Text style={styles.securityText}>🔒 Private storage • Signed access • Files are scoped to your account</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 9 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 30, height: 30, borderRadius: 8, backgroundColor: palette.sky, alignItems: 'center', justifyContent: 'center' }, name: { flex: 1, color: palette.ink, fontWeight: '800', fontSize: 12 }, done: { color: palette.green, fontSize: 10, fontWeight: '800' }, security: { alignItems: 'center', paddingVertical: 10 }, securityText: { color: palette.muted, fontSize: 10 },
});
