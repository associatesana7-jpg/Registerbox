import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { AppIcon, type AppIconName } from './app-icon';
import { Button, ErrorBanner } from './registerbox-ui';
import { Disclosure, EmptyState, LoadingCards, WorkspaceHeading } from './workspace-ui';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { chooseAndUploadDocument } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';
import './website/workspace-documents.css';

const categories = [{ value: 'OTHER', label: 'Other document' }, { value: 'AADHAAR_CARD', label: 'Aadhaar card' }, { value: 'PAN_CARD', label: 'PAN card' }, { value: 'PROMOTER_PHOTO', label: 'Passport-size photo' }, { value: 'RENT_AGREEMENT', label: 'Rental agreement' }, { value: 'OFFICE_UTILITY', label: 'Electricity bill' }, { value: 'PREMISES_OWNER_PROOF', label: 'Property ownership / tax receipt' }, { value: 'EXISTING_REGISTRATION', label: 'Existing registration or licence' }];
const filters = ['All', 'Certificates', 'Identity'];

function Icon({ name, size = 19 }: { name: AppIconName; size?: number }) {
  return <AppIcon name={name} size={size} color="currentColor"/>;
}

export default function CustomerDocuments() {
  const { business, session } = useApp();
  return <DocumentVault key={(session?.user.id || 'signed-out') + ':' + (business.id || 'no-business')}/>;
}

