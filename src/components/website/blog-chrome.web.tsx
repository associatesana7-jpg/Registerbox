import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { contact } from './content';
import { blogImage, blogReadMinutes, type BlogArticle } from '@/data/blog';
export function blogCategoryLabel(category: BlogArticle['category'], locale: 'en' | 'hi') {
  if (locale === 'en') return category;
  return ({ 'Start a business': 'कारोबार शुरू करें', Registrations: 'रजिस्ट्रेशन', 'GST & records': 'GST और रिकॉर्ड', 'Grow & comply': 'कारोबार चलाएँ' } as const)[category];
}
export function BlogHeader({ locale = 'en', slug }: { locale?: 'en' | 'hi'; slug?: string }) {
  const englishPath = slug ? `/blog/${slug}` : '/blog';
  const hindiPath = slug ? `/hi/blog/${slug}` : '/hi/blog';
  return <><a className="rb-skip" href="#blog-main">{locale === 'hi' ? 'मुख्य जानकारी पर जाएँ' : 'Skip to content'}</a><header className="rbg-header"><WebBrand/><div className="rbg-header-right"><nav aria-label={locale === 'hi' ? 'गाइड नेविगेशन' : 'Guides navigation'}><Link href={(locale === 'hi' ? '/hi/blog' : '/blog') as Href}>{locale === 'hi' ? 'गाइड' : 'Guides'}</Link><Link href="/services">{locale === 'hi' ? 'सेवाएँ' : 'Services'}</Link><Link href="/contact">{locale === 'hi' ? 'संपर्क' : 'Contact'}</Link></nav><nav className="rbg-language-switch" aria-label={locale === 'hi' ? 'भाषा चुनें' : 'Choose language'}><Link href={englishPath as Href} aria-current={locale === 'en' ? 'page' : undefined}><span lang="en">English</span></Link><Link href={hindiPath as Href} aria-current={locale === 'hi' ? 'page' : undefined}><span lang="hi">हिन्दी</span></Link></nav></div></header></>;
}
export function BlogFooter({ locale = 'en' }: { locale?: 'en' | 'hi' }) {
  const hi = locale === 'hi';
  return <footer className="rbg-footer"><div><WebBrand/><p>{hi ? 'कारोबार के अगले फैसले में आसान मदद।' : 'Practical help for your next business decision.'}</p></div><nav aria-label={hi ? 'फुटर लिंक' : 'Footer'}><Link href={'/blog/editorial-policy' as Href}>{hi ? 'हम गाइड कैसे लिखते हैं' : 'How we write our guides'}</Link><Link href="/services">{hi ? 'हमारी सेवाएँ देखें' : 'Explore our services'}</Link><Link href="/contact">{hi ? 'संपर्क और शाखाएँ' : 'Contact & branches'}</Link><Link href="/privacy">{hi ? 'गोपनीयता' : 'Privacy'}</Link><a href={`mailto:${contact.email}`}>{contact.email}</a></nav></footer>;
}
export function BlogCard({ article, featured = false, locale = 'en' }: { article: BlogArticle; featured?: boolean; locale?: 'en' | 'hi' }) {
  const path = `${locale === 'hi' ? '/hi' : ''}/blog/${article.slug}` as Href;
  return <article className={`rbg-card${featured ? ' rbg-card-featured' : ''}`}><div className="rbg-image-link"><img src={blogImage(article)} srcSet={`${blogImage(article, true)} 640w, ${blogImage(article)} 1200w`} sizes={featured ? '(max-width: 700px) 100vw, 55vw' : '(max-width: 700px) 100vw, 33vw'} width="1200" height="800" alt="" loading={featured ? 'eager' : 'lazy'} decoding="async"/></div><div className="rbg-card-copy"><span className="rbg-label">{blogCategoryLabel(article.category, locale)} <span>· {blogReadMinutes(article)} {locale === 'hi' ? 'मिनट पढ़ें' : 'min read'}</span></span><h2><Link href={path}>{article.title}</Link></h2><p>{article.description}</p><Link className="rbg-read" href={path}>{locale === 'hi' ? 'गाइड पढ़ें' : 'Read the guide'} <span aria-hidden="true">↗</span></Link></div></article>;
}
