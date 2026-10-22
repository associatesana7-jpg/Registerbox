import { useEffect, useRef, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { availableBlogLocales, blogLocale, blogPath, blogUi, type BlogLocale } from '@/data/blog/localized';

const preferenceKey = 'registerbox-guide-language';

function rememberLanguage(locale: BlogLocale) {
  try { window.localStorage.setItem(preferenceKey, locale); } catch { /* Language links still work when storage is unavailable. */ }
}

export function BlogLanguageSwitch({ locale = 'en', slug }: { locale?: BlogLocale; slug?: string }) {
  const available = availableBlogLocales(slug);
  const primary = available.filter(language => language.code === 'en' || language.code === 'hi');
  const regional = available.filter(language => language.code !== 'en' && language.code !== 'hi');
  const current = blogLocale(locale);
  const [suggested, setSuggested] = useState<BlogLocale | undefined>();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const choices = availableBlogLocales(slug);
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(preferenceKey); } catch { /* Browser preferences can still suggest a language. */ }
    const preferred = saved && choices.some(language => language.code === saved)
      ? saved
      : navigator.languages.map(language => {
        const normalized = language.toLowerCase();
        return choices.find(choice => choice.code.toLowerCase() === normalized)?.code
          || choices.find(choice => choice.code.toLowerCase() === normalized.split('-')[0])?.code;
      }).find(Boolean);
    const frame = window.requestAnimationFrame(() => setSuggested(preferred && preferred !== locale ? preferred : undefined));
    return () => window.cancelAnimationFrame(frame);
  }, [locale, slug]);

  const suggestion = suggested && available.find(language => language.code === suggested);
  function dismissSuggestion() {
    rememberLanguage(locale);
    setSuggested(undefined);
  }

  return <div className="rbg-language-control">
    <nav className="rbg-language-switch" aria-label={blogUi(locale, 'chooseLanguage')}>
      {primary.map(language => <Link key={language.code} href={blogPath(language.code, slug) as Href} asChild>
        <a lang={language.code} hrefLang={language.hreflang} aria-current={locale === language.code ? 'page' : undefined} onClick={() => rememberLanguage(language.code)}>{language.nativeName}</a>
      </Link>)}
      {regional.length > 0 && <details className="rbg-language-menu" ref={menu} onKeyDown={event => {
        if (event.key === 'Escape' && menu.current) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
        }
      }}>
        <summary aria-label={blogUi(locale, 'moreLanguages')}><span lang={current.code}>{locale !== 'en' && locale !== 'hi' ? current.nativeName : blogUi(locale, 'moreLanguages')}</span><span className="rbg-language-chevron" aria-hidden="true">⌄</span></summary>
        <div className="rbg-language-options">
          {regional.map(language => <Link key={language.code} href={blogPath(language.code, slug) as Href} asChild>
            <a lang={language.code} hrefLang={language.hreflang} aria-current={locale === language.code ? 'page' : undefined} onClick={() => {
              rememberLanguage(language.code);
              if (menu.current) menu.current.open = false;
            }}><span>{language.nativeName}</span><span className="rbg-language-english" lang="en">{language.name}</span>{locale === language.code && <span aria-hidden="true">✓</span>}</a>
          </Link>)}
        </div>
      </details>}
    </nav>
    {suggestion && <aside className="rbg-language-suggestion" aria-label={blogUi(locale, 'chooseLanguage')}>
      <Link href={blogPath(suggestion.code, slug) as Href} asChild><a lang={suggestion.code} hrefLang={suggestion.hreflang} onClick={() => rememberLanguage(suggestion.code)}>{blogUi(suggestion.code, 'suggestedLanguage').replace('{language}', suggestion.nativeName)} <span aria-hidden="true">→</span></a></Link>
      <button type="button" onClick={dismissSuggestion} aria-label={blogUi(locale, 'dismiss')}>×</button>
    </aside>}
  </div>;
}
