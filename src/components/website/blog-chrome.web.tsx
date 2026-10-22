import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { contact } from './content';
import { blogImage, blogReadMinutes, type BlogArticle } from '@/data/blog';
import { blogPath, blogUi, type BlogLocale } from '@/data/blog/localized';
import { BlogLanguageSwitch } from './blog-language-switch.web';
export function blogCategoryLabel(category: BlogArticle['category'], locale: BlogLocale) {
  const keys: Record<BlogArticle['category'], string> = { 'Start a business': 'startBusiness', Registrations: 'registrations', 'GST & records': 'gstRecords', 'Grow & comply': 'growComply' };
  return blogUi(locale, keys[category]);
}
export function BlogHeader({ locale = 'en', slug }: { locale?: BlogLocale; slug?: string }) {
  return <><a className="rb-skip" href="#blog-main">{blogUi(locale, 'skip')}</a><header className="rbg-header"><WebBrand/><div className="rbg-header-right"><nav aria-label={blogUi(locale, 'guidesNavigation')}><Link href={blogPath(locale) as Href}>{blogUi(locale, 'guides')}</Link><Link href="/services">{blogUi(locale, 'services')}</Link><Link href="/contact">{blogUi(locale, 'contact')}</Link></nav><BlogLanguageSwitch locale={locale} slug={slug}/></div></header></>;
}
export function BlogFooter({ locale = 'en' }: { locale?: BlogLocale }) {
  return <footer className="rbg-footer"><div><WebBrand/><p>{blogUi(locale, 'footerTagline')}</p></div><nav aria-label={blogUi(locale, 'footer')}><Link href={'/blog/editorial-policy' as Href}>{blogUi(locale, 'editorial')}</Link><Link href="/services">{blogUi(locale, 'exploreServices')}</Link><Link href="/contact">{blogUi(locale, 'contactBranches')}</Link><Link href="/privacy">{blogUi(locale, 'privacy')}</Link><a href={`mailto:${contact.email}`}>{contact.email}</a></nav></footer>;
}
export function BlogCard({ article, featured = false, locale = 'en' }: { article: BlogArticle; featured?: boolean; locale?: BlogLocale }) {
  const path = blogPath(locale, article.slug) as Href;
  return <article className={`rbg-card${featured ? ' rbg-card-featured' : ''}`}><div className="rbg-image-link"><img src={blogImage(article)} srcSet={`${blogImage(article, true)} 640w, ${blogImage(article)} 1200w`} sizes={featured ? '(max-width: 700px) 100vw, 55vw' : '(max-width: 700px) 100vw, 33vw'} width="1200" height="800" alt="" loading={featured ? 'eager' : 'lazy'} decoding="async"/></div><div className="rbg-card-copy"><span className="rbg-label">{blogCategoryLabel(article.category, locale)} <span>· {blogReadMinutes(article)} {blogUi(locale, 'readMinutes')}</span></span><h2><Link href={path}>{article.title}</Link></h2><p>{article.description}</p><Link className="rbg-read" href={path}>{blogUi(locale, 'readGuide')} <span aria-hidden="true">↗</span></Link></div></article>;
}
