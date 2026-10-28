import { Link, Redirect, type Href, usePathname, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode, type RefObject } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { contact, safeNext } from './content';
import blogLocales from '@/data/blog/locales.json';
import { PublicLeadPrompt } from './public-lead-prompt.web';
import './workspace-shell.css';

type ShellIconName = 'home' | 'applications' | 'folder' | 'receipt' | 'document' | 'business' | 'spark' | 'person' | 'search' | 'menu' | 'close' | 'help' | 'arrow' | 'chevron';
type WorkspacePage = { href: string; label: string; icon: ShellIconName; description: string; keywords?: string };
const pages: WorkspacePage[] = [
  { href: '/dashboard', label: 'Overview', icon: 'home', description: 'Your business at a glance', keywords: 'home dashboard business' },
  { href: '/compliance', label: 'Applications', icon: 'applications', description: 'Registration drafts and progress', keywords: 'compliance registration licences licenses' },
  { href: '/documents', label: 'Documents', icon: 'folder', description: 'Your files and certificates', keywords: 'upload wallet digilocker files' },
  { href: '/gst', label: 'GST workspace', icon: 'receipt', description: 'Prepare and review GST returns', keywords: 'tax filing returns gstr' },
  { href: '/gst-purchases', label: 'Purchases & bills', icon: 'document', description: 'Purchase records and invoices', keywords: 'invoice expenses' },
  { href: '/tally', label: 'Tally accounting', icon: 'business', description: 'Connect your company and manage your books', keywords: 'ledger vouchers accounting bookkeeping' },
  { href: '/ai', label: 'RegisterBox AI', icon: 'spark', description: 'Get help with your next step', keywords: 'assistant questions chat' },
  { href: '/account', label: 'Account', icon: 'person', description: 'Your profile and account settings', keywords: 'settings email profile' },
];
// Detail screens retain their own breadcrumb while selecting the owning workspace.
const relatedPages: (WorkspacePage & { owner: string; searchable?: boolean })[] = [
  { href: '/application-details', owner: '/compliance', label: 'Application details', icon: 'applications', description: 'Review an application', searchable: false },
  { href: '/gst-returns', owner: '/gst', label: 'GST returns', icon: 'receipt', description: 'Review your return preparation', keywords: 'gstr filing' },
  { href: '/document-locker', owner: '/documents', label: 'Document locker', icon: 'folder', description: 'Connect and fetch consented DigiLocker documents', keywords: 'digilocker consent certificates' },
];
const searchablePages = [...pages, ...relatedPages.filter(page => page.searchable !== false)];
const navigationGroups = [
  { label: 'Workspace', pages: pages.slice(0, 3) },
  { label: 'Finance', pages: pages.slice(3, 6) },
  { label: 'Assistant', pages: pages.slice(6, 7) },
];
const iconPaths: Record<ShellIconName, ReactNode> = {
  home: <><path d="m3.5 10 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z"/><path d="M9 20.5V13h6v7.5"/></>,
  applications: <><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2.5h8v4H8zM8 11h8M8 15h5"/></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 4h18"/>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></>,
  document: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></>,
  business: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/></>,
  spark: <><path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z"/></>,
  person: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .2c0 1.8-2.5 2.1-2.5 4.3M12 17h.01"/></>,
  arrow: <path d="M19 12H5m6-6-6 6 6 6"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
};
function ShellIcon({ name, size = 19 }: { name: ShellIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconPaths[name]}</svg>;
}

// Native modal dialogs make the background inert and contain keyboard focus.
function useModalDialog(ref: RefObject<HTMLDialogElement | null>, open: boolean, preferredFocus?: string) {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    if (preferredFocus) dialog.querySelector<HTMLElement>(preferredFocus)?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, preferredFocus, ref]);
}

