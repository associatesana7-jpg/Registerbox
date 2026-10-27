import { usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { contact } from './content';
import './public-lead-prompt.css';

const STORAGE_KEY = 'registerbox.callback-prompt.v1';
const DISMISS_DAYS = 7;
const COMPLETE_DAYS = 180;
const choices = [
  { key: 'gst_registration', label: 'GST registration' },
  { key: 'gst_returns', label: 'GST returns & filing' },
  { key: 'company', label: 'Private limited company' },
  { key: 'llp', label: 'LLP registration' },
  { key: 'food', label: 'FSSAI / food licence' },
  { key: 'udyam', label: 'Udyam (MSME)' },
  { key: 'retail', label: 'Shop & establishment' },
  { key: 'other', label: 'Something else' },
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
  const title = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestInFlight = useRef(false);
  const startedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'service' | 'contact'>('service');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceKey, setServiceKey] = useState(inferredService(pathname));
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState('');
  const [complete, setComplete] = useState(false);
  const selected = useMemo(() => choices.find(choice => choice.key === serviceKey), [serviceKey]);

  const openPrompt = useCallback((requestedService?: string) => {
    if (requestInFlight.current) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (choices.some(choice => choice.key === requestedService)) setServiceKey(requestedService!);
    else setServiceKey(current => current || inferredService(pathname));
    setStep('service');
    setComplete(false);
    setConsent(false);
    setError('');
    setInvalidField('');
    startedAt.current = Date.now();
    setOpen(true);
    if (dialog.current?.open) dialog.current.setAttribute('data-visible', 'true');
  }, [pathname]);

  useEffect(() => {
    if (suppressionActive()) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const showWhenCalm = () => {
      if (suppressionActive()) return;
      const videoPlaying = Array.from(document.querySelectorAll('video')).some(video => !video.paused && !video.ended);
      if (document.visibilityState !== 'visible' || videoPlaying || document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
        retry = setTimeout(showWhenCalm, 5000);
        return;
      }
      openPrompt();
    };
    const timer = setTimeout(showWhenCalm, 10_000);
    return () => { clearTimeout(timer); if (retry) clearTimeout(retry); };
  }, [openPrompt]);

  useEffect(() => {
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ serviceKey?: string }>).detail;
      openPrompt(detail?.serviceKey);
    };
    const onCallbackLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (link?.href !== contact.callback || link.hasAttribute('download')) return;
      event.preventDefault();
      openPrompt();
    };
    window.addEventListener('registerbox:open-callback', onRequest);
    document.addEventListener('click', onCallbackLink);
    return () => {
      window.removeEventListener('registerbox:open-callback', onRequest);
      document.removeEventListener('click', onCallbackLink);
    };
  }, [openPrompt]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (!node.open) node.showModal();
      const frame = requestAnimationFrame(() => {
        node.setAttribute('data-visible', 'true');
        title.current?.focus({ preventScroll: true });
      });
      return () => {
        cancelAnimationFrame(frame);
        document.body.style.overflow = previousOverflow;
      };
    }
    if (node.open) {
      node.close();
      returnFocus.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    title.current?.focus({ preventScroll: true });
    dialog.current?.querySelector('.rb-lead-surface')?.scrollTo({ top: 0 });
  }, [step, complete, open]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const close = () => {
    if (!complete) suppressFor(DISMISS_DAYS);
    dialog.current?.removeAttribute('data-visible');
    closeTimer.current = setTimeout(() => setOpen(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  };

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]):not([tabindex="-1"])'))
      .filter(node => node.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }

  function validationError(message: string, field: string) {
    setError(message);
    setInvalidField(field);
    dialog.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    setError('');
    setInvalidField('');
    if (!selected) { setError('Choose the service you need.'); return; }
    if (step === 'service') { setStep('contact'); return; }
    const normalizedPhone = phone.replace(/\D/g, '');
    if (fullName.trim().length < 2) { validationError('Enter your name so we know how to address you.', 'fullName'); return; }
    if (!/^[6-9][0-9]{9}$/.test(normalizedPhone)) { validationError('Enter a valid 10-digit Indian mobile number.', 'phone'); return; }
    if (!consent) { validationError('Please allow RegisterBox to call about this request.', 'callbackConsent'); return; }
    requestInFlight.current = true;
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
    } finally { requestInFlight.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} className="rb-lead-dialog" aria-labelledby="rb-lead-title" aria-describedby="rb-lead-description" onKeyDown={trapFocus} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="rb-lead-surface">
      <button className="rb-lead-close" type="button" onClick={close} aria-label="Close callback form"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button>
      {complete ? <div className="rb-lead-success" role="status">
        <span className="rb-lead-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4 4L19 6"/></svg></span>
        <p className="rb-lead-eyebrow">You’re all set</p>
        <h2 ref={title} id="rb-lead-title" tabIndex={-1}>We’ll be in touch.</h2>
        <p id="rb-lead-description">A RegisterBox specialist will call you about <strong>{selected?.label}</strong>.</p>
        <button className="rb-lead-primary" type="button" onClick={close}>Continue browsing</button>
      </div> : <form onSubmit={submit} noValidate aria-busy={busy}>
        <div className="rb-lead-topline"><span>Let’s talk</span><span className="rb-lead-step" aria-label={`Step ${step === 'service' ? '1' : '2'} of 2`}>{step === 'service' ? '01' : '02'} <span aria-hidden="true">/ 02</span></span></div>
        <header className="rb-lead-heading">
          <h2 ref={title} id="rb-lead-title" tabIndex={-1}>{step === 'service' ? 'Your next step starts here.' : 'How can we reach you?'}</h2>
          <p id="rb-lead-description">{step === 'service' ? 'Choose what you need. We’ll help you move forward.' : 'Leave your details for a call with our team.'}</p>
        </header>
        <div className="rb-lead-progress" aria-hidden="true"><span/><span className={step === 'contact' ? 'is-current' : ''}/></div>
        {step === 'service' ? <fieldset className="rb-lead-services"><legend>Choose a service</legend>{choices.map(choice => <label key={choice.key} className={serviceKey === choice.key ? 'is-selected' : ''}>
          <input type="radio" name="callback-service" value={choice.key} checked={serviceKey === choice.key} onChange={() => { setServiceKey(choice.key); setError(''); }}/>
          <span>{choice.label}</span><i aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3.5 8 3 3 6-6"/></svg></i>
        </label>)}</fieldset> : <div className="rb-lead-contact-step">
          <div className="rb-lead-selection"><div><span>Your service</span><strong>{selected?.label}</strong></div><button type="button" disabled={busy} onClick={() => { setStep('service'); setError(''); setInvalidField(''); }}>Change</button></div>
          <div className="rb-lead-fields">
            <label htmlFor="rb-lead-name">Your name<input id="rb-lead-name" name="fullName" autoComplete="name" maxLength={80} value={fullName} aria-invalid={invalidField === 'fullName'} aria-describedby={invalidField === 'fullName' ? 'rb-lead-error' : undefined} onChange={event => { setFullName(event.target.value); setError(''); setInvalidField(''); }} placeholder="Full name" disabled={busy}/></label>
            <label htmlFor="rb-lead-mobile">Mobile number<span className="rb-lead-phone"><span aria-hidden="true">+91</span><input id="rb-lead-mobile" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} aria-invalid={invalidField === 'phone'} aria-describedby={invalidField === 'phone' ? 'rb-lead-error' : undefined} onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); setInvalidField(''); }} placeholder="10-digit mobile number" disabled={busy}/></span></label>
          </div>
          <label className="rb-lead-consent"><input name="callbackConsent" type="checkbox" checked={consent} aria-invalid={invalidField === 'callbackConsent'} aria-describedby={invalidField === 'callbackConsent' ? 'rb-lead-error' : undefined} disabled={busy} onChange={event => { setConsent(event.target.checked); setError(''); setInvalidField(''); }}/><span>I agree that RegisterBox may call me about this request. <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy notice</a></span></label>
        </div>}
        <label className="rb-lead-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></label>
        {error && <p id="rb-lead-error" className="rb-lead-error" role="alert">{error}</p>}
        <div className="rb-lead-actions"><button className="rb-lead-secondary" type="button" onClick={close}>Not now</button><button className="rb-lead-primary" type="submit" disabled={busy || !selected}>{busy ? 'Sending…' : step === 'service' ? 'Continue' : 'Request a callback'}{!busy && <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>}</button></div>
        <p className="rb-lead-footnote">{step === 'service' ? 'A little clarity. A good place to start.' : 'Just a conversation. No documents needed.'}</p>
      </form>}
    </div>
  </dialog>;
}
