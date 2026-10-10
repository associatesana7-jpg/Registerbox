import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { applicationCategories,questionsFor,documentsFor,validateQuestion } from '@/data/application-categories';
import { Button, Card, ErrorBanner, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { GstSelect } from '@/components/gst-ui';
import { ApplicationAddress } from '@/components/application-address';
import { validateAddress } from '@/data/india-address';
import { FlowProgress } from '@/components/experience';
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
  if(!session)return <Redirect href="/auth"/>;
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
  const [answers,setAnswers]=useState<Answers>({}),[step,setStep]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!!business.id),[error,setError]=useState(''),[saved,setSaved]=useState(false);
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
    setBusinessId(id);await selectBusiness(id);return id;
  }
  async function next(){setBusy(true);setError('');try{if(question){const message=question.kind==='address'?validateAddress(answers):validateQuestion(question,answers);if(message)throw new Error(message);}if(step===reviewStep){for(let i=0;i<questions.length;i++){const q=questions[i],message=q.kind==='address'?validateAddress(answers):validateQuestion(q,answers);if(message){setStep(i+1);throw new Error(message);}}}await saveDraft();if(step===reviewStep)setSaved(true);else setStep(step+1);}catch(cause){setError(cause instanceof Error?cause.message:'Could not save your answers.');}finally{setBusy(false);}}
  async function upload(type:string){setBusy(true);setError('');try{const id=await saveDraft();const doc=await chooseAndUploadDocument(id,type);if(doc)setDocuments(current=>[...current,{...doc,type}]);}catch(cause){setError(cause instanceof Error?cause.message:'Upload failed.');}finally{setBusy(false);}}
  const body={fontSize:13,lineHeight:20,color:palette.muted};
  return <Screen key={step+':'+String(saved)} footer={<Button title={saved?'Back to Home':step===documentStep?'Review application':step===reviewStep?'Save application draft':'Save & Continue'} loading={busy} disabled={loading} onPress={()=>saved?router.replace('/(tabs)'):void next()}/>}>
    <View style={{gap:17}}><PageHeader title={config.title} subtitle="Your details, relevant questions and documents." back={()=>step>0?setStep(step-1):router.back()}/><FlowProgress current={Math.min(step+1,reviewStep+1)} total={reviewStep+1}/><ErrorBanner message={error}/>
    {loading?<Text style={body}>Loading saved details…</Text>:saved?<Card>
      <Text style={{fontSize:20,color:palette.green,fontWeight:'800'}}>Application draft saved</Text><Text style={body}>Your answers and uploaded documents are saved under this business. This draft has not been submitted to a government portal.</Text><Text style={body}>{checklist.filter(d=>!documents.some(item=>item.type===d.type)).length} checklist items still need uploads. Government form preparation, professional review and submission are separate steps.</Text>
    </Card>:step===0?<Card>
      <Text style={{fontSize:17,color:palette.ink,fontWeight:'800'}}>Which business is this for?</Text><Field label="Business name" value={name} editable={!businessId&&!busy} onChangeText={setName}/>
      {!businessId?<Text style={body}>This application starts a separate business profile. It will not change your existing GST business.</Text>:null}
      {businessId?<><Text style={body}>We’ll use the selected business and its saved documents.</Text><Button title="Start a new business profile" variant="secondary" onPress={()=>{idRef.current=undefined;setBusinessId(undefined);setName('');setAnswers({});setDocuments([]);}}/></>:null}
    </Card>:question?<Card>
      <Text style={{fontSize:20,lineHeight:27,color:palette.ink,fontWeight:'800'}}>{question.label}</Text>
      {question.help?<Text style={body}>{question.help}</Text>:null}
      {question.kind==='address'?<ApplicationAddress value={answers} disabled={busy} onChange={setAnswers}/>:question.options?<GstSelect label="Choose an option" value={answers[question.key]||''} options={question.options.map(option=>({value:option,label:option}))} disabled={busy} onChange={value=>setAnswers(current=>({...current,[question.key]:value}))}/>:<Field accessibilityLabel={question.label} editable={!busy} keyboardType={question.numeric?'decimal-pad':'default'} value={answers[question.key]||''} onChangeText={value=>setAnswers(current=>({...current,[question.key]:value}))}/>}
    </Card>:step===documentStep?<>
      <Text style={body}>Add the documents relevant to your answers. You can save your draft and return with missing documents.</Text>
      {checklist.map(doc=>{const uploaded=documents.filter(item=>item.type===doc.type);return <Card key={doc.type}><Text style={{fontWeight:'800',fontSize:14,color:palette.ink}}>{doc.label}</Text>{uploaded.map(item=><Text key={item.id} style={body}>✓ {item.original_filename||'Saved document'}</Text>)}<Button title={uploaded.length?'Upload another':'Upload document'} variant="secondary" disabled={busy} onPress={()=>void upload(doc.type)}/></Card>;})}
    </>:<Card>
      <Text style={{fontWeight:'800',fontSize:18,color:palette.ink}}>Review your application</Text><Text style={body}>{name}</Text>
      {questions.map((item,index)=><View key={item.key} style={{gap:3}}><Text style={{...body,fontWeight:'700'}}>{item.label}</Text><Text style={body}>{item.kind==='address'?[answers.address_line_1,answers.address_line_2,answers.city,answers.district,answers.state,answers.pincode].filter(Boolean).join(', '):answers[item.key]||'Not answered'}</Text><Button title="Edit answer" variant="ghost" disabled={busy} onPress={()=>setStep(index+1)}/></View>)}
      {checklist.map(doc=><Text key={doc.type} style={body}>{documents.some(item=>item.type===doc.type)?'✓':'○'} {doc.label}</Text>)}
      {config.notice?<Text style={body}>{config.notice}</Text>:null}{config.source?<Text selectable style={body}>Official reference: {config.source}</Text>:null}
    </Card>}
    </View>
  </Screen>;
}
