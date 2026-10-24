import { Link, type Href } from 'expo-router';
import type { BlogArticle } from '@/data/blog';
import { servicePath } from './content';
import { publicServicePath, publicServices } from './service-pages';
import { blogPackagePrice, blogServiceOffers } from './blog-offers';

type ArticleWithEnquiry = BlogArticle & { enquiryOnly?: boolean; howToSection?: string };

export function BlogOffers({ article }: { article: ArticleWithEnquiry }) {
  const { packages, freeNil, quoteRequired: requiresQuote } = blogServiceOffers(article.slug, article.serviceCategory);
  const quoteRequired = Boolean(article.enquiryOnly) || requiresQuote;
  const hasFoodOffer = packages.some(item => item.serviceCategory === 'food');
  const service = publicServices.find(item => item.category === article.serviceCategory);
  const landing = publicServicePath(article.serviceCategory);
  const processHref = freeNil ? '/services/free-nil-gst-filing#nil-steps-title' : service ? `${landing}#application-start` : article.howToSection ? `#${article.howToSection}` : '/services';
  const start = article.enquiryOnly ? `/contact?service=${encodeURIComponent(article.slug)}` : servicePath(article.serviceCategory);
  return <aside className="rbg-service-cta rbg-offers" id="registerbox-services" aria-labelledby="blog-offers-title" lang="en">
    <div className="rbg-kicker">FROM READING TO YOUR NEXT STEP</div>
    <h2 id="blog-offers-title">{freeNil ? 'Eligible nil GST filing is free.' : 'Clear fees. Ready when you are.'}</h2>
    <p>{freeNil ? 'The RegisterBox service fee for eligible nil GSTR-1 and GSTR-3B filing is ₹0. Check your eligibility and review your return in the GST workspace; there is no paid checkout for this free service.' : hasFoodOffer ? 'Start with your food-business details and document checklist. Basic Registration eligibility is reviewed before you confirm the package and pay securely.' : 'Start with the process and document checklist, or review a relevant package before secure Razorpay payment. Choose only the support your business needs.'}</p>
    <div className="rbg-offer-actions">
      <Link href={processHref as Href} data-service-process="true">See the {freeNil ? 'nil filing' : 'registration & service'} process <span aria-hidden="true">↗</span></Link>
      <Link href={(freeNil ? '/gst' : start) as Href}>{freeNil ? 'Start free nil filing' : quoteRequired ? 'Submit details for a quote' : start === '/gst' ? 'Open GST workspace' : start.startsWith('/contact') ? 'Discuss your application' : 'Start your application'} <span aria-hidden="true">↗</span></Link>
    </div>
    {quoteRequired && <div className="rbg-quote-note"><strong>{service?.title || 'Your service'}: scope and fee by quotation.</strong><p>Submit your business details for review. Your requirements and any government charges are confirmed before paid work begins.</p><Link href={`/contact?service=${encodeURIComponent(article.serviceCategory)}` as Href}>Ask for a quote <span aria-hidden="true">↗</span></Link></div>}
    {packages.length > 0 && <><h3 className="rbg-offer-heading">{quoteRequired ? 'Related packages, when you need them' : 'Relevant RegisterBox packages'}</h3><p className="rbg-offer-note">{hasFoodOffer ? 'The eligible Basic Registration package includes the first annual government registration fee. No GST is added. State/Central licences are quoted separately; future annual fees and additional work are outside this package. Other government charges and statutory dues, where applicable, are separate.' : 'Final service fees below. No GST is added. Government charges, taxes or statutory dues, where applicable, are separate.'}</p><div className="rbg-offer-grid">{packages.map(item => <article className="rbg-offer-card" key={item.id}>
      <h4>{item.title}</h4><div className="rbg-offer-price">{blogPackagePrice(item.amountPaise)}<span>{item.billingLabel}</span></div><p>{item.description}</p><details><summary>Included support & fee details</summary><ul>{item.includes.map(inclusion => <li key={inclusion}>{inclusion}</li>)}</ul><p>{item.feeNote}</p></details><Link href={(item.serviceCategory === 'food' ? servicePath('food') : `/checkout?package=${encodeURIComponent(item.id)}`) as Href} aria-label={item.serviceCategory === 'food' ? 'Start your FSSAI application for eligibility review' : `Review ${item.title} and pay securely for ${blogPackagePrice(item.amountPaise)}`}>{item.serviceCategory === 'food' ? 'Start FSSAI application' : 'Review & pay securely'} <span aria-hidden="true">↗</span></Link>
    </article>)}</div><p className="rbg-offer-note">After you submit a registration application, you can review the relevant package and payment step. Payment confirms your service order; government filing and approval remain separate.</p></>}
    {!freeNil && ['gst', 'gst_registration', 'new', 'existing'].includes(article.serviceCategory) && <Link className="rbg-free-link" href={'/services/free-nil-gst-filing' as Href}>Have an eligible nil GST return? RegisterBox filing support is ₹0 <span aria-hidden="true">↗</span></Link>}
    <Link className="rbg-offer-help" href="/contact">Unsure which route fits? Ask RegisterBox <span aria-hidden="true">↗</span></Link>
  </aside>;
}

export function BlogPriceSummary({ article, path = `/blog/${article.slug}` }: { article: ArticleWithEnquiry; path?: string }) {
  const { packages, freeNil, quoteRequired: requiresQuote } = blogServiceOffers(article.slug, article.serviceCategory);
  const quoteRequired = Boolean(article.enquiryOnly) || requiresQuote;
  const label = freeNil ? 'Nil filing · ₹0 service fee' : quoteRequired ? 'Service scope & fee by quotation' : packages.length ? `${packages[0].title} · ${blogPackagePrice(packages[0].amountPaise)}` : '';
  if (!label) return null;
  return <Link href={`${path}#registerbox-services` as Href} asChild><a className="rbg-price-summary" lang="en">{label}<span>{freeNil || quoteRequired ? 'See your next step' : packages[0]?.serviceCategory === 'food' ? 'First annual government fee included · See scope' : 'No GST added · See packages'} <span aria-hidden="true">↗</span></span></a></Link>;
}
