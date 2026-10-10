import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { NavTile, ScreenTitle, SoftNotice } from '@/components/experience';
import { palette } from '@/constants/design';
import { Segmented } from '@/components/flow-parts';
import { Badge, Button, Card, ErrorBanner, Screen } from '@/components/registerbox-ui';
import { useBusinessRecords } from '@/hooks/use-business-records';

export default function ComplianceScreen() {
  const { data, loading, error, refresh } = useBusinessRecords();
  const [tab, setTab] = useState('All');
  const rows = data?.applications ?? [];
  return <Screen>
    <ScreenTitle overline="COMPLIANCE" title="Application Tracker" subtitle="Follow actual applications from preparation to decision. Recommendations do not count as submissions." />
    <NavTile icon="▤" title="GST returns" detail="Connect, prepare, compare, review and file when the live provider allows it" onPress={() => router.push('/gst-returns')} />
    <Segmented options={['All', 'In progress', 'Approved']} selected={tab} onSelect={setTab} />
    <ErrorBanner message={error} />
    {loading ? <SoftNotice title="Loading applications…" /> : !rows.length && !error ? <SoftNotice title="No applications yet" detail="A compliance recommendation is not a submitted application." /> : rows.filter((row) => tab === 'All' || (tab === 'Approved' ? row.status === 'APPROVED' : !['APPROVED', 'REJECTED', 'CANCELLED'].includes(row.status))).map((row) => <Card key={row.id}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8}}><Text style={{color:palette.ink,fontSize:14,fontWeight:'900',flex:1}}>{row.services?.name || 'Application'}</Text><Badge label={row.status.replaceAll('_', ' ')} /></View>
      <Text style={{color:palette.muted,fontSize:12}}>{row.submitted_at ? 'Submitted ' + new Date(row.submitted_at).toLocaleDateString() : 'Not submitted'}</Text>
    </Card>)}
    <Button title="Refresh" variant="secondary" onPress={refresh} />
  </Screen>;
}
