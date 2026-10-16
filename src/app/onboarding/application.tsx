import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { applicationCategories,questionsFor,documentsFor,validateQuestion } from '@/data/application-categories';
import { Button, Card, ErrorBanner, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { GstSelect } from '@/components/gst-ui';
import { ApplicationAddress } from '@/components/application-address';
import { validateAddress } from '@/data/india-address';
import { ApplicationChoices, ApplicationFooter, ApplicationProgress } from '@/components/application-form-ui';
import { applicationInputProps } from '@/lib/application-form-presentation';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';
import { chooseAndUploadDocument } from '@/lib/registerbox-api';
import { palette } from '@/constants/design';
import type { Json } from '@/types/database';

type Answers=Record<string,string>;
const object=(value:unknown):Record<string,Json|undefined>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,Json|undefined>:{};
export default function ApplicationScreen(){
  const {category:requested}=useLocalSearchParams<{category?:string}>();
  const category=requested&&applicationCategories[requested]?requested:'new';
  const {session,loadingSession}=useApp();
  if(loadingSession)return <Screen><Text>Loading your account…</Text></Screen>;
  if(!session)return <Redirect href={{pathname:'/auth',params:{next:`/onboarding/application?category=${category}`}}}/>;
  if(category==='gst')return <Redirect href="/gst"/>;
  return <CategoryApplication key={category+session.user.id} category={category} userId={session.user.id}/>;
}
function CategoryApplication({category,userId}:{category:string;userId:string}){
  const config=applicationCategories[category];
  const {business,selectBusiness}=useApp();
  const reuse=category==='existing';
  const [businessId,setBusinessId]=useState(reuse?business.id:undefined),[name,setName]=useState(reuse?(business.tradeName||business.legalName||''):'');
  const idRef=useRef(reuse?business.id:undefined);
  const initialId=useRef(business.id);
  const [answers,setAnswers]=useState<Answers>({}),[step,setStep]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!!business.id),[error,setError]=useState(''),[saved,setSaved]=useState(false),[applicationReference,setApplicationReference]=useState('');
  const [documents,setDocuments]=useState<{id:string;type:string;original_filename:string|null}[]>([]);
  useEffect(()=>{let active=true;const id=initialId.current;if(!id)return;Promise.all([supabase.from('business_profiles').select('questionnaire,legal_name').eq('id',id).single(),supabase.from('documents').select('id,type,original_filename').eq('business_id',id).is('deleted_at',null)]).then(([profile,docs])=>{if(!active)return;if(profile.error)throw profile.error;if(docs.error)throw docs.error;const stored=object(object(profile.data.questionnaire).application_drafts);const entry=object(stored[category]);if(!entry.answers&&category!=='existing')return;idRef.current=id;setBusinessId(id);setName(profile.data.legal_name||'');setAnswers(Object.fromEntries(Object.entries(object(entry.answers)).filter((entry):entry is [string,string]=>typeof entry[1]==='string')));setDocuments(docs.data||[]);}).catch(cause=>{if(active)setError(cause.message||'Could not load saved application.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[category]);
  const questions=questionsFor(category,answers);
  const documentStep=questions.length+1,reviewStep=documentStep+1;
  const question=step>0&&step<documentStep?questions[step-1]:null;
  const checklist=documentsFor(category,answers);
  async function saveDraft(){
    let id=idRef.current;
    if(!id){if(!name.trim())throw new Error('Enter the business name.');const {data,error:insertError}=await supabase.from('business_profiles').insert({user_id:userId,created_by:userId,legal_name:name.trim(),trade_name:name.trim(),status:'draft'}).select('id').single();if(insertError)throw insertError;id=data.id;idRef.current=id;}
    const {data,error:readError}=await supabase.from('business_profiles').select('questionnaire,updated_at').eq('id',id).single();if(readError)throw readError;
    const current=object(data.questionnaire);const next={...current,application_drafts:{...object(current.application_drafts),[category]:{answers,updated_at:new Date().toISOString(),status:'draft'}}};
    const {data:written,error:writeError}=await supabase.from('business_profiles').update({questionnaire:next}).eq('id',id).eq('updated_at',data.updated_at).select('id').maybeSingle();
    if(writeError)throw writeError;if(!written)throw new Error('This business was updated elsewhere. Reload it before saving again.');
    if(answers.address_confirmed==='Yes'&&!validateAddress(answers)){
      const {data:address,error:lookupError}=await supabase.from('business_addresses').select('id,verified').eq('business_id',id).eq('type','principal').limit(1).maybeSingle();if(lookupError)throw lookupError;
      // A postal suggestion/user edit must never overwrite a government-verified profile address.
      if(!address?.verified){const values={address_line_1:answers.address_line_1,address_line_2:answers.address_line_2||null,state:answers.state,district:answers.district,city:answers.city,pincode:answers.pincode,verified:false};const result=address?await supabase.from('business_addresses').update(values).eq('id',address.id):await supabase.from('business_addresses').insert({...values,business_id:id,type:'principal'});if(result.error)throw new Error('Answers saved, but the reusable address could not be saved. Retry before continuing.');}
    }
    setBusinessId(id);if(id!==business.id)await selectBusiness(id);return id;
  }
  async function next(){setBusy(true);setError('');try{if(question){const message=question.kind==='address'?validateAddress(answers):validateQuestion(question,answers);if(message)throw new Error(message);}if(step===reviewStep){for(let i=0;i<questions.length;i++){const q=questions[i],message=q.kind==='address'?validateAddress(answers):validateQuestion(q,answers);if(message){setStep(i+1);throw new Error(message);}}}await saveDraft();if(step===reviewStep)setSaved(true);else setStep(step+1);}catch(cause){setError(cause instanceof Error?cause.message:'Could not save your answers.');}finally{setBusy(false);}}
  async function submit(){setBusy(true);setError('');try{for(let i=0;i<questions.length;i++){const q=questions[i],message=q.kind==='address'?validateAddress(answers):validateQuestion(q,answers);if(message){setStep(i+1);throw new Error(message);}}const id=await saveDraft();const {data,error:submitError}=await supabase.rpc('submit_application_draft',{p_business:id,p_category:category});if(submitError)throw submitError;const result=object(data);setApplicationReference(typeof result.reference==='string'?result.reference:'');setSaved(true);}catch(cause){setError(cause instanceof Error?cause.message:'Could not send this application to RegisterBox.');}finally{setBusy(false);}}
  async function upload(type:string){setBusy(true);setError('');try{const id=await saveDraft();const doc=await chooseAndUploadDocument(id,type);if(doc)setDocuments(current=>[...current,{...doc,type}]);}catch(cause){setError(cause instanceof Error?cause.message:'Upload failed.');}finally{setBusy(false);}}
  const body={fontSize:14,lineHeight:22,color:palette.muted};
  return <Screen key={step+':'+String(saved)} footer={<View style={{gap:10}}><ErrorBanner message={error}/><ApplicationFooter title={saved?'View my applications':step===0?'Start application':step===documentStep?'Review application':step===reviewStep?'Send to RegisterBox':'Save & continue'} busy={busy} disabled={loading} review={step===reviewStep} saved={saved} onBack={step>0?()=>setStep(step-1):undefined} onContinue={()=>saved?router.replace('/(tabs)/compliance'):step===reviewStep?void submit():void next()}/></View>}>
    <View style={{gap:20}}><PageHeader title={config.title} subtitle="One step at a time. Save and continue later." back={()=>{if(busy)return;if(step>0)setStep(step-1);else router.back();}}/>{!saved&&<ApplicationProgress step={step} documentStep={documentStep} reviewStep={reviewStep}/>}
    {loading?<Text style={body}>Loading saved details…</Text>:saved?<Card>
      <Text style={{fontSize:20,color:palette.green,fontWeight:'800'}}>Application sent to RegisterBox</Text><Text style={body}>Our filing team can now open this customer case in the admin panel and begin professional review for {config.title.toLowerCase()}.</Text>{applicationReference?<Text selectable style={{fontSize:14,color:palette.ink,fontWeight:'800'}}>Reference: {applicationReference}</Text>:null}<Text style={body}>{checklist.filter(d=>!documents.some(item=>item.type===d.type)).length} checklist items still need uploads. Nothing has been submitted to a government portal yet; our team will contact you before any OTP, signature, payment or final filing step.</Text>
    </Card>:step===0?<Card>
      <Text accessibilityRole="header" style={{fontSize:22,lineHeight:29,color:palette.ink,fontWeight:'800'}}>Which business is this for?</Text><Field label="Business name" placeholder="Enter your business name" autoCapitalize="words" value={name} editable={!businessId&&!busy} onChangeText={value=>{setName(value);setError('');}}/>
      {!businessId?<Text style={body}>This application starts a separate business profile. It will not change your existing GST business.</Text>:null}
      {businessId?<><Text style={body}>We’ll use the selected business and its saved documents.</Text><Button title="Start a new business profile" variant="secondary" onPress={()=>{idRef.current=undefined;setBusinessId(undefined);setName('');setAnswers({});setDocuments([]);}}/></>:null}
    </Card>:question?<Card>
      <Text accessibilityRole="header" style={{fontSize:22,lineHeight:29,color:palette.ink,fontWeight:'800'}}>{question.label}</Text>
      {question.help?<Text style={body}>{question.help}</Text>:null}
      {question.kind==='address'?<ApplicationAddress value={answers} disabled={busy} onChange={value=>{setAnswers(value);setError('');}}/>:question.options?(question.options.length<=6?<ApplicationChoices options={question.options} value={answers[question.key]||''} disabled={busy} onChange={value=>{setAnswers(current=>({...current,[question.key]:value}));setError('');}}/>:<GstSelect label="Choose an option" value={answers[question.key]||''} options={question.options.map(option=>({value:option,label:option}))} disabled={busy} onChange={value=>{setAnswers(current=>({...current,[question.key]:value}));setError('');}}/>):<Field {...applicationInputProps(question)} accessibilityLabel={question.label} placeholder={question.numeric?'Enter a number':'Type your answer'} editable={!busy} style={applicationInputProps(question).multiline?{minHeight:112}:undefined} value={answers[question.key]||''} onChangeText={value=>{setAnswers(current=>({...current,[question.key]:value}));setError('');}}/>}
    </Card>:step===documentStep?<>
      <View style={{gap:8}}><Text accessibilityRole="header" style={{fontSize:22,lineHeight:29,color:palette.ink,fontWeight:'800'}}>Your document checklist</Text><Text style={body}>{checklist.filter(doc=>documents.some(item=>item.type===doc.type)).length} of {checklist.length} checklist items have an upload. You can return with missing documents.</Text></View>
      {checklist.map(doc=>{const uploaded=documents.filter(item=>item.type===doc.type);return <Card key={doc.type}><Text style={{fontWeight:'800',fontSize:16,lineHeight:23,color:palette.ink}}>{doc.label}</Text><Text style={{fontSize:12,color:uploaded.length?palette.green:palette.muted}}>{uploaded.length?'✓ Uploaded':'Not uploaded yet'}</Text>{uploaded.map(item=><Text key={item.id} selectable numberOfLines={2} accessibilityLabel={item.original_filename||'Saved document'} style={body}>{item.original_filename||'Saved document'}</Text>)}<Button title={uploaded.length?'Upload another':'Choose a document'} variant="secondary" disabled={busy} onPress={()=>void upload(doc.type)}/></Card>;})}
    </>:<Card>
      <Text style={{fontWeight:'800',fontSize:18,color:palette.ink}}>Review your application</Text><Text style={body}>{name}</Text>
      {questions.map((item,index)=><View key={item.key} style={{gap:3}}><Text style={{...body,fontWeight:'700'}}>{item.label}</Text><Text style={body}>{item.kind==='address'?[answers.address_line_1,answers.address_line_2,answers.city,answers.district,answers.state,answers.pincode].filter(Boolean).join(', '):answers[item.key]||'Not answered'}</Text><Button title="Edit answer" variant="ghost" disabled={busy} onPress={()=>setStep(index+1)}/></View>)}
      {checklist.map(doc=><Text key={doc.type} style={body}>{documents.some(item=>item.type===doc.type)?'✓':'○'} {doc.label}</Text>)}
      {config.notice?<Text style={body}>{config.notice}</Text>:null}{config.source?<Text selectable style={body}>Official reference: {config.source}</Text>:null}
    </Card>}
    </View>
  </Screen>;
}
