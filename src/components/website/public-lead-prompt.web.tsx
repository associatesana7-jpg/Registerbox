import { usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import './public-lead-prompt.css';

const STORAGE_KEY = 'registerbox.callback-prompt.v1';
const DISMISS_DAYS = 7;
const COMPLETE_DAYS = 180;
const choices = [
  { key: 'gst_registration', label: 'GST registration', mark: 'GST' },
  { key: 'gst_returns', label: 'GST returns & filing', mark: '3B' },
  { key: 'company', label: 'Private limited company', mark: 'PVT' },
  { key: 'llp', label: 'LLP registration', mark: 'LLP' },
  { key: 'food', label: 'FSSAI / food licence', mark: 'FSSAI' },
  { key: 'udyam', label: 'Udyam (MSME)', mark: 'MSME' },
  { key: 'retail', label: 'Shop & establishment', mark: 'SHOP' },
  { key: 'other', label: 'Something else', mark: 'MORE' },
] as const;

function inferredService(pathname: string) {
  const value = pathname.toLowerCase();
  if (/gstr|gst-return/.test(value)) return 'gst_returns';
  if (/gst/.test(value)) return 'gst_registration';
  if (/fssai|food/.test(value)) return 'food';
  if (/udyam|msme/.test(value)) return 'udyam';
  if (/shop|establishment/.test(value)) return 'retail';
  if (/llp/.test(value)) return 'llp';
  if (/company|private-limited|opc/.test(value)) return 'company';
  return '';
}

function suppressionActive() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as { until?: number };
    return typeof parsed.until === 'number' && parsed.until > Date.now();
  } catch { return false; }
}

function suppressFor(days: number) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ until: Date.now() + days * 86400000 })); }
  catch { /* The prompt still works when storage is unavailable. */ }
}

export function PublicLeadPrompt() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const startedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceKey, setServiceKey] = useState(inferredService(pathname));
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const selected = useMemo(() => choices.find(choice => choice.key === serviceKey), [serviceKey]);

  useEffect(() => {
    if (suppressionActive()) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const showWhenCalm = () => {
      if (document.visibilityState !== 'visible' || document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
        retry = setTimeout(showWhenCalm, 5000);
        return;
      }
      startedAt.current = Date.now();
      setOpen(true);
    };
    const timer = setTimeout(showWhenCalm, 10_000);
    return () => { clearTimeout(timer); if (retry) clearTimeout(retry); };
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      requestAnimationFrame(() => node.setAttribute('data-visible', 'true'));
    }
    if (!open && node.open) node.close();
  }, [open]);

  const close = () => {
    suppressFor(DISMISS_DAYS);
    dialog.current?.removeAttribute('data-visible');
    window.setTimeout(() => setOpen(false), 220);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const normalizedPhone = phone.replace(/\D/g, '');
    if (!selected) { setError('Choose the service you need.'); return; }
    if (fullName.trim().length < 2) { setError('Enter your name.'); return; }
    if (!/^[6-9][0-9]{9}$/.test(normalizedPhone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    if (!consent) { setError('Please allow RegisterBox to call about this request.'); return; }
    setBusy(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke('public-lead-intake', {
        body: {
          fullName: fullName.trim(), phone: normalizedPhone, serviceKey: selected.key,
          sourcePath: pathname, locale: document.documentElement.lang || 'en',
          callbackConsent: true, website, startedAt: startedAt.current,
        },
      });
      if (invokeError) {
        const detail = await (invokeError.context as Response | undefined)?.clone().json().catch(() => null) as { error?: string } | null;
        throw new Error(detail?.error || invokeError.message);
      }
      suppressFor(COMPLETE_DAYS);
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save the callback request. Please try again.');
    } finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="rb-lead-dialog" aria-labelledby="rb-lead-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="rb-lead-surface">
      <button className="rb-lead-close" type="button" onClick={close} aria-label="Close callback form">×</button>
      {complete ? <div className="rb-lead-success" role="status">
        <span aria-hidden="true">✓</span><p>CALLBACK REQUEST RECEIVED</p><h2 id="rb-lead-title">We’ll take it from here.</h2>
        <p>A RegisterBox specialist will call you about <strong>{selected?.label}</strong>. No need to submit the form again.</p>
        <button type="button" onClick={() => { dialog.current?.removeAttribute('data-visible'); window.setTimeout(() => setOpen(false), 220); }}>Continue browsing</button>
      </div> : <form onSubmit={submit} noValidate>
        <div className="rb-lead-heading"><span className="rb-lead-spark" aria-hidden="true">✦</span><div><p>YOUR NEXT STEP, MADE CLEAR</p><h2 id="rb-lead-title">What can we help you get done?</h2><span>Choose one service. A RegisterBox specialist can call you back.</span></div></div>
        <fieldset className="rb-lead-services"><legend>Choose a service</legend>{choices.map(choice => <label key={choice.key} className={serviceKey === choice.key ? 'is-selected' : ''}><input type="radio" name="callback-service" value={choice.key} checked={serviceKey === choice.key} onChange={() => { setServiceKey(choice.key); setError(''); }}/><span className="rb-lead-mark" aria-hidden="true">{choice.mark}</span><span>{choice.label}</span><i aria-hidden="true">✓</i></label>)}</fieldset>
        <div className="rb-lead-fields"><label>Your name<input autoFocus autoComplete="name" maxLength={80} value={fullName} onChange={event => { setFullName(event.target.value); setError(''); }} placeholder="e.g. Asha Rao"/></label><label>Mobile number<span className="rb-lead-phone"><b>+91</b><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} placeholder="10-digit number"/></span></label></div>
        <label className="rb-lead-consent"><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); setError(''); }}/><span>I agree that RegisterBox may call me about this request. See our <a href="/privacy" target="_blank">privacy notice</a>.</span></label>
        <label className="rb-lead-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></label>
        {error && <p className="rb-lead-error" role="alert">{error}</p>}
        <div className="rb-lead-actions"><button type="submit" disabled={busy}>{busy ? 'Saving your request…' : 'Request a callback'}<span aria-hidden="true">↗</span></button><button type="button" onClick={close}>Not now</button></div>
        <p className="rb-lead-footnote">No spam. No document uploads. Just a quick call about the service you chose.</p>
      </form>}
    </div>
  </dialog>;
}
