import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, PageHeader, Screen } from '@/components/registerbox-ui';
export default function PaymentScreen() {
  return <Screen><PageHeader title="Payment setup pending" subtitle="No payment has been taken and no application has been submitted." /><Card><Text>Live payment collection is not configured yet. Your saved documents remain available in your wallet.</Text></Card><Button title="Open my business" onPress={() => router.replace('/(tabs)')} /></Screen>;
}
