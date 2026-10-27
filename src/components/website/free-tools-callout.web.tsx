import { Link, type Href } from 'expo-router';
import './free-tools-callout.css';

const tools = [
  { path: '/tools/pdf-converter', name: 'Free PDF converter', kicker: 'FILES, READY TO SHARE', detail: 'Word, Excel, PowerPoint, images and more. Convert to and from PDF in your browser, up to 5 MB.', action: 'Open PDF converter', icon: 'pdf' },
  { path: '/tools/indian-language-typing', name: 'Indian language typing', kicker: 'ENGLISH KEYS. YOUR LANGUAGE.', detail: 'Type familiar words using English letters and write in Kannada, Hindi, Tamil and other supported Indian scripts.', action: 'Start typing', icon: 'language' },
] as const;

export function FreeToolCards() {
  return <div className="rb-free-tool-grid">{tools.map(tool => <article className="rb-free-tool-card" key={tool.path}>
    <div className="rb-free-tools-icon" aria-hidden="true">{tool.icon === 'pdf' ? <svg width="30" height="36" viewBox="0 0 36 42" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H8a3 3 0 0 0-3 3v30a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V12Z"/><path d="M22 3v9h9M10 21h16m-4-4 4 4-4 4M26 31H10m4-4-4 4 4 4"/></svg> : <span lang="kn">ಅ</span>}</div>
    <span className="rb-free-tools-kicker">{tool.kicker}</span>
    <h3><Link href={tool.path as Href}>{tool.name}</Link></h3>
    <p>{tool.detail}</p>
    <Link href={tool.path as Href} className="rb-free-tools-link">{tool.action} <span aria-hidden="true">↗</span></Link>
  </article>)}</div>;
}

export function FreeToolsCallout() {
  return <section className="rb-free-tools rb-container" aria-labelledby="free-tools-title">
    <div className="rb-free-tools-heading"><div><span className="rb-free-tools-kicker">FREE TO USE. NO SIGN-UP.</span><h2 id="free-tools-title">Everyday tools. One less step.</h2></div><Link href={'/tools' as Href}>Explore free tools <span aria-hidden="true">↗</span></Link></div>
    <FreeToolCards/>
  </section>;
}
