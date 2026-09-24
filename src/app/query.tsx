import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

export default function QueryScreen() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Screen footer={<Button title={submitted ? 'Done' : 'Submit to FSSAI'} onPress={() => submitted ? router.back() : setSubmitted(true)} />}>
      <PageHeader title={submitted ? 'Response submitted' : 'Action Required'} subtitle="FSSAI has requested an additional document." back={() => router.back()} />
      {submitted ? <Card><Text style={styles.success}>✓ We sent the response for review</Text><Text style={styles.copy}>Your application timeline has been updated. We’ll notify you if the department needs anything else.</Text></Card> : <>
        <Card><Text style={styles.label}>Query Details</Text><Text selectable style={styles.copy}>Kindly upload a clearer address proof of the food premises.</Text></Card>
        <Card style={styles.found}><Text style={styles.foundTitle}>▤  We found a relevant document</Text><Text selectable style={styles.doc}>Electricity Bill (BESCOM)</Text><Button title="Use this" variant="dark" onPress={() => {}} /></Card>
        <Text style={styles.or}>Or upload a new document</Text>
        <Button title="↥  Upload Document" variant="secondary" onPress={() => {}} />
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({ label: { color: palette.ink, fontSize: 12, fontWeight: '900' }, copy: { color: palette.muted, fontSize: 12, lineHeight: 19 }, found: { backgroundColor: palette.greenBg, borderColor: '#C5ECDD' }, foundTitle: { color: palette.green, fontSize: 12, fontWeight: '900' }, doc: { color: palette.ink, fontSize: 12, fontWeight: '700' }, or: { color: palette.muted, fontSize: 11, textAlign: 'center' }, success: { color: palette.green, fontWeight: '900', fontSize: 16 } });
