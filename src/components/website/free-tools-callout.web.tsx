import { TAX_TOOLS } from '@/lib/tax-tool-content';
import { Link, type Href } from 'expo-router';
import './free-tools-callout.css';
import './ca-tools.css';

const originalTools = [
  { path: '/tools/business-licence-checker', name: 'Business licence checker', kicker: 'A CLEAR START FOR YOUR BUSINESS.', detail: 'Answer simple questions to find the registrations and permissions to check for your business in India. Available in English, Hindi and Kannada.', action: 'Check my business', icon: 'licence' },
  { path: '/tools/pdf-converter', name: 'Free PDF converter', kicker: 'FILES, READY TO SHARE', detail: 'Word, Excel, PowerPoint, images and more. Convert to and from PDF in your browser, up to 5 MB.', action: 'Open PDF converter', icon: 'pdf' },
  { path: '/tools/indian-language-typing', name: 'Indian language typing', kicker: 'ENGLISH KEYS. YOUR LANGUAGE.', detail: 'Type familiar words using English letters and write in Kannada, Hindi, Tamil and other supported Indian scripts.', action: 'Start typing', icon: 'language' },
  { path: '/tools/ca-tools', name: 'Free CA tools', kicker: 'FOR CHARTERED ACCOUNTANTS & BUSINESSES', detail: 'Tax calculators, GST checks, GSTR-2B reconciliation, bank and invoice extraction, and draft financial statements. Together in one free collection.', action: 'Explore CA tools', icon: 'tax' },
] as const;

const tools = [...originalTools, ...TAX_TOOLS.map(tool => ({ path: `/tools/${tool.id}`, name: tool.name, kicker: 'FREE · INDIA TAX & BUSINESS', detail: tool.intro, action: `Open ${tool.name.toLowerCase()}`, icon: 'tax' }))];

export function FreeToolCards({ limit }: { limit?: number }) {
  return <div className="rb-free-tool-grid">{tools.slice(0, limit).map(tool => <article className="rb-free-tool-card" key={tool.path}>
    <div className="rb-free-tools-icon" aria-hidden="true">{tool.icon === 'pdf' ? <svg width="30" height="36" viewBox="0 0 36 42" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H8a3 3 0 0 0-3 3v30a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V12Z"/><path d="M22 3v9h9M10 21h16m-4-4 4 4-4 4M26 31H10m4-4-4 4 4 4"/></svg> : tool.icon === 'licence' ? <svg width="32" height="36" viewBox="0 0 36 42" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="26" height="33" rx="3"/><path d="M13 3h10v6H13zM11 17l2 2 4-4m3 3h5M11 26l2 2 4-4m3 3h5"/></svg> : tool.icon === 'tax' ? <span aria-hidden="true">%</span> : <span lang="kn">ಅ</span>}</div>
    <span className="rb-free-tools-kicker">{tool.kicker}</span>
    <h3><Link href={tool.path as Href}>{tool.name}</Link></h3>
    <p>{tool.detail}</p>
    <Link href={tool.path as Href} className="rb-free-tools-link">{tool.action} <span aria-hidden="true">↗</span></Link>
  </article>)}</div>;
}

export function FreeToolsCallout() {
  return <section className="rb-free-tools rb-container" aria-labelledby="free-tools-title">
    <div className="rb-free-tools-heading"><div><span className="rb-free-tools-kicker">FREE TO USE. NO SIGN-UP.</span><h2 id="free-tools-title">Everyday tools. One less step.</h2></div><Link href={'/tools' as Href}>Explore free tools <span aria-hidden="true">↗</span></Link></div>
    <FreeToolCards limit={3}/><div className="ca-hub-banner"><div><h2>Free tools for CA firms and accountants</h2><p>Calculate advance tax, check GST, reconcile GSTR-2B and prepare reviewable bank or invoice data.</p></div><Link href={'/tools/ca-tools' as Href}>Open CA tools <span aria-hidden="true">↗</span></Link></div><nav className="rb-free-tax-links" aria-label="Free tax tools">{TAX_TOOLS.map(tool => <Link key={tool.id} href={`/tools/${tool.id}` as Href}>{tool.name} <span aria-hidden="true">↗</span></Link>)}</nav>
  </section>;
}
