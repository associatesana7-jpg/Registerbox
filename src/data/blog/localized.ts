import locales from './locales.json';
import englishUi from './ui-en.json';
import hindiUi from './ui-hi.json';
import kannadaUi from './ui-kn.json';
import tamilUi from './ui-ta.json';
import kannada from './kannada.json';
import tamil from './tamil.json';
import generated from './regional.generated.json';
import { blogArticles, type BlogArticle } from './index';
import { blogHindiBySlug, type HindiBlogContent } from './hindi';

export type BlogLocale = string;
export type BlogTranslation = HindiBlogContent & { imageAlt?: string; searchQuestions?: string[] };
type Locale = { code: string; name: string; nativeName: string; direction: 'ltr' | 'rtl'; hreflang: string };
type Bundle = { ui: Record<string, string>; articles: Record<string, BlogTranslation> };
const automatic = generated.locales as Record<string, Bundle>;
const authored: Record<string, Bundle> = {
  hi: { ui: hindiUi, articles: blogHindiBySlug },
  kn: { ui: kannadaUi, articles: kannada },
  ta: { ui: tamilUi, articles: tamil },
};
const bundleCache = new Map<BlogLocale, Bundle | undefined>();
const articlesBySlug = new Map(blogArticles.map(article => [article.slug, article]));

export function blogLocale(code: BlogLocale = 'en'): Locale {
  const value = locales.find(locale => locale.code === code) || locales[0];
  return { ...value, direction: value.direction === 'rtl' ? 'rtl' : 'ltr', hreflang: `${value.code}-IN` };
}

export function blogPath(locale: BlogLocale = 'en', slug?: string) {
  return `${locale === 'en' ? '' : `/${locale}`}/blog${slug ? `/${slug}` : ''}`;
}

function bundle(locale: BlogLocale): Bundle | undefined {
  if (bundleCache.has(locale)) return bundleCache.get(locale);
  // Authored translations keep precedence over machine output.
  const manual = authored[locale], machine = automatic[locale];
  if (!manual) { bundleCache.set(locale, machine); return machine; }
  const articles = { ...machine?.articles };
  for (const original of blogArticles) {
    const translation = manual.articles[original.slug];
    if (completeTranslation(translation, original)) articles[original.slug] = translation;
  }
  const value = { ui: { ...machine?.ui, ...manual.ui }, articles };
  bundleCache.set(locale, value);
  return value;
}

function completeTranslation(translation: BlogTranslation | undefined, original: BlogArticle): translation is BlogTranslation {
  return Boolean(translation && translation.title?.trim() && translation.description?.trim()
    && translation.intro?.length && translation.intro.every(text => text.trim()) && translation.faqs?.length
    && translation.faqs.every(faq => faq.question?.trim() && faq.answer?.trim())
    && (!original.availabilityNote || translation.availabilityNote?.trim())
    && original.sections.every(section => translation.sections?.[section.id]?.heading?.trim()
      && translation.sections[section.id]?.paragraphs?.length
      && translation.sections[section.id]?.paragraphs.every(text => text.trim())));
}

function completeUi(locale: BlogLocale) {
  const ui = bundle(locale)?.ui;
  return ui && Object.keys(englishUi).every(key => typeof ui[key] === 'string' && ui[key].trim());
}

export function localizedArticle(slug: string, locale: BlogLocale = 'en'): BlogArticle | undefined {
  const original = articlesBySlug.get(slug);
  if (!original || locale === 'en') return original;
  if (!locales.some(item => item.code === locale) || !completeUi(locale)) return undefined;
  const translation = bundle(locale)?.articles[slug];
  if (!completeTranslation(translation, original)) return undefined;
  return {
    ...original,
    title: translation.title,
    description: translation.description,
    intro: translation.intro,
    sections: original.sections.map(section => ({
      ...section,
      ...translation.sections[section.id],
      // Concise authored translations can express a list as prose. Never fall
      // back to an English list inside a regional-language article.
      bullets: translation.sections[section.id].bullets,
    })),
    faqs: translation.faqs,
    availabilityNote: translation.availabilityNote,
    imageAlt: translation.imageAlt || translation.title,
    searchQuestions: translation.searchQuestions || translation.faqs.map(faq => faq.question),
  };
}

export function availableBlogLocales(slug?: string): Locale[] {
  return locales.filter(locale => locale.code === 'en' || (completeUi(locale.code)
    && (slug ? Boolean(localizedArticle(slug, locale.code))
      : blogArticles.some(article => localizedArticle(article.slug, locale.code)))))
    .map(locale => blogLocale(locale.code));
}

export function blogAlternates(slug?: string) {
  return [
    ...availableBlogLocales(slug).map(locale => ({ language: locale.hreflang, path: blogPath(locale.code, slug) })),
    { language: 'x-default', path: blogPath('en', slug) },
  ];
}

export function blogUi(locale: BlogLocale, key: string) {
  return (locale === 'en' ? undefined : bundle(locale)?.ui[key]) || (englishUi as Record<string, string>)[key] || key;
}

export function regionalStaticParams() {
  return blogArticles.flatMap(article => availableBlogLocales(article.slug)
    .filter(locale => locale.code !== 'en' && locale.code !== 'hi')
    .map(locale => ({ language: locale.code, slug: article.slug })));
}
