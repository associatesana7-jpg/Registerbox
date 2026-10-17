import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Badge, Button, Card, ErrorBanner, Field, Screen } from './registerbox-ui';
import { GstHeader } from './gst-ui';
import { GstSignatorySelector } from './gst-signatory-selector';
import { JourneyRail } from './workspace-ui';
import { palette } from '@/constants/design';
import { returnAction, type ReturnDraft } from '@/lib/gst-returns-api';
import { nilNextStep } from '@/lib/gst-nil-flow';
import { validFilingOtp } from '../../supabase/functions/_shared/gst-filing-otp';
import { filingBlock, type FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';
import { periodIsClosed, validPeriod } from '../../supabase/functions/gst-workspace/domain';
import { GstCheckbox } from './gst-checkbox';
import { useGstRefresh } from '@/hooks/use-gst-refresh';
import { GstImsRecovery } from './gst-ims-recovery';

const heading = { color: palette.ink, fontSize: 20, lineHeight:27, fontWeight: '600' as const };
const detail = { color: palette.muted, fontSize: 14, lineHeight: 21 };
function Confirm({ checked, disabled, label, onPress }: { checked: boolean; disabled: boolean; label: string; onPress: () => void }) {
  return <GstCheckbox checked={checked} disabled={disabled} label={label} onPress={onPress}/>;
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
  const [resumeApproved,setResumeApproved]=useState(false);
  const [imsOpen,setImsOpen]=useState(false);
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
      setPan(value=>value||saved?.signatory_pan||'');
    } catch (cause) { if (mounted.current) {setHistory(null);setError(cause instanceof Error ? cause.message : 'Could not load GST status.');} }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; /* Remounted for every account/period. */
  }, []);
  useGstRefresh(()=>{if(!running.current)void reload();});
  const block = history ? filingBlock(history, form) : null;
  const filed = draft?.state === 'filed' || block?.record.status.toLowerCase() === 'filed';
  const regular = !!draft && draft.payload.registerbox_nil !== true;
  const priorFiled = history?.records.some(r => r.form === 'GSTR1' && r.status.toLowerCase() === 'filed');
  const stage = nilNextStep(draft);
  const blocked = loading || !history || !!block || regular || stage==='ims' || !periodIsClosed(year, month) || !writes || (form === 'gstr-3b' && !priorFiled);
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
  async function resendOtp() {
    if(running.current||blocked||!draft)return;
    running.current=true;setBusy('Resending filing OTP…');setError('');
    try{await act('evc',draft,{pan:draft.signatory_pan||pan});setOtp('');setFileApproved(false);}
    catch(cause){await reload();setError(cause instanceof Error?cause.message:'Could not resend OTP.');}
    finally{running.current=false;setBusy('');}
  }
  function openSavedReturn(){router.replace({pathname:'/gst-returns',params:{form,year,month,mode:'regular'}});}
  async function resumePortal(){
    if(running.current||loading||!history||!!block||!resumeApproved)return;
    running.current=true;setBusy('Loading your saved GSTR-3B and payment status…');setError('');
    try{await act('resume_portal',draft);setOtp('');setFileApproved(false);openSavedReturn();}
    catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'Could not load the saved GST return.');}
    finally{running.current=false;if(mounted.current)setBusy('');}
  }
  return <Screen><Stack.Screen options={{ headerShown: false }}/><GstHeader title={`File Nil ${form.toUpperCase()}`} onBack={() => router.replace('/gst')}/>
    <View style={{ gap: 20 }}><JourneyRail current={filed ? 2 : stage === 'otp' ? 1 : 0} steps={['Declaration', 'OTP & file', 'Receipt']}/>
      <Card><Text style={heading}>{form.toUpperCase()} · {periodLabel}</Text><Text selectable style={detail}>{gstin || 'Loading GST account…'}</Text><Text style={detail}>Monthly return · Nil declaration</Text></Card>
      <ErrorBanner message={error}/>
      {form==='gstr-3b'?<GstImsRecovery businessId={businessId} year={year} month={month} visible={imsOpen} onClose={()=>setImsOpen(false)} onComplete={()=>{setImsOpen(false);void (async()=>{setBusy('Refreshing return after IMS…');try{if(stage==='ims')await act('recover_ims',draft);else await reload();}catch(cause){setError(cause instanceof Error?cause.message:'Refresh GST status to continue.');}finally{setBusy('');}})();}}/>:null}
      {form==='gstr-3b'&&!filed?<Card><Text style={heading}>{draft?.last_error?.includes('IMS002')?'Generate GSTR-2B to continue':'Invoices & GSTR-2B'}</Text><Text style={detail}>Review supplier invoices in IMS, save your decisions, then compute GSTR-2B. Your return and checklist stay here.</Text><Button title="Open IMS dashboard →" variant="secondary" disabled={!!busy} onPress={()=>setImsOpen(true)}/>{stage==='ims'?<Button title="I completed IMS · refresh & continue" disabled={!!busy} onPress={()=>void (async()=>{setBusy('Checking GSTR-2B…');setError('');try{await act('recover_ims',draft);}catch(cause){setError(cause instanceof Error?cause.message:'GSTR-2B is not ready yet.');}finally{setBusy('');}})()}/>:null}</Card>:null}
      {loading ? <Text style={detail}>Checking your account and filing status…</Text> : null}
      {filed ? <Card><Badge label="Filed · duplicate filing blocked" tone="green"/><Text selectable style={heading}>ARN: {draft?.acknowledgement || block?.record.arn || 'Not returned by GST'}</Text>{form === 'gstr-1' ? <Button title="Continue to GSTR-3B →" onPress={() => router.replace({ pathname: '/gst-returns', params: { form: 'gstr-3b', year, month, mode: 'nil' } })}/> : <Button title="Back to GST" onPress={() => router.replace('/gst')}/>}</Card> : <>
        {!loading && blocked ? <Card><Text style={heading}>Before continuing</Text><Text style={detail}>{regular ? 'A regular draft exists. Review it instead of overwriting it with nil.' : block?.message || (stage==='ims'?'Compute GSTR-2B in IMS below, then continue with your saved declaration.':!periodIsClosed(year, month) ? 'This tax period has not ended in India.' : !history ? 'GST filing status could not be verified. Retry below.' : !writes ? 'Live GST filing is currently unavailable.' : 'Complete GSTR-1 for this period before filing GSTR-3B.')}</Text></Card> : null}
        {regular?<Card><Text style={heading}>Continue your saved GSTR-3B</Text><Text style={detail}>Review the saved return and its payment details to continue filing.</Text><Button title="Open saved return →" onPress={openSavedReturn}/></Card>:stage==='portal'?<Card><Text style={heading}>Continue from GST portal</Text><Text style={detail}>GST rejected nil filing because this return has saved values or liabilities (RT-3BAS1079). If you have offset them on the portal, load the updated return here. You can then review its payment details and request a fresh filing OTP.</Text><Confirm checked={resumeApproved} disabled={!!busy} onPress={()=>setResumeApproved(!resumeApproved)} label={`Load the saved GSTR-3B and payment details for ${periodLabel}, and continue with that return for review.`}/><Button title="Load saved return & payment status →" loading={!!busy} disabled={!!busy||loading||!history||!!block||!resumeApproved} onPress={()=>void resumePortal()}/></Card>:stage === 'blocked' ? <Card><Text style={heading}>Check the previous operation</Text><Text style={detail}>{draft?.last_error || 'The previous request needs review. Check its outcome on GST before trying again.'}</Text></Card> : stage === 'otp' ? <Card><Text style={heading}>Enter GST filing OTP</Text><Text style={detail}>Sent to the authorized signatory’s registered GST contact. Entering the OTP alone does not submit the return.</Text><Field label="GST filing code (letters and numbers)" value={otp} secureTextEntry keyboardType="default" autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy} onChangeText={value => { setOtp(value.trim()); setFileApproved(false); }}/><Confirm checked={fileApproved} disabled={!!busy} onPress={() => setFileApproved(!fileApproved)} label={`I confirm the nil declaration for ${gstin}, ${form.toUpperCase()}, ${periodLabel} is true and complete, and authorize filing this return using this OTP.`}/><Button title="Verify OTP & file nil return" loading={!!busy} disabled={!!busy || blocked || !fileApproved || !validFilingOtp(otp)} onPress={() => void fileReturn()}/><Button title="Resend OTP" variant="ghost" disabled={!!busy || blocked} onPress={() => void resendOtp()}/></Card> : <Card>
          <Text style={heading}>File Nil {form.toUpperCase()}</Text>
          <Text style={detail}>Confirm all of the following for this period:</Text>
          <Text style={detail}>• No outward supplies, including exports and reverse-charge supplies.{ '\n' }• No amendments or credit/debit notes to report.{ '\n' }• No service advances to declare or adjust.</Text>
          {form === 'gstr-3b' ? <Text style={detail}>• No purchases/inward supplies, ITC claim, tax, interest or late-fee liability.{ '\n' }• No auto-populated activity requiring a regular return.{ '\n' }• GSTR-1 for this period has been filed as nil.</Text> : null}
          <Confirm checked={declared} disabled={!!busy} onPress={() => setDeclared(!declared)} label="I checked my complete books and confirm these nil conditions are true. If any condition does not apply, I must prepare a regular return."/>
          {gstin ? <GstSignatorySelector key={businessId+gstin} businessId={businessId} gstin={gstin} pan={pan} disabled={!!busy || loading} onSelect={value => { setPan(value); setAuthorized(false); setFileApproved(false); setOtp(''); }}/> : null}
          <Confirm checked={authorized} disabled={!!busy} onPress={() => setAuthorized(!authorized)} label={`I authorize saving this declaration, checking filing status, ${form === 'gstr-1' ? 'preparing nil GSTR-1, checking its processing status or resuming an already-ready return, and ' : ''}sending the filing OTP. This does not file my return.`}/>
          {busy ? <Text accessibilityLiveRegion="polite" style={detail}>{busy}</Text> : null}
          <Button title={draft?.signatory_pan?'Resend OTP':'Send OTP →'} loading={!!busy} disabled={!!busy || blocked || !declared || !authorized || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)} onPress={() => void continueToOtp()}/>
          <Text style={detail}>No invoice upload or manual summary fetch is needed for this nil flow. GST may still reject a return if its requirements are not met.</Text>
        </Card>}
      </>}
      <Button title="Refresh filing status" variant="ghost" disabled={!!busy || loading} onPress={() => void reload()}/>
      <Button title="Change period / back to GST" variant="ghost" disabled={!!busy} onPress={() => router.replace('/gst')}/>
    </View>
  </Screen>;
}
