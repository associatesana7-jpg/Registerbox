import { useLocalSearchParams } from 'expo-router';
import { availableBlogLocales } from '@/data/blog/localized';
import BlogIndex from '@/components/website/blog-index.web';

export function generateStaticParams() {
  return availableBlogLocales().filter(locale => !['en', 'hi'].includes(locale.code)).map(locale => ({ language: locale.code }));
}
export default function RegionalBlogIndex() {
  const { language } = useLocalSearchParams<{ language: string }>();
  return <BlogIndex locale={language}/>;
}
