import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Metric } from '@/components/flow-parts';
import { Brand, Button, Card, Screen, SectionTitle } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function DashboardScreen() {
  const { business } = useApp();
  return (
    <Screen padded={false}>
      <LinearGradient colors={['#08265C', '#0A3D7E']} style={styles.header}>
        <View style={styles.top}><Brand light compact /><Text style={styles.bell}>♧</Text></View>
        <Text selectable style={styles.greeting}>Good Afternoon,{`\n`}{business.ownerName.split(' ')[0]}! 👋</Text>
        <Text style={styles.business}>▣  {business.legalName} ⌄</Text>
      </LinearGradient>
      <View style={styles.body}>
        <Card style={styles.healthCard}>
          <Text style={styles.healthy}>Your business is healthy</Text>
          <View style={styles.scoreRow}><View style={styles.ring}><Text style={styles.score}>8/9</Text><Text style={styles.scoreLabel}>Complete</Text></View><View style={{ flex: 1, gap: 8 }}><Text style={styles.healthCopy}>RegisterBox has handled most of your compliance plan.</Text><View style={styles.progress}><View style={styles.progressFill} /></View></View></View>
        </Card>
        <View style={styles.metrics}><Metric value="3" label="Active Licences" tone="green" /><Metric value="1" label="Action Required" tone="amber" /></View>
        <View style={styles.metrics}><Metric value="0" label="Expiring Soon" tone="amber" /><Metric value="2" label="In Progress" /></View>
        <SectionTitle action="View all">Action required</SectionTitle>
        <Card><View style={styles.actionRow}><View style={styles.actionIcon}><Text>!</Text></View><View style={{ flex: 1 }}><Text selectable style={styles.actionTitle}>FSSAI needs one more document</Text><Text selectable style={styles.actionCopy}>Upload a clearer address proof for the premises.</Text></View></View><Button title="Resolve now" variant="secondary" onPress={() => router.push('/query')} /></Card>
        <Button title="✦  Ask RegisterBox AI" onPress={() => router.push('/(tabs)/ai')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 74, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, bell: { color: palette.white, fontSize: 23 }, greeting: { color: palette.white, fontSize: 25, lineHeight: 31, fontWeight: '900', paddingTop: 28 }, business: { color: '#C6D9FF', fontSize: 12, fontWeight: '700', paddingTop: 12 },
  body: { paddingHorizontal: 20, marginTop: -48, gap: 14, paddingBottom: 30 }, healthCard: { padding: 20 }, healthy: { color: palette.green, fontWeight: '900', textAlign: 'center', fontSize: 15 }, scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18 }, ring: { width: 100, height: 100, borderRadius: 50, borderWidth: 9, borderColor: palette.green, alignItems: 'center', justifyContent: 'center' }, score: { color: palette.ink, fontSize: 22, fontWeight: '900' }, scoreLabel: { color: palette.muted, fontSize: 9 }, healthCopy: { color: palette.muted, fontSize: 11, lineHeight: 17 }, progress: { height: 7, borderRadius: 5, backgroundColor: palette.line, overflow: 'hidden' }, progressFill: { height: '100%', width: '89%', backgroundColor: palette.green }, metrics: { flexDirection: 'row', gap: 10 }, actionRow: { flexDirection: 'row', gap: 10 }, actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.amberBg, alignItems: 'center', justifyContent: 'center' }, actionTitle: { color: palette.ink, fontSize: 12, fontWeight: '900' }, actionCopy: { color: palette.muted, fontSize: 10, lineHeight: 15, paddingTop: 4 },
});
