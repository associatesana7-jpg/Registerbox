import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { GstAiWorkspace } from '@/components/gst-ai-workspace';
import {GST_WORKFLOWS,GST_KNOWLEDGE_VERSION,safeGstActions,type GstAiAction} from '../../../supabase/functions/_shared/gst-assistant-knowledge';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GstBillReview } from '@/components/gst-bill-review';
import { Button, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { addExtractedBillToBooks, askRegisterBoxAi, chooseAndExtractGstBill, type BillExtraction } from '@/lib/registerbox-api';

const prompts = ['Do I need an FSSAI licence for a cloud kitchen?', 'Can I open another branch in Mysore?', 'Explain this GST notice', 'What licences do I need for a food truck?', 'Help me renew my trade licence'];

export default function AiScreen() {
  const {business,session}=useApp();
  return <AiContent key={(session?.user.id||'signed-out')+':'+(business.id||'no-business')}/>;
}
function AiContent() {
  const { business } = useApp();
  const [actions,setActions]=useState<GstAiAction[]>([]);
  const [workspace,setWorkspace]=useState<'platform'|'tcs'|null>(null);
  const [knowledgeVersion,setKnowledgeVersion]=useState(GST_KNOWLEDGE_VERSION);
  const [answerSource,setAnswerSource]=useState('');
  const account=useRef(business.id);account.current=business.id;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const [missingFacts, setMissingFacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerConsent,setProviderConsent]=useState(false);
  const [bill,setBill]=useState<BillExtraction|null>(null);
  const [billBusy,setBillBusy]=useState(false);
  useEffect(()=>()=>{account.current='';},[]);
  function workflow(action:GstAiAction){
    if(!business.id){setError('Select a business profile first.');return;}
    if(action==='upload_bill'){void uploadBill();return;}
    if(action==='upload_platform'||action==='review_tcs'){setWorkspace(action==='review_tcs'?'tcs':'platform');return;}
    if(action==='open_purchases')router.push('/gst-purchases');
    else if(action==='open_returns'||action==='review_amendments')router.push('/gst-returns');
    else router.push('/gst');
  }
  async function ask(value = question) {
    if (!value.trim() || loading) return;
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
    finally { setLoading(false); }
  }
  async function uploadBill(){const businessId=business.id;if(!businessId){setError('Select or create a GST business profile before uploading a bill.');return;}setBillBusy(true);setError('');try{const result=await chooseAndExtractGstBill(businessId);if(account.current!==businessId)return;if(result){setBill(result);setAnswer('I extracted the bill into a reviewable GST purchase draft. Check every field against the image before approving it.');}}catch(caught){setError(caught instanceof Error?caught.message:'Could not extract this bill.');}finally{setBillBusy(false);}}
  async function addBill(purchase:Parameters<typeof addExtractedBillToBooks>[4],year:number,month:number){if(!business.id||!bill)return;setBillBusy(true);setError('');try{await addExtractedBillToBooks(business.id,bill.extractionId,year,month,purchase);setAnswer(`Bill ${purchase.number} was added to ${String(month).padStart(2,'0')}/${year} purchase books. It has not been filed with GST.`);setBill(null);}catch(caught){setError(caught instanceof Error?caught.message:'Could not add the bill.');}finally{setBillBusy(false);}}
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<View style={styles.inputRow}><TextInput value={question} onChangeText={setQuestion} onSubmitEditing={() => ask()} placeholder="Type your question..." placeholderTextColor="#97A4BF" style={styles.input} /><Pressable onPress={() => ask()} style={styles.send}><Text style={styles.sendText}>↑</Text></Pressable></View>}>
        <PageHeader title="Ask RegisterBox AI" subtitle="Guidance and actions for your selected business." />
        <ErrorBanner message={error} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:providerConsent}} onPress={()=>setProviderConsent(!providerConsent)} style={styles.consentRow}><Text style={styles.consentTick}>{providerConsent?'☑':'☐'}</Text><Text style={styles.consentText}>Send my redacted question and limited GST workflow status to Groq for this answer. PAN, GSTIN, Aadhaar, email and phone are removed first.</Text></Pressable>
        <View style={styles.billCard}><Text style={styles.answerLabel}>GST ACTIONS</Text><Text style={styles.answerText}>Upload reports here, then review and authorize filing in the GST workspace.</Text><Button title="Upload platform / POS CSV" variant="secondary" onPress={()=>workflow('upload_platform')}/><Button title="Review & file GST return" onPress={()=>workflow('open_gst')}/><Button title="GSTR-8 / TCS workpaper" variant="ghost" onPress={()=>workflow('review_tcs')}/></View>
        {workspace&&business.id?<GstAiWorkspace key={business.id+workspace} businessId={business.id} operator={workspace==='tcs'}/>:null}
        <View style={styles.billCard}><Text style={styles.answerLabel}>BILL TO GST BOOKS</Text><Text style={styles.answerText}>Upload a bill photo. Groq extracts a draft; you review and approve before it enters purchase books.</Text><Button title="Upload bill photo" variant="secondary" loading={billBusy} onPress={uploadBill}/></View>
        {loading ? <View style={styles.answer}><Text style={styles.answerLabel}>RegisterBox AI</Text><Text style={styles.answerText}>Checking your saved business profile and rule-backed compliance results…</Text></View> : answer ? <View style={styles.answer}><Text selectable style={styles.answerLabel}>RegisterBox AI</Text><Text selectable style={styles.answerText}>{answer}</Text>{missingFacts.length > 0 && <Text selectable style={styles.missing}>Still needed: {missingFacts.join(', ')}</Text>}<Text style={styles.confidence}>{answerSource==='workflow_guide'?'RegisterBox workflow guide':'AI guidance'} · Knowledge {knowledgeVersion}</Text></View> : <View style={styles.stack}>{prompts.map((prompt) => <Pressable key={prompt} onPress={() => ask(prompt)} style={styles.prompt}><Text style={styles.bubble}>◉</Text><Text selectable style={styles.promptText}>{prompt}</Text></Pressable>)}</View>}
        {actions.map(action=><Button key={action} title={GST_WORKFLOWS[action].label} variant="secondary" onPress={()=>workflow(action)}/>)}
        {bill?<GstBillReview key={bill.extractionId} bill={bill} busy={billBusy} onApprove={addBill}/>:null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ stack: { gap: 11 }, consentRow:{flexDirection:'row',gap:9,alignItems:'flex-start',backgroundColor:palette.white,borderWidth:1,borderColor:palette.line,borderRadius:14,padding:13},consentTick:{color:palette.blue,fontSize:20},consentText:{flex:1,color:palette.muted,fontSize:11,lineHeight:17,fontWeight:'700'}, billCard:{backgroundColor:palette.white,borderWidth:1,borderColor:palette.line,borderRadius:16,padding:16,gap:10}, prompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, padding: 14, borderRadius: 13 }, bubble: { color: palette.blue }, promptText: { color: palette.muted, fontSize: 12, fontWeight: '700' }, inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, input: { flex: 1, height: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 24, backgroundColor: palette.white, paddingHorizontal: 17, color: palette.ink }, send: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' }, sendText: { color: palette.white, fontWeight: '900', fontSize: 20 }, answer: { backgroundColor: palette.sky, borderRadius: 16, padding: 18, gap: 9 }, answerLabel: { color: palette.blue, fontWeight: '900', fontSize: 12 }, answerText: { color: palette.ink, fontSize: 14, lineHeight: 22 }, missing: { color: palette.amber, fontSize: 11, lineHeight: 17, fontWeight: '700' }, confidence: { color: palette.muted, fontSize: 9 } });
