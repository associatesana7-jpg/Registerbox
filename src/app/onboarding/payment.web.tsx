import { Link, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ApplicationPaymentCard } from '@/components/application-payment-card.web';
import { Card, PageHeader, Screen } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { applicationPaymentPath, isApplicationId } from '@/lib/application-checkout';

export default function ApplicationPaymentScreen() {
  const { application } = useLocalSearchParams<{ application?: string }>();
  const { session, loadingSession } = useApp();
  const id = Array.isArray(application) ? application[0] : application;
  return <Screen><PageHeader title="Your next step." subtitle="Your application is saved. Review the service fee before you pay."/>
    {loadingSession ? <Text>Loading your account…</Text> : !session ? <Card><Text>Sign in to review your submitted application and its payment status.</Text><Link href={{ pathname: '/auth', params: { next: id && isApplicationId(id) ? applicationPaymentPath(id) : '/compliance' } }}>Sign in to continue ↗</Link></Card> : <ApplicationPaymentCard key={id} applicationId={id || ''}/>}
  </Screen>;
}
