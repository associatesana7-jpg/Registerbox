import { useLocalSearchParams } from 'expo-router';
import { blogArticles } from '@/data/blog';
import { localizedArticle } from '@/data/blog/localized';
import BlogArticlePage from '@/components/website/blog-article.web';

export function generateStaticParams() { return blogArticles.filter(article => localizedArticle(article.slug, 'hi')).map(article => ({ slug: article.slug })); }
export default function HindiBlogArticle() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <BlogArticlePage slug={slug} locale="hi"/>;
}
