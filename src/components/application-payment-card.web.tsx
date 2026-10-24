import { Link, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { applicationCategory, applicationCheckoutPackageIds, applicationCheckoutPath, isApplicationId, loadApplicationCheckout, type ApplicationCheckout } from '@/lib/application-checkout.web';
import { getServicePackage } from '@/lib/service-catalog';
import { readPendingCheckout } from '@/lib/razorpay-checkout.web';
import { usePaymentJourney } from '@/lib/payment-journey.web';
import { contact } from './website/content';
import './website/application-payment.css';

const price = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);

export function ApplicationPaymentCard({ applicationId }: { applicationId: string }) {
  const { session } = useApp();
  return <PaymentCard key={`${session?.user.id || 'signed-out'}:${applicationId}`} applicationId={applicationId}/>;
}

function PaymentCard({ applicationId }: { applicationId: string }) {
  const { session } = useApp();
  const [application, setApplication] = useState<ApplicationCheckout | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const userId = session?.user.id;
  useEffect(() => {
    let active = true;
    if (!userId || !isApplicationId(applicationId)) return;
    loadApplicationCheckout(applicationId, userId).then(value => { if (active) { setApplication(value); setError(''); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load payment details.'); });
    return () => { active = false; };
  }, [applicationId, userId, revision]);
  const packages = application ? applicationCheckoutPackageIds(applicationCategory(application), application).flatMap(id => { const item = getServicePackage(id); return item ? [item] : []; }) : [];
  const received = application?.orders.find(order => order.status === 'paid' || order.status === 'authorized');
  const closed = Boolean(application && ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status));
  const journey = usePaymentJourney(userId && application && packages[0] ? {
    userId, packageId: packages[0].id, applicationId: application.id, businessId: application.business_id,
  } : null, !received && !closed);
  if (!isApplicationId(applicationId)) return <section className="rb-ap-card"><h2>Open a submitted application</h2><p>Choose a case from My applications to review its payment step.</p><Link href="/compliance">My applications ↗</Link></section>;
  if (error) return <section className="rb-ap-card"><h2>Check payment details</h2><p role="alert">{error}</p><button type="button" className="rb-ap-button" onClick={() => { setError(''); setRevision(value => value + 1); }}>Try again</button></section>;
  if (!application) return <section className="rb-ap-card" aria-busy="true"><h2>Checking your application…</h2><p>Loading its service and payment status.</p></section>;
  const pending = userId ? readPendingCheckout(userId) : null;
  const quoteHref = `${contact.whatsapp}?text=${encodeURIComponent(`Please confirm the scope and quote for my ${application.services?.name || 'registration'} application ${application.application_number || application.id}.`)}`;
  return <section className="rb-ap-card" aria-labelledby={`payment-${applicationId}`}>
    <div className="rb-ap-eyebrow"><span aria-hidden="true">✓</span> APPLICATION SAVED · NEXT STEP</div>
    <h2 id={`payment-${applicationId}`}>{received ? received.status === 'paid' ? 'Your service payment is confirmed.' : 'Your payment is being confirmed.' : closed ? 'Your application record.' : packages.length ? 'Complete your service payment.' : 'Confirm your service quote.'}</h2>
    <p>{application.businessName} · {application.services?.name}<br/><strong>Reference: {application.application_number || application.id}</strong></p>
    {received ? <div className="rb-ap-receipt" role="status"><strong>{received.status === 'paid' ? 'Payment verified' : 'Payment authorized · capture pending'} · {price(received.amount)}</strong><p>{received.status === 'paid' ? 'Your payment is linked to this application. Our team can continue with the agreed service.' : 'No additional payment is needed. If you have the checkout tab open, use Check payment status there, or ask our team to confirm capture.'}</p>{received.razorpay_payment_id && <code>{received.razorpay_payment_id}</code>}</div> : closed ? <p>This case is {application.status.toLowerCase()}. Contact your team about any outstanding service work.</p> : packages.length ? <div className="rb-ap-packages">{packages.map(item => <div className="rb-ap-package" key={item.id}><div><h3>{item.title}</h3><span>{item.billingLabel} · No GST added</span></div><strong>{price(item.amountPaise)}</strong><p>{item.feeNote}</p><Link className="rb-ap-button" href={applicationCheckoutPath(application.id, item.id) as Href} onPress={() => journey?.record('checkout_cta_clicked')}>Review & pay securely <span aria-hidden="true">↗</span></Link></div>)}</div> : <><p>Your application needs a scope review before we can confirm a fee. Request your quote with this application reference. There is no charge at this step.</p><a className="rb-ap-button" href={quoteHref} target="_blank" rel="noopener noreferrer">Request my service quote <span aria-hidden="true">↗</span></a></>}
    <p className="rb-ap-footnote">{received ? 'Your receipt keeps its original amount and agreed scope. Payment does not establish government submission or approval.' : applicationCategory(application) === 'food' ? packages.length ? 'This Basic package includes the first annual ₹100 government registration fee. Future annual fees and additional work are separate. Government submission and approval are separate steps.' : 'The team will confirm your food-business scope, fee and inclusions before payment. A quote request does not submit an application to the government.' : 'Payment covers RegisterBox’s agreed assistance. Government submission, approval, statutory dues and any additional fees remain separate.'}</p>
    {pending?.application_id === application.id && application.orders.some(order => order.id === pending.checkout_token && order.package_id === pending.package_id && ['pending_payment', 'authorized'].includes(order.status)) && <Link className="rb-ap-button" href={applicationCheckoutPath(application.id, pending.package_id) as Href}>Check existing payment status ↗</Link>}
    <Link className="rb-ap-record" href={{ pathname: '/application-details', params: { id: application.id } }}>View application & documents ↗</Link>
  </section>;
}
