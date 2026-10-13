import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Choice, ErrorBanner, Field } from '@/components/registerbox-ui';
import { deletionInformation } from '@/data/privacy-policy';
import { useApp } from '@/hooks/use-app';
import { listPrivacyRequests, submitPrivacyRequest, type PrivacyRequest } from '@/lib/privacy-requests';

export function PrivacyDeletion() {
  const { session, demoMode } = useApp();
  return <PrivacyDeletionForm key={`${session?.user.id ?? 'signed-out'}:${demoMode}`} />;
}
function PrivacyDeletionForm() {
  const { session, loadingSession, demoMode } = useApp();
  const [scope, setScope] = useState<'account' | 'data'>('account');
  const [details, setDetails] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const userId = session?.user.id;
  useEffect(() => {
    let current = true;
    if (userId && !demoMode) listPrivacyRequests().then(rows => { if (current) setRequests(rows); }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [userId, demoMode]);
  async function submit() {
    if (!confirmed || busy || !userId || demoMode) return;
    setBusy(true); setError(''); setReceipt('');
    try {
      const row = await submitPrivacyRequest(scope, details);
      setRequests(current => [row, ...current]);
      setReceipt(`Request received. Reference: ${row.id}. Target response: ${new Date(row.target_at).toLocaleDateString()}. Your data has not yet been deleted.`);
      setConfirmed(false); setDetails('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit. Please try again or email support.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 16 }}>
    {deletionInformation.map(item => <Card key={item.title}><Text style={{ fontSize: 18, fontWeight: '700' }}>{item.title}</Text><Text style={{ lineHeight: 23 }}>{item.body}</Text></Card>)}
    <Link href="mailto:registerbox@yahoo.com?subject=RegisterBox%20deletion%20request">Email a deletion request</Link>
    {loadingSession ? <Text>Checking sign-in…</Text> : !session || demoMode ? <Card><Text>Sign in to submit and track a verified request, or use the email instructions above.</Text><Button title="Sign in to request deletion" onPress={() => router.push({ pathname: '/auth', params: { next: '/delete-account' } })}/></Card> : <Card>
      <Text>Request for {session.user.email}</Text>
      <Choice label="Account and associated data" selected={scope === 'account'} onPress={() => { setScope('account'); setConfirmed(false); }}/>
      <Choice label="Selected data — keep my account" selected={scope === 'data'} onPress={() => { setScope('data'); setConfirmed(false); }}/>
      <Field label={scope === 'data' ? 'Describe the data to delete (required)' : 'Additional details (optional)'} accessibilityLabel="Deletion request details" multiline maxLength={1000} value={details} onChangeText={setDetails} placeholder="Document names or business profile; do not enter credentials or government IDs"/>
      <Choice label="I request deletion as described above and understand that retained records will be explained to me." selected={confirmed} onPress={() => setConfirmed(!confirmed)}/>
      <Button title="Submit deletion request" loading={busy} disabled={!confirmed || (scope === 'data' && !details.trim())} onPress={() => void submit()}/>
    </Card>}
    <ErrorBanner message={error}/>
    {!!receipt && <Text accessibilityRole="alert" style={{ lineHeight: 23 }}>{receipt}</Text>}
    {requests.map(row => <Card key={row.id}><Text selectable>Reference: {row.id}</Text><Text>{row.scope === 'account' ? 'Account deletion' : 'Selected data deletion'} · {row.status}</Text><Text>Requested: {new Date(row.created_at).toLocaleDateString()} · Target response: {new Date(row.target_at).toLocaleDateString()}</Text>{row.response && <Text selectable>{row.response}</Text>}</Card>)}
  </View>;
}