function WorkspaceChrome({ children, pathname, email }: PropsWithChildren<{ pathname: string; email?: string }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchResults = useRef<HTMLDivElement>(null);
  const currentPath = pathname === '/' ? '/dashboard' : pathname;
  const relatedPage = relatedPages.find(page => currentPath === page.href || currentPath.startsWith(`${page.href}/`));
  const navigationPath = relatedPage?.owner || currentPath;
  const isActive = (href: string) => navigationPath === href || navigationPath.startsWith(`${href}/`);
  const activePage = pages.find(page => isActive(page.href));
  const pageTitle = relatedPage?.label || activePage?.label || (pathname.startsWith('/onboarding') ? 'New application' : 'Workspace');
  const initials = email?.slice(0, 1).toUpperCase() || 'R';
  const searchTerm = query.trim().toLowerCase();
  const filteredPages = searchablePages.filter(page => `${page.label} ${page.description} ${page.keywords || ''}`.toLowerCase().includes(searchTerm));
  useModalDialog(mobileDialog, mobileOpen, 'a[aria-current="page"]');
  useModalDialog(searchDialog, searchOpen, 'input');

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
        event.preventDefault();
        setMobileOpen(false);
        setSearchOpen(value => !value);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 851px)');
    const closeMobileOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', closeMobileOnDesktop);
    return () => desktop.removeEventListener('change', closeMobileOnDesktop);
  }, []);

  const closeNavigation = () => { setMobileOpen(false); setSearchOpen(false); };
  const renderNavigation = () => <>
    <nav className="rb-workspace-nav" aria-label="Business workspace">
      {navigationGroups.map(group => <section className="rb-nav-group" key={group.label} aria-label={group.label}>
        <p className="rb-nav-label">{group.label}</p>
        {group.pages.map(page => <Link key={page.href} href={page.href as Href} className={`rb-side-link ${isActive(page.href) ? 'is-active' : ''}`} aria-current={isActive(page.href) ? 'page' : undefined} onPress={closeNavigation}><ShellIcon name={page.icon}/><span>{page.label}</span></Link>)}
      </section>)}
    </nav>
    <div className="rb-sidebar-footer">
      <a className="rb-side-link rb-help-link" href={contact.whatsapp} target="_blank" rel="noopener noreferrer" onClick={closeNavigation}><ShellIcon name="help"/><span>Help & support</span><span className="rb-external-mark" aria-hidden="true">↗</span></a>
      <Link href="/account" className={`rb-work-account ${isActive('/account') ? 'is-active' : ''}`} aria-current={isActive('/account') ? 'page' : undefined} onPress={closeNavigation}><span className="rb-work-avatar" aria-hidden="true">{initials}</span><span className="rb-work-account-copy"><strong>My account</strong><small>{email || 'Profile & settings'}</small></span><ShellIcon name="chevron" size={14}/></Link>
      <Link href="/" className="rb-back-home" onPress={closeNavigation}><ShellIcon name="arrow" size={15}/><span>Back to website</span></Link>
    </div>
  </>;

  return <div className="rb-shell" data-clarity-mask="true">
    <Head><title>{pageTitle} | RegisterBox</title><meta name="description" content={`${pageTitle} in your private RegisterBox business workspace.`}/><meta name="robots" content="noindex,nofollow"/></Head>
    <a href="#workspace-main" className="rb-workspace-skip">Skip to workspace</a>
    <header className="rb-work-header">
      <div className="rb-work-brand"><WebBrand/></div>
      <div className="rb-work-toolbar">
        <div className="rb-toolbar-leading">
          <button type="button" className="rb-menu-button" aria-label="Open workspace navigation" aria-expanded={mobileOpen} aria-controls="workspace-mobile-navigation" onClick={() => setMobileOpen(true)}><ShellIcon name="menu" size={20}/></button>
          <nav className="rb-work-breadcrumb" aria-label="Breadcrumb"><Link href="/dashboard">Workspace</Link><ShellIcon name="chevron" size={12}/><span aria-current="page">{pageTitle}</span></nav>
        </div>
        <div className="rb-work-header-right">
          <button type="button" className="rb-work-search-button" aria-label="Search workspace pages" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K" onClick={() => { setQuery(''); setSearchOpen(true); }}><ShellIcon name="search" size={17}/><span>Search pages</span><kbd>⌘ K</kbd></button>
          <a className="rb-work-help-button" href={contact.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Get help on WhatsApp"><ShellIcon name="help" size={19}/></a>
          <Link href="/account" className="rb-account-chip" aria-label="Open your account"><span className="rb-account-initial">{initials}</span></Link>
        </div>
      </div>
    </header>
    <aside className="rb-sidebar rb-desktop-sidebar">{renderNavigation()}</aside>
    <main className="rb-work-main" id="workspace-main" tabIndex={-1}>{children}</main>
    <nav className="rb-mobile-tabs" aria-label="Main navigation">{pages.filter(page => ['/dashboard', '/compliance', '/documents', '/ai', '/account'].includes(page.href)).map(page => <Link key={page.href} href={page.href as Href} className={isActive(page.href) ? 'is-active' : ''} aria-current={isActive(page.href) ? 'page' : undefined} onPress={closeNavigation}><ShellIcon name={page.icon} size={20}/><span>{page.href === '/ai' ? 'AI' : page.href === '/dashboard' ? 'Home' : page.label}</span></Link>)}</nav>
    <dialog ref={mobileDialog} id="workspace-mobile-navigation" className="rb-mobile-dialog" aria-labelledby="workspace-mobile-title" onCancel={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
      <div className="rb-mobile-dialog-header"><h2 id="workspace-mobile-title">Your workspace</h2><button type="button" className="rb-icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><ShellIcon name="close" size={21}/></button></div>
      <div className="rb-mobile-dialog-body">{renderNavigation()}</div>
    </dialog>
    <dialog ref={searchDialog} className="rb-command-dialog" aria-labelledby="workspace-search-title" onCancel={() => setSearchOpen(false)} onClose={() => setSearchOpen(false)} onClick={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
      <div className="rb-command-surface">
        <form className="rb-command-form" onSubmit={event => { event.preventDefault(); searchResults.current?.querySelector<HTMLAnchorElement>('a')?.click(); }}>
          <ShellIcon name="search" size={21}/><label className="rb-visually-hidden" id="workspace-search-title" htmlFor="workspace-page-search">Search workspace pages</label><input id="workspace-page-search" type="search" placeholder="Where would you like to go?" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); searchResults.current?.querySelector<HTMLAnchorElement>('a')?.focus(); } }}/><button type="button" className="rb-icon-button" aria-label="Close search" onClick={() => setSearchOpen(false)}><ShellIcon name="close" size={19}/></button>
        </form>
        <div className="rb-command-results" ref={searchResults}>
          <p className="rb-command-section-label">Workspace pages</p>
          {filteredPages.map(page => <Link key={page.href} href={page.href as Href} className="rb-command-result" onPress={closeNavigation}><span className="rb-command-result-icon"><ShellIcon name={page.icon} size={20}/></span><span><strong>{page.label}</strong><small>{page.description}</small></span><ShellIcon name="chevron" size={15}/></Link>)}
          {!filteredPages.length && <p className="rb-command-empty" role="status">No pages match “{query}”. Try documents, GST or account.</p>}
        </div>
        <p className="rb-command-footnote">Enter to open the first result · Tab to navigate · Esc to close</p>
      </div>
    </dialog>
  </div>;
}

