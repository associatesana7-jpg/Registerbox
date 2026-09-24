import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/flow-parts';
import { Badge, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { applicationRows } from '@/data/demo';
import { palette } from '@/constants/design';

export default function ComplianceScreen() {
  const [tab, setTab] = useState('All (5)');
  return (
    <Screen>
      <PageHeader title="Application Tracker" subtitle="Track each application from preparation to certificate." />
      <Segmented options={['All (5)', 'In Progress (2)', 'Completed (1)']} selected={tab} onSelect={setTab} />
      <View style={styles.stack}>{applicationRows.filter((row) => tab.startsWith('All') || row.status === (tab.startsWith('Completed') ? 'Completed' : 'In Progress')).map((row) => <Pressable key={row.name} onPress={() => row.name.startsWith('FSSAI') && router.push('/query')}><Card style={{ padding: 13 }}><View style={styles.row}><View style={styles.icon}><Text>{row.icon}</Text></View><View style={{ flex: 1 }}><Text selectable style={styles.name}>{row.name}</Text><Text selectable style={styles.detail}>{row.detail}</Text></View><Badge label={row.status} tone={row.tone as 'blue' | 'green' | 'red' | 'amber'} /></View></Card></Pressable>)}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10, paddingTop: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 32, height: 32, borderRadius: 8, backgroundColor: palette.sky, alignItems: 'center', justifyContent: 'center' }, name: { color: palette.ink, fontSize: 12, fontWeight: '900' }, detail: { color: palette.muted, fontSize: 9, paddingTop: 4 } });