function DocumentVault() {
  const { business } = useApp();
  const params = useLocalSearchParams<{ application?: string }>();
  const { data, loading, error, refresh } = useBusinessRecords();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [type, setType] = useState('OTHER');
  const [busy, setBusy] = useState('');
  const [failure, setFailure] = useState('');
  const [success, setSuccess] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnCase = data?.applications.find(row => row.id === params.application);
  const rows = (data?.documents || []).filter(doc => (filter === 'All' || (filter === 'Certificates' ? doc.source === 'STAFF_ISSUED' : /PAN|AADHAAR|PHOTO|IDENTITY/.test(doc.type))) && ((doc.original_filename || '') + ' ' + doc.type).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!uploadOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLSelectElement>('select')?.focus();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, [uploadOpen]);

  async function upload() {
    if (!business.id) { router.push('/onboarding/intent'); return; }
    setBusy('upload'); setFailure(''); setSuccess('');
    try {
      const doc = await chooseAndUploadDocument(business.id, type);
      if (doc) { await refresh(); setUploadOpen(false); setQuery(''); setFilter('All'); setSuccess('Document saved to this business. You can reuse it in the relevant application.'); }
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : 'Could not upload this document.'); }
    finally { setBusy(''); }
  }

  async function open(path: string, download = false) {
    setFailure(''); setBusy(path);
    try {
      const { data: link, error: linkError } = await supabase.storage.from('business-documents').createSignedUrl(path, 60, { download });
      if (linkError) throw linkError;
      await Linking.openURL(link.signedUrl);
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : 'Could not open the document.'); }
    finally { setBusy(''); }
  }

  const resetSearch = () => { setQuery(''); setFilter('All'); };

  return <div className="rb-documents"><div className="rb-documents-inner">
    <WorkspaceHeading eyebrow="YOUR PRIVATE VAULT" title="Documents, together." detail="Everything important. In one considered place." action="Add a document" onAction={() => setUploadOpen(true)}/>
    {returnCase ? <Link className="rb-documents-return" href={{ pathname: '/application-details', params: { id: returnCase.id } }}><Icon name="back" size={18}/><span>Back to {returnCase.services?.name || 'your application'}</span></Link> : null}
    <ErrorBanner message={error || (!uploadOpen ? failure : '')}/>
    {success ? <div className="rb-documents-success" role="status"><Icon name="check"/><div><strong>Saved to your vault.</strong><p>{success}</p>{returnCase ? <Link href={{ pathname: '/application-details', params: { id: returnCase.id } }}>Continue to application →</Link> : null}</div></div> : null}

    <section className="rb-documents-library" aria-label="Document library">
      <div className="rb-documents-toolbar">
        <div className="rb-documents-filters" role="group" aria-label="Filter documents">{filters.map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
        <label className="rb-documents-search"><Icon name="search" size={18}/><span className="rb-documents-sr">Find a document</span><input type="search" aria-label="Find a document" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a document" autoComplete="off"/></label>
      </div>
      <div className="rb-documents-summary"><span>{loading ? 'Loading your records…' : error ? 'Documents unavailable' : rows.length + (rows.length === 1 ? ' document' : ' documents')}{!error && (query || filter !== 'All') ? ' in this view' : ''}</span><span><Icon name="lock" size={13}/> Private to your business</span></div>
      {loading ? <div className="rb-documents-state"><LoadingCards/></div> : error ? <div className="rb-documents-state"><EmptyState icon="info" title="We couldn’t load your documents." detail="Your saved records are still in your account. Try loading the library again." action="Try again" onAction={() => void refresh()}/></div> : !rows.length ? <div className="rb-documents-state"><EmptyState icon="folder" title={query || filter !== 'All' ? 'No matching documents.' : 'A home for your important records.'} detail={query || filter !== 'All' ? 'Try another filename or view all your documents.' : 'Add your identity documents, premises proof and issued certificates. Find them here whenever you need them.'} action={query || filter !== 'All' ? 'View all documents' : 'Add a document'} onAction={query || filter !== 'All' ? resetSearch : () => setUploadOpen(true)}/></div> : <table className="rb-documents-table">
        <caption className="rb-documents-sr">Saved business documents with verification status and private file actions</caption>
        <thead><tr><th scope="col">Document</th><th scope="col">Status</th><th scope="col">Added</th><th scope="col"><span className="rb-documents-sr">File actions</span></th></tr></thead>
        <tbody>{rows.map(doc => {
          const issued = doc.source === 'STAFF_ISSUED';
          const verified = doc.verified && doc.verification_status === 'verified';
          const name = doc.original_filename || doc.type.replaceAll('_', ' ');
          const date = Number.isFinite(Date.parse(doc.uploaded_at)) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(doc.uploaded_at)) : '—';
          return <tr key={doc.id}>
            <td className="rb-documents-file"><span className={'rb-documents-file-icon' + (issued ? ' is-issued' : '')}><Icon name={issued ? 'verified' : 'document'} size={22}/></span><span><strong>{name}</strong><span>{doc.type.replaceAll('_', ' ').toLowerCase()}</span></span></td>
            <td className="rb-documents-file-status"><span className={'rb-documents-status' + (issued || verified ? ' is-verified' : '')}>{issued ? 'Issued by RegisterBox' : verified ? 'Verified' : 'Review pending'}</span></td>
            <td className="rb-documents-file-date">{date}</td>
            <td className="rb-documents-file-actions"><button type="button" className="rb-documents-open" aria-label={'Open ' + name} aria-busy={busy === doc.storage_path || undefined} disabled={Boolean(busy)} onClick={() => void open(doc.storage_path)}>{busy === doc.storage_path ? 'Opening…' : 'Open'}<Icon name="arrow" size={15}/></button><button type="button" className="rb-documents-download" aria-label={'Download ' + name} title={'Download ' + name} disabled={Boolean(busy)} onClick={() => void open(doc.storage_path, true)}><Icon name="download" size={18}/></button></td>
          </tr>;
        })}</tbody>
      </table>}
    </section>

    <div className="rb-documents-bottom"><div className="rb-documents-note"><Icon name="shield" size={20}/><p>Uploads stay with the selected business.<br/><span>Uploading a document does not mark it verified.</span></p></div><div className="rb-documents-integrations"><Disclosure title="More ways to manage documents" detail="DigiLocker and identifier verification"><Link href="/document-locker"><Icon name="lock"/>DigiLocker<Icon name="chevron" size={16}/></Link><Link href="/onboarding/identify"><Icon name="verified"/>Verify PAN or GSTIN<Icon name="chevron" size={16}/></Link><p>Availability depends on the configured provider.</p></Disclosure></div></div>

    <dialog ref={dialogRef} className="rb-documents-dialog" aria-labelledby="document-upload-title" aria-describedby="document-upload-description" aria-busy={Boolean(busy) || undefined} onCancel={event => { event.preventDefault(); if (!busy) setUploadOpen(false); }} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && !busy && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) setUploadOpen(false); }}>
      <div className="rb-documents-dialog-top"><span className="rb-documents-dialog-icon"><Icon name="upload" size={24}/></span><button type="button" aria-label="Close add document" disabled={Boolean(busy)} onClick={() => setUploadOpen(false)}><Icon name="close"/></button></div>
      <h2 id="document-upload-title">A little more organised.</h2><p id="document-upload-description">Add a document to your business’s private vault.</p>
      <label htmlFor="document-category">Document category</label><select id="document-category" value={type} disabled={Boolean(busy)} onChange={event => setType(event.target.value)}>{categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select>
      <div className="rb-documents-upload-note"><Icon name="info" size={17}/><p>Choose the right category so you can reuse this document in an application. Uploading does not mark it verified.</p></div>
      {failure ? <ErrorBanner message={failure}/> : null}
      <div className="rb-documents-dialog-actions"><Button title="Cancel" variant="secondary" disabled={Boolean(busy)} onPress={() => setUploadOpen(false)}/><Button title={business.id ? 'Choose file & upload' : 'Set up a business first'} loading={busy === 'upload'} disabled={Boolean(busy)} onPress={() => void upload()}/></div>
    </dialog>
  </div></div>;
}
