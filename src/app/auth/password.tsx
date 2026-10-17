import { Redirect, useLocalSearchParams } from 'expo-router';
import { safeNext } from '@/components/website/content';

// Preserve old bookmarks without exposing a second sign-in method.
export default function LegacyPasswordRedirect() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return <Redirect href={{ pathname: '/auth', params: { next: next ? safeNext(next) : '/(tabs)' } }} />;
}
