import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { getServicePackage } from '@/lib/service-catalog';

/** Standard Web Checkout stays on the website, including when opened from the app. */
export default function CheckoutScreen() {
  const { package: packageId } = useLocalSearchParams<{ package?: string }>();
  const requestedId = Array.isArray(packageId) ? packageId[0] : packageId;
  const selected = requestedId ? getServicePackage(requestedId) : undefined;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function openWebsite() {
    setBusy(true);
    setError('');
    try {
      const path = selected ? `?package=${encodeURIComponent(selected.id)}` : '';
      await Linking.openURL(`https://www.registerbox.in/checkout${path}`);
    } catch { setError('Could not open your browser. Visit www.registerbox.in/checkout to continue.'); }
    finally { setBusy(false); }
  }
  return <Screen>
    <PageHeader title="Secure web checkout" subtitle="Choose your service and complete payment on the RegisterBox website." back={() => router.back()}/>
    <Card><Text style={{ fontSize: 20, fontWeight: '700', color: '#132548' }}>{selected?.title || 'Your next step starts here.'}</Text><Text style={{ color: '#66728a', lineHeight: 23 }}>Your service details and final fee are shown before payment. Sign in to the website with your RegisterBox account to continue.</Text><Button title="Continue on website" loading={busy} onPress={() => void openWebsite()}/></Card>
    <ErrorBanner message={error}/>
  </Screen>;
}
