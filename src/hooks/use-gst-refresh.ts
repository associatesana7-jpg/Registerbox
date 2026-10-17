import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Refresh reads on navigation and when returning from the GST portal. Never retries a write. */
export function useGstRefresh(refresh: () => void) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; }, [refresh]);
  useFocusEffect(useCallback(() => {
    latest.current();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') latest.current();
    });
    const onFocus = () => latest.current();
    if (Platform.OS === 'web') window.addEventListener('focus', onFocus);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('focus', onFocus);
    };
  }, []));
}
