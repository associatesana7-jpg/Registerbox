import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';

const settings = ['Regulatory updates', 'Renewal reminders', 'Turnover-based alerts', 'New compliance detection', 'Notice monitoring'];

export default function AccountScreen() {
  const { business, demoMode } = useApp();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(settings.map((item) => [item, true])));
  return (
    <Screen>
      <PageHeader title="We’ve got you covered" subtitle="RegisterBox monitors new compliance requirements and important updates." />
      <Card><Text selectable style={styles.business}>{business.legalName}</Text><Text style={styles.type}>Proprietorship • Bengaluru</Text></Card>
      <View style={styles.stack}>{settings.map((item, index) => <View key={item} style={styles.row}><Text style={styles.icon}>{['♧', '◫', '▥', '◉', '♢'][index]}</Text><Text selectable style={styles.label}>{item}</Text><Switch value={enabled[item]} onValueChange={(value) => setEnabled((current) => ({ ...current, [item]: value }))} trackColor={{ false: '#D9E1EE', true: palette.blue }} /></View>)}</View>
      <Card><Text style={styles.promise}>Your business. Our Autopilot. Always.</Text><Text selectable style={styles.copy}>Actions requiring OTP, eSign, DSC, consent or legal approval will always come back to you.</Text></Card>
      {!demoMode && <Text onPress={() => supabase.auth.signOut()} style={styles.signOut}>Sign out</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({ business: { color: palette.ink, fontSize: 17, fontWeight: '900' }, type: { color: palette.muted, fontSize: 11 }, stack: { gap: 2, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 16, overflow: 'hidden' }, row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#EFF3F9' }, icon: { width: 24, color: palette.blue, fontSize: 18 }, label: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '700' }, promise: { color: palette.blue, fontWeight: '900', textAlign: 'center' }, copy: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' }, signOut: { color: palette.red, fontWeight: '800', textAlign: 'center', padding: 18 } });
