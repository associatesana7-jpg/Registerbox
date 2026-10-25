import { Link, type Href } from 'expo-router';
import { blogArticles } from '@/data/blog';
import { BlogCard } from './blog-chrome.web';
import './blog.css';
import './blog-answer-first.css';
export function BlogPreview() {
  const featured = blogArticles.slice(0, 3);
  return <section className="rbg-home rb-container" aria-labelledby="business-guides-title"><div className="rb-section-heading"><div><div className="rb-eyebrow">PRACTICAL READING FOR BUSINESS OWNERS</div><h2 id="business-guides-title">What should I know before applying?</h2></div><Link href={'/blog' as Href}>Read all business guides ↗</Link></div><nav className="rbg-question-links" aria-label="Answers to business setup questions"><Link href={'/blog/fssai-licence-cost-government-fees' as Href}>What does FSSAI registration cost? ↗</Link><Link href={'/blog/fssai-home-kitchen-cloud-kitchen' as Href}>Which FSSAI route fits a home kitchen? ↗</Link><Link href={'/blog/gst-registration-documents-and-address-proof' as Href}>Which documents do I need for GST registration? ↗</Link><Link href={'/blog/llp-vs-private-limited-company-startup' as Href}>Should I choose an LLP or a company? ↗</Link></nav><div className="rbg-grid">{featured.map(article=><BlogCard key={article.slug} article={article}/>)}</div></section>;
}
