import { Link, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { blogArticleDate, blogImage, blogReadMinutes, type BlogArticle } from '@/data/blog';
import { blogAlternates, blogLocale, blogPath, blogUi, localizedArticle, type BlogLocale } from '@/data/blog/localized';
import { BlogActions } from './blog-actions.web';
import { BlogOffers } from './blog-offers.web';
import { BlogVideoPlayer } from './blog-video.web';
import { blogVideos } from '@/data/blog-video';
import { BlogCard, BlogFooter, BlogHeader, blogCategoryLabel } from './blog-chrome.web';
import { Seo, siteUrl } from './seo.web';
import './blog.css';
import './blog-answer-first.css';

export default function BlogArticlePage({ slug, locale = 'en' }: { slug: string; locale?: BlogLocale }) {
  const article = localizedArticle(slug, locale);
  const language = blogLocale(locale);
  if (!article) return <div className="rbg-page" lang={language.code} dir={language.direction}>
    <Head><title>{blogUi(locale, 'notFoundTitle')} | RegisterBox</title><meta name="robots" content="noindex"/></Head>
    <BlogHeader locale={locale}/>
    <main id="blog-main" className="rbg-main"><h1>{blogUi(locale, 'notFound')}</h1><Link href={blogPath(locale) as Href}>{blogUi(locale, 'browseGuides')}</Link></main>
    <BlogFooter locale={locale}/>
  </div>;

  const path = blogPath(locale, article.slug);
  const publishedAt = blogArticleDate(article);
  const dateLabel = new Intl.DateTimeFormat(language.hreflang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${publishedAt}T00:00:00Z`));
  const related = article.relatedSlugs.map(slug => localizedArticle(slug, locale)).filter((item): item is BlogArticle => Boolean(item)).slice(0, 3);
  const video = blogVideos[article.slug];
  const schema: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting', '@id': `${siteUrl}${path}#article`, headline: article.title,
      description: article.description, image: [`${siteUrl}${blogImage(article)}`],
      datePublished: publishedAt, dateModified: publishedAt, inLanguage: language.hreflang,
      author: { '@type': 'Organization', name: 'RegisterBox', url: `${siteUrl}/blog/editorial-policy` },
      publisher: { '@id': `${siteUrl}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}${path}` },
      articleSection: blogCategoryLabel(article.category, locale), citation: article.sources.map(source => source.url),
    },
    {
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: blogUi(locale, 'home'), item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: blogUi(locale, 'guides'), item: `${siteUrl}${blogPath(locale)}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: `${siteUrl}${path}` },
      ],
    },
  ];

  if (video) schema.push({
    '@type': 'VideoObject', '@id': `${siteUrl}${path}#video`, name: video.title,
    description: video.description, thumbnailUrl: [`${siteUrl}${video.poster}`],
    contentUrl: `${siteUrl}${video.src}`, uploadDate: video.uploadDate,
    duration: video.duration, inLanguage: video.language, transcript: video.transcript,
    publisher: { '@id': `${siteUrl}/#organization` },
    isPartOf: { '@id': `${siteUrl}${path}#article` },
  });

  return <div className="rbg-page" lang={language.code} dir={language.direction}>
    <Seo title={article.slug === 'gst-registration-small-ecommerce-sellers-november-2026' && locale === 'en' ? 'GST for Small E-commerce Sellers: November 2026 | RegisterBox' : `${article.title} | RegisterBox`} description={article.description} path={path} alternates={blogAlternates(slug)} language={language.hreflang} schema={schema} image={blogImage(article)} imageAlt={article.imageAlt} type="article" publishedTime={publishedAt}/>
    <BlogHeader locale={locale} slug={slug}/>
    <main id="blog-main" className="rbg-main">
      <nav aria-label={blogUi(locale, 'guidesNavigation')} className="rbg-breadcrumb"><Link href="/">{blogUi(locale, 'home')}</Link><span>/</span><Link href={blogPath(locale) as Href}>{blogUi(locale, 'guides')}</Link><span>/</span><span>{blogCategoryLabel(article.category, locale)}</span></nav>
      <header className="rbg-article-heading">
        <div className="rbg-kicker">{blogCategoryLabel(article.category, locale)}</div>
        <h1>{article.title}</h1><p className="rbg-deck">{article.description}</p>
        <p className="rbg-byline">{blogUi(locale, 'by')} <Link href={'/blog/editorial-policy' as Href}>RegisterBox</Link> <span>·</span> <time dateTime={publishedAt}>{dateLabel}</time> <span>·</span> {blogReadMinutes(article)} {blogUi(locale, 'readMinutes')}</p>
        {article.availabilityNote && <p className="rbg-availability" role="note"><strong>{blogUi(locale, 'available')}</strong> {article.availabilityNote}</p>}
        <BlogActions article={article} compact locale={locale}/>
      </header>
      <div className="rbg-answer rbg-article-summary">{article.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      <figure className="rbg-cover"><img src={blogImage(article)} srcSet={`${blogImage(article, true)} 640w, ${blogImage(article)} 1200w`} sizes="(max-width: 1000px) 100vw, 1100px" width="1200" height="800" fetchPriority="high" alt={article.imageAlt}/><figcaption>{blogUi(locale, 'illustration')}</figcaption></figure>
      <div className="rbg-reading-layout">
        <aside className="rbg-toc"><h2>{blogUi(locale, 'inGuide')}</h2><nav aria-label={blogUi(locale, 'onPage')}>{video && <a href="#video-explainer">हिंदी वीडियो</a>}{article.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}<a href="#common-questions">{blogUi(locale, 'commonQuestions')}</a><a href="#sources">{blogUi(locale, 'officialSources')}</a></nav></aside>
        <article className="rbg-prose">
          {video && <BlogVideoPlayer video={video}/>}
          {article.sections.map(section => <section id={section.id} key={section.id}>
            <h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
            {section.sourceIds?.length ? <p className="rbg-citations">{blogUi(locale, 'sources')} {section.sourceIds.map(id => {
              const source = article.sources.find(item => item.id === id);
              return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : null;
            })}</p> : null}
          </section>)}
          <section id="common-questions"><h2>{blogUi(locale, 'commonQuestions')}</h2>{article.faqs.map(faq => <div className="rbg-faq" key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</section>
          <section id="sources" className="rbg-sources">
            <h2>{blogUi(locale, 'furtherReading')}</h2><p>{blogUi(locale, 'sourcesChecked').replace('{date}', dateLabel)}</p>
            <ul>{article.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul>
            <p>{blogUi(locale, 'correction')} <Link href="/contact">{blogUi(locale, 'tellUs')}</Link> {blogUi(locale, 'correctionDetails')}</p>
          </section>
          <BlogActions article={article} locale={locale}/><BlogOffers article={article}/><p className="rbg-editorial-note">{blogUi(locale, 'editorialNote')}</p>
        </article>
      </div>
      {related.length > 0 && <section className="rbg-related"><h2>{blogUi(locale, 'keepReading')}</h2><div className="rbg-grid">{related.map(item => <BlogCard key={item.slug} article={item} locale={locale}/>)}</div></section>}
    </main>
    <BlogFooter locale={locale}/>
  </div>;
}
