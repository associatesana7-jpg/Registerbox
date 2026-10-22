import { useState } from 'react';
import Head from 'expo-router/head';
import { Link, type Href } from 'expo-router';
import { blogArticles, type BlogArticle } from '@/data/blog';
import { availableBlogLocales, blogAlternates, blogLocale, blogPath, blogUi, localizedArticle, type BlogLocale } from '@/data/blog/localized';
import { Seo, siteUrl } from './seo.web';
import { BlogCard, BlogFooter, BlogHeader, blogCategoryLabel } from './blog-chrome.web';
import './blog.css';

const categories = ['All guides', 'Start a business', 'Registrations', 'GST & records', 'Grow & comply'] as const;

export default function BlogIndex({ locale = 'en' }: { locale?: BlogLocale }) {
  const language = blogLocale(locale);
  const articles = blogArticles.map(article => localizedArticle(article.slug, locale)).filter((article): article is BlogArticle => Boolean(article));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All guides');
  if (!availableBlogLocales().some(item => item.code === locale)) return <div className="rbg-page" lang="en" dir="ltr">
    <Head><title>Guides not available | RegisterBox</title><meta name="robots" content="noindex"/></Head>
    <BlogHeader/><main id="blog-main" className="rbg-main"><h1>These guides are not available in this language yet.</h1><Link href="/blog">Browse available guides</Link></main><BlogFooter/>
  </div>;
  const normalized = query.trim().toLocaleLowerCase(language.hreflang);
  const shown = articles.filter(article => (category === 'All guides' || article.category === category) && normalized.split(/\s+/).every(term => `${article.title} ${article.description} ${article.searchQuestions.join(' ')}`.toLocaleLowerCase(language.hreflang).includes(term)));
  const featured = !normalized && category === 'All guides' ? shown[0] : undefined;
  const path = blogPath(locale);

  return <div className="rbg-page" lang={language.code} dir={language.direction}>
    <Seo title={blogUi(locale, 'indexTitle')} description={blogUi(locale, 'indexDescription')} path={path} alternates={blogAlternates()} language={language.hreflang} schema={[{
      '@type': 'CollectionPage', name: blogUi(locale, 'collectionName'), inLanguage: language.hreflang, url: `${siteUrl}${path}`,
      mainEntity: { '@type': 'ItemList', itemListElement: articles.map((article, index) => ({ '@type': 'ListItem', position: index + 1, url: `${siteUrl}${blogPath(locale, article.slug)}`, name: article.title })) },
    }]}/>
    <BlogHeader locale={locale}/>
    <main id="blog-main" className="rbg-main">
      <div className="rbg-index-intro">
        <div className="rbg-kicker">{blogUi(locale, 'journal')}</div>
        <h1>{blogUi(locale, 'goodQuestions')}<br/>{blogUi(locale, 'clearSteps')}</h1>
        <p>{blogUi(locale, 'indexIntro')}</p><Link href={'/blog/editorial-policy' as Href}>{blogUi(locale, 'ourSources')}</Link>
      </div>
      <section aria-label={blogUi(locale, 'findGuide')} className="rbg-controls">
        <label className="rbg-search"><span>{blogUi(locale, 'helpQuestion')}</span><input type="search" placeholder={blogUi(locale, 'searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="rbg-filters" aria-label={blogUi(locale, 'filterTopic')}>{categories.map(item => <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item === 'All guides' ? blogUi(locale, 'allGuides') : blogCategoryLabel(item, locale)}</button>)}</div>
      </section>
      <p role="status" className="rbg-count">{shown.length} {locale === 'en' && shown.length === 1 ? 'guide' : blogUi(locale, 'guideCount')}{normalized ? ` “${query.trim()}”` : ` ${blogUi(locale, 'indianOwners')}`}</p>
      {featured && <BlogCard article={featured} featured locale={locale}/>}
      <section aria-label={blogUi(locale, 'collectionName')} className="rbg-grid">{shown.filter(article => article !== featured).map(article => <BlogCard key={article.slug} article={article} locale={locale}/>)}</section>
      {!shown.length && <div className="rbg-empty"><h2>{blogUi(locale, 'noMatches')}</h2><p>{blogUi(locale, 'tryService')}</p><button type="button" onClick={() => { setQuery(''); setCategory('All guides'); }}>{blogUi(locale, 'showAll')}</button><Link href="/contact">{blogUi(locale, 'askUs')}</Link></div>}
      <aside className="rbg-bottom-cta"><div><h2>{blogUi(locale, 'ready')}</h2><p>{blogUi(locale, 'prepareHelp')}</p></div><Link href="/services">{blogUi(locale, 'findService')}</Link></aside>
    </main>
    <BlogFooter locale={locale}/>
  </div>;
}
