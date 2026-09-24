import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { classifyBusinessIntent } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';

const examples = ['Start a cloud kitchen in Bengaluru', 'Register a private limited company', 'Open another branch for my existing business', 'Check what registrations my online store needs'];

type BusinessOption = { id: string; legal_name: string | null; trade_name: string | null };

export default function IntentScreen() {
  const { setOnboarding } = useApp();
  const [message, setMessage] = useState('');
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('business_profiles').select('id,legal_name,trade_name').is('deleted_at', null).order('updated_at', { ascending: false }).then(({ data }) => setBusinesses(data ?? []));
  }, []);

  async function continueFlow(value = message) {
    if (value.trim().length < 3) return setError('Tell us what you want to start, change, or check.');
    setLoading(true); setError('');
    try {
      const result = await classifyBusinessIntent(value.trim(), selectedBusinessId);
      setOnboarding(result);
      router.push({ pathname: '/onboarding/dynamic', params: { sessionId: result.sessionId, intentId: result.intentId } } as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not start onboarding.');
    } finally { setLoading(false); }
  }

  return (
    <Screen footer={<Button title="Build my compliance path" icon="→" loading={loading} onPress={() => continueFlow()} />}>
      <PageHeader title="What are you planning?" subtitle="Describe it naturally. RegisterBox will build the shortest verified path for your business." back={() => router.back()} />
      <Card style={styles.hero}>
        <Badge label="AI-GUIDED ONBOARDING" />
        <Text selectable style={styles.title}>Start with your goal, not a form.</Text>
        <TextInput multiline value={message} onChangeText={setMessage} maxLength={1500} placeholder="Example: I want to start a cloud kitchen in Bengaluru and sell through delivery apps." placeholderTextColor="#8A98B5" style={styles.input} />
        <Text style={styles.count}>{message.length}/1500</Text>
      </Card>
      {businesses.length > 0 && <View style={styles.section}>
        <Text style={styles.label}>Is this for an existing business? (optional)</Text>
        <Pressable onPress={() => setSelectedBusinessId(undefined)} style={[styles.business, !selectedBusinessId && styles.selected]}><Text style={styles.businessName}>＋ A new business</Text></Pressable>
        {businesses.map((item) => <Pressable key={item.id} onPress={() => setSelectedBusinessId(item.id)} style={[styles.business, selectedBusinessId === item.id && styles.selected]}><Text style={styles.businessName}>{item.trade_name || item.legal_name || 'Unnamed business'}</Text><Text style={styles.businessHint}>Use saved facts and documents</Text></Pressable>)}
      </View>}
      <View style={styles.section}><Text style={styles.label}>Try an example</Text>{examples.map((example) => <Pressable key={example} onPress={() => setMessage(example)} style={styles.example}><Text style={styles.spark}>✦</Text><Text style={styles.exampleText}>{example}</Text></Pressable>)}</View>
      <ErrorBanner message={error} />
      <Text style={styles.disclaimer}>AI identifies the workflow and missing facts. Verified rules and registry data determine the final compliance plan.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#F7FAFF' }, title: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: '900' },
  input: { minHeight: 132, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, borderRadius: 14, padding: 14, color: palette.ink, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' }, count: { color: palette.muted, fontSize: 10, textAlign: 'right' },
  section: { gap: 9 }, label: { color: palette.ink, fontWeight: '800', fontSize: 13 }, business: { borderWidth: 1, borderColor: palette.line, borderRadius: 12, backgroundColor: palette.white, padding: 13 }, selected: { borderColor: palette.blue, backgroundColor: palette.sky }, businessName: { color: palette.ink, fontWeight: '800', fontSize: 13 }, businessHint: { color: palette.muted, fontSize: 10, paddingTop: 3 },
  example: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 13 }, spark: { color: palette.blue }, exampleText: { flex: 1, color: palette.muted, fontWeight: '700', fontSize: 12 }, disclaimer: { color: palette.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
