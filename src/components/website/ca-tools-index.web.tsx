import { Link, type Href } from 'expo-router';
import { CA_TOOL_GROUPS, CA_TOOLS } from '@/lib/ca-tool-catalog';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { Seo, siteUrl } from './seo.web';
import './tax-tools.css';
import './ca-tools.css';

const path = '/tools/ca-tools';
const description = 'Free tools for chartered accountants, tax practitioners and businesses in India: 44AD/44ADA, advance tax, ITC set-off, GSTR-2B reconciliation, invoice and bank PDF to Excel. No login or paid API.';
const faqs = [
  { question: 'Which free tools can chartered accountants use on RegisterBox?', answer: 'Use the tax calculators for presumptive income, advance tax interest, depreciation, Karnataka professional tax and supported MCA additional fees. The GST tools cover ITC utilisation, e-invoice checks, e-way bill validity, selected place-of-supply and reverse-charge cases. Document tools reconcile GSTR-2B and extract reviewable bank or invoice data.' },
  { question: 'Do the CA tools need a login, subscription or government API?', answer: 'No. Calculations and document processing run in your browser using bundled code and local assets. They do not connect to GSTN, income-tax, MCA or bank accounts, and do not submit returns or payments.' },
  { question: 'Can a matched GSTR-2B invoice be treated as eligible ITC?', answer: 'A match only compares the records supplied. Legal ITC eligibility also depends on the document, receipt, statutory conditions, blocked credit, reversals and time limits. Review those facts before claiming credit.' },
  { question: 'Can PDF and image extraction make mistakes?', answer: 'Yes. Layouts, scan quality and OCR can affect amounts and descriptions. The tools expose extracted rows for review and flag reconciliation or balance differences. Compare the exported data with the original document before posting it in the books.' },
];

export default function CaToolsIndex() {
  const schema = [
    { '@type': 'CollectionPage', '@id': `${siteUrl}${path}#webpage`, url: `${siteUrl}${path}`, name: 'Free CA tools for India', description, inLanguage: 'en-IN', dateModified: '2026-10-28', mainEntity: { '@id': `${siteUrl}${path}#tools` } },
    { '@type': 'ItemList', '@id': `${siteUrl}${path}#tools`, name: 'Free tools for chartered accountants', numberOfItems: CA_TOOLS.length, itemListElement: CA_TOOLS.map((tool, i) => ({ '@type': 'ListItem', position: i + 1, name: tool.name, url: `${siteUrl}/tools/${tool.id}` })) },
    { '@type': 'FAQPage', mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${siteUrl}/tools` }, { '@type': 'ListItem', position: 3, name: 'CA tools', item: `${siteUrl}${path}` }] },
  ];
  return <div className="rb-public-page tax-page ca-index" lang="en-IN">
    <Seo title="Free CA Tools India | Tax, GST & Excel Tools | RegisterBox" description={description} path={path} schema={schema}/>
    <a className="rb-skip" href="#ca-catalog">Skip to CA tools</a>
    <header className="rb-container tax-header"><WebBrand/><nav aria-label="Website"><Link href={'/tools' as Href}>All free tools ↗</Link><Link href="/services">Our services ↗</Link></nav></header>
    <main className="rb-container tax-main">
      <nav className="tax-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={'/tools' as Href}>Free tools</Link><span>/</span><span aria-current="page">CA tools</span></nav>
      <section className="tax-hero ca-hero"><div><span className="tax-eyebrow">FOR CHARTERED ACCOUNTANTS · ACCOUNTANTS · BUSINESSES IN INDIA</span><h1>Free CA tools.<br/><span>Tax, GST & accounting.</span></h1><p>Calculate tax, check GST treatment, reconcile purchases and prepare reviewable Excel data. Choose a tool below. Each one explains the facts it needs, the calculation and the cases it covers.</p><div className="tax-promises"><span>✓ {CA_TOOLS.length} free tools</span><span>✓ No account needed</span><span>✓ Processed on your device</span></div></div><aside><span className="tax-hero-glyph" aria-hidden="true">≡</span><span>Clear workings.<br/>Official sources.</span><small>Rules & scope reviewed<br/><time dateTime="2026-10-28">28 October 2026</time></small></aside></section>
      <nav className="ca-jump-links" aria-label="Choose a tool category">{CA_TOOL_GROUPS.map(group => <a key={group.id} href={`#${group.id}`}>{group.name}<span aria-hidden="true">↓</span></a>)}</nav>
      <div id="ca-catalog">{CA_TOOL_GROUPS.map((group, index) => <section className="ca-category" id={group.id} key={group.id} aria-labelledby={`${group.id}-heading`}><div className="ca-category-heading"><span className="tax-eyebrow">0{index + 1}</span><h2 id={`${group.id}-heading`}>{group.name}</h2><p>{group.description}</p></div><div className="ca-tool-grid">{group.tools.map(tool => <article className="ca-tool-card" key={tool.id}><span className="ca-card-tag">FREE · NO LOGIN</span><h3><Link href={`/tools/${tool.id}` as Href}>{tool.name}</Link></h3><p>{tool.intro}</p><Link className="ca-card-action" href={`/tools/${tool.id}` as Href}>Open tool <span aria-hidden="true">↗</span></Link></article>)}</div></section>)}</div>
      <section className="tax-answer"><span className="tax-eyebrow">PRACTICAL TOOLS, EXPLAINED</span><h2>Free accounting tools for Indian businesses and CA firms</h2><p>Start with the relevant period and the source records. Tax tools show their assumptions and workings; document tools show extracted data for checking. Each page includes examples, exclusions and source links so you can assess the result before using it in client work.</p><p>For everyday calculations, also use the <Link href={'/tools/gst-calculator' as Href}>GST calculator</Link>, <Link href={'/tools/gst-invoice-generator' as Href}>GST invoice generator</Link>, <Link href={'/tools/tds-calculator' as Href}>TDS calculator</Link>, <Link href={'/tools/gstin-validator' as Href}>GSTIN validator</Link> and <Link href={'/tools/gst-late-fee-calculator' as Href}>GST late-fee calculator</Link>.</p></section>
      <section className="tax-faq"><h2>Using the CA tools</h2>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</section>
      <section className="tax-scope"><div><h2>Your client data stays in this page.</h2><p>The tools do not upload the files or amounts you enter to a conversion or calculation API. Keep original documents and independently review extraction, classification and statutory conditions. Reloading clears the tool inputs.</p></div><aside><h3>Need help with GST or compliance?</h3><p>Choose a RegisterBox service when you want help with the next step. Using a tool is free.</p><Link href="/services">Explore our services ↗</Link></aside></section>
    </main><SiteFooter/>
  </div>;
}
