import { Link, type Href } from 'expo-router';
import type { BlogArticle } from '@/data/blog';
import { blogUi, type BlogLocale } from '@/data/blog/localized';
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

export function BlogActions({ article, compact = false, locale = 'en' }: { article: BlogArticle; compact?: boolean; locale?: BlogLocale }) {
  const { session } = useApp();
  const service = publicServices.find(item => item.category === article.serviceCategory);
  const enquiry = article.enquiryOnly || article.serviceCategory === 'trademark' || !service;
  const categories = [article.serviceCategory, article.additionalServiceCategory].filter((category): category is string => Boolean(category));
  return <aside className={`rbg-actions${compact ? ' rbg-actions-compact' : ''}`} aria-label={blogUi(locale, 'getHelp')}>
    {!compact && <><h2>{blogUi(locale, 'nextStep')}</h2><p>{blogUi(locale, enquiry ? 'enquiryIntro' : 'applicationIntro')}</p></>}
    <div className="rbg-action-links">
      {article.appActions?.length ? article.appActions.map(action => <Link key={action.destination} className="rbg-action-primary" href={session ? action.destination as Href : { pathname: '/auth', params: { next: action.destination } }}>{locale === 'en' ? action.label : blogUi(locale, action.destination.includes('gstr-3b') ? 'prepare3b' : 'openGst')} <span aria-hidden="true">↗</span></Link>) : enquiry ? <Link className={article.officialApplication ? 'rbg-action-call' : 'rbg-action-primary'} href={{ pathname: '/contact', params: { service: article.slug } }}>{blogUi(locale, 'discussService')} <span aria-hidden="true">↗</span></Link> : categories.map(category => {
        const destination = servicePath(category);
        const href: Href = session ? destination as Href : { pathname: '/auth', params: { next: destination } };
        return <Link key={category} className="rbg-action-primary" href={href}>{locale === 'en' ? actionLabels[category] || blogUi(locale, 'discussService') : blogUi(locale, 'startApplication')} <span aria-hidden="true">↗</span></Link>;
      })}
      <a className="rbg-action-call" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{blogUi(locale, 'call')} <bdi>{contact.phone}</bdi></a>
      {article.howToSection && <a className="rbg-action-call" href={`#${article.howToSection}`}>{blogUi(locale, 'stepGuide')}</a>}
      {article.officialApplication && <a className="rbg-action-call" href={article.officialApplication.url} target="_blank" rel="noopener noreferrer">{locale === 'en' ? article.officialApplication.label : blogUi(locale, 'officialWebsite')} <span aria-hidden="true">↗</span></a>}
    </div>
    {!compact && <><p className="rbg-action-note">{blogUi(locale, enquiry ? 'enquiryNote' : 'applicationNote')}</p>{service && <Link className="rbg-action-details" href={`/services/${service.slug}` as Href}>{locale === 'en' ? `View ${service.title.toLowerCase()} details` : blogUi(locale, 'serviceDetails')}</Link>}</>}
  </aside>;
}
