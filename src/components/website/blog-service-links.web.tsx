import { Link, type Href } from 'expo-router';
import { blogArticles } from '@/data/blog';
import publicBlogPaths from '@/data/blog/public-paths.generated.json';
export function BlogServiceLinks({ category }: { category: string }) {
  const articles = blogArticles.filter(article => article.serviceCategory === category || article.additionalServiceCategory === category);
  if (!articles.length) return null;
  return <section className="rbg-related" aria-label="Practical guides for this service"><h2>Read before you start</h2><p>Practical answers and official sources for the questions behind this service.</p><ul>{articles.map(article=><li key={article.slug}><Link href={`/blog/${article.slug}` as Href}>{article.title}</Link>{category === 'food' && <span className="rb-food-guide-languages" aria-label={`Languages for ${article.title}`}>{[{code:'hi',label:'हिन्दी'},{code:'kn',label:'ಕನ್ನಡ'},{code:'ta',label:'தமிழ்'}].filter(locale => publicBlogPaths.includes(`/${locale.code}/blog/${article.slug}`)).map(locale => <Link key={locale.code} href={`/${locale.code}/blog/${article.slug}` as Href} asChild><a hrefLang={locale.code}>{locale.label}</a></Link>)}</span>}</li>)}</ul><Link href={'/blog' as Href}>All business guides ↗</Link></section>;
}
