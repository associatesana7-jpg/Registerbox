import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ComplianceCard } from '@/components/flow-parts';
import { ScreenTitle, SoftNotice, StatTile } from '@/components/experience';
import { Button, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function ReportScreen() {
  const { compliances } = useApp();
  return (
    <Screen footer={<Button title="Back to my business" onPress={() => router.replace('/(tabs)')} />}>
      <ScreenTitle overline="PERSONALIZED PLAN" title="Your compliance plan" subtitle="Based on your saved business details and the rules we could check." />
      <View style={{flexDirection:'row',gap:10}}><StatTile label="Items identified" value={String(compliances.length)} /><StatTile label="Status" value="Review" tone="amber" /></View>
      <SoftNotice title="Your plan needs your review" detail="A recommendation is not a licence, application or legal determination. Check each item's evidence and applicability before acting." />
      <View style={styles.stack}>{compliances.map((item) => <ComplianceCard key={item.id} item={item} compact />)}</View>
      {!compliances.length && <Text>No matching rules were found. This does not mean your business has no compliance obligations. Add your activity and location or request a review.</Text>}
      <Text style={styles.disclaimer}>Recommendations are based on the information provided. “Check Required” items need one more detail or expert verification.</Text>
      <Button title="Update business details" variant="ghost" onPress={() => router.push('/onboarding/intent')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 }, disclaimer: { color: palette.muted, fontSize: 10, lineHeight: 15, padding: 8 },
});
