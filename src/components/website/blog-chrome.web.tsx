import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { blogImage, blogReadMinutes, type BlogArticle } from '@/data/blog';
export function BlogHeader() {
  return <><a className="rb-skip" href="#blog-main">Skip to content</a><header className="rbg-header"><WebBrand/><nav aria-label="Guides navigation"><Link href={'/blog' as Href}>Guides</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link></nav></header></>;
}
export function BlogFooter() {
  return <SiteFooter/>;
}
export function BlogCard({ article, featured = false }: { article: BlogArticle; featured?: boolean }) {
  return <article className={`rbg-card${featured ? ' rbg-card-featured' : ''}`}><div className="rbg-image-link"><img src={blogImage(article)} srcSet={`${blogImage(article, true)} 640w, ${blogImage(article)} 1200w`} sizes={featured ? '(max-width: 700px) 100vw, 55vw' : '(max-width: 700px) 100vw, 33vw'} width="1200" height="800" alt="" loading={featured ? 'eager' : 'lazy'} decoding="async"/></div><div className="rbg-card-copy"><span className="rbg-label">{article.category} <span>· {blogReadMinutes(article)} min read</span></span><h2><Link href={`/blog/${article.slug}` as Href}>{article.title}</Link></h2><p>{article.description}</p><Link className="rbg-read" href={`/blog/${article.slug}` as Href}>Read the guide <span aria-hidden="true">↗</span></Link></div></article>;
}
