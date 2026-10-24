import { Link, router } from 'expo-router';
import { useEffect, useId, useRef, useState } from 'react';
import { AppIcon, type AppIconName } from '@/components/app-icon';
import { ErrorBanner } from '@/components/registerbox-ui';
import { GstAiWorkspace } from '@/components/gst-ai-workspace';
import { GstAiNilLauncher } from '@/components/gst-ai-nil-launcher';
import { GstBillReview } from '@/components/gst-bill-review';
import { useApp } from '@/hooks/use-app';
import { addExtractedBillToBooks, askRegisterBoxAi, chooseAndExtractGstBill, type BillExtraction } from '@/lib/registerbox-api';
import { GST_WORKFLOWS, GST_KNOWLEDGE_VERSION, isNilFilingRequest, safeGstActions, type GstAiAction } from '../../../supabase/functions/_shared/gst-assistant-knowledge';
import './ai-workspace.css';

const prompts: { title: string; question: string; detail: string; icon: AppIconName }[] = [
  { title: 'File a nil return', question: 'File my nil return', detail: 'Choose a return and period', icon: 'receipt' },
  { title: 'Start a registration', question: 'What documents do I need for GST registration?', detail: 'Understand your documents', icon: 'document' },
  { title: 'Plan a cloud kitchen', question: 'Do I need an FSSAI licence for a cloud kitchen?', detail: 'Find a clear starting point', icon: 'business' },
  { title: 'Find my next step', question: 'Help me understand my next business step', detail: 'A little business guidance', icon: 'arrow' },
];
function Icon({ name, size = 20 }: { name: AppIconName; size?: number }) {
  return <AppIcon name={name} size={size} color="currentColor"/>;
}

export default function AiScreen() {
  const { business, session } = useApp();
  return <AiContent key={(session?.user.id || 'signed-out') + ':' + (business.id || 'no-business')}/>;
}

