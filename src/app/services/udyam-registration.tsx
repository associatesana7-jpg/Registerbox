import { Redirect } from 'expo-router';

export default function Page() {
  return <Redirect href={{ pathname: '/onboarding/application', params: { category: 'udyam' } }}/>;
}
