import { useLocalSearchParams } from 'expo-router';
import { blogArticles } from '@/data/blog';
import BlogArticlePage from '@/components/website/blog-article.web';
export function generateStaticParams() { return blogArticles.map(article=>({slug:article.slug})); }
export default function Page() { const {slug} = useLocalSearchParams<{slug:string}>(); return <BlogArticlePage slug={slug}/>; }
