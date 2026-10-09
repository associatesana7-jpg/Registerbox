import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Badge, Button, Card, ErrorBanner, Field, Screen } from './registerbox-ui';
import { GstHeader } from './gst-ui';
import { GstSignatorySelector } from './gst-signatory-selector';
import { FlowProgress } from './experience';
import { palette } from '@/constants/design';
import { returnAction, type ReturnDraft } from '@/lib/gst-returns-api';
import { nilNextStep } from '@/lib/gst-nil-flow';
import { validFilingOtp } from '../../supabase/functions/_shared/gst-filing-otp';
import { filingBlock, type FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';
import { periodIsClosed, validPeriod } from '../../supabase/functions/gst-workspace/domain';

const heading = { color: palette.ink, fontSize: 17, fontWeight: '800' as const };
const detail = { color: palette.muted, fontSize: 14, lineHeight: 21 };
function Confirm({ checked, disabled, label, onPress }: { checked: boolean; disabled: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12 }}><Text style={{ color: palette.blue, fontSize: 22 }}>{checked ? '☑' : '☐'}</Text><Text style={{ ...detail, color: palette.ink, flex: 1 }}>{label}</Text></Pressable>;
}

/** Nil preparation uses taxpayer declarations, not a fabricated zero-value GST snapshot. */
export function GstNilReturn({ businessId, form, year, month }: { businessId: string; form: 'gstr-1' | 'gstr-3b'; year: number; month: number }) {
  const [draft, setDraft] = useState<ReturnDraft | null>(null);
  const [history, setHistory] = useState<FilingHistory | null>(null);
  const [gstin, setGstin] = useState('');
  const [writes, setWrites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [declared, setDeclared] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [fileApproved, setFileApproved] = useState(false);
  const [pan, setPan] = useState('');
  const [otp, setOtp] = useState('');
  const running = useRef(false), mounted = useRef(true);
  const period = String(month).padStart(2, '0') + year;
  const periodLabel = `${String(month).padStart(2, '0')}/${year}`;
  async function reload(initial = false) {
    if (!initial) { setLoading(true); setError(''); }
    try {
      if (!validPeriod(year, month)) throw new Error('Choose a valid return period.');
      const [list, status] = await Promise.all([returnAction(businessId, 'list'), returnAction(businessId, 'history', { year, month })]);
      if (!mounted.current) return;
      const saved = list.drafts?.find(d => d.form === form && d.year === year && d.month === month) ?? null;
      setDraft(saved); setGstin(list.gstin || ''); setWrites(list.writesEnabled); setHistory(status.history ?? null);
      if (initial || saved?.state === 'otp_sent') setPan(saved?.signatory_pan || '');
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not load GST status.'); }
    finally { if (mounted.current) setLoading(false); }
  }
  // Initial loading state is already true; reload(true) only sets state after I/O.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { mounted.current = true; void reload(true); return () => { mounted.current = false; }; /* Remounted for every account/period. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const block = history ? filingBlock(history, form) : null;
  const filed = draft?.state === 'filed' || block?.record.status.toLowerCase() === 'filed';
  const regular = !!draft && draft.payload.registerbox_nil !== true;
  const priorFiled = history?.records.some(r => r.form === 'GSTR1' && r.status.toLowerCase() === 'filed');
  const stage = nilNextStep(draft);
  const blocked = loading || !history || !!block || regular || !periodIsClosed(year, month) || !writes || (form === 'gstr-3b' && !priorFiled);
  async function act(action: string, current: ReturnDraft | null, extra: Record<string, unknown> = {}) {
    if (!mounted.current) throw new Error('Screen closed. Reload to check the saved status.');
    const result = await returnAction(businessId, action, { consent: true, draftId: current?.id, revision: current?.revision, approvedHash: current?.payload_hash, ...extra });
    if (!result.draft) throw new Error('No saved return status was returned. Reload before continuing.');
    if (mounted.current) setDraft(result.draft);
    return result.draft;
  }
  async function continueToOtp() {
    if (running.current || blocked || !declared || !authorized || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return;
    running.current = true; setError('');
    let current = draft;
    try {
      if (!current) {
        setBusy('Requesting filing OTP…');
        current = await act('draft', null, { form, year, month, payload: { gstin, ret_period: period, registerbox_nil: true, declarations: { noSales: true, noAdjustments: true, completeBooks: true, ...(form === 'gstr-3b' ? { noPurchases: true, noItc: true, noLiability: true, noAutoPopulation: true, gstr1FiledNil: true } : {}) } } });
      }
      if (nilNextStep(current) === 'recover') {
        setBusy('Requesting filing OTP…');
        current = await act('recover_nil', current);
      }
      if (nilNextStep(current) === 'proceed') {
        setBusy('Requesting filing OTP…');
        current = await act('proceed', current);
      }
      // Poll only the existing reference; never retry a GST write automatically.
      for (let attempt = 0; nilNextStep(current) === 'poll' && attempt < 4; attempt++) {
        setBusy('Waiting for GST preparation…');
        current = await act('poll', current);
        if (nilNextStep(current) === 'poll') await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (nilNextStep(current) === 'poll') return;
      if (!['review', 'otp'].includes(nilNextStep(current))) throw new Error(current.last_error || 'Check the GST portal outcome before continuing.');
      setBusy('Requesting filing OTP…');
      await act('evc', current, { pan });
      setOtp(''); setFileApproved(false);
    } catch (cause) {
      // A failed request may have advanced the server state. Never retain the
      // stale draft and send preparation again from this screen.
      const message = cause instanceof Error ? cause.message : 'Could not continue. Reload to check status before retrying.';
      if (mounted.current) { await reload(); setError(message); }
    }
    finally { running.current = false; if (mounted.current) setBusy(''); }
  }
  async function fileReturn() {
    if (running.current || blocked || !fileApproved || !validFilingOtp(otp) || draft?.state !== 'otp_sent') return;
    running.current = true; setBusy('Submitting your authorized nil return…'); setError('');
    try { await act('file', draft, { otp }); setOtp(''); setFileApproved(false); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Check GST status before retrying.';
      if (mounted.current) { await reload(); setError(message); }
    }
    finally { running.current = false; if (mounted.current) setBusy(''); }
  }
  return <Screen><Stack.Screen options={{ headerShown: false }}/><GstHeader title={`File Nil ${form.toUpperCase()}`} onBack={() => router.replace('/gst')}/>
    <View style={{ gap: 16 }}><FlowProgress current={filed ? 3 : stage === 'otp' ? 2 : 1} total={3} labels={['Declaration', 'OTP & file', 'Receipt']}/>
      <Card><Text style={heading}>{form.toUpperCase()} · {periodLabel}</Text><Text selectable style={detail}>{gstin || 'Loading GST account…'}</Text><Text style={detail}>Monthly return · Nil declaration</Text></Card>
      <ErrorBanner message={error}/>
      {loading ? <Text style={detail}>Checking your account and filing status…</Text> : null}
      {filed ? <Card><Badge label="Filed · duplicate filing blocked" tone="green"/><Text selectable style={heading}>ARN: {draft?.acknowledgement || block?.record.arn || 'Not returned by GST'}</Text>{form === 'gstr-1' ? <Button title="Continue to GSTR-3B →" onPress={() => router.replace({ pathname: '/gst-returns', params: { form: 'gstr-3b', year, month, mode: 'nil' } })}/> : <Button title="Back to GST" onPress={() => router.replace('/gst')}/>}</Card> : <>
        {!loading && blocked ? <Card><Text style={heading}>Before continuing</Text><Text style={detail}>{regular ? 'A regular draft exists. Review it instead of overwriting it with nil.' : block?.message || (!periodIsClosed(year, month) ? 'This tax period has not ended in India.' : !history ? 'GST filing status could not be verified. Retry below.' : !writes ? 'Live GST filing is currently unavailable.' : 'Complete GSTR-1 for this period before filing GSTR-3B.')}</Text></Card> : null}
        {stage === 'blocked' ? <Card><Text style={heading}>Check the previous operation</Text><Text style={detail}>{draft?.last_error || 'The previous request needs review. Check its outcome on GST before trying again.'}</Text></Card> : stage === 'otp' ? <Card><Text style={heading}>Enter GST filing OTP</Text><Text style={detail}>Sent to the authorized signatory’s registered GST contact. Entering the OTP alone does not submit the return.</Text><Field label="GST filing code (letters and numbers)" value={otp} secureTextEntry keyboardType="default" autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy} onChangeText={value => { setOtp(value.trim()); setFileApproved(false); }}/><Confirm checked={fileApproved} disabled={!!busy} onPress={() => setFileApproved(!fileApproved)} label={`I confirm the nil declaration for ${gstin}, ${form.toUpperCase()}, ${periodLabel} is true and complete, and authorize filing this return using this OTP.`}/><Button title="Verify OTP & file nil return" loading={!!busy} disabled={!!busy || blocked || !fileApproved || !validFilingOtp(otp)} onPress={() => void fileReturn()}/><Button title="Request a fresh OTP" variant="ghost" disabled={!!busy} onPress={() => { setDraft(draft ? { ...draft, state: 'prepared' } : null); setAuthorized(false); setDeclared(false); setOtp(''); }}/></Card> : <Card>
          <Text style={heading}>File Nil {form.toUpperCase()}</Text>
          <Text style={detail}>Confirm all of the following for this period:</Text>
          <Text style={detail}>• No outward supplies, including exports and reverse-charge supplies.{ '\n' }• No amendments or credit/debit notes to report.{ '\n' }• No service advances to declare or adjust.</Text>
          {form === 'gstr-3b' ? <Text style={detail}>• No purchases/inward supplies, ITC claim, tax, interest or late-fee liability.{ '\n' }• No auto-populated activity requiring a regular return.{ '\n' }• GSTR-1 for this period has been filed as nil.</Text> : null}
          <Confirm checked={declared} disabled={!!busy} onPress={() => setDeclared(!declared)} label="I checked my complete books and confirm these nil conditions are true. If any condition does not apply, I must prepare a regular return."/>
          {gstin ? <GstSignatorySelector key={businessId+gstin} businessId={businessId} gstin={gstin} pan={pan} disabled={!!busy || loading} onSelect={value => { setPan(value); setAuthorized(false); setFileApproved(false); setOtp(''); }}/> : null}
          <Confirm checked={authorized} disabled={!!busy} onPress={() => setAuthorized(!authorized)} label={`I authorize saving this declaration, checking filing status, ${form === 'gstr-1' ? 'preparing nil GSTR-1, checking its processing status or resuming an already-ready return, and ' : ''}sending the filing OTP. This does not file my return.`}/>
          {busy ? <Text accessibilityLiveRegion="polite" style={detail}>{busy}</Text> : null}
          <Button title="Send OTP →" loading={!!busy} disabled={!!busy || blocked || !declared || !authorized || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)} onPress={() => void continueToOtp()}/>
          <Text style={detail}>No invoice upload or manual summary fetch is needed for this nil flow. GST may still reject a return if its requirements are not met.</Text>
        </Card>}
      </>}
      <Button title="Refresh filing status" variant="ghost" disabled={!!busy || loading} onPress={() => void reload()}/>
      <Button title="Change period / back to GST" variant="ghost" disabled={!!busy} onPress={() => router.replace('/gst')}/>
    </View>
  </Screen>;
}