export function WebShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const segments = useSegments();
  const { session, loadingSession } = useApp();
  // Control Center owns its staff authentication and server-side role checks.
  // Never send its signed-out visitors through the customer login guard.
  if (pathname === '/privacy-operations' || pathname === '/control-center' || pathname.startsWith('/control-center/')) return <><Head><meta name="robots" content="noindex,nofollow"/></Head>{children}</>;
  const landing = pathname === '/' && !segments.includes('(tabs)' as never);
  const regionalBlog = blogLocales.some(locale => pathname === `/${locale.code}/blog` || pathname.startsWith(`/${locale.code}/blog/`));
  const publicTool = pathname === '/tools' || pathname === '/tools/pdf-converter' || pathname === '/tools/indian-language-typing' || ['/tools/business-licence-checker', '/tools/business-licence-checker/hi', '/tools/business-licence-checker/kn'].includes(pathname);
  const publicPage = landing || publicTool || regionalBlog || pathname.startsWith('/watch/') || pathname === '/checkout' || pathname === '/blog' || pathname.startsWith('/blog/') || pathname.startsWith('/auth') || pathname === '/contact' || pathname === '/privacy' || pathname === '/policies' || pathname === '/delete-account' || pathname === '/services' || pathname.startsWith('/services/');
  const leadPromptPage = landing || publicTool || regionalBlog || pathname === '/blog' || pathname.startsWith('/blog/') || pathname === '/contact' || pathname === '/services' || pathname.startsWith('/services/');
  if (publicPage) return <>{pathname.startsWith('/auth') && <Head><meta name="robots" content="noindex,nofollow"/></Head>}{leadPromptPage && <PublicLeadPrompt/>}{children}</>;
  const next = safeNext(typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname);
  return <WorkspaceChrome pathname={pathname} email={session?.user.email}>{loadingSession ? <div className="rb-loading" role="status"><h1 className="rb-visually-hidden">Your private RegisterBox workspace</h1>Loading your workspace…</div> : !session ? <><Redirect href={{ pathname: '/auth', params: { next } }}/><div className="rb-loading"><h1 className="rb-visually-hidden">Your private RegisterBox workspace</h1>Opening secure sign-in…</div></> : children}</WorkspaceChrome>;
}
