import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import type { ComplianceItem } from '@/data/demo';

export function Segmented({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.segmented}>{options.map((option) => <Text key={option} onPress={() => onSelect(option)} style={[styles.segment, selected === option && styles.segmentActive, selected === option && styles.segmentTextActive]}>{option}</Text>)}</View>;
}

export function ComplianceCard({ item, compact = false }: { item: ComplianceItem; compact?: boolean }) {
  const tone = item.status === 'REQUIRED' ? 'red' : item.status === 'CHECK_REQUIRED' ? 'amber' : item.status === 'RECOMMENDED' ? 'green' : 'gray';
  const label = item.status.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ');
  return <Card style={compact ? { padding: 12 } : undefined}><View style={styles.complianceRow}><View style={styles.iconBox}><Text>{item.icon}</Text></View><View style={{ flex: 1 }}><Text selectable style={styles.complianceName}>{item.name}</Text>{!compact && <Text selectable style={styles.reason}>{item.reason}</Text>}</View><Badge label={label} tone={tone} /></View>{!compact && <View style={styles.feeRow}><Text style={styles.feeLabel}>RegisterBox service fee</Text><Text style={styles.fee}>₹{item.fee.toLocaleString('en-IN')}</Text></View>}</Card>;
}

export function Metric({ value, label, tone = 'blue' }: { value: string; label: string; tone?: 'blue' | 'green' | 'amber' }) {
  const color = tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : palette.blue;
  return <View style={styles.metric}><Text selectable style={[styles.metricValue, { color }]}>{value}</Text><Text selectable style={styles.metricLabel}>{label}</Text></View>;
}

export const flowStyles = StyleSheet.create({
  stack: { gap: 12 },
  eyebrow: { color: palette.blue, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  title: { color: palette.ink, fontSize: 26, lineHeight: 32, fontWeight: '900', letterSpacing: -0.6 },
  body: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});

const styles = StyleSheet.create({
  segmented: { backgroundColor: '#EAF1FB', borderRadius: 11, padding: 3, flexDirection: 'row' },
  segment: { flex: 1, textAlign: 'center', paddingVertical: 10, borderRadius: 8, color: palette.muted, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  segmentActive: { backgroundColor: palette.blue },
  segmentTextActive: { color: palette.white },
  complianceRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.sky },
  complianceName: { color: palette.ink, fontWeight: '800', fontSize: 14 },
  reason: { color: palette.muted, fontSize: 11, lineHeight: 16, paddingTop: 4 },
  feeRow: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { color: palette.muted, fontSize: 11 },
  fee: { color: palette.ink, fontWeight: '800', fontSize: 12 },
  metric: { flex: 1, minHeight: 76, borderRadius: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', padding: 8 },
  metricValue: { fontSize: 19, fontWeight: '900' },
  metricLabel: { color: palette.muted, fontSize: 9, fontWeight: '700', textAlign: 'center', paddingTop: 4 },
});
