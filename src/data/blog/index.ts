import { businessGuides } from './business-guides';
import { gstFoodGuides } from './gst-food-guides';
import { startupGuides } from './startup-guides';
import { payrollFoodGuides } from './payroll-food-guides';
import { gstr3bProcessGuide } from './gstr3b-process-guide';
import { directorEmployerGuides } from './director-employer-guides';
import { shopProcessGuide } from './shop-process-guide';
import { fastGstGuide } from './fast-gst-guide';
import { ecommerceGstGuide } from './ecommerce-gst-guide';
import type { BlogArticle } from './types';
import { gstExplainedGuide } from './gst-explained-guide';
export type { BlogArticle } from './types';
export const blogPublishedAt = '2026-10-20';
export const blogDateLabel = '20 October 2026';
export const blogArticles: BlogArticle[] = [...gstExplainedGuide, ...ecommerceGstGuide, ...fastGstGuide, ...gstr3bProcessGuide, ...directorEmployerGuides, ...shopProcessGuide, ...startupGuides, ...payrollFoodGuides, ...gstFoodGuides, ...businessGuides];
export function blogArticleDate(article: BlogArticle) { return article.publishedAt || blogPublishedAt; }
export function blogArticleDateLabel(article: BlogArticle) { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${blogArticleDate(article)}T00:00:00Z`)); }
export function blogReadMinutes(article: BlogArticle) {
  const text = [...article.intro, ...article.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.bullets || [])]), ...article.faqs.flatMap(faq => [faq.question, faq.answer])].join(' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}
export function blogImage(article: BlogArticle, small = false) {
  return `/images/blog/${article.image}${small ? '-640' : '-1200'}.webp`;
}
