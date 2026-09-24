import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BotIllustration } from '@/components/illustrations';
import { Button, Screen, StepDot } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

const steps = [['Payment confirmed', 'done'], ['Documents verified', 'done'], ['Applications being prepared (60%)', 'active'], ['Filing with government portals', 'todo'], ['Tracking & updates', 'todo'], ['Certificates delivered', 'todo']] as const;

export default function AutopilotScreen() {
  return (
    <Screen footer={<Button title="View Live Status" onPress={() => router.replace('/(tabs)')} />}>
      <BotIllustration rocket />
      <Text selectable style={styles.title}>RegisterBox Autopilot{`\n`}is now active!</Text>
      <Text selectable style={styles.sub}>We’re setting up your business compliances. Sit back, we’ll handle the rest.</Text>
      <View style={styles.timeline}>
        {steps.map(([label, state], index) => (
          <View key={label} style={styles.step}>
            {index < steps.length - 1 ? <View style={styles.connector} /> : null}
            <StepDot state={state} />
            <Text style={[styles.label, state === 'active' && styles.active]}>{label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: palette.ink, textAlign: 'center', fontSize: 23, lineHeight: 29, fontWeight: '900' }, sub: { color: palette.muted, textAlign: 'center', fontSize: 13, lineHeight: 20, paddingHorizontal: 20, paddingBottom: 12 }, timeline: { paddingHorizontal: 18, gap: 0 }, step: { minHeight: 50, flexDirection: 'row', alignItems: 'flex-start', gap: 12, position: 'relative' }, connector: { position: 'absolute', left: 9, top: 19, width: 2, height: 32, backgroundColor: palette.line }, label: { color: palette.muted, fontSize: 12, fontWeight: '700', paddingTop: 1 }, active: { color: palette.blue, fontWeight: '900' },
});
