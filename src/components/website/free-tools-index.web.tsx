import { TAX_TOOLS } from '@/lib/tax-tool-content';
import { CA_TOOLS } from '@/lib/ca-tool-catalog';
import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { FreeToolCards } from './free-tools-callout.web';
import { Seo, siteUrl } from './seo.web';
import './free-tools-index.css';
import './ca-tools.css';

const path = '/tools';
const description = 'Free CA, GST and income-tax tools for India. Calculate tax, reconcile GSTR-2B, extract bank and invoice data, check licences and convert PDFs. No login.';
const toolLinks = [
  { name: 'Business licence checker', path: '/tools/business-licence-checker' },
  { name: 'Free PDF converter', path: '/tools/pdf-converter' },
  { name: 'Indian language typing', path: '/tools/indian-language-typing' },
  { name: 'Free CA tools for India', path: '/tools/ca-tools' },
  ...TAX_TOOLS.map(tool => ({ name: tool.name, path: `/tools/${tool.id}` })),
  ...CA_TOOLS.map(tool => ({ name: tool.name, path: `/tools/${tool.id}` })),
];
const schema = [
  { '@type': 'CollectionPage', '@id': `${siteUrl}${path}#webpage`, url: `${siteUrl}${path}`, name: 'Free online tools by RegisterBox', description, inLanguage: 'en-IN', mainEntity: { '@id': `${siteUrl}${path}#tools` } },
  { '@type': 'ItemList', '@id': `${siteUrl}${path}#tools`, name: 'Free RegisterBox tools', numberOfItems: toolLinks.length, itemListElement: toolLinks.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, name: tool.name, url: `${siteUrl}${tool.path}` })) },
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${siteUrl}${path}` }] },
];

export default function FreeToolsIndex() {
  return <div className="rb-public-page rb-tool-index">
    <Seo title="Free CA, GST & Accounting Tools India | RegisterBox" description={description} path={path} schema={schema}/>
    <a className="rb-skip" href="#free-tools-main">Skip to tools</a>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/">Back to RegisterBox <span aria-hidden="true">↗</span></Link></header>
    <main className="rb-container rb-tool-index-main" id="free-tools-main">
      <nav className="rb-tool-index-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Free tools</span></nav>
      <section className="rb-tool-index-intro" aria-labelledby="free-tools-page-title"><span className="rb-eyebrow">A LITTLE LESS EVERYDAY WORK</span><h1 id="free-tools-page-title">Useful tools.<br/><span>Free for everyone.</span></h1><p>Calculate GST, TDS and advance tax, compare income tax regimes, reconcile purchases or turn a bank statement into Excel. Find business licences, convert documents and type Indian languages. Tools for chartered accountants, accountants and businesses in India, with explanations and official sources.</p><div className="rb-tool-index-promises"><span>✓ No login</span><span>✓ No payment</span><span>✓ Works in your browser</span></div></section>
      <section className="ca-hub-banner" aria-labelledby="ca-tools-banner-title"><div><h2 id="ca-tools-banner-title">Tools for CA firms and accountants</h2><p>{CA_TOOLS.length} free tools for tax, GST, reconciliation and accounting. Find them together in the CA tools collection.</p></div><Link href={'/tools/ca-tools' as Href}>Explore CA tools <span aria-hidden="true">↗</span></Link></section>
      <nav className="rb-free-tax-links" aria-label="Free chartered accountant tools">{CA_TOOLS.map(tool=><Link key={tool.id} href={`/tools/${tool.id}` as Href}>{tool.name} <span aria-hidden="true">↗</span></Link>)}</nav>
      <section className="rb-tool-index-catalog" aria-labelledby="choose-free-tool"><h2 id="choose-free-tool">Pick the tool you need.</h2><FreeToolCards/></section>
      <section className="rb-tool-index-guide" aria-labelledby="free-tools-guide"><div><h2 id="free-tools-guide">A clear place to start.</h2><p>Each tool explains how it works and its limits before you begin. Review your output before sharing it.</p></div><div><h3>Find the registrations to check</h3><p>The <Link href={'/tools/business-licence-checker' as Href}>business licence checker</Link> uses your location, activity and business details to build a starting checklist, with official sources and local checks. Answer in <Link href={'/tools/business-licence-checker' as Href}>English</Link>, <Link href={'/tools/business-licence-checker/hi' as Href}><span lang="hi">हिन्दी</span></Link> or <Link href={'/tools/business-licence-checker/kn' as Href}><span lang="kn">ಕನ್ನಡ</span></Link>. It is guidance rather than a government approval.</p><h3>Turn files into PDF and back</h3><p>The <Link href={'/tools/pdf-converter' as Href}>PDF converter</Link> accepts source files up to 5 MB combined. Convert images and supported Office files to PDF, or export PDF pages and selectable text to other formats. The format guide explains what is preserved.</p><h3>Write using English letters</h3><p><Link href={'/tools/indian-language-typing' as Href}>Indian language typing</Link> converts the sounds you type into the selected script. It is transliteration: spell a word as it sounds. It does not translate an English sentence into another language.</p></div></section>
    </main>
    <SiteFooter/>
  </div>;
}
