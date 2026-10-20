import { Link, type Href } from 'expo-router';
import { blogArticles } from '@/data/blog';
export function BlogServiceLinks({ category }: { category: string }) {
  const articles = blogArticles.filter(article => article.serviceCategory === category || article.additionalServiceCategory === category);
  if (!articles.length) return null;
  return <section className="rbg-related" aria-label="Practical guides for this service"><h2>Read before you start</h2><p>Practical answers and official sources for the questions behind this service.</p><ul>{articles.map(article=><li key={article.slug}><Link href={`/blog/${article.slug}` as Href}>{article.title}</Link></li>)}</ul><Link href={'/blog' as Href}>All business guides ↗</Link></section>;
}
