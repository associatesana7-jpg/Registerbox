import { Link, router, type Href } from 'expo-router';
import { AppIcon, type AppIconName } from './app-icon';
import { BusinessProfilePicker } from './business-profile-picker';
import { ErrorBanner } from './registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationCategories } from '@/data/application-categories';
import { applicationStage } from '@/lib/workspace-journey';
import { contact } from './website/content';
import './website/workspace-overview.css';

const shortcuts: { title: string; detail: string; href: Href; icon: AppIconName; color: string }[] = [
  { title: 'GST workspace', detail: 'Prepare, review and track your returns.', href: '/gst', icon: 'receipt', color: 'blue' },
  { title: 'Registrations & licences', detail: 'The right service for your next step.', href: '/onboarding/intent', icon: 'business', color: 'violet' },
  { title: 'Document wallet', detail: 'Your records, ready when you need them.', href: '/documents' as Href, icon: 'folder', color: 'orange' },
];

function Icon({ name, size = 21 }: { name: AppIconName; size?: number }) {
  return <AppIcon name={name} size={size} color="currentColor"/>;
}

function shortDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export default function CustomerHome() {
  const { business } = useApp();
  const { data, loading, error, refresh } = useBusinessRecords();
  const draft = data?.drafts[0];
  const request = data?.actions[0];
  const active = data?.applications.find(row => !['APPROVED', 'CANCELLED', 'REJECTED'].includes(row.status));
  const begin = () => router.push('/onboarding/intent');
  const next = !business.id
    ? { title: 'Your next chapter starts here.', detail: 'Start an application or add an existing GST business. We’ll help you find the right first step.', action: 'Find my service', onPress: begin, icon: 'add' as const, label: 'LET’S GET STARTED' }
    : request
      ? { title: request.title, detail: request.description, action: 'Review what’s needed', onPress: () => router.push('/compliance' as Href), icon: 'info' as const, label: 'NEEDS YOUR ATTENTION' }
      : draft
        ? { title: 'Pick up where you left off.', detail: applicationCategories[draft.category].title, action: 'Continue application', onPress: () => router.push({ pathname: '/onboarding/application', params: { category: draft.category, resume: '1' } }), icon: 'document' as const, label: 'YOUR SAVED APPLICATION' }
        : active
          ? { title: 'A clear view of your next step.', detail: (active.services?.name || 'Application') + ' · Track your progress and see what happens next.', action: 'View application', onPress: () => router.push({ pathname: '/application-details', params: { id: active.id } }), icon: 'pending' as const, label: 'YOUR APPLICATION' }
          : { title: business.gstin ? 'Your GST, one step at a time.' : 'Ready for your next move?', detail: business.gstin ? 'Start with GSTR-1. Continue to GSTR-3B after its filing is confirmed.' : 'Explore registrations and services for your next business milestone.', action: business.gstin ? 'Open GST workspace' : 'Explore services', onPress: business.gstin ? () => router.push('/gst') : begin, icon: 'receipt' as const, label: 'YOUR NEXT STEP' };
  const busy = loading && Boolean(business.id);
  const metrics = [
    { label: 'Applications', value: data?.applications.length, href: '/compliance', icon: 'grid' as const, detail: 'Your service requests' },
    { label: 'Documents', value: data?.documents.length, href: '/documents', icon: 'folder' as const, detail: 'Saved to your business' },
    { label: 'Open requests', value: data?.actions.length, href: '/compliance', icon: 'pending' as const, detail: 'Waiting for your attention' },
  ];

  return <div className="rb-overview"><div className="rb-overview-inner">
    <header className="rb-overview-heading">
      <div><p className="rb-overview-eyebrow">A LITTLE CLARITY. EVERY DAY.</p><h1>Your workspace.</h1><p>{business.id ? 'Everything your business needs. A little more in order.' : 'Your registrations, documents and next steps. Together.'}</p></div>
      <Link href="/onboarding/intent" className="rb-overview-button rb-overview-button-primary"><Icon name="add" size={18}/> New application</Link>
    </header>

    {error ? <div className="rb-overview-error"><ErrorBanner message={error}/></div> : null}

    <section className="rb-overview-metrics" aria-label="Business at a glance" aria-busy={busy}>
      {metrics.map(item => <Link key={item.label} href={item.href as Href} className="rb-overview-metric">
        <div className="rb-overview-metric-top"><span>{item.label}</span><Icon name={item.icon} size={19}/></div>
        <strong>{busy ? <span className="rb-overview-skeleton-number" aria-label="Loading"/> : data ? item.value : '—'}</strong>
        <div className="rb-overview-metric-bottom"><span>{item.detail}</span><Icon name="chevron" size={17}/></div>
      </Link>)}
    </section>

    <div className="rb-overview-columns">
      <div className="rb-overview-primary">
        <section className={'rb-overview-next' + (request ? ' rb-overview-next-attention' : '')} aria-labelledby="workspace-next-title" aria-busy={busy}>
          {busy ? <div className="rb-overview-loading" role="status"><span/><span/><span/><p>Getting your workspace ready…</p></div> : error ? <>
            <div className="rb-overview-next-top"><span className="rb-overview-next-icon"><Icon name="info" size={24}/></span><span className="rb-overview-kicker">WORKSPACE UNAVAILABLE</span></div>
            <h2 id="workspace-next-title">Let’s reconnect your workspace.</h2><p>Your latest progress couldn’t load. Try again to see your applications and the right next step.</p>
            <button className="rb-overview-button rb-overview-button-primary" onClick={() => void refresh()}>Reload workspace<Icon name="arrow" size={18}/></button>
          </> : <>
            <div className="rb-overview-next-top"><span className="rb-overview-next-icon"><Icon name={next.icon} size={24}/></span><span className="rb-overview-kicker">{next.label}</span>{active && !request && !draft ? <span className={'rb-overview-status rb-overview-status-' + applicationStage(active.status).tone}>{applicationStage(active.status).label}</span> : null}</div>
            <h2 id="workspace-next-title">{next.title}</h2><p>{next.detail}</p>
            <button className="rb-overview-button rb-overview-button-primary" onClick={next.onPress}>{next.action}<Icon name="arrow" size={18}/></button>
          </>}
        </section>

        <section className="rb-overview-panel" aria-labelledby="workspace-applications-title">
          <div className="rb-overview-section-heading"><h2 id="workspace-applications-title">Recent applications</h2><Link href={'/compliance' as Href}>View all <Icon name="chevron" size={15}/></Link></div>
          {busy ? <div className="rb-overview-list-loading" role="status">Loading your applications…</div> : data?.applications.length ? <div className="rb-overview-application-list">{data.applications.slice(0, 3).map(row => {
            const stage = applicationStage(row.status);
            return <Link key={row.id} href={{ pathname: '/application-details', params: { id: row.id } }} className="rb-overview-application">
              <span className="rb-overview-file-icon"><Icon name="document" size={21}/></span>
              <div className="rb-overview-application-name"><strong>{row.services?.name || 'Business application'}</strong><span>{row.application_number || 'Application'}{shortDate(row.created_at) ? ' · ' + shortDate(row.created_at) : ''}</span></div>
              <span className={'rb-overview-status rb-overview-status-' + stage.tone}>{stage.label}</span><span className="rb-overview-row-chevron"><Icon name="chevron" size={17}/></span>
            </Link>;
          })}</div> : <div className="rb-overview-empty"><span className="rb-overview-file-icon"><Icon name="document" size={25}/></span><h3>{error ? 'Your applications couldn’t load.' : 'Your next idea belongs here.'}</h3><p>{error ? 'Try again to see the latest information.' : 'Start a service and follow every step from this workspace.'}</p>{!error ? <Link href="/onboarding/intent">Explore services <Icon name="arrow" size={16}/></Link> : null}</div>}
        </section>

        <section className="rb-overview-shortcuts" aria-labelledby="workspace-tools-title">
          <div className="rb-overview-section-heading"><h2 id="workspace-tools-title">Made for your business</h2><span>Your everyday essentials</span></div>
          <div className="rb-overview-shortcut-grid">{shortcuts.map(item => <Link key={item.title} href={item.href} className="rb-overview-shortcut"><span className={'rb-overview-tool-icon rb-overview-tool-' + item.color}><Icon name={item.icon} size={23}/></span><h3>{item.title}</h3><p>{item.detail}</p><span className="rb-overview-shortcut-arrow"><Icon name="arrow" size={18}/></span></Link>)}</div>
        </section>
      </div>

      <aside className="rb-overview-rail" aria-label="Business and assistance">
        <section className="rb-overview-business"><div className="rb-overview-section-heading"><h2>Your business</h2><span className="rb-overview-private"><Icon name="lock" size={13}/> Private</span></div><BusinessProfilePicker compact/></section>
        <section className="rb-overview-assistant" aria-labelledby="workspace-assistant-title"><span className="rb-overview-ai-icon"><Icon name="spark" size={25}/></span><span className="rb-overview-kicker">A LITTLE EXTRA CLARITY</span><h2 id="workspace-assistant-title">Meet your business<br/>thinking partner.</h2><p>A business question. A bill to organise. A simpler place to start.</p><Link href={'/ai' as Href} className="rb-overview-button rb-overview-button-secondary">Ask RegisterBox AI<Icon name="arrow" size={17}/></Link></section>
        <a className="rb-overview-human-help" href={contact.whatsapp} target="_blank" rel="noopener noreferrer"><span className="rb-overview-help-icon"><Icon name="help" size={21}/></span><span><strong>A person, when you need one.</strong><span>Talk to the RegisterBox team <span aria-hidden="true">↗</span></span></span></a>
      </aside>
    </div>
    <footer className="rb-overview-footer"><span>Business. With clarity.</span><span>Your work, connected across web and app.</span></footer>
  </div></div>;
}
