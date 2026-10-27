import { Link, type Href } from 'expo-router';
import './free-tools-callout.css';

export function FreeToolsCallout() {
  return <section className="rb-free-tools rb-container" aria-labelledby="free-pdf-tool-title">
    <div className="rb-free-tools-inner">
      <div className="rb-free-tools-icon" aria-hidden="true">
        <svg width="36" height="42" viewBox="0 0 36 42" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H8a3 3 0 0 0-3 3v30a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V12Z"/><path d="M22 3v9h9M10 21h16m-4-4 4 4-4 4M26 31H10m4-4-4 4 4 4"/></svg>
      </div>
      <div className="rb-free-tools-copy">
        <span className="rb-free-tools-kicker">FREE PDF CONVERTER</span>
        <h2 id="free-pdf-tool-title">A new format. Less paperwork.</h2>
        <p>Word, Excel, PowerPoint, images and more. Convert to and from PDF. Free, up to 5 MB. No sign-up.</p>
      </div>
      <Link href={'/tools/pdf-converter' as Href} className="rb-free-tools-link">Open free PDF converter <span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
