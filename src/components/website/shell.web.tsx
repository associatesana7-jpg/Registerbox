import { Link, Redirect, type Href, usePathname, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { useState, type PropsWithChildren } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { contact, safeNext } from './content';
import { AppIcon, type AppIconName } from '../app-icon';
import blogLocales from '@/data/blog/locales.json';
import './workspace-shell.css';
const nav: [string,string,AppIconName][] = [
  ['/dashboard', 'Home', 'home'], ['/compliance', 'Applications', 'grid'], ['/documents', 'Documents', 'folder'],
  ['/gst', 'GST workspace', 'receipt'], ['/gst-purchases', 'Purchases & bills', 'document'], ['/ai', 'RegisterBox AI', 'spark'], ['/tally', 'Connect Tally', 'business'], ['/account', 'Account', 'person'],
];
export function WebShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const segments = useSegments();
  const { session, loadingSession } = useApp();
  const [open, setOpen] = useState(false);
  // Control Center owns its staff authentication and server-side role checks.
  // Never send its signed-out visitors through the customer login guard.
  if (pathname === '/privacy-operations' || pathname === '/control-center' || pathname.startsWith('/control-center/')) return <><Head><meta name="robots" content="noindex,nofollow"/></Head>{children}</>;
  const landing = pathname === '/' && !segments.includes('(tabs)' as never);
  const regionalBlog = blogLocales.some(locale => pathname === `/${locale.code}/blog` || pathname.startsWith(`/${locale.code}/blog/`));
  const publicPage = landing || pathname === '/blog' || pathname.startsWith('/blog/') || regionalBlog || pathname.startsWith('/auth') || pathname === '/contact' || pathname === '/privacy' || pathname === '/policies' || pathname === '/delete-account' || pathname === '/services' || pathname.startsWith('/services/');
  if (publicPage) return <>{pathname.startsWith('/auth') && <Head><meta name="robots" content="noindex,nofollow"/></Head>}{children}</>;
  const next = safeNext(typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname);
  return <div className="rb-shell"><Head><meta name="robots" content="noindex,nofollow"/></Head>
    <header className="rb-work-header"><WebBrand/><div className="rb-work-header-right"><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Need a hand?</a><button className="rb-menu-button" aria-expanded={open} aria-controls="workspace-navigation" onClick={()=>setOpen(!open)}>Menu {open ? '−' : '+'}</button><span className="rb-account-chip">{session?.user.email?.slice(0,1).toUpperCase() || 'R'}</span></div></header>
    <aside id="workspace-navigation" className={`rb-sidebar ${open?'is-open':''}`}><p className="rb-nav-label">YOUR WORKSPACE</p><nav aria-label="Business workspace">{nav.map(([href,label,icon])=><Link key={href} href={href as Href} className={`rb-side-link ${pathname===href?'is-active':''}`} aria-current={pathname===href?'page':undefined} onPress={()=>setOpen(false)}><AppIcon name={icon} color={pathname===href?'#3458DD':'#647481'} size={21}/>{label}</Link>)}</nav><div className="rb-side-support"><span>Business. With clarity.</span><p>Your applications and documents, together across web and app.</p><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Talk to RegisterBox ↗</a></div><Link href="/" className="rb-back-home">← Back to website</Link></aside>
    <main className="rb-work-main" id="workspace-main">{loadingSession?<div className="rb-loading" role="status">Loading your workspace…</div>:!session?<><Redirect href={{pathname:'/auth',params:{next}}}/><div className="rb-loading">Opening secure sign-in…</div></>:children}</main>
    <nav className="rb-mobile-tabs" aria-label="Main navigation">{nav.filter(([href])=>['/dashboard','/compliance','/documents','/ai','/account'].includes(href)).map(([href,label,icon])=><Link key={href} href={href as Href} className={pathname===href?'is-active':''} aria-current={pathname===href?'page':undefined} onPress={()=>setOpen(false)}><AppIcon name={icon} color={pathname===href?'#3458DD':'#647481'} size={22}/><span>{href==='/ai'?'AI':label}</span></Link>)}</nav>
  </div>;
}
