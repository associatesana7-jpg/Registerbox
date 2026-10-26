import { Link, type Href } from 'expo-router';
import type { BlogArticle } from '@/data/blog';
import { useApp } from '@/hooks/use-app';
import { contact, servicePath } from './content';
import { blogPackagePrice, blogServiceOffers } from './blog-offers';
import { publicServices } from './service-pages';
import './blog-pricing.css';

function offerFor(article: BlogArticle) {
  const offers = blogServiceOffers(article.slug, article.serviceCategory);
  const quote = Boolean(article.enquiryOnly) || offers.quoteRequired;
  const item = offers.packages[0];
  const service = publicServices.find(service => service.category === article.serviceCategory);
  const application = ['gst_registration', 'food', 'retail', 'udyam', 'company', 'llp'].includes(article.serviceCategory);
  return {
    ...offers, quote, item,
    title: offers.freeNil ? 'Eligible nil GST filing' : quote ? service?.title || 'Business support' : item?.title || service?.title || 'RegisterBox support',
    price: offers.freeNil ? '₹0' : quote ? 'Let’s talk.' : item ? blogPackagePrice(item.amountPaise) : 'Let’s talk.',
    href: offers.freeNil ? '/gst' : quote ? `/contact?service=${encodeURIComponent(article.serviceCategory)}` : application || article.serviceCategory === 'gst' ? servicePath(article.serviceCategory) : item ? `/checkout?package=${encodeURIComponent(item.id)}` : servicePath(article.serviceCategory),
    action: offers.freeNil ? 'Check nil eligibility' : quote ? 'Get my quote' : application ? 'Start application' : article.serviceCategory === 'gst' ? 'Open GST workspace' : 'Review package',
  };
}

/** Price and the next safe action are readable before long editorial content. */
export function BlogPricingLead({ article }: { article: BlogArticle }) {
  const { session } = useApp();
  const offer = offerFor(article);
  const href: Href = !session && offer.href.startsWith('/onboarding/') ? { pathname: '/auth', params: { next: offer.href } } : offer.href as Href;
  const food = !offer.quote && offer.item?.serviceCategory === 'food';
  return <aside className="rbg-pricing-lead" id="service-next-step" aria-label="RegisterBox service and next step" lang="en">
    <div className="rbg-lead-top"><span>YOUR NEXT STEP</span><span className="rbg-lead-mark" aria-hidden="true">R<span>✦</span></span></div>
    <h2>{offer.title}</h2>
    <p className="rbg-lead-price">{offer.price}<span>{offer.freeNil ? 'RegisterBox service fee' : offer.quote ? 'Scope first. A quote for you.' : offer.item?.billingLabel}</span></p>
    <p className="rbg-lead-scope">{offer.freeNil ? 'For eligible nil GSTR-1 and GSTR-3B returns. Eligibility and filing authorisation still apply.' : offer.quote ? 'Tell us what you need. We’ll confirm the scope and fee before paid work begins.' : food ? 'Eligible Basic Registration · one premises. First annual government fee included. State/Central licences quoted separately.' : offer.item?.description}</p>
    <Link href={href} asChild><a className="rbg-lead-primary">{offer.action}<span aria-hidden="true">↗</span></a></Link>
    <div className="rbg-lead-secondary"><a href={contact.telephoneHref}>Call our team <span aria-hidden="true">↗</span></a><a href="#registerbox-services">{offer.packages.length > 1 ? 'Compare packages' : 'See the full scope'} <span aria-hidden="true">↓</span></a></div>
    <p className="rbg-lead-fee">{offer.freeNil ? 'No paid checkout. Statutory dues, if any, remain payable.' : offer.quote ? 'No commitment to pay from this enquiry.' : food ? 'No GST added to this package.' : 'No GST added. Government fees and statutory dues are separate where applicable.'}</p>
  </aside>;
}

export function BlogPricingDock({ article }: { article: BlogArticle }) {
  const { session } = useApp();
  const offer = offerFor(article);
  const href: Href = !session && offer.href.startsWith('/onboarding/') ? { pathname: '/auth', params: { next: offer.href } } : offer.href as Href;
  return <nav className="rbg-pricing-dock" aria-label="Service quick actions" lang="en">
    <a className="rbg-dock-price" href="#registerbox-services"><small>{offer.quote ? 'Your service quote' : offer.title}</small><strong>{offer.quote ? 'Let’s talk' : offer.price}</strong></a>
    <a className="rbg-dock-call" href={contact.telephoneHref}>Call</a>
    <Link href={href} asChild><a className="rbg-dock-start">{offer.freeNil ? 'Check eligibility' : offer.quote ? 'Get quote' : 'Get started'} <span aria-hidden="true">↗</span></a></Link>
  </nav>;
}
