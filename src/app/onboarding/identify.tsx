import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented, flowStyles } from '@/components/flow-parts';
import { Button, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

export default function IdentifyBusinessScreen() {
  const { business, updateBusiness } = useApp();
  const [identifier, setIdentifier] = useState('PAN');
  const [value, setValue] = useState(business.pan);
  return (
    <Screen footer={<Button title="Continue" icon="→" onPress={() => { if (identifier === 'PAN') updateBusiness({ pan: value.toUpperCase() }); if (identifier === 'GSTIN') updateBusiness({ gstin: value.toUpperCase() }); router.push('/onboarding/business'); }} />}>
      <PageHeader title="Let’s find your business" subtitle="Enter any of the following. We’ll auto-fetch your details, then ask you to confirm them." back={() => router.back()} />
      <View style={flowStyles.stack}>
        <Segmented options={['PAN', 'GSTIN', 'CIN']} selected={identifier} onSelect={setIdentifier} />
        <Field placeholder={`Enter ${identifier}`} autoCapitalize="characters" value={value} onChangeText={setValue} />
        <Text style={styles.or}>Or scan your PAN card</Text>
        <Button title="▣  Scan PAN" variant="secondary" onPress={() => setValue('DEMO-PAN')} />
        <View style={styles.aiBox}><Text style={styles.aiTitle}>✦ Tell RegisterBox instead</Text><Text style={styles.aiText}>“I run a cloud kitchen in Marathahalli and sell through Swiggy.”</Text></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  or: { color: palette.muted, fontSize: 12, textAlign: 'center', paddingVertical: 4 },
  aiBox: { backgroundColor: palette.sky, borderRadius: 14, padding: 16, gap: 8, marginTop: 14 },
  aiTitle: { color: palette.blue, fontWeight: '800', fontSize: 13 },
  aiText: { color: palette.muted, fontSize: 12, lineHeight: 18 },
});
