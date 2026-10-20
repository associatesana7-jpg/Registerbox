import { Link, type Href } from 'expo-router';
import { blogArticles } from '@/data/blog';
import { BlogCard } from './blog-chrome.web';
import './blog.css';
export function BlogPreview() {
  const featured = blogArticles.slice(0, 3);
  return <section className="rbg-home rb-container" aria-labelledby="business-guides-title"><div className="rb-section-heading"><div><div className="rb-eyebrow">PRACTICAL READING FOR BUSINESS OWNERS</div><h2 id="business-guides-title">A little clarity before you start.</h2></div><Link href={'/blog' as Href}>Read all business guides ↗</Link></div><div className="rbg-grid">{featured.map(article=><BlogCard key={article.slug} article={article}/>)}</div></section>;
}
