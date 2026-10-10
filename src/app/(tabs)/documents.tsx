import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { NavTile, ScreenTitle, SectionHeading, SoftNotice, StatTile } from '@/components/experience';
import { Button, Card, ErrorBanner, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { chooseAndUploadDocument } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';

export default function DocumentsTab() {
  const { business } = useApp();
  const { data, loading, error, refresh } = useBusinessRecords();
  const [actionError, setActionError] = useState('');
  const [uploading, setUploading] = useState(false);
  async function upload() {
    if (!business.id) { router.push('/onboarding/intent'); return; }
    setUploading(true); setActionError('');
    try { if (await chooseAndUploadDocument(business.id, 'OTHER')) await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Upload failed. Please retry.'); }
    finally { setUploading(false); }
  }
  async function open(path: string, download = false) {
    try {
      const { data: link, error: linkError } = await supabase.storage.from('business-documents').createSignedUrl(path, 60, { download });
      if (linkError) throw new Error(linkError.message);
      await Linking.openURL(link.signedUrl);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not open document.'); }
  }
  return <Screen>
    <ScreenTitle overline="YOUR RECORDS" title="Document Wallet" subtitle="Your reusable business documents and certificates. Only actual saved records appear here." />
    <ErrorBanner message={error || actionError} />
    <View style={{flexDirection:'row',gap:9}}><StatTile label="Saved documents" value={String(data?.documents.length ?? 0)} /><StatTile label="Verified documents" value={String(data?.documents.filter((doc)=>doc.verified&&doc.verification_status==='verified').length ?? 0)} tone="green" /></View>
    <SectionHeading title="Business documents" action="Refresh" onAction={refresh} />
    <Button title={business.id ? 'Upload a document' : 'Set up business to upload'} loading={uploading} onPress={upload} />
    {loading ? <SoftNotice title="Loading documents…" /> : !data?.documents.length && !error ? <SoftNotice title="No documents uploaded yet" detail="Upload a document to keep it in your private business wallet. We will never mark a document verified just because it was uploaded." /> : data?.documents.map((doc) => <Card key={doc.id}>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{height:38,width:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#EDF4FF'}}><Text style={{color:palette.blue,fontSize:19}}>▤</Text></View><View style={{flex:1,gap:3}}><Text selectable style={{color:palette.ink,fontSize:14,fontWeight:'800'}}>{doc.original_filename || doc.type}</Text><Text style={{color:doc.verified && doc.verification_status === 'verified' ? palette.green : palette.amber,fontSize:11,fontWeight:'700'}}>{doc.verified && doc.verification_status === 'verified' ? 'Verified' : 'Uploaded · not verified'} · {new Date(doc.uploaded_at).toLocaleDateString()}</Text></View></View>
      {doc.source==='STAFF_ISSUED'&&<SoftNotice title="Issued licence / certificate" detail="Your completed certificate was delivered by RegisterBox. You can view or download it here."/>}
      <Button title="Open document" variant="secondary" onPress={() => open(doc.storage_path)} />
      <Button title="Download file" variant="secondary" onPress={() => open(doc.storage_path,true)} />
    </Card>)}
    <SectionHeading title="More ways to add evidence" />
    <NavTile title="Connect DigiLocker" detail="Available only when the connector is configured and you authorize access" icon="▣" onPress={() => router.push('/document-locker')} />
    <NavTile title="Verify PAN or GSTIN" detail="Check identifiers against the connected verification provider" icon="✓" onPress={() => router.push('/onboarding/identify')} />
  </Screen>;
}
