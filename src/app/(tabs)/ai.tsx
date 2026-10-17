import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { GstAiWorkspace } from '@/components/gst-ai-workspace';
import { GstAiNilLauncher } from '@/components/gst-ai-nil-launcher';
import {GST_WORKFLOWS,GST_KNOWLEDGE_VERSION,isNilFilingRequest,safeGstActions,type GstAiAction} from '../../../supabase/functions/_shared/gst-assistant-knowledge';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GstBillReview } from '@/components/gst-bill-review';
import { Button, Card, ErrorBanner, Screen } from '@/components/registerbox-ui';
import { ActionRow, Disclosure, WorkspaceHeading } from '@/components/workspace-ui';
import { GstCheckbox } from '@/components/gst-checkbox';
import { AppIcon } from '@/components/app-icon';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { addExtractedBillToBooks, askRegisterBoxAi, chooseAndExtractGstBill, type BillExtraction } from '@/lib/registerbox-api';

const prompts = ['File my nil return', 'What documents do I need for GST registration?', 'Do I need an FSSAI licence for a cloud kitchen?', 'Help me understand my next business step'];

export default function AiScreen() {
  const {business,session}=useApp();
  return <AiContent key={(session?.user.id||'signed-out')+':'+(business.id||'no-business')}/>;
}
function AiContent() {
  const { business } = useApp();
  const [actions,setActions]=useState<GstAiAction[]>([]);
  const [nilForm,setNilForm]=useState<'gstr-1'|'gstr-3b'>('gstr-1');
  const [workspace,setWorkspace]=useState<'platform'|'tcs'|'nil'|null>(null);
  const [knowledgeVersion,setKnowledgeVersion]=useState(GST_KNOWLEDGE_VERSION);
  const [answerSource,setAnswerSource]=useState('');
  const account=useRef(business.id);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const [missingFacts, setMissingFacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerConsent,setProviderConsent]=useState(false);
  const [bill,setBill]=useState<BillExtraction|null>(null);
  const [billBusy,setBillBusy]=useState(false);
  useEffect(()=>{account.current=business.id;return()=>{account.current='';};},[business.id]);
  function workflow(action:GstAiAction){
    if(!business.id){setError('Select a business profile first.');return;}
    if(action==='file_nil'){setWorkspace('nil');return;}
    if(action==='upload_bill'){void uploadBill();return;}
    if(action==='upload_platform'||action==='review_tcs'){setWorkspace(action==='review_tcs'?'tcs':'platform');return;}
    if(action==='open_purchases')router.push('/gst-purchases');
    else if(action==='open_returns'||action==='review_amendments')router.push('/gst-returns');
    else router.push('/gst');
  }
  async function ask(value = question) {
    if (!value.trim() || loading) return;
    if(isNilFilingRequest(value)){
      if(!business.id){setError('Select a GST business profile first.');return;}
      setNilForm(/\bgstr[- ]?3b\b/i.test(value)?'gstr-3b':'gstr-1');
      setError('');setQuestion('');setActions([]);setMissingFacts([]);setWorkspace('nil');
      setAnswer('Let’s file your nil return. Confirm the return and month below, then select your saved signatory and authorize using the GST OTP.');
      setAnswerSource('workflow_guide');setKnowledgeVersion(GST_KNOWLEDGE_VERSION);return;
    }
    if(!providerConsent){setError('Tick the Groq consent box before sending an AI question.');return;}
    if(bill&&/\b(add|save|upload)\b.*\b(bill|invoice)\b.*\b(gst|book|purchase)/i.test(value)){
      setQuestion('');setAnswer('Your bill is ready below. Review every extracted field, tick the approval, and add it to the correct GST purchase period.');return;
    }
    const businessId=business.id;
    setLoading(true); setError(''); setQuestion(''); setAnswer(''); setMissingFacts([]);setActions([]);
    try {
      const result = await askRegisterBoxAi(value.trim(), true, businessId||undefined);
      if(account.current!==businessId)return;
      setActions(safeGstActions(result.actions));setKnowledgeVersion(result.knowledgeVersion);setAnswerSource(result.source);
      setAnswer(result.answer); setMissingFacts(result.missingFacts);
    } catch (caught) { if(account.current===businessId)setError(caught instanceof Error ? caught.message : 'RegisterBox AI is unavailable.'); }
    finally { if(account.current===businessId)setLoading(false); }
  }
  async function uploadBill(){const businessId=business.id;if(!businessId){setError('Select or create a GST business profile before uploading a bill.');return;}setBillBusy(true);setError('');try{const result=await chooseAndExtractGstBill(businessId);if(account.current!==businessId)return;if(result){setBill(result);setAnswer('I extracted the bill into a reviewable GST purchase draft. Check every field against the image before approving it.');}}catch(caught){setError(caught instanceof Error?caught.message:'Could not extract this bill.');}finally{setBillBusy(false);}}
  async function addBill(purchase:Parameters<typeof addExtractedBillToBooks>[4],year:number,month:number){if(!business.id||!bill)return;setBillBusy(true);setError('');try{await addExtractedBillToBooks(business.id,bill.extractionId,year,month,purchase);setAnswer(`Bill ${purchase.number} was added to ${String(month).padStart(2,'0')}/${year} purchase books. It has not been filed with GST.`);setBill(null);}catch(caught){setError(caught instanceof Error?caught.message:'Could not add the bill.');}finally{setBillBusy(false);}}
  return (
      <Screen footer={<View style={styles.inputRow}><TextInput accessibilityLabel="Your question for RegisterBox AI" value={question} onChangeText={setQuestion} onSubmitEditing={() => ask()} placeholder="Ask about your business…" placeholderTextColor={palette.muted} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send question" accessibilityState={{disabled:!question.trim()||loading,busy:loading}} disabled={!question.trim()||loading} onPress={() => ask()} style={[styles.send,(!question.trim()||loading)&&{opacity:0.45}]}><AppIcon name="arrow" color={palette.white}/></Pressable></View>}>
        <WorkspaceHeading eyebrow="REGISTERBOX AI" title="A clearer way forward." detail={business.id?`Guidance for ${business.tradeName||business.legalName}. You stay in control of every action.`:'Ask a question, or choose a business on Home to work with its records.'}/>
        <ErrorBanner message={error} />
        <Card><GstCheckbox checked={providerConsent} onPress={()=>setProviderConsent(!providerConsent)} label="Allow Groq to answer using my redacted question and limited GST workflow status. PAN, GSTIN, Aadhaar, email and phone are removed first."/><Button title="Review AI privacy & permissions" variant="ghost" onPress={()=>router.push('/privacy')}/></Card>
        <ActionRow icon="receipt" title={billBusy?'Reading your bill…':'Turn a bill into a reviewed draft'} detail="Upload a photo. Check the extracted fields before adding it to purchase books. Nothing is filed automatically." onPress={()=>{if(!billBusy)void uploadBill();}}/>
        {workspace==='nil'&&business.id?<GstAiNilLauncher key={business.id+'nil'+nilForm} initialForm={nilForm}/>:workspace&&business.id?<GstAiWorkspace key={business.id+workspace} businessId={business.id} operator={workspace==='tcs'}/>:null}
        {loading ? <View style={styles.answer}><Text style={styles.answerLabel}>RegisterBox AI</Text><Text style={styles.answerText}>Checking your saved business profile and rule-backed compliance results…</Text></View> : answer ? <View style={styles.answer}><Text selectable style={styles.answerLabel}>RegisterBox AI</Text><Text selectable style={styles.answerText}>{answer}</Text>{missingFacts.length > 0 && <Text selectable style={styles.missing}>Still needed: {missingFacts.join(', ')}</Text>}<Text style={styles.confidence}>{answerSource==='workflow_guide'?'RegisterBox workflow guide':'AI guidance'} · Knowledge {knowledgeVersion}</Text></View> : <View style={styles.stack}>{prompts.map((prompt) => <Pressable key={prompt} accessibilityRole="button" onPress={() => ask(prompt)} style={styles.prompt}><Text style={styles.bubble}>◉</Text><Text selectable style={styles.promptText}>{prompt}</Text></Pressable>)}</View>}
        {actions.map(action=><Button key={action} title={GST_WORKFLOWS[action].label} variant="secondary" onPress={()=>workflow(action)}/>)}
        {bill?<GstBillReview key={bill.extractionId} bill={bill} busy={billBusy} onApprove={addBill}/>:null}
        <Card><Disclosure title="More GST tools" detail="Filing, marketplace reports and TCS workpapers"><Button title="Open GST workspace" variant="secondary" onPress={()=>workflow('open_gst')}/><Button title="Upload platform / POS CSV" variant="secondary" onPress={()=>workflow('upload_platform')}/><Button title="GSTR-8 / TCS workpaper" variant="ghost" onPress={()=>workflow('review_tcs')}/></Disclosure></Card>
        <Text style={{fontSize:12,lineHeight:19,color:palette.muted}}>AI can make mistakes. Review important advice and every extracted amount before taking action.</Text>
      </Screen>
  );
}

const styles = StyleSheet.create({stack:{gap:10},prompt:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:palette.white,borderWidth:1,borderColor:palette.line,minHeight:60,padding:17,borderRadius:18},bubble:{color:palette.blue},promptText:{flex:1,color:palette.ink,fontSize:14,lineHeight:21,fontWeight:'500'},inputRow:{flexDirection:'row',gap:10,alignItems:'center'},input:{flex:1,minWidth:0,height:54,borderWidth:1,borderColor:palette.line,borderRadius:18,backgroundColor:'#FAFBFC',paddingHorizontal:16,color:palette.ink,fontSize:16},send:{width:50,height:50,borderRadius:16,backgroundColor:palette.blue,alignItems:'center',justifyContent:'center'},answer:{backgroundColor:palette.sky,borderRadius:22,padding:22,gap:14},answerLabel:{color:palette.blue,fontWeight:'700',fontSize:12,letterSpacing:0.6},answerText:{color:palette.ink,fontSize:15,lineHeight:25},missing:{color:palette.amber,fontSize:14,lineHeight:22,fontWeight:'600'},confidence:{color:palette.muted,fontSize:11,lineHeight:17}});
