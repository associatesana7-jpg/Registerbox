import { Link, type Href } from 'expo-router';
import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { evaluateBusinessLicences, REVIEWED_ON, RULE_VERSION, SOURCES, STATES, type Answers, type LicenceResult, type Locale, type Localized } from '@/lib/business-licence-checker';
import { CHECKER_COPY, CHOICES } from '@/lib/business-licence-copy';
import { BUSINESS_LICENCE_EXAMPLES, LICENCE_FAQS, LICENCE_GUIDE } from '@/lib/business-licence-guide';
import { normalizeBusinessNumber, validBusinessNumber } from '@/lib/business-licence-input';
import { CHECKLIST_SERVICES, SERVICE_COPY, matchingChecklistServices, serviceForLicence } from '@/lib/business-licence-services';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { Seo, siteUrl } from './seo.web';
import './business-licence-checker.css';

const basePath = '/tools/business-licence-checker';
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const languageNames: Record<Locale, string> = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ' };
const emptyAnswers = (): Answers => ({ state: '', city: '', activity: '', entity: '', premises: '', turnover: '', employees: '', channels: [], special: [] });
const text = (en: string, hi: string, kn: string): Localized => ({ en, hi, kn });
const misc = {
  skip: text('Skip to the checker', 'चेकर पर जाएँ', 'ಪರಿಶೀಲನಾ ಸಾಧನಕ್ಕೆ ಹೋಗಿ'),
  tools: text('Free tools', 'मुफ़्त टूल', 'ಉಚಿತ ಸಾಧನಗಳು'),
  breadcrumb: text('Business licence checker', 'व्यवसाय लाइसेंस चेकर', 'ಉದ್ಯಮ ಪರವಾನಗಿ ಪರಿಶೀಲನೆ'),
  overview: text('Your starting point', 'आपकी शुरुआत', 'ನಿಮ್ಮ ಆರಂಭ'),
  sidebarTitle: text('Less guesswork. A clearer next step.', 'उलझन कम। अगला कदम साफ़।', 'ಗೊಂದಲ ಕಡಿಮೆ. ಮುಂದಿನ ಹೆಜ್ಜೆ ಸ್ಪಷ್ಟ.'),
  sidebarText: text('Find relevant registrations, understand why they matter, and follow the official source.', 'ज़रूरी पंजीकरण पहचानें, उनकी वजह समझें और आधिकारिक जानकारी देखें।', 'ಸಂಬಂಧಿತ ನೋಂದಣಿಗಳನ್ನು ತಿಳಿಯಿರಿ, ಅವುಗಳ ಕಾರಣ ಅರಿಯಿರಿ ಮತ್ತು ಅಧಿಕೃತ ಮೂಲಗಳನ್ನು ನೋಡಿ.'),
  featureOne: text('A checklist shaped around your business', 'आपके व्यवसाय के अनुसार सूची', 'ನಿಮ್ಮ ಉದ್ಯಮಕ್ಕೆ ಹೊಂದುವ ಪಟ್ಟಿ'),
  featureTwo: text('Reasons and documents to prepare', 'वजह और तैयार करने वाले दस्तावेज़', 'ಕಾರಣಗಳು ಮತ್ತು ಸಿದ್ಧಪಡಿಸಬೇಕಾದ ದಾಖಲೆಗಳು'),
  featureThree: text('Official links for every result', 'हर परिणाम के साथ आधिकारिक लिंक', 'ಪ್ರತಿ ಫಲಿತಾಂಶಕ್ಕೂ ಅಧಿಕೃತ ಲಿಂಕ್‌ಗಳು'),
  sample: text('Registrations we help you check', 'इन पंजीकरणों की जाँच करें', 'ಈ ನೋಂದಣಿಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಸಹಾಯ'),
  optional: text('Optional', 'वैकल्पिक', 'ಐಚ್ಛಿಕ'),
  optionalSpecial: text('Select any that apply. Leave these unchecked if none apply.', 'जो लागू हों उन्हें चुनें। कोई लागू नहीं तो खाली छोड़ें।', 'ಅನ್ವಯಿಸುವುದನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಯಾವುದೂ ಇಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ.'),
  numberUnknown: text('I don’t know yet', 'अभी पता नहीं', 'ಇನ್ನೂ ತಿಳಿದಿಲ್ಲ'),
  selectedBusiness: text('Your business', 'आपका व्यवसाय', 'ನಿಮ್ಮ ಉದ್ಯಮ'),
  assistance: text('Need help with a registration?', 'पंजीकरण में मदद चाहिए?', 'ನೋಂದಣಿಗೆ ಸಹಾಯ ಬೇಕೇ?'),
  assistanceText: text('Take your checklist to the relevant authority, your accountant or the RegisterBox team.', 'अपनी सूची संबंधित विभाग, अपने अकाउंटेंट या RegisterBox टीम के साथ जाँचें।', 'ನಿಮ್ಮ ಪಟ್ಟಿಯನ್ನು ಸಂಬಂಧಿತ ಇಲಾಖೆ, ಲೆಕ್ಕಪರಿಶೋಧಕರು ಅಥವಾ RegisterBox ತಂಡದೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.'),
  notFound: text('No trigger found from these answers', 'इन जवाबों में कोई संकेत नहीं मिला', 'ಈ ಉತ್ತರಗಳಿಂದ ಸೂಚನೆ ಕಂಡುಬಂದಿಲ್ಲ'),
  notExempt: text('These items remain available to review. This does not confirm an exemption.', 'इनकी जानकारी भी देखें। इसका मतलब छूट की पुष्टि नहीं है।', 'ಇವುಗಳನ್ನೂ ಪರಿಶೀಲಿಸಬಹುದು. ಇದು ವಿನಾಯಿತಿಯನ್ನು ಖಚಿತಪಡಿಸುವುದಿಲ್ಲ.'),
  copyFailed: text('Copy is unavailable in this browser. Use Print / Save PDF instead.', 'इस ब्राउज़र में कॉपी उपलब्ध नहीं। प्रिंट / PDF सेव करें।', 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ನಕಲಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ಮುದ್ರಿಸು / PDF ಉಳಿಸು ಬಳಸಿ.'),
  checkAnswers: text('Please check the highlighted answers.', 'कृपया दिखाए गए जवाब जाँचें।', 'ಗುರುತಿಸಿದ ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.'),
  planNote: text('A planning guide, based on your answers. Local and activity-specific checks may still be needed.', 'आपके जवाबों पर आधारित शुरुआती मार्गदर्शन। स्थानीय और काम-विशेष की जाँच बाकी हो सकती है।', 'ನಿಮ್ಮ ಉತ್ತರಗಳ ಆಧಾರದ ಆರಂಭಿಕ ಮಾರ್ಗದರ್ಶಿ. ಸ್ಥಳೀಯ ಮತ್ತು ಚಟುವಟಿಕೆಗೆ ಸಂಬಂಧಿತ ಪರಿಶೀಲನೆ ಬೇಕಾಗಬಹುದು.'),
  viewSource: text('NSWS: Know Your Approvals', 'NSWS: अपनी अनुमतियाँ जानें', 'NSWS: ನಿಮ್ಮ ಅನುಮತಿಗಳನ್ನು ತಿಳಿಯಿರಿ'),
  guideEyebrow: text('INDIA · BUSINESS REGISTRATIONS', 'भारत · व्यवसाय पंजीकरण', 'ಭಾರತ · ವ್ಯವಹಾರ ನೋಂದಣಿಗಳು'),
  breadcrumbLabel: text('Breadcrumb', 'पेज का रास्ता', 'ಪುಟದ ಹಾದಿ'),
  operationDescription: text('Tell us about your workplace, sales and team. Leave numbers blank if you don’t know them yet.', 'काम की जगह, बिक्री और कर्मचारियों के बारे में बताएँ। कोई संख्या नहीं पता तो खाली छोड़ दें।', 'ನಿಮ್ಮ ಕೆಲಸದ ಸ್ಥಳ, ಮಾರಾಟ ಮತ್ತು ಸಿಬ್ಬಂದಿಯ ಬಗ್ಗೆ ತಿಳಿಸಿ. ಸಂಖ್ಯೆ ಇನ್ನೂ ತಿಳಿದಿಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ.'),
  javascript: text('Enable JavaScript to answer the questions. You can still read the guide and official sources below.', 'सवालों के जवाब देने के लिए JavaScript चालू करें। नीचे जानकारी और आधिकारिक स्रोत फिर भी पढ़ सकते हैं।', 'ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲು JavaScript ಸಕ್ರಿಯಗೊಳಿಸಿ. ಕೆಳಗಿನ ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ಅಧಿಕೃತ ಮೂಲಗಳನ್ನು ಈಗಲೂ ಓದಬಹುದು.'),
};

function Mark({ children }: { children: ReactNode }) { return <span className="blc-mark" aria-hidden="true">{children}</span>; }

export default function BusinessLicenceChecker({ initialLocale = 'en' }: { initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, Localized>>({});
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const workspace = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const t = (value: Localized) => value[locale];
  const c = CHECKER_COPY;
  const path = initialLocale === 'en' ? basePath : `${basePath}/${initialLocale}`;
  const results = useMemo(() => step === 2 ? evaluateBusinessLicences(answers) : [], [answers, step]);
  const activeResults = results.filter(result => result.status !== 'not-triggered');
  const otherResults = results.filter(result => result.status === 'not-triggered');
  const matchingServices = matchingChecklistServices(results, answers);
  const statusLabel = (status: LicenceResult['status']) => t(status === 'required' ? c.required : status === 'check' ? c.check : status === 'recommended' ? c.recommended : c.notTriggered);
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : locale === 'hi' ? 'hi-IN' : 'kn-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${REVIEWED_ON}T00:00:00Z`));
  const title = t(text('Business Licence Checker India | GST, FSSAI & MSME | RegisterBox', 'भारत में व्यवसाय लाइसेंस चेकर | GST, FSSAI और MSME | RegisterBox', 'ಭಾರತದ ಉದ್ಯಮ ಪರವಾನಗಿ ಪರಿಶೀಲನೆ | GST, FSSAI ಮತ್ತು MSME | RegisterBox'));
  const description = t(text('Check GST, FSSAI, Udyam/MSME, shop registration and local business approvals in India. Get a free checklist for your activity and state. English, Hindi and Kannada.', 'भारत में GST, FSSAI, उद्यम/MSME, दुकान पंजीकरण और स्थानीय व्यापार अनुमतियाँ जाँचें। अपने काम और राज्य के अनुसार मुफ़्त सूची पाएँ। हिंदी, अंग्रेज़ी और कन्नड़ में।', 'ಭಾರತದಲ್ಲಿ GST, FSSAI, ಉದ್ಯಮ/MSME, ಅಂಗಡಿ ನೋಂದಣಿ ಮತ್ತು ಸ್ಥಳೀಯ ಉದ್ಯಮ ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ನಿಮ್ಮ ಚಟುವಟಿಕೆ ಮತ್ತು ರಾಜ್ಯಕ್ಕೆ ಅನುಗುಣವಾದ ಉಚಿತ ಪಟ್ಟಿಯನ್ನು ಪಡೆಯಿರಿ.'));
  const schema = [
    { '@type': 'WebPage', '@id': `${siteUrl}${path}#webpage`, url: `${siteUrl}${path}`, name: title, description, inLanguage: locale === 'en' ? 'en-IN' : `${locale}-IN`, dateModified: REVIEWED_ON, mainEntity: { '@id': `${siteUrl}${path}#application` }, about: { '@type': 'Thing', name: 'Business licences and registrations in India' } },
    { '@type': 'WebApplication', '@id': `${siteUrl}${path}#application`, name: 'Free India Business Licence & Registration Checker', description, url: `${siteUrl}${path}`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any modern web browser', browserRequirements: 'JavaScript enabled', isAccessibleForFree: true, inLanguage: ['en-IN', 'hi-IN', 'kn-IN'], offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, featureList: 'Business licence checklist, official source links, English Hindi Kannada, print and copy, no login' },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${siteUrl}/tools` }, { '@type': 'ListItem', position: 3, name: t(misc.breadcrumb), item: `${siteUrl}${path}` }] },
    { '@type': 'FAQPage', mainEntity: [...LICENCE_FAQS, ...BUSINESS_LICENCE_EXAMPLES].map(faq => ({ '@type': 'Question', name: t(faq.question), acceptedAnswer: { '@type': 'Answer', text: t(faq.answer) } })) },
  ];

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(previous => ({ ...previous, [key]: value }));
    setErrors(previous => { const updated = { ...previous }; delete updated[key]; return updated; });
    setCopyState('idle');
  }
  function toggle(key: 'channels' | 'special', value: string) {
    update(key, answers[key].includes(value) ? answers[key].filter(item => item !== value) : [...answers[key], value]);
  }
  function goTo(nextStep: number) {
    setStep(nextStep); setErrors({}); setCopyState('idle');
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      workspace.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, Localized> = {};
    if (step === 0) {
      if (!STATES.some(state => state.id === answers.state)) nextErrors.state = c.validationState;
      if (!answers.activity) nextErrors.activity = c.validationActivity;
      if (!answers.entity) nextErrors.entity = c.validationEntity;
    } else {
      if (!answers.premises) nextErrors.premises = c.validationPremises;
      if (!answers.channels.length) nextErrors.channels = c.validationChannels;
      if (!validBusinessNumber(answers.turnover)) nextErrors.turnover = c.validationTurnover;
      if (!validBusinessNumber(answers.employees, true)) nextErrors.employees = c.validationEmployees;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) requestAnimationFrame(() => errorSummary.current?.focus());
    else { setAnswers(previous => ({ ...previous, turnover: normalizeBusinessNumber(previous.turnover), employees: normalizeBusinessNumber(previous.employees) })); goTo(step + 1); }
  }
  function printChecklist() {
    const details = Array.from(workspace.current?.querySelectorAll('details') || []);
    const openStates = details.map(item => item.open);
    const restore = () => details.forEach((item, index) => { item.open = openStates[index]; });
    details.forEach(item => { item.open = true; });
    window.addEventListener('afterprint', restore, { once: true });
    try { window.print(); } catch { window.removeEventListener('afterprint', restore); restore(); }
  }
  async function copyChecklist() {
    const lines = [t(c.resultsTitle), `${t(c.reviewed)}: ${date} | ${RULE_VERSION}`, ...summary.map(item => `${t(item.label)}: ${item.value}`), t(misc.planNote), '', ...results.flatMap(result => [ `${t(result.title)} — ${statusLabel(result.status)}`, t(result.reason), `${t(c.nextStep)}: ${t(result.nextStep)}`, `${t(c.documents)}: ${result.documents.map(t).join('; ')}`, ...result.sourceIds.map(id => SOURCES[id]).filter(Boolean).map(source => `${source.title}: ${source.url}`), '' ]), `${siteUrl}${path}`];
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }
  const selected = (group: keyof typeof CHOICES, id: string) => CHOICES[group].find(item => item.id === id)?.label;
  const effectiveSpecial = [...new Set([...answers.special, ...(answers.activity === 'food' ? ['food'] : [])])];
  const summary = [
    { label: c.stateLabel, value: answers.state ? `${t(STATES.find(state => state.id === answers.state)!.name)}${answers.city ? ` · ${answers.city}` : ''}` : '—' },
    { label: c.activityTitle, value: answers.activity ? t(selected('activity', answers.activity)!) : '—' },
    { label: c.entityTitle, value: answers.entity ? t(selected('entity', answers.entity)!) : '—' },
    ...(step === 2 ? [
      { label: c.premisesTitle, value: t(selected('premises', answers.premises)!) },
      { label: c.turnoverTitle, value: answers.turnover ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(answers.turnover)) : t(c.unknown) },
      { label: c.employeesTitle, value: answers.employees || t(c.unknown) },
      { label: c.channelsTitle, value: answers.channels.map(id => t(selected('channels', id)!)).join(', ') },
      { label: c.specialTitle, value: effectiveSpecial.length ? effectiveSpecial.map(id => t(selected('special', id)!)).join(', ') : t(c.noneSpecial) },
    ] : []),
  ];
  function choiceGroup(group: keyof typeof CHOICES, label: Localized, hint?: Localized) {
    const multiple = group === 'channels' || group === 'special';
    return <fieldset className={`blc-fieldset blc-group-${group}`} aria-describedby={errors[group] ? `blc-error-${group}` : undefined}>
      <legend>{t(label)}</legend>{hint && <p className="blc-hint">{t(hint)}</p>}
      <div className="blc-choices">{CHOICES[group].filter(choice => !(group === 'special' && answers.activity === 'food' && choice.id === 'food')).map(choice => {
        const checked = multiple ? answers[group].includes(choice.id) : answers[group] === choice.id;
        return <label className={`blc-choice${checked ? ' is-selected' : ''}`} key={choice.id}>
          <input type={multiple ? 'checkbox' : 'radio'} name={group} value={choice.id} checked={checked} onChange={() => multiple ? toggle(group, choice.id) : update(group, choice.id)} aria-invalid={!!errors[group]}/>
          <span><strong>{t(choice.label)}</strong>{'hint' in choice && choice.hint && <small>{t(choice.hint)}</small>}</span>
        </label>;
      })}</div>{errors[group] && <p className="blc-error" id={`blc-error-${group}`}>{t(errors[group])}</p>}
    </fieldset>;
  }
  function resultCard(result: LicenceResult) {
    const service = serviceForLicence(result, answers);
    return <article className={`blc-result is-${result.status}`} key={result.id}>
      <div className="blc-result-heading"><div className="blc-result-name"><Mark>{result.status === 'required' ? '✓' : result.status === 'recommended' ? '+' : '?'}</Mark><h3>{t(result.title)}</h3></div><span className={`blc-status status-${result.status}`}>{statusLabel(result.status)}</span></div>
      <p>{t(result.reason)}</p><div className="blc-next"><strong>{t(c.nextStep)}</strong><p>{t(result.nextStep)}</p></div>
      <details><summary>{t(c.documents)} <span aria-hidden="true">+</span></summary><ul>{result.documents.map((document, index) => <li key={index}>{t(document)}</li>)}</ul></details>
      <div className="blc-result-sources"><span>{t(c.authority)}: {t(result.authority)}</span><div>{result.sourceIds.map(id => SOURCES[id]).filter(Boolean).map((source, sourceIndex) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t(c.officialSource)} {sourceIndex + 1} <span aria-hidden="true">↗</span><span className="blc-sr">: {source.title}</span></a>)}</div></div>
      {service && <div className="blc-result-service"><div><span>{t(service.kind === 'service' ? SERVICE_COPY.helpLabel : SERVICE_COPY.reviewLabel)}</span><p>{t(service.detail)}</p></div><Link href={service.path as Href} target="_blank" rel="noopener noreferrer" className={`blc-button ${service.kind === 'service' ? 'blc-primary' : 'blc-secondary'}`} aria-label={`${t(service.action)} — ${t(SERVICE_COPY.newTabShort)}`}>{t(service.action)} <span aria-hidden="true">↗</span></Link></div>}
    </article>;
  }

  return <div className="rb-public-page blc-page" lang={locale === 'en' ? 'en-IN' : `${locale}-IN`}>
    <Seo title={title} description={description} path={path} schema={schema} language={`${initialLocale}-IN`} alternates={[{ language: 'en-IN', path: basePath }, { language: 'hi-IN', path: `${basePath}/hi` }, { language: 'kn-IN', path: `${basePath}/kn` }, { language: 'x-default', path: basePath }]}/>
    <a className="rb-skip" href="#licence-checker">{t(misc.skip)}</a>
    <header className="blc-header rb-container"><WebBrand/><nav aria-label={t(misc.tools)}><Link href="/services" target="_blank" rel="noopener noreferrer">{t(SERVICE_COPY.ourServices)} <span aria-hidden="true">↗</span></Link><Link href={'/tools' as Href}>{t(misc.tools)} <span aria-hidden="true">↗</span></Link></nav></header>
    <main className="rb-container blc-main">
      <nav className="blc-breadcrumb" aria-label={t(misc.breadcrumbLabel)}><Link href="/">RegisterBox</Link><span aria-hidden="true">/</span><Link href={'/tools' as Href}>{t(misc.tools)}</Link><span aria-hidden="true">/</span><span aria-current="page">{t(misc.breadcrumb)}</span></nav>
      <section className="blc-hero" aria-labelledby="blc-title"><div><span className="blc-eyebrow"><span aria-hidden="true"/> {t(c.heroEyebrow)}</span><h1 id="blc-title">{t(c.heroTitle)} <em>{t(c.heroAccent)}</em></h1><p>{t(c.heroDescription)}</p><div className="blc-promises"><span>✓ {t(c.free)}</span><span>✓ {t(c.noLogin)}</span><span>✓ {t(c.private)}</span></div></div><div className="blc-hero-art" aria-hidden="true"><div className="blc-art-dots"/><div className="blc-paper"><span className="blc-paper-brand">Register<span>Box</span></span><span className="blc-paper-line"/><div><span>✓</span> GST</div><div><span>✓</span> FSSAI</div><div><span>✓</span> Udyam</div><span className="blc-paper-line short"/><div className="blc-art-stamp">IN<span>28 + 8</span></div></div><span className="blc-art-bubble">✓</span></div></section>
      <section className="blc-browse-services" aria-labelledby="blc-browse-title"><div><h2 id="blc-browse-title">{t(SERVICE_COPY.knowAlready)}</h2><p>{t(SERVICE_COPY.browseIntro)}</p></div><Link href="/services" target="_blank" rel="noopener noreferrer" className="blc-button blc-secondary">{t(SERVICE_COPY.browse)} <span aria-hidden="true">↗</span></Link></section>
      <section className="blc-workspace" id="licence-checker" ref={workspace} aria-labelledby="blc-step-title">
        <div className="blc-workspace-top"><ol className="blc-progress" aria-label={t(c.stepLabel)}>{c.steps.map((label, index) => <li className={index === step ? 'is-active' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined} key={index}><span>{index < step ? '✓' : `0${index + 1}`}</span><span>{t(label)}</span></li>)}</ol><div className="blc-languages" role="group" aria-label={t(c.languageLabel)}>{(['en','hi','kn'] as const).map(language => <button type="button" key={language} lang={language} aria-pressed={locale === language} onClick={() => { setLocale(language); setCopyState('idle'); }}>{languageNames[language]}</button>)}</div></div>
        <div className={`blc-workspace-body${step === 2 ? ' blc-has-results' : ''}`}>
          <div className="blc-form-panel">
            <div className="blc-step-heading"><span className="blc-eyebrow">{t(c.stepLabel)} {step + 1} / 3</span><h2 id="blc-step-title" ref={heading} tabIndex={-1}>{t(step === 2 ? c.resultsTitle : step === 0 ? c.startTitle : c.steps[1])}</h2><p>{t(step === 2 ? c.resultsDescription : step === 0 ? c.startDescription : misc.operationDescription)}</p></div>
            {step < 2 ? <div role="form" aria-labelledby="blc-step-title" aria-busy={!ready}><noscript><p className="blc-validation">{t(misc.javascript)}</p></noscript>
              {!!Object.keys(errors).length && <div className="blc-validation" role="alert" tabIndex={-1} ref={errorSummary}><strong>{t(misc.checkAnswers)}</strong><ul>{Object.entries(errors).map(([key,value]) => <li key={key}>{t(value)}</li>)}</ul></div>}
              <fieldset className="blc-fields blc-hydration-fields" key={step} disabled={!ready}>
                {step === 0 ? <>
                  <fieldset className="blc-fieldset"><legend>{t(c.locationTitle)}</legend><p className="blc-hint">{t(c.locationHint)}</p><div className="blc-location"><div><label htmlFor="blc-state">{t(c.stateLabel)}</label><select id="blc-state" value={answers.state} onChange={event => update('state', event.target.value)} aria-invalid={!!errors.state} aria-describedby={errors.state ? 'blc-error-state' : undefined}><option value="">{t(c.selectState)}</option>{STATES.map(state => <option key={state.id} value={state.id}>{t(state.name)}</option>)}</select>{errors.state && <p className="blc-error" id="blc-error-state">{t(errors.state)}</p>}</div><div><label htmlFor="blc-city">{t(c.cityLabel)} <small>{t(misc.optional)}</small></label><input id="blc-city" type="text" value={answers.city} maxLength={80} autoComplete="off" placeholder={t(c.cityHint)} onChange={event => update('city', event.target.value)}/></div></div></fieldset>
                  {choiceGroup('activity', c.activityTitle, c.activityHint)}
                  {choiceGroup('entity', c.entityTitle, c.entityHint)}
                </> : <>
                  {choiceGroup('premises', c.premisesTitle, c.premisesHint)}
                  <div className="blc-number-grid">{(['turnover','employees'] as const).map(key => <div className="blc-number" key={key}><label htmlFor={`blc-${key}`}>{t(key === 'turnover' ? c.turnoverTitle : c.employeesTitle)}</label><p className="blc-hint" id={`blc-hint-${key}`}>{t(key === 'turnover' ? c.turnoverHint : c.employeesHint)}</p><div className="blc-number-input">{key === 'turnover' && <span aria-hidden="true">₹</span>}<input id={`blc-${key}`} type="text" inputMode={key === 'turnover' ? 'decimal' : 'numeric'} maxLength={16} value={answers[key]} onChange={event => update(key,event.target.value.trim())} aria-describedby={`blc-hint-${key}${errors[key] ? ` blc-error-${key}` : ''}`} aria-invalid={!!errors[key]} placeholder={t(key === 'turnover' ? c.turnoverPlaceholder : c.employeesPlaceholder)}/></div>{answers[key] !== '' && <button className="blc-text-button" type="button" onClick={() => update(key,'')}>{t(misc.numberUnknown)}</button>}{errors[key] && <p className="blc-error" id={`blc-error-${key}`}>{t(errors[key])}</p>}</div>)}</div>
                  {choiceGroup('channels', c.channelsTitle, c.channelsHint)}
                  {choiceGroup('special', c.specialTitle, misc.optionalSpecial)}
                </>}
              </fieldset>
              <div className="blc-form-actions">{step > 0 && <button type="button" className="blc-button blc-secondary" onClick={() => goTo(step - 1)}><span aria-hidden="true">←</span> {t(c.back)}</button>}<button type="button" disabled={!ready} onClick={submit} className="blc-button blc-primary">{t(step === 0 ? c.next : c.showResults)} <span aria-hidden="true">→</span></button></div>
              <p className="blc-form-note"><span aria-hidden="true">♧</span> {t(c.privacyNote)}</p>
            </div> : <>
              <section className="blc-service-recommendations" aria-labelledby="blc-service-results-title"><div className="blc-service-recommendation-heading"><div><h3 id="blc-service-results-title">{t(SERVICE_COPY.heading)}</h3><p>{t(SERVICE_COPY.intro)}</p></div><Link href="/services" target="_blank" rel="noopener noreferrer">{t(SERVICE_COPY.browse)} ↗</Link></div><nav className="blc-matching-services" aria-label={t(SERVICE_COPY.ourServices)}>{[...matchingServices, CHECKLIST_SERVICES.review].map(service => <Link key={service.path} href={service.path as Href} target="_blank" rel="noopener noreferrer" className={service.kind === 'review' ? 'is-review' : ''} aria-label={`${t(service.title)} — ${t(SERVICE_COPY.newTabShort)}`}>{t(service.title)} <span aria-hidden="true">↗</span></Link>)}</nav><p className="blc-service-fee-note">{t(SERVICE_COPY.optional)}</p><p className="blc-service-newtab">{t(SERVICE_COPY.newTab)}</p></section>
              <div className="blc-results-notice">{t(misc.planNote)}</div>
              <dl className="blc-results-profile">{summary.map((item,index) => <div key={index}><dt>{t(item.label)}</dt><dd>{item.value}</dd></div>)}</dl>
              <div className="blc-results-toolbar"><button className="blc-button blc-primary" type="button" onClick={printChecklist}>{t(c.print)} <span aria-hidden="true">↗</span></button><button className="blc-button blc-secondary" type="button" onClick={copyChecklist}>{t(copyState === 'copied' ? c.copied : c.copy)}</button><button className="blc-text-button" type="button" onClick={() => goTo(0)}>{t(c.editAnswers)}</button></div>
              <p className="blc-copy-status" role="status">{copyState === 'copied' ? t(c.copied) : copyState === 'failed' ? t(misc.copyFailed) : ''}</p>
              <div className="blc-result-counts">{(['required','check','recommended'] as const).map(status => <span key={status}><strong>{results.filter(result => result.status === status).length}</strong> {statusLabel(status)}</span>)}</div>
              <div className="blc-results-list">{activeResults.map(resultCard)}</div>
              {otherResults.length > 0 && <details className="blc-other-results"><summary>{t(misc.notFound)} <span>{otherResults.length} <span aria-hidden="true">+</span></span></summary><p>{t(misc.notExempt)}</p><div className="blc-results-list">{otherResults.map(resultCard)}</div></details>}
              <div className="blc-assistance"><div><h3>{t(misc.assistance)}</h3><p>{t(misc.assistanceText)}</p></div><Link href="/contact" className="blc-button blc-secondary">{t(c.contact)} <span aria-hidden="true">↗</span></Link></div>
              <div className="blc-results-footnote"><p>{t(c.scopeNote)}</p><p>{t(c.reviewed)}: {date} · {RULE_VERSION}</p><button className="blc-text-button" type="button" onClick={() => { setAnswers(emptyAnswers()); goTo(0); }}>{t(c.restart)}</button></div>
            </>}
          </div>
          {step < 2 && <aside className="blc-aside"><span className="blc-eyebrow">{t(misc.overview)}</span><h2>{t(misc.sidebarTitle)}</h2><p>{t(misc.sidebarText)}</p><ul className="blc-feature-list">{[misc.featureOne,misc.featureTwo,misc.featureThree].map((feature,index) => <li key={index}><Mark>✓</Mark>{t(feature)}</li>)}</ul><div className="blc-preview"><span>{t(misc.sample)}</span><div><span>GST</span><span>FSSAI</span><span>Udyam</span><span>IEC</span><span>EPF / ESI</span></div></div>{answers.activity && <div className="blc-answer-summary"><h3>{t(misc.selectedBusiness)}</h3><dl>{summary.filter(item => item.value !== '—').map((item,index) => <div key={index}><dt>{t(item.label)}</dt><dd>{item.value}</dd></div>)}</dl></div>}<p className="blc-aside-note">{t(c.localCoverage)}</p></aside>}
        </div>
      </section>
      <section className="blc-guide" aria-labelledby="blc-guide-title"><div className="blc-guide-intro"><span className="blc-eyebrow">{t(misc.guideEyebrow)}</span><h2 id="blc-guide-title">{t(LICENCE_GUIDE.title)}</h2><p>{t(LICENCE_GUIDE.intro)}</p></div><div className="blc-guide-coverage"><h3>{t(LICENCE_GUIDE.coverageTitle)}</h3><p>{t(LICENCE_GUIDE.coverage)}</p><p className="blc-guide-links"><Link href={'/services/gst-registration' as Href}>GST</Link><Link href={'/services/fssai-food-business' as Href}>FSSAI</Link><Link href={'/services/udyam-registration' as Href}>Udyam / MSME</Link><Link href="/services">{t(c.contact)} ↗</Link></p></div></section>
      <section className="blc-examples" aria-labelledby="blc-examples-title"><h2 id="blc-examples-title">{t(LICENCE_GUIDE.examplesTitle)}</h2><p className="blc-examples-intro">{t(LICENCE_GUIDE.examplesIntro)}</p><div className="blc-example-grid">{BUSINESS_LICENCE_EXAMPLES.map(example => <article key={example.id}><h3>{t(example.question)}</h3><p>{t(example.answer)}</p><div className="blc-example-links"><Link href={example.servicePath as Href} target="_blank" rel="noopener noreferrer">{t(LICENCE_GUIDE.serviceLink)} ↗</Link><details><summary>{t(c.officialSource)}</summary><ul>{example.sourceIds.map(id => <li key={id}><a href={SOURCES[id].url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{SOURCES[id].title} ↗</a></li>)}</ul></details></div></article>)}</div></section>
      <section className="blc-method" aria-labelledby="blc-method-title"><h2 id="blc-method-title">{t(LICENCE_GUIDE.howTitle)}</h2><ol>{LICENCE_GUIDE.how.map((item,index) => <li key={index}><span>0{index + 1}</span><h3>{t(c.steps[index])}</h3><p>{t(item)}</p></li>)}</ol></section>
      <section className="blc-faq" aria-labelledby="blc-faq-title"><h2 id="blc-faq-title">{t(LICENCE_GUIDE.faqTitle)}</h2><div>{LICENCE_FAQS.map((faq,index) => <details key={index}><summary>{t(faq.question)}<span aria-hidden="true">+</span></summary><p>{t(faq.answer)}</p></details>)}</div></section>
      <section className="blc-trust" aria-labelledby="blc-source-title"><div><h2 id="blc-source-title">{t(LICENCE_GUIDE.sourceTitle)}</h2><p>{t(LICENCE_GUIDE.sourceIntro)}</p><a href="https://www.nsws.gov.in/portal/investor-decision" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t(misc.viewSource)} ↗</a><p className="blc-review-date">{t(c.reviewed)}: <time dateTime={REVIEWED_ON}>{date}</time> · {RULE_VERSION}</p><details className="blc-source-register"><summary>{t(c.officialSource)} <span aria-hidden="true">+</span></summary><ul>{Object.values(SOURCES).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.title} ↗</a></li>)}</ul></details></div><div className="blc-privacy"><Mark>✓</Mark><h2>{t(LICENCE_GUIDE.privacyTitle)}</h2><p>{t(LICENCE_GUIDE.privacy)}</p></div></section>
      <nav className="blc-read-languages" aria-label={t(c.languageLabel)}><span>{t(LICENCE_GUIDE.languages)}</span>{(['en','hi','kn'] as const).map(language => <Link key={language} href={(language === 'en' ? basePath : `${basePath}/${language}`) as Href} asChild><a hrefLang={language} lang={language}>{languageNames[language]}</a></Link>)}</nav>
    </main>
    <SiteFooter/>
  </div>;
}
