import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Choice, ErrorBanner, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { getTallyCompanies, getTallyJobs, reconcileTallyJob, submitTallyImport } from '@/lib/tally-api';
import { ledgerTemplate, money, parseTallyCsv, voucherTemplate, type TallyBatch, type TallyCompany, type TallyJob, type TallyMode } from '@/lib/tally-core';

export default function TallyScreen() {
  const [url, setUrl] = useState(''); const [token, setToken] = useState('');
  const [companies, setCompanies] = useState<TallyCompany[]>([]); const [company, setCompany] = useState<TallyCompany>();
  const [mode, setMode] = useState<TallyMode>('vouchers'); const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<TallyBatch>(); const [jobs, setJobs] = useState<TallyJob[]>([]);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false); const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [reference, setReference] = useState('');
  const [debitLedger, setDebitLedger] = useState(''); const [creditLedger, setCreditLedger] = useState(''); const [amount, setAmount] = useState('');
  const [ledgerName, setLedgerName] = useState(''); const [parent, setParent] = useState('');
  const connection = { url, token };
  const relevantJobs = jobs.filter(j => company && j.company.guid === company.guid);
  const unresolved = relevantJobs.some(j => ['OUTCOME_UNKNOWN', 'SENT', 'QUEUED'].includes(j.state));
  async function action(task: () => Promise<void>) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'Tally connection failed.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function editCsv(text: string) { setCsv(text); setPreview(undefined); }
  function resetConnection() { setCompanies([]); setCompany(undefined); setJobs([]); setPreview(undefined); }
  const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  function buildEntry() {
    setError('');
    try {
      let text: string;
      if (mode === 'ledgers') text = `${ledgerTemplate.split('\n')[0]}\n${[reference, ledgerName, parent].map(csvCell).join(',')}`;
      else {
        money(amount);
        text = `${voucherTemplate.split('\n')[0]}\n${[reference, date, 'Journal', reference, debitLedger, amount, '0', 'RegisterBox entry'].map(csvCell).join(',')}\n${[reference, date, 'Journal', reference, creditLedger, '0', amount, 'RegisterBox entry'].map(csvCell).join(',')}`;
      }
      parseTallyCsv(text, mode); editCsv(text);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check entry details.'); }
  }
  return <Screen><PageHeader title="Connect to Tally" subtitle="Upload entries from your phone and verify them in your Tally company." back={() => router.back()} />
    <View style={styles.stack}>
      <Card><Badge label="XML compatibility" /><Text style={styles.title}>Your books, connected</Text><Text style={styles.body}>Use a RegisterBox connector on the computer running Tally. TallyPrime and Tally.ERP 9 use XML; each installed release must be tested before live use.</Text><Text style={styles.body}>This release supports basic ledgers and balanced accounting vouchers. Inventory, GST invoice allocations and custom masters need verified templates.</Text></Card>
      <ErrorBanner message={error} />
      <Card><Text style={styles.title}>1. Pair your computer</Text><Text style={styles.body}>Enable Tally’s HTTP server, load your company, and start the RegisterBox connector. Use its trusted HTTPS address on your phone.</Text>
        <Field label="Connector address" placeholder="https://tally.your-business.in:9123" autoCapitalize="none" autoCorrect={false} value={url} editable={!busy} onChangeText={v => { setUrl(v); resetConnection(); }} />
        <Field label="Pairing token" placeholder="Token configured on your computer" autoCapitalize="none" autoCorrect={false} secureTextEntry value={token} editable={!busy} onChangeText={v => { setToken(v); resetConnection(); }} />
        <Text style={styles.note}>Pairing details stay in this screen’s memory. The connector keeps the import journal on your computer.</Text>
        <Button title="Connect and load companies" disabled={busy || !url || !token} onPress={() => action(async () => { resetConnection(); const result = await getTallyCompanies(connection); setCompanies(result.companies); if (!result.companies.length) throw Error('No loaded company with a stable GUID was returned. Open your company in Tally.'); setJobs((await getTallyJobs(connection)).jobs); })} />
      </Card>
      {!!companies.length && <Card><Text style={styles.title}>2. Select the exact company</Text>{companies.map(c => <Choice key={c.guid} label={c.name} selected={company?.guid === c.guid} onPress={() => { if (!busy) { setCompany(c); setPreview(undefined); } }} />)}</Card>}
      {company && <>
        <Card><Text style={styles.title}>3. Add your entries</Text><View style={styles.row}><Button title="Vouchers" variant={mode === 'vouchers' ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setMode('vouchers'); editCsv(''); }} /><Button title="Ledgers" variant={mode === 'ledgers' ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setMode('ledgers'); editCsv(''); }} /></View>
          <Text style={styles.body}>{mode === 'vouchers' ? 'Upload Sales, Purchase, Payment, Receipt, Contra, Journal, Credit Note or Debit Note entries. One row per ledger line; use the same external ID for all lines of a voucher.' : 'Create basic ledgers under existing Tally groups. Extended tax or banking configuration must be completed in Tally.'}</Text>
          <Field label="Unique external reference" value={reference} onChangeText={setReference} editable={!busy} placeholder="e.g. rent-2026-10" autoCapitalize="none" />
          {mode === 'vouchers' ? <><Field label="Journal date (YYYY-MM-DD)" value={date} onChangeText={setDate} editable={!busy} /><Field label="Debit ledger — exact Tally name" value={debitLedger} onChangeText={setDebitLedger} editable={!busy} /><Field label="Credit ledger — exact Tally name" value={creditLedger} onChangeText={setCreditLedger} editable={!busy} /><Field label="Amount" value={amount} onChangeText={setAmount} editable={!busy} keyboardType="decimal-pad" placeholder="1000.00" /></> : <><Field label="Ledger name" value={ledgerName} onChangeText={setLedgerName} editable={!busy} /><Field label="Existing parent group" value={parent} onChangeText={setParent} editable={!busy} placeholder="Indirect Expenses" /></>}
          <Button title={mode === 'vouchers' ? 'Prepare journal entry' : 'Prepare ledger'} variant="secondary" disabled={busy} onPress={buildEntry} />
          <Text style={styles.title}>Or upload a CSV</Text><Button title="Choose CSV file" variant="secondary" disabled={busy} onPress={() => action(async () => { const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'], copyToCacheDirectory: true }); if (result.canceled) return; const asset = result.assets[0]; if ((asset.size || 0) > 1_000_000) throw Error('Choose a CSV under 1 MB.'); const text = asset.file ? await asset.file.text() : await new File(asset.uri).text(); parseTallyCsv(text, mode); editCsv(text); })} />
          <Text selectable style={styles.template}>{(mode === 'vouchers' ? voucherTemplate : ledgerTemplate).split('\n')[0]}</Text>
          <Field label="CSV content" value={csv} onChangeText={editCsv} editable={!busy} multiline style={{ minHeight: 150, textAlignVertical: 'top' }} placeholder="Paste CSV rows here, or choose a file above" />
          <Button title="Validate and review" disabled={busy || !csv} onPress={() => { setError(''); try { setPreview(parseTallyCsv(csv, mode)); } catch (e) { setPreview(undefined); setError(e instanceof Error ? e.message : 'Invalid CSV.'); } }} />
        </Card>
        {preview && <Card><Text style={styles.title}>4. Review before importing</Text><Text style={styles.body}>Destination: {company.name}</Text><Badge label={`${mode === 'vouchers' ? preview.vouchers.length : preview.ledgers.length} ${mode}`} />
          {preview.vouchers.map(v => <View key={v.externalId} style={styles.entry}><Text style={styles.title}>{v.voucherType} · {v.voucherNumber}</Text><Text style={styles.note}>{v.date} · {v.externalId}</Text>{v.lines.map((l, i) => <Text key={i} style={styles.body}>{l.ledger}: {l.amount < 0 ? 'Dr' : 'Cr'} {(Math.abs(l.amount) / 100).toFixed(2)}</Text>)}</View>)}
          {preview.ledgers.map(l => <Text key={l.externalId} style={styles.body}>{l.name} → {l.parent}</Text>)}
          <Text style={styles.note}>Confirm you have a company backup and the entries belong in these books. Imports are sequential and may stop after some entries are saved.</Text>
          {unresolved && <ErrorBanner message="An import is pending or unresolved. Refresh history or reconcile it before sending more entries." />}
          <Button title="Confirm and import into Tally" disabled={busy || unresolved} onPress={() => action(async () => { const job = await submitTallyImport(connection, company, mode, csv); setJobs(previous => [job, ...previous.filter(j => j.id !== job.id)]); setPreview(undefined); })} />
        </Card>}
        <Card><Text style={styles.title}>Import history</Text><Button title="Refresh import status" variant="secondary" disabled={busy} onPress={() => action(async () => setJobs((await getTallyJobs(connection)).jobs))} />
          {!relevantJobs.length && <Text style={styles.body}>No imports for this company yet.</Text>}
          {relevantJobs.map(j => <View key={j.id} style={styles.entry}><Badge label={j.state.replace(/_/g, ' ')} tone={j.state === 'APPLIED' ? 'green' : j.state === 'REJECTED' ? 'red' : 'amber'} /><Text style={styles.body}>{j.applied} / {j.total} entries verified</Text><Text selectable style={styles.body}>{j.message}</Text><Text style={styles.note}>{new Date(j.updatedAt).toLocaleString()}</Text>{j.state === 'OUTCOME_UNKNOWN' && <Button title="Reconcile saved entries" variant="secondary" disabled={busy} onPress={() => action(async () => { const result = await reconcileTallyJob(connection, j.id); setJobs(previous => previous.map(item => item.id === j.id ? result : item)); })} />}</View>)}
        </Card>
      </>}
    </View>
  </Screen>;
}
const styles = StyleSheet.create({ stack: { gap: 16 }, title: { color: palette.ink, fontSize: 16, fontWeight: '800' }, body: { color: palette.muted, fontSize: 13, lineHeight: 20 }, note: { color: palette.muted, fontSize: 11, lineHeight: 17 }, row: { flexDirection: 'row', gap: 8 }, template: { color: palette.blue, fontSize: 11, lineHeight: 18 }, entry: { borderTopWidth: 1, borderColor: palette.line, paddingTop: 12, gap: 6 } });
