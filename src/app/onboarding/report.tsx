import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ComplianceCard, flowStyles } from '@/components/flow-parts';
import { Button, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function ReportScreen() {
  const { compliances } = useApp();
  return (
    <Screen footer={<Button title="Apply for Recommended Plan" onPress={() => router.push('/onboarding/review')} />}>
      <Text selectable style={flowStyles.title}>Your Compliance Report</Text>
      <Text selectable style={flowStyles.body}>Based on your business details, here’s what our verified rules found.</Text>
      <View style={styles.count}><Text style={styles.countNumber}>{compliances.length}</Text><Text style={styles.countLabel}> compliances identified</Text></View>
      <View style={styles.stack}>{compliances.map((item) => <ComplianceCard key={item.id} item={item} compact />)}</View>
      <Text style={styles.disclaimer}>Recommendations are based on the information provided. “Check Required” items need one more detail or expert verification.</Text>
      <Button title="View Details" variant="ghost" onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 8 }, countNumber: { color: palette.blue, fontSize: 28, fontWeight: '900' }, countLabel: { color: palette.muted, fontSize: 13 }, stack: { gap: 10 }, disclaimer: { color: palette.muted, fontSize: 10, lineHeight: 15, padding: 8 },
});
