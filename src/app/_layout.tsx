import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from '@/providers/app-provider';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F7FAFF' } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="query" options={{ presentation: 'modal' }} />
        <Stack.Screen name="certificate" options={{ presentation: 'modal' }} />
      </Stack>
    </AppProvider>
  );
}
