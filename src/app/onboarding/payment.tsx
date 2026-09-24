import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Choice, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { createCheckout } from '@/lib/registerbox-api';

export default function PaymentScreen() {
  const { business, demoMode, compliances } = useApp();
  const [method, setMethod] = useState('UPI (GPay, PhonePe, etc.)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function pay() {
    try {
      setLoading(true); setError('');
      if (!demoMode) {
        if (!business.id) throw new Error('Your business profile is missing. Please restart onboarding.');
        await createCheckout(business.id, compliances.filter((item) => item.status !== 'OPTIONAL').map((item) => item.slug));
        throw new Error('Your secure checkout is ready. Add Razorpay or Cashfree credentials to collect the live payment.');
      }
      router.push('/onboarding/autopilot');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not start the payment.'); }
    finally { setLoading(false); }
  }
  return (
    <Screen footer={<Button title="Pay ₹5,899" loading={loading} onPress={pay} />}>
      <PageHeader title="Complete Your Payment" subtitle="Secure checkout for your compliance plan." back={() => router.back()} />
      <Card><Text style={styles.summary}>Order Summary</Text><View style={styles.line}><Text>5 Compliances</Text><Text>₹4,999</Text></View><View style={styles.line}><Text>GST (18%)</Text><Text>₹900</Text></View><View style={styles.total}><Text style={styles.totalText}>Total</Text><Text style={styles.totalValue}>₹5,899</Text></View></Card>
      <Text style={styles.heading}>Choose Payment Method</Text>
      <View style={styles.stack}>{['UPI (GPay, PhonePe, etc.)', 'Credit / Debit Card', 'Net Banking', 'Wallet'].map((item) => <Choice key={item} icon={item.startsWith('UPI') ? '●' : '▣'} label={item} selected={method === item} onPress={() => setMethod(item)} />)}</View>
      <ErrorBanner message={error} />
      <Text style={styles.secure}>🔒 100% secure payments</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { color: palette.ink, fontWeight: '900', fontSize: 14 }, line: { flexDirection: 'row', justifyContent: 'space-between' }, total: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }, totalText: { color: palette.ink, fontWeight: '900' }, totalValue: { color: palette.ink, fontSize: 18, fontWeight: '900' }, heading: { color: palette.ink, fontWeight: '900', fontSize: 15, paddingTop: 8 }, stack: { gap: 9 }, secure: { color: palette.green, fontSize: 10, textAlign: 'center', fontWeight: '700' },
});
