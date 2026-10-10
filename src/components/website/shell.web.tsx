import { Link, Redirect, type Href, usePathname, useSegments } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { contact, safeNext } from './content';
const nav = [
  ['/dashboard', 'Overview', '◫'], ['/compliance', 'Applications', '▤'], ['/documents', 'Document wallet', '▱'],
  ['/gst', 'GST workspace', '₹'], ['/gst-purchases', 'Purchases & bills', '▦'], ['/ai', 'RegisterBox AI', '✦'], ['/tally', 'Connect Tally', '⇄'], ['/account', 'Account', '○'],
];
export function WebShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const segments = useSegments();
  const { session, loadingSession } = useApp();
  const [open, setOpen] = useState(false);
  const landing = pathname === '/' && !segments.includes('(tabs)' as never);
  const publicPage = landing || pathname.startsWith('/auth') || pathname === '/contact' || pathname === '/policies';
  if (publicPage) return <>{children}</>;
  const next = safeNext(typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname);
  return <div className="rb-shell">
    <header className="rb-work-header"><WebBrand/><div className="rb-work-header-right"><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Need a hand?</a><button className="rb-menu-button" aria-expanded={open} aria-controls="workspace-navigation" onClick={()=>setOpen(!open)}>Menu {open ? '−' : '+'}</button><span className="rb-account-chip">{session?.user.email?.slice(0,1).toUpperCase() || 'R'}</span></div></header>
    <aside id="workspace-navigation" className={`rb-sidebar ${open?'is-open':''}`}><p className="rb-nav-label">YOUR WORKSPACE</p><nav aria-label="Business workspace">{nav.map(([href,label,icon])=><Link key={href} href={href as Href} className={`rb-side-link ${pathname===href?'is-active':''}`} aria-current={pathname===href?'page':undefined} onPress={()=>setOpen(false)}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><div className="rb-side-support"><span>Made for your business.</span><p>Your profiles and documents travel with you, from the app to the web.</p><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Talk to RegisterBox ↗</a></div><Link href="/" className="rb-back-home">← Back to website</Link></aside>
    <main className="rb-work-main" id="workspace-main">{loadingSession?<div className="rb-loading" role="status">Loading your workspace…</div>:!session?<><Redirect href={{pathname:'/auth',params:{next}}}/><div className="rb-loading">Opening secure sign-in…</div></>:children}</main>
  </div>;
}
