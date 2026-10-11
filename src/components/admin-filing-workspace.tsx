import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applicationCategories, documentsFor, questionsFor } from '@/data/application-categories';
import { controlCenterRequest, createControlCenterDocumentLink } from '@/lib/control-center-api';
import { supabase } from '@/lib/supabase';

type RecordData = Record<string, unknown>;
type CertificateDocument = { id:string; type:string; original_filename:string; verification_status:string; source:string; uploaded_at:string };
type CaseData = {
  business: RecordData & { id:string; legal_name:string; trade_name:string; questionnaire:RecordData };
  customer: RecordData | null;
  documents: CertificateDocument[];
  addresses: RecordData[]; people: RecordData[]; applications: RecordData[]; registrations:RecordData[]; licenses:RecordData[];
  services:{id:string;name:string}[];
  revealed:boolean;canReveal:boolean;canDownload:boolean;canComplete:boolean;
  deliveryRequestId:string;
};
const object=(value:unknown):RecordData=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordData:{};
const display=(value:unknown)=>value===null||value===undefined||value===''?'Not provided':typeof value==='object'?JSON.stringify(value):String(value);
function Action({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Fields({data,labels={}}:{data:RecordData;labels?:Record<string,string>}) {
  return <View style={s.fields}>{Object.entries(data).filter(([key,value])=>!['id','user_id','questionnaire'].includes(key)&&typeof value!=='object').map(([key,value])=><View key={key} style={s.field}><Text style={s.label}>{labels[key]||key.replaceAll('_',' ')}</Text><Text selectable style={s.value}>{display(value)}</Text></View>)}</View>;
}

export function AdminFilingWorkspace({businessId,onBack}:{businessId:string;onBack:()=>void}) {
  const [data,setData]=useState<CaseData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [category,setCategory]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState('');
  const [file,setFile]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
  const [completion,setCompletion]=useState({applicationId:'',serviceId:'',licenceNumber:'',authority:'',issueDate:'',expiryDate:''});
  const [confirmed,setConfirmed]=useState(false);
  const load=useCallback(async(revealReason?:string)=>{
    const result=await controlCenterRequest<CaseData>('filing_workspace',{businessId,...(revealReason?{reason:revealReason}:{})});
    setData(result);
    setCategory(current=>current||Object.keys(object(result.business.questionnaire.application_drafts))[0]||'');
  },[businessId]);
  useEffect(()=>{let live=true;controlCenterRequest<CaseData>('filing_workspace',{businessId}).then(result=>{if(live){setData(result);setCategory(Object.keys(object(result.business.questionnaire.application_drafts))[0]||'')}}).catch(cause=>{if(live)setError(cause.message)});return()=>{live=false}},[businessId]);
  async function perform(action:()=>Promise<void>){setBusy(true);setError('');try{await action()}catch(cause){setError(cause instanceof Error?cause.message:'The action could not be completed.')}finally{setBusy(false)}}
  const drafts=object(data?.business.questionnaire.application_drafts),draft=object(drafts[category]);
  const answers=Object.fromEntries(Object.entries(object(draft.answers)).map(([key,value])=>[key,display(value)]));
  const knownCategory=Boolean(applicationCategories[category]);
  const checklist=knownCategory?documentsFor(category,answers):[];
  const uploadedTypes=new Set(data?.documents.map(document=>document.type)??[]);
  const uploadedRequired=checklist.filter(item=>uploadedTypes.has(item.type)).length;
  const missingRequired=checklist.filter(item=>!uploadedTypes.has(item.type));
  const questionLabels=knownCategory?Object.fromEntries(questionsFor(category,answers).map(q=>[q.key,q.label])):{};
  const contactPhone=answers.contact_mobile||answers.phone||data?.customer?.phone||data?.business.phone;
  const contactEmail=answers.contact_email||data?.customer?.email||data?.business.email;

  async function chooseFile(){const picked=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png'],copyToCacheDirectory:true,multiple:false});if(!picked.canceled){if((picked.assets[0].size||0)>10*1024*1024)throw new Error('Choose a file under 10 MB.');setFile(picked.assets[0]);setConfirmed(false)}}
  async function complete(){
    if(!data||!file||!confirmed)return;
    const form=new FormData();
    form.append('businessId',businessId);form.append('requestId',data.deliveryRequestId);form.append('confirmed','yes');
    form.append('category',completion.applicationId?'':category);
    Object.entries(completion).forEach(([key,value])=>form.append(key,value));
    if(process.env.EXPO_OS==='web'&&file.file)form.append('file',file.file,file.name);
    else form.append('file',{uri:file.uri,name:file.name,type:file.mimeType} as unknown as Blob);
    const result=await supabase.functions.invoke('control-center',{body:form});
    if(result.error){const response=result.error.context as Response|undefined;const details=await response?.json().catch(()=>null);throw new Error(details?.error||result.error.message)}
    setMessage('Completed. The issued certificate is now in this customer’s Document Wallet.');setFile(null);setConfirmed(false);await load();
  }
  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.actions}><Action title="← Back to records" onPress={onBack}/><Action title="Refresh case" disabled={busy} onPress={()=>void perform(()=>load())}/></View>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!message&&<Text style={s.success}>{message}</Text>}
    {!data?<ActivityIndicator/>:<>
      <Text style={s.eyebrow}>CUSTOMER APPLICATION WORKSPACE</Text><Text style={s.title}>{data.business.trade_name||data.business.legal_name||'Business'}</Text>
      <View style={s.summaryGrid}>
        <View style={s.summaryCard}><Text style={s.summaryValue}>{Object.keys(drafts).length}</Text><Text style={s.summaryLabel}>Saved applications</Text></View>
        <View style={s.summaryCard}><Text style={s.summaryValue}>{data.documents.length}</Text><Text style={s.summaryLabel}>Uploaded files</Text></View>
        <View style={s.summaryCard}><Text style={[s.summaryValue,missingRequired.length?s.warning:s.complete]}>{checklist.length?`${uploadedRequired}/${checklist.length}`:'—'}</Text><Text style={s.summaryLabel}>Required documents ready</Text></View>
        <View style={s.summaryCard}><Text style={s.summaryValue}>{data.applications.length}</Text><Text style={s.summaryLabel}>Active case records</Text></View>
      </View>
      <View style={s.card}><Text style={s.heading}>Applicant contact</Text><Fields data={{name:answers.contact_name||data.customer?.full_name,phone:contactPhone||'Phone number missing',email:contactEmail}}/><Text style={s.note}>Contact values are customer-provided. Select any value to copy it.</Text></View>
      <View style={s.card}><Text style={s.heading}>Application / licence request</Text><View style={s.actions}>{Object.keys(drafts).map(key=><Action key={key} title={`${category===key?'✓ ':''}${applicationCategories[key]?.title||key}`} disabled={busy} onPress={()=>{setCategory(key);setConfirmed(false);setCompletion(current=>({...current,applicationId:''}))}}/>)}</View>{!Object.keys(drafts).length&&<Text style={s.note}>No intake draft saved yet. Uploaded business documents are listed below.</Text>}
        {!!category&&<><Text style={s.status}>Draft status: {display(draft.status)}</Text><Fields data={answers} labels={questionLabels}/></>}
      </View>
      <View style={s.card}><Text style={s.heading}>Business details</Text><Fields data={data.business}/>{data.addresses.map((address,index)=><View key={String(address.id)}><Text style={s.subheading}>Address {index+1} · {address.verified?'Verified':'Customer-provided'}</Text><Fields data={address}/></View>)}{data.people.map(person=><Fields key={String(person.id)} data={person}/>)}</View>
      <View style={s.card}><View style={s.cardHeadingRow}><View><Text style={s.heading}>Documents for this application</Text><Text style={s.note}>{checklist.length?`${uploadedRequired} of ${checklist.length} required documents uploaded`:'Select an application draft to see its document checklist.'}</Text></View>{checklist.length?<View style={[s.progressPill,missingRequired.length?s.progressPending:s.progressComplete]}><Text style={[s.progressText,!missingRequired.length&&s.progressTextComplete]}>{missingRequired.length?`${missingRequired.length} missing`:'Ready for review'}</Text></View>:null}</View>
        {checklist.map(item=>{const uploaded=data.documents.find(doc=>doc.type===item.type);return <View key={item.type} style={[s.checklistRow,uploaded?s.checklistUploaded:s.checklistMissing]}><Text style={[s.checkIcon,uploaded?s.complete:s.warning]}>{uploaded?'✓':'!'}</Text><View style={s.checkCopy}><Text style={s.checkLabel}>{item.label}</Text><Text style={s.note}>{uploaded?`Uploaded as ${uploaded.original_filename}`:'Customer still needs to upload this document'}</Text></View></View>})}
        <Text style={s.note}>Checklist follows the selected service and the customer’s answers. Staff must confirm any case-specific portal requirement before submission.</Text>
      </View>
      <View style={s.card}><Text style={s.heading}>All uploaded files · {data.documents.length}</Text><TextInput accessibilityLabel="File access or identity reveal reason" placeholder="Reason for access, e.g. prepare this applicant’s licence filing" value={reason} onChangeText={setReason} maxLength={240} style={s.input}/>{data.canReveal&&!data.revealed&&<Action title="Reveal identity details for filing" disabled={busy||reason.trim().length<12} onPress={()=>void perform(()=>load(reason))}/>}
        {data.documents.map(doc=><View key={doc.id} style={s.document}><Text selectable style={s.subheading}>{doc.original_filename}</Text><Text style={s.note}>{doc.type.replaceAll('_',' ')} · {doc.source==='STAFF_ISSUED'?'Issued certificate':doc.verification_status} · {new Date(doc.uploaded_at).toLocaleDateString()}</Text>{data.canDownload&&<Action title="Open / download file" disabled={busy||reason.trim().length<12} onPress={()=>void perform(async()=>{const link=await createControlCenterDocumentLink(doc.id,reason);await Linking.openURL(link.url)})}/>}</View>)}
      </View>
      <View style={s.card}><Text style={s.heading}>Official filing portals</Text><View style={s.actions}><Action title="Open FSSAI FoSCoS ↗" onPress={()=>void perform(()=>Linking.openURL('https://foscos.fssai.gov.in/'))}/><Action title="Open GST portal ↗" onPress={()=>void perform(()=>Linking.openURL('https://www.gst.gov.in/'))}/></View><Text style={s.note}>Opening a portal does not submit an application. Use the saved answers and files above for manual filing.</Text></View>
      <View style={s.card}><Text style={s.heading}>Applications and issued licences</Text>{data.applications.map(app=><View key={String(app.id)} style={s.document}><Text style={s.subheading}>{display(object(app.services).name)} · {display(app.status)}</Text><Fields data={app}/></View>)}{[...data.registrations,...data.licenses].map(record=><Fields key={String(record.id)} data={record}/>)}</View>
      {data.canComplete&&<View style={s.card}><Text style={s.heading}>Upload government certificate & complete</Text><Text style={s.note}>Recipient: {display(data.customer?.full_name)} · {data.business.trade_name||data.business.legal_name}. Only complete after receiving and checking the issued certificate.</Text>
        <Text style={s.label}>Choose an open application, or use the selected intake draft</Text><View style={s.actions}><Action title="Use selected draft" disabled={busy||!category||draft.status==='completed'} onPress={()=>setCompletion(current=>({...current,applicationId:''}))}/>{data.applications.filter(app=>!['APPROVED','REJECTED','CANCELLED'].includes(String(app.status))).map(app=><Action key={String(app.id)} title={`${completion.applicationId===app.id?'✓ ':''}${display(object(app.services).name)} · ${String(app.id).slice(0,8)}`} disabled={busy} onPress={()=>setCompletion(current=>({...current,applicationId:String(app.id)}))}/>)}</View>
        {!completion.applicationId&&<><Text style={s.label}>Service for this certificate</Text><View style={s.actions}>{data.services.map(service=><Action key={service.id} title={`${completion.serviceId===service.id?'✓ ':''}${service.name}`} disabled={busy} onPress={()=>setCompletion(current=>({...current,serviceId:service.id}))}/>)}</View></>}
        {(['licenceNumber','authority','issueDate','expiryDate'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={{licenceNumber:'Issued licence / registration number',authority:'Issuing authority',issueDate:'Issue date · YYYY-MM-DD',expiryDate:'Expiry date · YYYY-MM-DD (optional)'}[key]} value={completion[key]} onChangeText={value=>{setCompletion(current=>({...current,[key]:value}));setConfirmed(false)}} style={s.input}/>)}
        <Action title={file?`Selected: ${file.name}`:'Choose issued PDF / JPG / PNG'} disabled={busy} onPress={()=>void perform(chooseFile)}/>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed}} disabled={busy} onPress={()=>setConfirmed(!confirmed)} style={s.confirm}><Text style={s.value}>{confirmed?'☑':'☐'} I checked the applicant, service, licence number and certificate. Deliver this certificate to this customer and mark the case completed.</Text></Pressable>
        <Action title={busy?'Saving…':'Upload certificate & mark completed'} disabled={busy||!file||!confirmed||!completion.licenceNumber||!completion.authority||!completion.issueDate||(!completion.applicationId&&(!completion.serviceId||!category||draft.status==='completed'))} onPress={()=>void perform(complete)}/>
      </View>}
    </>}
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{padding:24,gap:18,backgroundColor:'#F4F7FB'},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{backgroundColor:'#EAF2FF',borderWidth:1,borderColor:'#C9DCFA',padding:12,borderRadius:10},buttonText:{fontSize:12,fontWeight:'700',color:'#0854C8'},disabled:{opacity:.45},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1,color:'#0865F7'},title:{fontSize:26,fontWeight:'900',color:'#0A1943'},summaryGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},summaryCard:{minWidth:150,flexBasis:180,flexGrow:1,padding:16,borderRadius:14,borderWidth:1,borderColor:'#DCE6F4',backgroundColor:'#fff'},summaryValue:{fontSize:24,fontWeight:'900',color:'#0A1943'},summaryLabel:{fontSize:11,fontWeight:'700',color:'#687B96',marginTop:4},card:{padding:20,borderRadius:16,borderWidth:1,borderColor:'#DDE6F2',backgroundColor:'#fff',gap:14},cardHeadingRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:12},heading:{fontSize:18,fontWeight:'800',color:'#0A1943'},subheading:{fontSize:14,fontWeight:'700',color:'#243955'},fields:{flexDirection:'row',flexWrap:'wrap',gap:10},field:{minWidth:180,flexBasis:240,flexGrow:1,backgroundColor:'#F7F9FC',padding:12,borderRadius:8},label:{fontSize:11,color:'#657692',marginBottom:5},value:{fontSize:14,lineHeight:21,color:'#182C4B'},note:{fontSize:12,lineHeight:19,color:'#687B96'},status:{fontSize:12,fontWeight:'700',color:'#0A6A44'},line:{fontSize:13,lineHeight:22,color:'#273D5D'},complete:{color:'#068B58'},warning:{color:'#B45309'},progressPill:{paddingVertical:7,paddingHorizontal:11,borderRadius:99},progressPending:{backgroundColor:'#FFF2DF'},progressComplete:{backgroundColor:'#E7F8EF'},progressText:{fontSize:11,fontWeight:'800',color:'#9A5207'},progressTextComplete:{color:'#08764D'},checklistRow:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:13,borderRadius:11,borderWidth:1},checklistUploaded:{backgroundColor:'#F0FBF5',borderColor:'#CBEEDC'},checklistMissing:{backgroundColor:'#FFF9EF',borderColor:'#F2D8AE'},checkIcon:{fontSize:17,fontWeight:'900',width:20},checkCopy:{flex:1,gap:2},checkLabel:{fontSize:13,fontWeight:'800',color:'#203653'},input:{borderWidth:1,borderColor:'#C8D6EA',padding:13,borderRadius:9,fontSize:13,color:'#152B4D'},document:{paddingVertical:13,gap:9,borderTopWidth:1,borderTopColor:'#E3EAF3'},confirm:{paddingVertical:14},error:{backgroundColor:'#FFF0F1',color:'#A72536',padding:14,borderRadius:10},success:{backgroundColor:'#E6F7EC',color:'#136541',padding:14,borderRadius:10},
});
