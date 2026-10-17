import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBanner, Field, Screen } from './registerbox-ui';
import { WorkspaceHeading, EmptyState, LoadingCards, ActionRow, Disclosure } from './workspace-ui';
import { AppIcon } from './app-icon';
import { GstSelect } from './gst-ui';
import { Segmented } from './flow-parts';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { chooseAndUploadDocument } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';

const categories=[{value:'OTHER',label:'Other document'},{value:'AADHAAR_CARD',label:'Aadhaar card'},{value:'PAN_CARD',label:'PAN card'},{value:'PROMOTER_PHOTO',label:'Passport-size photo'},{value:'RENT_AGREEMENT',label:'Rental agreement'},{value:'OFFICE_UTILITY',label:'Electricity bill'},{value:'PREMISES_OWNER_PROOF',label:'Property ownership / tax receipt'},{value:'EXISTING_REGISTRATION',label:'Existing registration or licence'}];
export default function CustomerDocuments(){
  const {business,session}=useApp();
  return <DocumentVault key={`${session?.user.id||'signed-out'}:${business.id||'no-business'}`}/>;
}
function DocumentVault(){
  const {business}=useApp(),params=useLocalSearchParams<{application?:string}>();const {data,loading,error,refresh}=useBusinessRecords();
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('All'),[uploadOpen,setUploadOpen]=useState(false),[type,setType]=useState('OTHER');
  const [busy,setBusy]=useState(''),[failure,setFailure]=useState(''),[success,setSuccess]=useState('');
  const returnCase=data?.applications.find(row=>row.id===params.application);
  const rows=(data?.documents||[]).filter(doc=>(filter==='All'||(filter==='Certificates'?doc.source==='STAFF_ISSUED':/PAN|AADHAAR|PHOTO|IDENTITY/.test(doc.type)))&&`${doc.original_filename||''} ${doc.type}`.toLowerCase().includes(query.toLowerCase()));
  async function upload(){
    if(!business.id){router.push('/onboarding/intent');return;}
    setBusy('upload');setFailure('');setSuccess('');
    try{const doc=await chooseAndUploadDocument(business.id,type);if(doc){await refresh();setUploadOpen(false);setQuery('');setFilter('All');setSuccess('Document saved to this business. You can reuse it in the relevant application.');}}
    catch(cause){setFailure(cause instanceof Error?cause.message:'Could not upload this document.');}finally{setBusy('');}
  }
  async function open(path:string,download=false){setFailure('');setBusy(path);try{const {data:link,error:linkError}=await supabase.storage.from('business-documents').createSignedUrl(path,60,{download});if(linkError)throw linkError;await Linking.openURL(link.signedUrl);}catch(cause){setFailure(cause instanceof Error?cause.message:'Could not open the document.');}finally{setBusy('');}}
  return <Screen><WorkspaceHeading eyebrow="YOUR PRIVATE VAULT" title="Documents, together." detail="Upload once. Find it easily. Reuse it for your next business step." action="Add a document" onAction={()=>setUploadOpen(true)}/>
    {returnCase?<ActionRow icon="back" title="Back to your application" detail={returnCase.services?.name||'View progress and next step'} onPress={()=>router.push({pathname:'/application-details',params:{id:returnCase.id}})}/>:null}
    <ErrorBanner message={error||failure}/>{success?<Card style={{backgroundColor:palette.greenBg}}><Badge label="Saved to your vault" tone="green"/><Text accessibilityLiveRegion="polite" style={{fontSize:14,lineHeight:22,color:palette.ink}}>{success}</Text>{returnCase?<Button title="Continue to application" onPress={()=>router.push({pathname:'/application-details',params:{id:returnCase.id}})}/>:null}</Card>:null}
    {uploadOpen?<Card><Text style={{fontSize:20,fontWeight:'600',color:palette.ink}}>Add to your vault</Text><GstSelect label="Document category" value={type} options={categories} disabled={!!busy} onChange={setType}/><Text style={{fontSize:13,lineHeight:21,color:palette.muted}}>Choose the correct category so your saved document can be found in an application. Uploading does not mark it verified.</Text><Button title={business.id?'Choose file & upload':'Set up a business first'} loading={busy==='upload'} disabled={!!busy} onPress={()=>void upload()}/><Button title="Cancel" variant="ghost" disabled={!!busy} onPress={()=>setUploadOpen(false)}/></Card>:null}
    <Field label="Find a document" placeholder="Search by filename or document type" value={query} onChangeText={setQuery} autoCorrect={false}/><Segmented options={['All','Certificates','Identity']} selected={filter} onSelect={setFilter}/>
    {loading?<LoadingCards/>:error?<Button title="Reload my documents" onPress={()=>void refresh()}/>:!rows.length?<EmptyState icon="folder" title={query?'No matching documents.':'A home for your important records.'} detail={query?'Try another filename or switch to All.':'Keep your identity documents, premises proof and issued certificates in one private place.'} action={query?'Clear search':'Add a document'} onAction={()=>query?setQuery(''):setUploadOpen(true)}/>:rows.map(doc=><Card key={doc.id}><View style={{flexDirection:'row',gap:13,alignItems:'center'}}><View style={{width:44,height:48,borderRadius:13,backgroundColor:doc.source==='STAFF_ISSUED'?palette.greenBg:palette.sky,alignItems:'center',justifyContent:'center'}}><AppIcon name={doc.source==='STAFF_ISSUED'?'verified':'document'} color={doc.source==='STAFF_ISSUED'?palette.green:palette.blue}/></View><View style={{flex:1,gap:6}}><Text numberOfLines={2} style={{fontSize:15,lineHeight:22,fontWeight:'600',color:palette.ink}}>{doc.original_filename||doc.type.replaceAll('_',' ')}</Text><Text style={{fontSize:12,color:palette.muted}}>{new Date(doc.uploaded_at).toLocaleDateString('en-IN')} · {doc.type.replaceAll('_',' ')}</Text></View></View><Badge label={doc.source==='STAFF_ISSUED'?'Issued by RegisterBox':doc.verified&&doc.verification_status==='verified'?'Verified':'Uploaded · review pending'} tone={doc.source==='STAFF_ISSUED'||doc.verified&&doc.verification_status==='verified'?'green':'gray'}/><Button title="Open document" variant="secondary" disabled={!!busy} loading={busy===doc.storage_path} onPress={()=>void open(doc.storage_path)}/><Disclosure title="File actions"><Button title="Download a copy" variant="ghost" disabled={!!busy} onPress={()=>void open(doc.storage_path,true)}/></Disclosure></Card>)}
    <Disclosure title="More ways to manage documents" detail="DigiLocker and identifier verification"><ActionRow icon="lock" title="DigiLocker" detail="Availability depends on the configured connector" onPress={()=>router.push('/document-locker')}/><ActionRow icon="verified" title="Verify an identifier" detail="PAN or GSTIN provider checks" onPress={()=>router.push('/onboarding/identify')}/></Disclosure>
  </Screen>;
}
