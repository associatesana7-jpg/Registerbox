import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { DocumentCelebration } from '@/components/illustrations';
import { Button, Card, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

export default function CertificateScreen() {
  return (
    <Screen footer={<Button title="Done" onPress={() => router.back()} />}>
      <DocumentCelebration />
      <Text selectable style={styles.title}>🎉 Congratulations!</Text>
      <Text selectable style={styles.sub}>Your FSSAI Licence has been approved.</Text>
      <Card><Text style={styles.licence}>▤  FSSAI Licence</Text><Text selectable style={styles.detail}>Issued on 15 Sep 2024</Text><Text selectable style={styles.detail}>Licence No: 1122S44S566</Text><Button title="Download Certificate" onPress={() => {}} /><Button title="Share Certificate" variant="secondary" onPress={() => {}} /></Card>
      <Button title="View Details" variant="ghost" onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { textAlign: 'center', color: palette.ink, fontSize: 24, fontWeight: '900' }, sub: { textAlign: 'center', color: palette.ink, fontSize: 15, lineHeight: 22, fontWeight: '700', paddingBottom: 14 }, licence: { color: palette.green, fontWeight: '900', fontSize: 14 }, detail: { color: palette.muted, fontSize: 11 } });
