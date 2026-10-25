import { BlogPriceSummary } from './blog-offers.web';
import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
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
  return <div data-guide-language={locale}><SiteFooter/></div>;
}
export function BlogCard({ article, featured = false, locale = 'en' }: { article: BlogArticle; featured?: boolean; locale?: BlogLocale }) {
  const path = blogPath(locale, article.slug) as Href;
  return <article className={`rbg-card${featured ? ' rbg-card-featured' : ''}`}>
    <Link href={path} asChild><a className="rbg-image-link" aria-label={`${blogUi(locale, 'readGuide')}: ${article.title}`}><img src={blogImage(article)} srcSet={`${blogImage(article, true)} 640w, ${blogImage(article)} 1200w`} sizes={featured ? '(max-width: 700px) 100vw, 55vw' : '(max-width: 700px) 100vw, 33vw'} width="1200" height="800" alt={article.imageAlt} loading={featured ? 'eager' : 'lazy'} decoding="async"/></a></Link>
    <div className="rbg-card-copy">
      <span className="rbg-label">{blogCategoryLabel(article.category, locale)} <span>· {blogReadMinutes(article)} {blogUi(locale, 'readMinutes')}</span></span>
      <h2 className="rbg-card-title"><Link href={path} asChild><a>{article.title}</a></Link></h2>
      <p>{article.description}</p>
      <Link href={path} asChild><a className="rbg-read">{blogUi(locale, 'readGuide')} <span aria-hidden="true">↗</span></a></Link>
      <BlogPriceSummary article={article} path={blogPath(locale, article.slug)}/>
    </div>
  </article>;
}