function AiContent() {
  const { business } = useApp();
  const [actions, setActions] = useState<GstAiAction[]>([]);
  const [nilForm, setNilForm] = useState<'gstr-1' | 'gstr-3b'>('gstr-1');
  const [workspace, setWorkspace] = useState<'platform' | 'tcs' | 'nil' | null>(null);
  const [knowledgeVersion, setKnowledgeVersion] = useState(GST_KNOWLEDGE_VERSION);
  const [answerSource, setAnswerSource] = useState('');
  const account = useRef(business.id);
  const consentRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState('');
  const [sentQuestion, setSentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [missingFacts, setMissingFacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerConsent, setProviderConsent] = useState(false);
  const [bill, setBill] = useState<BillExtraction | null>(null);
  const [billBusy, setBillBusy] = useState(false);
  const questionId = useId();
  const consentDetailId = useId();
  const started = Boolean(answer || sentQuestion || loading || workspace || bill);

  useEffect(() => { account.current = business.id; return () => { account.current = ''; }; }, [business.id]);

  function workflow(action: GstAiAction) {
    if (!business.id) { setError('Select a business profile first.'); return; }
    if (action === 'file_nil') { setWorkspace('nil'); return; }
    if (action === 'upload_bill') { void uploadBill(); return; }
    if (action === 'upload_platform' || action === 'review_tcs') { setWorkspace(action === 'review_tcs' ? 'tcs' : 'platform'); return; }
    if (action === 'open_purchases') router.push('/gst-purchases');
    else if (action === 'open_returns' || action === 'review_amendments') router.push('/gst-returns');
    else router.push('/gst');
  }

  async function ask(value = question) {
    if (!value.trim() || loading) return;
    if (isNilFilingRequest(value)) {
      if (!business.id) { setError('Select a GST business profile first.'); return; }
      setNilForm(/\bgstr[- ]?3b\b/i.test(value) ? 'gstr-3b' : 'gstr-1');
      setError(''); setQuestion(''); setSentQuestion(value.trim()); setActions([]); setMissingFacts([]); setWorkspace('nil');
      setAnswer('Let’s file your nil return. Confirm the return and month below, then select your saved signatory and authorize using the GST OTP.');
      setAnswerSource('workflow_guide'); setKnowledgeVersion(GST_KNOWLEDGE_VERSION); return;
    }
    if (!providerConsent) {
      setQuestion(value);
      setError('Allow Groq below before sending an AI question.');
      consentRef.current?.focus();
      return;
    }
    if (bill && /\b(add|save|upload)\b.*\b(bill|invoice)\b.*\b(gst|book|purchase)/i.test(value)) {
      setQuestion(''); setSentQuestion(value.trim()); setAnswer('Your bill is ready below. Review every extracted field, tick the approval, and add it to the correct GST purchase period.'); return;
    }
    const businessId = business.id;
    setLoading(true); setError(''); setQuestion(''); setSentQuestion(value.trim()); setAnswer(''); setMissingFacts([]); setActions([]);
    try {
      const result = await askRegisterBoxAi(value.trim(), true, businessId || undefined);
      if (account.current !== businessId) return;
      setActions(safeGstActions(result.actions)); setKnowledgeVersion(result.knowledgeVersion); setAnswerSource(result.source);
      setAnswer(result.answer); setMissingFacts(result.missingFacts);
    } catch (caught) {
      if (account.current === businessId) { setError(caught instanceof Error ? caught.message : 'RegisterBox AI is unavailable.'); setQuestion(value.trim()); }
    } finally { if (account.current === businessId) setLoading(false); }
  }

  async function uploadBill() {
    const businessId = business.id;
    if (!businessId) { setError('Select or create a GST business profile before uploading a bill.'); return; }
    if (billBusy) return;
    setBillBusy(true); setError('');
    try {
      const result = await chooseAndExtractGstBill(businessId);
      if (account.current !== businessId) return;
      if (result) { setBill(result); setAnswer('I extracted the bill into a reviewable GST purchase draft. Check every field against the image before approving it.'); }
    } catch (caught) { if (account.current === businessId) setError(caught instanceof Error ? caught.message : 'Could not extract this bill.'); }
    finally { if (account.current === businessId) setBillBusy(false); }
  }

  async function addBill(purchase: Parameters<typeof addExtractedBillToBooks>[4], year: number, month: number) {
    const businessId = business.id;
    if (!businessId || !bill || billBusy) return;
    setBillBusy(true); setError('');
    try {
      await addExtractedBillToBooks(businessId, bill.extractionId, year, month, purchase);
      if (account.current !== businessId) return;
      setAnswer(`Bill ${purchase.number} was added to ${String(month).padStart(2, '0')}/${year} purchase books. It has not been filed with GST.`); setBill(null);
    } catch (caught) { if (account.current === businessId) setError(caught instanceof Error ? caught.message : 'Could not add the bill.'); }
    finally { if (account.current === businessId) setBillBusy(false); }
  }

  return <div className={'rb-ai-page' + (started ? ' has-conversation' : '')}>
    <header className="rb-ai-context"><div><span className="rb-ai-context-mark"><Icon name="spark" size={17}/></span><h1>RegisterBox AI</h1></div><Link href="/dashboard" className="rb-ai-business" aria-label="Choose your business on Overview"><Icon name="business" size={15}/><span>{business.id ? business.tradeName || business.legalName || 'Your business' : 'Choose a business'}</span><Icon name="chevron" size={13}/></Link></header>

    <div className="rb-ai-scroll"><div className="rb-ai-conversation">
      {!started ? <section className="rb-ai-welcome" aria-labelledby="ai-welcome-title"><span className="rb-ai-orb"><Icon name="spark" size={31}/></span><p className="rb-ai-eyebrow">A LITTLE CLARITY GOES A LONG WAY.</p><h2 id="ai-welcome-title">What’s your next big step?</h2><p>Make sense of the paperwork.<br/>Find a starting point. Keep moving.</p><div className="rb-ai-suggestions">{prompts.map(prompt => <button key={prompt.title} type="button" onClick={() => void ask(prompt.question)}><span className="rb-ai-suggestion-icon"><Icon name={prompt.icon} size={20}/></span><span><strong>{prompt.title}</strong><span>{prompt.detail}</span></span><span className="rb-ai-suggestion-arrow"><Icon name="chevron" size={15}/></span></button>)}</div></section> : <>
        {sentQuestion ? <div className="rb-ai-question"><span className="rb-ai-sr">Your question: </span>{sentQuestion}</div> : null}
        {loading ? <div className="rb-ai-response" role="status"><span className="rb-ai-response-mark"><Icon name="spark" size={21}/></span><div><p className="rb-ai-response-label">RegisterBox AI</p><p className="rb-ai-working"><span aria-hidden="true"/>Checking your saved profile and compliance guidance…</p></div></div> : (answer || actions.length > 0 || missingFacts.length > 0) ? <article className="rb-ai-response" aria-label="RegisterBox AI response"><span className="rb-ai-response-mark"><Icon name="spark" size={21}/></span><div><p className="rb-ai-response-label">RegisterBox AI</p><div className="rb-ai-answer">{answer}</div>{missingFacts.length ? <div className="rb-ai-missing"><Icon name="info" size={17}/><p><strong>A little more detail needed</strong>{missingFacts.join(', ')}</p></div> : null}<p className="rb-ai-answer-source">{answerSource === 'workflow_guide' ? 'RegisterBox workflow guide' : 'AI guidance'} · Knowledge {knowledgeVersion}</p>{actions.length ? <div className="rb-ai-actions">{actions.map(action => <button key={action} type="button" onClick={() => workflow(action)}>{GST_WORKFLOWS[action].label}<Icon name="arrow" size={16}/></button>)}</div> : null}</div></article> : null}
      </>}
      {workspace && business.id ? <section className="rb-ai-workflow" aria-label="Review your GST workflow"><div className="rb-ai-workflow-heading"><span><Icon name="receipt" size={18}/>{workspace === 'nil' ? 'Nil return' : workspace === 'tcs' ? 'TCS workpaper' : 'Marketplace reports'}</span><button type="button" onClick={() => setWorkspace(null)} aria-label="Close GST workflow"><Icon name="close" size={18}/></button></div>{workspace === 'nil' ? <GstAiNilLauncher key={business.id + 'nil' + nilForm} initialForm={nilForm}/> : <GstAiWorkspace key={business.id + workspace} businessId={business.id} operator={workspace === 'tcs'}/>}</section> : null}
      {bill ? <section className="rb-ai-workflow" aria-label="Review your extracted bill"><GstBillReview key={bill.extractionId} bill={bill} busy={billBusy} onApprove={addBill}/></section> : null}
      <ErrorBanner message={error}/>
    </div></div>

    <div className="rb-ai-compose-area"><div className="rb-ai-compose-inner">
      <div className="rb-ai-tools"><button type="button" onClick={() => void uploadBill()} disabled={billBusy}><Icon name="upload" size={17}/>{billBusy ? 'Reading bill…' : 'Upload a bill'}<span>Review a draft first</span></button><details><summary>GST tools<span aria-hidden="true">⌄</span></summary><div className="rb-ai-tools-menu"><button type="button" onClick={() => workflow('open_gst')}><Icon name="receipt" size={17}/>GST workspace</button><button type="button" onClick={() => workflow('upload_platform')}><Icon name="document" size={17}/>Platform / POS CSV</button><button type="button" onClick={() => workflow('review_tcs')}><Icon name="grid" size={17}/>GSTR-8 / TCS workpaper</button></div></details></div>
      <form className="rb-ai-composer" onSubmit={event => { event.preventDefault(); void ask(); }}>
        <label className="rb-ai-sr" htmlFor={questionId}>Your question for RegisterBox AI</label><textarea id={questionId} ref={inputRef} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(); } }} placeholder="Ask about your business…" rows={2} maxLength={10000}/>
        <div className="rb-ai-composer-bottom"><span><Icon name="shield" size={14}/> You stay in control of every action.</span><button type="submit" aria-label="Send question" aria-busy={loading || undefined} disabled={!question.trim() || loading}>{loading ? <span className="rb-ai-send-spinner" aria-hidden="true"/> : <Icon name="arrow" size={20}/>}</button></div>
      </form>
      <div className="rb-ai-permission"><label><input ref={consentRef} type="checkbox" checked={providerConsent} onChange={event => setProviderConsent(event.target.checked)} aria-describedby={consentDetailId}/><span>Allow Groq to answer using my redacted question and limited GST workflow status.</span></label><p id={consentDetailId}>PAN, GSTIN, Aadhaar, email and phone are removed first. <Link href="/privacy">Privacy & permissions <span aria-hidden="true">↗</span></Link></p></div>
      <p className="rb-ai-disclaimer">AI can make mistakes. Review important advice and extracted amounts. Nothing is filed automatically.</p>
    </div></div>
  </div>;
}
