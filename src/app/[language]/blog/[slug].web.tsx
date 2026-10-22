import { useLocalSearchParams } from 'expo-router';
import { regionalStaticParams } from '@/data/blog/localized';
import BlogArticlePage from '@/components/website/blog-article.web';

export function generateStaticParams() { return regionalStaticParams(); }
export default function RegionalBlogArticle() {
  const { language, slug } = useLocalSearchParams<{ language: string; slug: string }>();
  return <BlogArticlePage slug={slug} locale={language}/>;
}
