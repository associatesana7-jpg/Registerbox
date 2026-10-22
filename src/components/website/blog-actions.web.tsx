import { Link, type Href } from 'expo-router';
import type { BlogArticle } from '@/data/blog';
import { useApp } from '@/hooks/use-app';
import { contact, servicePath } from './content';
import { publicServices } from './service-pages';

const actionLabels: Record<string, string> = {
  company: 'Start company registration',
  llp: 'Start LLP registration',
  gst_registration: 'Start GST registration',
  udyam: 'Apply for Udyam with RegisterBox',
  food: 'Start FSSAI application',
  retail: 'Start shop registration',
  gst: 'Open GST workspace',
  new: 'Prepare my business setup',
  online: 'Prepare online-business setup',
  manufacturing: 'Prepare manufacturing setup',
  branch: 'Prepare a branch application',
  existing: 'Start a compliance check',
};

export function BlogActions({ article, compact = false, locale = 'en' }: { article: BlogArticle; compact?: boolean; locale?: 'en' | 'hi' }) {
  const hi = locale === 'hi';
  const { session } = useApp();
  const service = publicServices.find(item => item.category === article.serviceCategory);
  const enquiry = article.enquiryOnly || article.serviceCategory === 'trademark' || !service;
  const categories = [article.serviceCategory, article.additionalServiceCategory].filter((category): category is string => Boolean(category));
  return <aside className={`rbg-actions${compact ? ' rbg-actions-compact' : ''}`} aria-label={hi ? 'इस गाइड के लिए मदद लें' : 'Get help with this guide'}>
    {!compact && <><h2>{hi ? 'अब अगला कदम उठाएँ।' : 'Turn your next step into a plan.'}</h2><p>{hi ? enquiry ? 'अपना काम, शहर और सवाल बताएं। फीस लेने से पहले हम मदद का दायरा साफ़ करेंगे।' : 'अपने कारोबार की जानकारी भरें। साइन इन के बाद चुनी हुई सेवा आपके आवेदन में खुल जाएगी।' : enquiry ? 'Tell us your activity, location and question. We will confirm the scope of help before any paid work.' : 'Start with your business details. Your service choice follows you through sign-in to your application or workspace.'}</p></>}
    <div className="rbg-action-links">
      {article.appActions?.length ? article.appActions.map(action => <Link key={action.destination} className="rbg-action-primary" href={session ? action.destination as Href : { pathname: '/auth', params: { next: action.destination } }}>{hi ? action.destination.includes('gstr-3b') ? 'RegisterBox पर GSTR-3B तैयार करें' : 'RegisterBox पर GST सेवा खोलें' : action.label} <span aria-hidden="true">↗</span></Link>) : enquiry ? <Link className={article.officialApplication ? 'rbg-action-call' : 'rbg-action-primary'} href={{ pathname: '/contact', params: { service: article.slug } }}>{hi ? 'इस सेवा पर बात करें' : 'Discuss this service'} <span aria-hidden="true">↗</span></Link> : categories.map(category => {
        const destination = servicePath(category);
        const href: Href = session ? destination as Href : { pathname: '/auth', params: { next: destination } };
        return <Link key={category} className="rbg-action-primary" href={href}>{hi ? 'RegisterBox पर आवेदन शुरू करें' : actionLabels[category] || 'Discuss this service'} <span aria-hidden="true">↗</span></Link>;
      })}
      <a className="rbg-action-call" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{hi ? 'कॉल करें' : 'Call'} {contact.phone}</a>
      {article.howToSection && <a className="rbg-action-call" href={`#${article.howToSection}`}>{hi ? 'आसान चरण देखें ↓' : 'Follow the step-by-step guide ↓'}</a>}
      {article.officialApplication && <a className="rbg-action-call" href={article.officialApplication.url} target="_blank" rel="noopener noreferrer">{hi ? 'सरकारी वेबसाइट खोलें' : article.officialApplication.label} <span aria-hidden="true">↗</span></a>}
    </div>
    {!compact && <><p className="rbg-action-note">{hi ? enquiry ? 'यह मदद का अनुरोध है। सरकारी आवेदन की लिंक नीचे स्रोतों में है।' : 'जानकारी सेव करने से ड्राफ्ट बनता है। सरकारी शुल्क, जाँच, जमा करना और मंजूरी अलग चरण हैं।' : enquiry ? 'This is a request for assistance, not an online government filing. The official self-service links are listed in the sources.' : 'Saving details prepares a draft. Government fees, review, submission and approval are separate stages.'}</p>{service && <Link className="rbg-action-details" href={`/services/${service.slug}` as Href}>{hi ? 'सेवा की जानकारी देखें' : `View ${service.title.toLowerCase()} details`}</Link>}</>}
  </aside>;
}
