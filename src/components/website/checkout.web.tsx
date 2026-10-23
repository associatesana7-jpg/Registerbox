import { Link, type Href, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';

import { useApp } from '@/hooks/use-app';
import { getServicePackage, servicePackages, type ServicePackage } from '@/lib/service-catalog';
import { applicationCategory, applicationCheckoutPackageIds, applicationPaymentPath, isApplicationId, loadApplicationCheckout, type ApplicationCheckout } from '@/lib/application-checkout.web';
import { ApplicationPaymentCard } from '@/components/application-payment-card.web';
import {
  clearPendingCheckout, createCheckoutOrder, loadRazorpayCheckout, openRazorpayCheckout,
  readPendingCheckout, rememberPendingCheckout, verifyCheckoutPayment,
  type CheckoutOrder, type PendingCheckoutPayment, type TrademarkCheckoutDetails, type VerifiedPayment,
} from '@/lib/razorpay-checkout.web';
import { WebBrand } from './brand.web';
import { contact, servicePath } from './content';
import { Seo } from './seo.web';
import './checkout.css';

const price = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
const filters = ['All services', 'Registrations', 'Trademark & DSC', 'GST & annual plans'] as const;
type PackageFilter = typeof filters[number];
type CheckoutState = 'idle' | 'preparing' | 'open' | 'verifying';
const packageHref = (item: ServicePackage) => `/checkout?package=${encodeURIComponent(item.id)}` as Href;
const isTrademark = (item: ServicePackage) => item.serviceCategory === 'trademark';
const subscribeToHydration = () => () => {};

function Icon({ name, size = 20 }: { name: 'lock' | 'check' | 'arrow' | 'shield' | 'file' | 'spark'; size?: number }) {
  const paths: Record<string, ReactNode> = {
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
    spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function matchesFilter(item: ServicePackage, filter: PackageFilter) {
  if (filter === 'All services') return true;
  if (filter === 'Trademark & DSC') return ['trademark', 'dsc'].includes(item.serviceCategory);
  if (filter === 'GST & annual plans') return ['gst', 'proprietorship', 'mca', 'income_tax'].includes(item.serviceCategory);
  return ['gst_registration', 'food', 'udyam', 'retail'].includes(item.serviceCategory);
}

export default function WebCheckout() {
  const { package: requested, application: requestedApplication } = useLocalSearchParams<{ package?: string; application?: string }>();
  // Static HTML has no query string. Match it during hydration, then select the
  // requested package without replacing the server-rendered public catalogue.
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const requestedId = hydrated ? (Array.isArray(requested) ? requested[0] : requested) : undefined;
  const applicationId = hydrated ? (Array.isArray(requestedApplication) ? requestedApplication[0] : requestedApplication) : undefined;
  const selected: ServicePackage = (requestedId ? getServicePackage(requestedId) : undefined) ?? servicePackages[0];
  const { session } = useApp();
  return <CheckoutPage key={`${session?.user.id || 'public'}:${selected.id}:${applicationId || ''}`} selected={selected} requestedId={requestedId} applicationId={applicationId}/>;
}

function CheckoutPage({ selected, requestedId, applicationId }: { selected: ServicePackage; requestedId?: string; applicationId?: string }) {
  const { session, loadingSession, business } = useApp();
  const [filter, setFilter] = useState<PackageFilter>('All services');
  const [state, setState] = useState<CheckoutState>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [enteredName, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [applicant, setApplicant] = useState<TrademarkCheckoutDetails['applicant_type']>(selected.id === 'trademark-non-msme' ? 'other' : 'individual_msme');
  const [enteredIdentifier, setIdentifier] = useState<string | null>(null);
  const [enteredBrand, setBrandName] = useState<string | null>(null);
  const [trademarkClass, setTrademarkClass] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState<PendingCheckoutPayment | null>(() => session ? readPendingCheckout(session.user.id) : null);
  const [confirmed, setConfirmed] = useState<{ result: VerifiedPayment; payment: PendingCheckoutPayment } | null>(null);
  const [testMode, setTestMode] = useState(Boolean(pending?.is_test_mode));
  const submitLock = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string; order?: CheckoutOrder } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [application, setApplication] = useState<ApplicationCheckout | null>(null);
  const [applicationError, setApplicationError] = useState('');
  const userId = session?.user.id;
  useEffect(() => {
    let active = true;
    if (!applicationId || !userId || !isApplicationId(applicationId)) return;
    loadApplicationCheckout(applicationId, userId).then(value => {
      if (!active) return;
      if (!applicationCheckoutPackageIds(applicationCategory(value)).includes(selected.id)) { setApplicationError('This package does not match your application. Return to its payment step to continue.'); return; }
      const savedPayment = readPendingCheckout(userId);
      if (savedPayment && value.orders.some(order => order.status === 'paid' && order.id === savedPayment.checkout_token)) { clearPendingCheckout(userId); setPending(null); }
      setApplication(value);
    }).catch(cause => { if (active) setApplicationError(cause instanceof Error ? cause.message : 'Could not check your application.'); });
    return () => { active = false; };
  }, [applicationId, userId, selected.id]);
  const needsApplication = !applicationId && ['gst_registration', 'food', 'retail', 'udyam'].includes(selected.serviceCategory);
  const applicationLoading = Boolean(applicationId && !application && !applicationError);
  const invalidApplication = Boolean(applicationId && !isApplicationId(applicationId));
  const name = enteredName ?? business.ownerName;
  const identifier = enteredIdentifier ?? (business.pan || business.gstin);
  const brandName = enteredBrand ?? business.tradeName ?? '';
  const busy = state !== 'idle';
  const trademark = isTrademark(selected);
  const next = `/checkout?package=${encodeURIComponent(selected.id)}${applicationId ? `&application=${encodeURIComponent(applicationId)}` : ''}`;
  const authHref: Href = { pathname: '/auth', params: { next } };

  async function verify(payment: PendingCheckoutPayment) {
    setState('verifying');
    setError('');
    setMessage('Confirming your payment securely…');
    try {
      const result = await verifyCheckoutPayment(payment);
      setConfirmed({ result, payment });
      if (result.status === 'paid') {
        clearPendingCheckout(payment.user_id);
        setPending(null);
        setMessage('Your payment is verified. Your RegisterBox service is ready for the next step.');
      } else {
        setMessage('Your payment is authorized and is awaiting capture. Check its status here before making another payment.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not confirm this payment yet.');
      setMessage('Your payment details are saved in this tab. Check the payment status below before paying again.');
    } finally { submitLock.current = false; setState('idle'); }
  }

  async function retryVerification() {
    if (submitLock.current || !pending) return;
    submitLock.current = true;
    await verify(pending);
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !session || loadingSession) return;
    if (needsApplication || applicationLoading || applicationError || invalidApplication) { setError('Complete your application and review its payment step before paying.'); return; }
    const existingPayment = pending || readPendingCheckout(session.user.id);
    if (existingPayment) { setPending(existingPayment); setError('Check your existing payment status before starting another payment.'); return; }
    if (!formRef.current?.reportValidity()) return;
    if (name.trim().length < 2) { setError('Enter your full name to continue.'); return; }
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s()-]/g, ''))) { setError('Enter a valid mobile number, including the country code if needed.'); return; }
    if (trademark && !/^([A-Z]{5}[0-9]{4}[A-Z]|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9])$/.test(identifier)) { setError('Enter a valid PAN or GSTIN for the trademark applicant.'); return; }
    if (trademark && brandName.trim().length < 2) { setError('Enter the brand name you want to file.'); return; }
    submitLock.current = true;
    setState('preparing');
    setError('');
    setMessage('Preparing your secure checkout…');
    try {
      const trademarkDetails: TrademarkCheckoutDetails | undefined = trademark ? { applicant_type: applicant, pan_or_gstin: identifier, brand_name: brandName.trim(), trademark_class: Number(trademarkClass) } : undefined;
      const input = { package_id: selected.id, business_id: application?.business_id || business.id || undefined, application_id: application?.id, trademark: trademarkDetails };
      const fingerprint = JSON.stringify(input);
      if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: window.crypto.randomUUID() };
      await loadRazorpayCheckout();
      const order = intent.current.order || await createCheckoutOrder({ ...input, idempotency_key: intent.current.key });
      intent.current.order = order;
      if (order.amount !== selected.amountPaise) throw new Error('This package fee has changed. Refresh this page to review the current fee before paying.');
      setTestMode(order.is_test_mode);
      setState('open');
      setMessage(order.is_test_mode ? 'Test checkout is open. No real payment will be collected.' : 'Secure checkout is open. Choose your preferred payment method.');
      openRazorpayCheckout(order, {
        title: selected.title, name: name.trim(), email: session.user.email || '', contact: phone.replace(/[\s()-]/g, '') || undefined,
        onSuccess: payment => {
          const saved: PendingCheckoutPayment = { ...payment, checkout_token: order.checkout_token, package_id: selected.id, user_id: session.user.id, is_test_mode: order.is_test_mode, application_id: application?.id };
          rememberPendingCheckout(saved);
          setPending(saved);
          void verify(saved);
        },
        onDismiss: () => {
          submitLock.current = false;
          setState('idle');
          setMessage('Checkout closed. Your package is still selected, so you can continue when you’re ready.');
        },
        onFailure: failure => { setError(failure); setMessage('The payment was not completed. You can retry inside the secure payment window.'); },
      });
    } catch (cause) {
      submitLock.current = false;
      setState('idle');
      setMessage('');
      setError(cause instanceof Error ? cause.message : 'Could not open checkout. Please try again.');
    }
  }

  const confirmedPackage = confirmed ? getServicePackage(confirmed.payment.package_id) : undefined;
  const pendingPackage = pending ? getServicePackage(pending.package_id) : undefined;
  const showResult = confirmed?.result.status === 'paid';
  const shown = servicePackages.filter(item => matchesFilter(item, filter));

  if (application && (application.orders.some(order => order.status === 'paid' || order.status === 'authorized' && !pending) || ['APPROVED', 'CANCELLED', 'REJECTED'].includes(application.status))) return <div className="rb-public-page rb-checkout"><header className="rb-ck-header rb-ck-container"><WebBrand/><Link href="/compliance">My applications ↗</Link></header><main className="rb-ck-container" style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 60 }}><ApplicationPaymentCard applicationId={application.id}/></main></div>;

  return <div className="rb-public-page rb-checkout">
    <Seo title="Service Packages & Secure Checkout | RegisterBox" description="GST registration ₹1,999, FSSAI ₹2,999, Udyam ₹499, trademark, DSC and annual compliance plans. Clear RegisterBox fees and secure Razorpay checkout." path="/checkout"/>
    <a className="rb-skip" href="#checkout-main">Skip to checkout</a>
    <header className="rb-ck-header rb-ck-container"><WebBrand/><div><span className="rb-ck-security"><Icon name="lock" size={15}/> Secure checkout</span><a href={contact.telephoneHref}>Need help? <span>Call our team ↗</span></a></div></header>

    <main id="checkout-main" className="rb-ck-container">
      <section className="rb-ck-intro">
        <div><p className="rb-ck-kicker"><span/> YOUR NEXT CHAPTER</p><h1>A clear fee.<br/><span>A confident start.</span></h1><p>Choose the right support for your business.<br className="rb-ck-desktop-break"/> Review your package, then pay securely.</p></div>
        <div className="rb-ck-intro-note"><div className="rb-ck-intro-icon"><Icon name="shield" size={30}/></div><div><strong>Your business. Sorted.</strong><span>Clear scope · Guided support<br/>Secure payment by Razorpay</span></div></div>
      </section>

      {requestedId && !getServicePackage(requestedId) && <p className="rb-ck-notice" role="status">That package is unavailable. Browse the current packages below and choose one to continue.</p>}
      {applicationId && <div className="rb-ck-notice" role={applicationError || invalidApplication ? 'alert' : 'status'}>{invalidApplication ? 'This application reference is invalid. Open a case from My applications.' : applicationError || (applicationLoading ? 'Checking your application and its payment status…' : `Application saved · ${application?.application_number || application?.id} · ${application?.businessName}`)} <Link href={isApplicationId(applicationId) ? applicationPaymentPath(applicationId) as Href : '/compliance'}>View application payment step ↗</Link></div>}

      <div className="rb-ck-layout">
        <div className="rb-ck-main-column">
          <section id="selected-package" className="rb-ck-selected" aria-labelledby="selected-package-title">
            <div className="rb-ck-section-label"><span>01</span><h2>Your package</h2>{!applicationId && <a href="#service-packages">Change package <span aria-hidden="true">↗</span></a>}</div>
            <div className="rb-ck-selected-body"><div className="rb-ck-selected-top"><div className="rb-ck-service-icon"><Icon name={trademark ? 'shield' : 'file'} size={26}/></div><div>{selected.tag && <span className="rb-ck-package-tag">{selected.tag}</span>}<h3 id="selected-package-title">{selected.title}</h3></div></div><p className="rb-ck-description">{selected.description}</p><ul className="rb-ck-inclusions">{selected.includes.map(item => <li key={item}><span><Icon name="check" size={13}/></span>{item}</li>)}</ul><div className="rb-ck-fee-note"><Icon name="file" size={16}/><p>{selected.feeNote}</p></div></div>
          </section>

          <section className="rb-ck-details" aria-labelledby="checkout-details-title">
            <div className="rb-ck-section-label"><span>02</span><h2 id="checkout-details-title">{trademark ? 'Applicant & contact details' : 'Your contact details'}</h2><Icon name="lock" size={17}/></div>
            {needsApplication ? <div className="rb-ck-signin"><div className="rb-ck-signin-icon"><Icon name="file" size={27}/></div><h3>Your application first. Payment next.</h3><p>Complete and submit your registration details and documents. We’ll bring you back to secure checkout with your application reference and this exact fee.</p><Link className="rb-ck-primary" href={servicePath(selected.serviceCategory) as Href}>Start my application <Icon name="arrow" size={18}/></Link><span>Details → Submit to RegisterBox → Review & pay</span></div> : !session ? <div className="rb-ck-signin"><div className="rb-ck-signin-icon"><Icon name="shield" size={27}/></div><h3>A secure start, with your account.</h3><p>Sign in with your email to connect this service and payment to your RegisterBox account. Your selected package comes with you.</p><Link className="rb-ck-primary" href={authHref}>Sign in to continue <Icon name="arrow" size={18}/></Link><span>No password to remember. Just a secure email code.</span></div> : <form ref={formRef} id="rb-checkout-form" className="rb-ck-form" onSubmit={event => void pay(event)}>
              {trademark && <fieldset className="rb-ck-trademark" disabled={busy || Boolean(pending) || showResult}>
                <legend>Trademark applicant</legend><div className="rb-ck-applicants" role="group" aria-label="Trademark applicant type"><button type="button" aria-pressed={applicant === 'individual_msme'} onClick={() => setApplicant('individual_msme')}>Individual / MSME<span>Individual or eligible MSME applicant</span></button><button type="button" aria-pressed={applicant === 'other'} onClick={() => setApplicant('other')}>Other applicants<span>Companies and other entities</span></button></div><p className="rb-ck-field-help">Government filing fees depend on applicant eligibility and the number of classes. They are confirmed separately before filing.</p>
                <div className="rb-ck-fields"><label htmlFor="ck-pan">Applicant PAN / GSTIN <span>*</span><input id="ck-pan" autoCapitalize="characters" autoComplete="off" maxLength={15} value={identifier} onChange={event => setIdentifier(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} placeholder="Enter PAN or GSTIN" required/></label><label htmlFor="ck-brand">Brand name <span>*</span><input id="ck-brand" autoComplete="off" maxLength={50} value={brandName} onChange={event => setBrandName(event.target.value)} placeholder="Your brand name" required minLength={2}/></label><label className="rb-ck-full-field" htmlFor="ck-class">Trademark class <span>*</span><select id="ck-class" value={trademarkClass} onChange={event => setTrademarkClass(event.target.value)} required><option value="" disabled>Choose your class</option>{Array.from({ length: 45 }, (_, index) => index + 1).map(value => <option key={value} value={value}>Class {value}</option>)}</select><small>Not sure which class fits? <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Ask our team before paying ↗</a></small></label></div>
              </fieldset>}
              <fieldset className="rb-ck-contact-fields" disabled={busy || Boolean(pending) || showResult}><legend className="rb-visually-hidden">Purchaser details</legend><div className="rb-ck-fields"><label htmlFor="ck-name">Full name <span>*</span><input id="ck-name" name="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" required minLength={2} maxLength={100}/></label><label htmlFor="ck-phone">Mobile number <small>Optional</small><input id="ck-phone" name="tel" type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+91 98765 43210" maxLength={22}/></label><label className="rb-ck-full-field" htmlFor="ck-email">Account email<Icon name="lock" size={13}/><input id="ck-email" type="email" value={session.user.email || ''} readOnly/><small>Your payment will be connected to this account.</small></label></div><label className="rb-ck-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required/><span>I’ve reviewed the package, final fee and <Link href={{ pathname: '/policies', params: { section: 'service' } }}>service information</Link>.</span></label></fieldset>
            </form>}
          </section>
        </div>

        <aside className="rb-ck-summary-column" aria-label="Order summary">
          <section className="rb-ck-summary"><div className="rb-ck-summary-heading"><Icon name="lock" size={18}/><h2>{showResult ? 'Payment confirmed' : 'Order summary'}</h2><span>INR</span></div>
            {showResult ? <div className="rb-ck-complete" role="status"><div><Icon name="check" size={29}/></div><h3>{testMode ? 'Test payment verified.' : 'You’re all set.'}</h3><p>{confirmedPackage?.title}</p><span>Payment ID</span><code>{confirmed?.payment.razorpay_payment_id}</code><Link className="rb-ck-primary" href={confirmed?.payment.application_id ? { pathname: '/application-details', params: { id: confirmed.payment.application_id } } : '/dashboard'}>{confirmed?.payment.application_id ? 'View your application' : 'Open your workspace'} <Icon name="arrow" size={18}/></Link><p className="rb-ck-success-note">Our team will confirm the documents and next steps for your service.</p></div> : <><div className="rb-ck-summary-item"><span>REGISTERBOX SERVICE</span><h3>{pendingPackage?.title || selected.title}</h3><p>{pendingPackage?.billingLabel || selected.billingLabel}</p></div><div className="rb-ck-price-row"><span>Service fee</span><strong>{price((pendingPackage || selected).amountPaise)}</strong></div><div className="rb-ck-total"><div><span>Total payable now</span><small>Final RegisterBox fee</small></div><strong>{price((pendingPackage || selected).amountPaise)}</strong></div><p className="rb-ck-summary-fee-note">{(pendingPackage || selected).feeNote}</p>
              {testMode && <p className="rb-ck-test-mode">TEST MODE · No real payment collected</p>}
              {pending ? <div className="rb-ck-pending"><strong>{confirmed?.result.status === 'authorized' ? 'Payment authorized' : 'Confirm your existing payment'}</strong><p>{confirmed?.result.status === 'authorized' ? 'Capture is pending. Check the status here; no additional payment is needed.' : 'We have your payment response. Check its status before starting a new payment.'}</p><code>{pending.razorpay_payment_id}</code><button type="button" className="rb-ck-primary" disabled={busy} onClick={() => void retryVerification()}>{state === 'verifying' ? 'Checking payment…' : 'Check payment status'}<Icon name="arrow" size={18}/></button></div> : needsApplication ? <Link className="rb-ck-primary" href={servicePath(selected.serviceCategory) as Href}>Start application, then pay <Icon name="arrow" size={18}/></Link> : session ? <button type="submit" form="rb-checkout-form" className="rb-ck-primary" disabled={busy || loadingSession || !accepted || applicationLoading || Boolean(applicationError) || invalidApplication}>{state === 'preparing' ? 'Preparing checkout…' : state === 'open' ? 'Payment window open' : state === 'verifying' ? 'Verifying payment…' : <>Pay {price(selected.amountPaise)} securely<Icon name="arrow" size={18}/></>}</button> : <Link href={authHref} className="rb-ck-primary">Sign in to continue<Icon name="arrow" size={18}/></Link>}
              <div className="rb-ck-payment-methods"><span>UPI</span><i/> <span>Cards</span><i/><span>Netbanking</span></div><p className="rb-ck-powered"><Icon name="shield" size={14}/> Secure payment by <strong>Razorpay</strong></p></>}
          </section>
          <div className="rb-ck-feedback" aria-live="polite" aria-atomic="true">{error && <p className="rb-ck-error" role="alert">{error}</p>}{message && <p className="rb-ck-message" role="status">{message}</p>}</div>
          <div className="rb-ck-human-help"><span className="rb-ck-human-avatar">R<span/></span><div><strong>A real team, a message away.</strong><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Talk to RegisterBox <span aria-hidden="true">↗</span></a></div></div>
        </aside>
      </div>

      {!applicationId && <section id="service-packages" className="rb-ck-catalog" aria-labelledby="checkout-packages-title"><div className="rb-ck-catalog-heading"><div><p className="rb-ck-kicker"><span/> SUPPORT THAT FITS</p><h2 id="checkout-packages-title">One business. Many next steps.</h2></div><p>Every package has a clear scope.<br/>Choose what you need today.</p></div><div className="rb-ck-filters" role="group" aria-label="Filter packages">{filters.map(item => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="rb-ck-package-grid">{shown.map(item => <article key={item.id} className={`rb-ck-package-card ${item.id === selected.id ? 'is-selected' : ''}`}><div className="rb-ck-card-top"><span>{item.serviceCategory === 'trademark' ? 'PROTECT YOUR BRAND' : item.serviceCategory === 'dsc' ? 'SIGN WITH CONFIDENCE' : ['gst', 'proprietorship', 'mca'].includes(item.serviceCategory) ? 'STAY ON TRACK' : 'YOUR BUSINESS ESSENTIALS'}</span>{item.tag && <b>{item.tag}</b>}</div><h3><Link href={packageHref(item)}>{item.title}</Link></h3><p>{item.description}</p><div className="rb-ck-card-price"><strong>{price(item.amountPaise)}</strong><span>{item.billingLabel}</span></div><ul>{item.includes.map(inclusion => <li key={inclusion}><Icon name="check" size={14}/><span>{inclusion}</span></li>)}</ul><p className="rb-ck-card-note">{item.feeNote}</p><Link href={packageHref(item)} className="rb-ck-card-action" aria-current={item.id === selected.id ? 'true' : undefined}>{item.id === selected.id ? 'Selected package' : 'Choose package'}<Icon name={item.id === selected.id ? 'check' : 'arrow'} size={18}/></Link></article>)}</div></section>}

      <section className="rb-ck-free"><div className="rb-ck-free-icon"><Icon name="spark" size={29}/></div><div><span>ELIGIBLE NIL RETURNS</span><h2>Nil business activity?<br className="rb-ck-mobile-break"/> Nil RegisterBox filing fee.</h2><p>Eligible nil GSTR-1 and GSTR-3B filing comes with a ₹0 RegisterBox service fee. Check your eligibility in the GST workspace.</p></div><Link href={'/services/free-nil-gst-filing' as Href}>Explore free nil filing <Icon name="arrow" size={18}/></Link></section>
      <section className="rb-ck-next-steps" aria-label="What happens after payment"><h2>A little clarity on what happens next.</h2><div><article><span>01</span><h3>Submit your details</h3><p>For registration services, complete the application and document checklist first.</p></article><article><span>02</span><h3>Review & pay securely</h3><p>Pay the matching service fee. Your payment is linked to your application.</p></article><article><span>03</span><h3>Move forward, together</h3><p>Track your business journey with support from the RegisterBox team.</p></article></div></section>
    </main>
    <footer className="rb-ck-footer rb-ck-container"><span>© {new Date().getFullYear()} RegisterBox</span><nav aria-label="Checkout information"><Link href="/services">All services</Link><Link href="/privacy">Privacy</Link><Link href={{ pathname: '/policies', params: { section: 'service' } }}>Service information</Link><Link href="/contact">Contact us</Link></nav></footer>
  </div>;
}
