import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Choice, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { fetchLockerDocuments, startDocumentLocker } from '@/lib/registerbox-api';

export default function LockerScreen() {
  const { business } = useApp();
  const [sessionId, setSessionId] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const storageKey = 'registerbox:locker:' + business.id;
  useEffect(() => { void AsyncStorage.getItem(storageKey).then((value) => setSessionId(value ?? '')); }, [storageKey]);
  async function start() {
    if (!business.id || !consent) return;
    setLoading(true); setError('');
    try {
      const result = await startDocumentLocker(business.id);
      setSessionId(result.sessionId);
      await AsyncStorage.setItem(storageKey, result.sessionId);
      await WebBrowser.openBrowserAsync(result.authorizationUrl);
      setMessage('After completing consent, tap Fetch consented documents.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect to DigiLocker.'); }
    finally { setLoading(false); }
  }
  async function collect() {
    if (!business.id) return;
    setLoading(true); setError('');
    try {
      const result = await fetchLockerDocuments(business.id, sessionId);
      setMessage(result.status === 'succeeded' ? result.imported + ' new documents saved. Previously imported files remain in your wallet.' : 'DigiLocker session: ' + result.status + '. Complete consent or start a new connection.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retrieve documents.'); }
    finally { setLoading(false); }
  }
  return <Screen>
    <PageHeader title="Connect DigiLocker" subtitle="Sign in and choose which personal documents to share." back={() => router.back()} />
    <Card><Text>Retrieve PAN and Aadhaar documents with your consent. Business GST certificates and rent agreements must be uploaded separately.</Text></Card>
    <Choice label="I consent to retrieving and saving my selected documents to this business." selected={consent} onPress={() => setConsent(!consent)} />
    <ErrorBanner message={error} />
    {message ? <Card><Text>{message}</Text></Card> : null}
    <Button title="Connect DigiLocker" disabled={!consent || !business.id || loading} loading={loading} onPress={start} />
    {sessionId ? <Button title="Fetch consented documents" disabled={loading} onPress={collect} /> : null}
    <Button title="Open document wallet" variant="secondary" onPress={() => router.replace('/(tabs)/documents')} />
  </Screen>;
}
