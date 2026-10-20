import { businessGuides } from './business-guides';
import { gstFoodGuides } from './gst-food-guides';
import type { BlogArticle } from './types';
export type { BlogArticle } from './types';
export const blogPublishedAt = '2026-10-20';
export const blogDateLabel = '20 October 2026';
export const blogArticles: BlogArticle[] = [...gstFoodGuides, ...businessGuides];
export function blogReadMinutes(article: BlogArticle) {
  const text = [...article.intro, ...article.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.bullets || [])]), ...article.faqs.flatMap(faq => [faq.question, faq.answer])].join(' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}
export function blogImage(article: BlogArticle, small = false) {
  return `/images/blog/${article.image}${small ? '-640' : '-1200'}.webp`;
}
