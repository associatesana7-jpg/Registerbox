import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { BusinessProfilePicker } from '@/components/business-profile-picker';
import { ErrorBanner } from '@/components/registerbox-ui';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';
import { contact } from './content';
import './account-workspace.css';

function Icon({ name, size = 20 }: { name: AppIconName; size?: number }) {
  return <AppIcon name={name} size={size} color="currentColor"/>;
}

export default function AccountWorkspace() {
  const { business, session, demoMode, businessProfiles } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const metadataName: unknown = session?.user.user_metadata?.full_name;
  const signedInName = typeof metadataName === 'string' ? metadataName.trim() : '';
  const accountName = demoMode ? 'Demo account' : signedInName || 'Your account';
  const accountEmail = session?.user.email || (demoMode ? 'Demo account' : 'Email not available');
  const initials = (signedInName || session?.user.email || (demoMode ? 'Demo' : 'R')).split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  const businessName = business.tradeName || business.legalName || 'Your business';
  const address = [business.address, business.city, business.state, business.pincode].filter(Boolean).join(', ');

  async function signOut() {
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
      router.replace('/auth');
    } catch { setError('Could not sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  async function contactTeam() {
    try { await Linking.openURL(contact.whatsapp); }
    catch { setError('Could not open WhatsApp. Email ' + contact.email); }
  }

  return <div className="rb-account-workspace"><div className="rb-account-inner">
    <header className="rb-account-heading"><p>YOUR ACCOUNT</p><h1>Account & settings.</h1><span>Your business details, tools and privacy.</span></header>

    <section className="rb-account-identity" aria-label="Signed-in account">
      <span className="rb-account-avatar" aria-hidden="true">{initials}</span>
      <div className="rb-account-identity-copy"><h2>{accountName}</h2><p>{accountEmail}</p></div>
      <span className="rb-account-session-label"><Icon name="lock" size={13}/>{demoMode ? 'Demo account' : 'Signed in'}</span>
    </section>

    <ErrorBanner message={error}/>

    <div className="rb-account-columns">
      <div className="rb-account-settings">
        <section className="rb-account-section" aria-labelledby="account-business-heading">
          <div className="rb-account-section-heading"><h2 id="account-business-heading">Business profile</h2><span>{businessProfiles.length ? `${businessProfiles.length} saved ${businessProfiles.length === 1 ? 'profile' : 'profiles'}` : 'Your selected business'}</span></div>
          <div className="rb-account-group">
            {business.id ? <>
              <div className="rb-account-business-title"><span className="rb-account-group-icon" aria-hidden="true"><Icon name="business"/></span><div><h3>{businessName}</h3><p>Active business profile</p></div></div>
              <dl className="rb-account-business-details">
                {business.legalName ? <div><dt>Legal name</dt><dd>{business.legalName}</dd></div> : null}
                {business.tradeName ? <div><dt>Trade name</dt><dd>{business.tradeName}</dd></div> : null}
                <div><dt>Business type</dt><dd className={!business.entityType ? 'is-unavailable' : ''}>{business.entityType ? business.entityType.replaceAll('_', ' ') : 'Not added'}</dd></div>
                <div><dt>GSTIN</dt><dd className={!business.gstin ? 'is-unavailable' : 'rb-account-gstin'}>{business.gstin || 'Not added'}</dd></div>
                <div className="rb-account-business-address"><dt>Business address</dt><dd className={!address ? 'is-unavailable' : ''}>{address || 'Not added'}</dd></div>
              </dl>
            </> : <div className="rb-account-no-business"><span className="rb-account-group-icon" aria-hidden="true"><Icon name="business"/></span><div><h3>Keep each business together.</h3><p>Add your existing GST business, or start a new application.</p></div></div>}
            <div className="rb-account-business-management"><BusinessProfilePicker compact/></div>
          </div>
        </section>

        <section className="rb-account-section" aria-labelledby="account-privacy-heading">
          <div className="rb-account-section-heading"><h2 id="account-privacy-heading">Privacy & your data</h2></div>
          <div className="rb-account-group rb-account-setting-list">
            <Link href="/privacy" className="rb-account-setting-row"><span className="rb-account-setting-icon" aria-hidden="true"><Icon name="shield"/></span><span className="rb-account-setting-copy"><strong>Privacy centre</strong><span>Permissions, consent and your data rights</span></span><Icon name="chevron" size={17}/></Link>
            <Link href="/policies" className="rb-account-setting-row"><span className="rb-account-setting-icon" aria-hidden="true"><Icon name="document"/></span><span className="rb-account-setting-copy"><strong>Privacy & retention</strong><span>How your information is used and kept</span></span><Icon name="chevron" size={17}/></Link>
            <Link href="/delete-account" className="rb-account-setting-row"><span className="rb-account-setting-icon" aria-hidden="true"><Icon name="person"/></span><span className="rb-account-setting-copy"><strong>Account & data deletion</strong><span>Review how to request deletion</span></span><Icon name="chevron" size={17}/></Link>
          </div>
        </section>

        {!demoMode ? <section className="rb-account-section" aria-labelledby="account-session-heading">
          <div className="rb-account-section-heading"><h2 id="account-session-heading">Session</h2></div>
          <div className="rb-account-group rb-account-signout-row"><div><h3>Sign out of RegisterBox</h3><p>You can sign in again to return to your workspace.</p></div><button type="button" className="rb-account-signout" disabled={busy} aria-busy={busy || undefined} onClick={() => void signOut()}><Icon name="logout" size={17}/>{busy ? 'Signing out…' : 'Sign out'}</button></div>
        </section> : null}
      </div>

      <aside className="rb-account-utilities" aria-label="Business tools and support">
        <section className="rb-account-section" aria-labelledby="account-tally-heading">
          <div className="rb-account-section-heading"><h2 id="account-tally-heading">Business tools</h2></div>
          <div className="rb-account-group rb-account-tool">
            <div className="rb-account-tool-header"><span className="rb-account-group-icon" aria-hidden="true"><Icon name="business"/></span><div><h3>Tally accounting</h3><p>Local connector</p></div></div>
            <p className="rb-account-tool-description">Use the RegisterBox connector on the computer running Tally to choose a company, review entries and check import history.</p>
            <Link href="/tally" className="rb-account-tool-link">Open Tally connector<Icon name="arrow" size={16}/></Link>
          </div>
        </section>

        <section className="rb-account-section" aria-labelledby="account-support-heading"><div className="rb-account-section-heading"><h2 id="account-support-heading">A person, when you need one</h2></div><div className="rb-account-group rb-account-support"><span className="rb-account-support-icon" aria-hidden="true"><Icon name="help" size={23}/></span><h3>Talk to the RegisterBox team.</h3><p>Get help with your account or the next step in your case.</p><button type="button" className="rb-account-support-button" onClick={() => void contactTeam()}>Chat on WhatsApp<Icon name="arrow" size={16}/></button><a className="rb-account-support-email" href={`mailto:${contact.email}`}>{contact.email}</a></div></section>
      </aside>
    </div>

    <footer className="rb-account-footer"><Icon name="shield" size={15}/><p>Government filing, payments and signatures always need your explicit approval.</p></footer>
  </div></div>;
}
