import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, ErrorBanner, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { chooseAndUploadDocument, ensureDraftBusiness, getNextOnboardingQuestion, saveOnboardingAnswer, verifyBusinessIdentity, type OnboardingQuestion } from '@/lib/registerbox-api';

const optionLabels: Record<string, string> = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery', PACKAGED_RETAIL: 'Packaged retail', VERIFY_NUMBER: 'Verify a number', ENTER_NUMBER: 'Enter licence number', UPLOAD_DOCUMENT: 'Upload certificate', DO_NOT_HAVE: "I don't have it", NOT_SURE: "I'm not sure" };

export default function DynamicOnboardingScreen() {
  const params = useLocalSearchParams<{ sessionId: string; intentId: string }>();
  const { onboarding, updateBusiness } = useApp();
  const [question, setQuestion] = useState<OnboardingQuestion | null>(onboarding?.nextQuestion ?? null);
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(!onboarding?.nextQuestion);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (question || !params.sessionId) return;
    getNextOnboardingQuestion(params.sessionId).then((result) => { setQuestion(result.nextQuestion); setComplete(result.complete); }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load onboarding.')).finally(() => setLoading(false));
  }, [params.sessionId, question]);

  const progress = question?.completion_percentage ?? (complete ? 100 : 0);
  const isRegistration = question?.expected_answer_type === 'registration';
  const isPan = question?.field_key === 'identity.pan_status';
  const isGst = question?.field_key === 'registration.gst_status';
  const isFssai = question?.field_key === 'registration.fssai_status';
  const prompt = useMemo(() => isPan ? 'PAN number' : isGst ? 'GSTIN' : isFssai ? 'FSSAI licence number' : 'Your answer', [isPan, isGst, isFssai]);

  async function advance(answer: unknown, source: 'USER' | 'CONNECTOR' | 'DOCUMENT' = 'USER', reference?: string) {
    if (!question) return;
    const result = await saveOnboardingAnswer(params.sessionId, question.field_key, answer, source, reference);
    if (result.businessId) updateBusiness({ id: result.businessId });
    setQuestion(result.nextQuestion); setComplete(result.complete); setValue(''); setChoice([]); setName(''); setDob('');
  }

  async function submit() {
    if (!question) return;
    setLoading(true); setError('');
    try {
      if (isRegistration && choice[0] === 'UPLOAD_DOCUMENT') {
        const businessId = await ensureDraftBusiness(params.intentId, onboarding?.classification.industry ?? undefined);
        const document = await chooseAndUploadDocument(businessId, isFssai ? 'FSSAI_CERTIFICATE' : isGst ? 'GST_CERTIFICATE' : 'PAN_CARD');
        if (!document) return;
        await advance({ status: 'UPLOADED', documentId: document.id, filename: document.original_filename }, 'DOCUMENT', document.id);
      } else if (question.expected_answer_type === 'document') {
        const businessId = await ensureDraftBusiness(params.intentId, onboarding?.classification.industry ?? undefined);
        const document = await chooseAndUploadDocument(businessId, question.field_key.toUpperCase().replace(/\./g, '_'));
        if (!document) return;
        await advance({ documentId: document.id, filename: document.original_filename }, 'DOCUMENT', document.id);
      } else if ((isPan || isGst) && choice[0] === 'VERIFY_NUMBER') {
        const verified = await verifyBusinessIdentity(isPan ? 'PAN' : 'GSTIN', value, isPan ? name : undefined, isPan ? dob : undefined);
        if (!verified.valid) throw new Error(`The ${isPan ? 'PAN' : 'GSTIN'} details could not be verified.`);
        await advance({ status: 'VERIFIED', identifier: verified.identifier, verificationId: verified.verificationId, data: verified }, 'CONNECTOR', verified.verificationId);
      } else if (isFssai && choice[0] === 'ENTER_NUMBER') {
        if (!/^[0-9]{14}$/.test(value.trim())) throw new Error('Enter the 14-digit FSSAI licence or registration number.');
        await advance({ status: 'USER_DECLARED', registrationNumber: value.trim() });
      } else if (isRegistration) {
        if (!choice[0]) throw new Error('Choose an option to continue.');
        await advance({ status: choice[0] });
      } else if (question.expected_answer_type === 'choice') {
        if (!choice.length) throw new Error('Choose at least one option.');
        await advance(choice);
      } else {
        if (!value.trim()) throw new Error('Enter an answer to continue.');
        const answer = question.expected_answer_type === 'number' ? Number(value) : value.trim();
        if (question.expected_answer_type === 'number' && (!Number.isFinite(answer) || Number(answer) < 0)) throw new Error('Enter a valid number.');
        await advance(answer);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your answer.'); }
    finally { setLoading(false); }
  }

  if (complete) return <Screen footer={<Button title="See my compliance plan" icon="→" onPress={() => router.replace('/onboarding/analyzing')} />}><PageHeader title="We have what we need" subtitle="Your answers, verified registry data, and uploaded evidence are ready for compliance analysis." /><Card><Badge label="PROFILE COMPLETE" tone="green" /><Text style={styles.completeTitle}>Your tailored path is ready.</Text><Text style={styles.help}>RegisterBox will show required, likely required, recommended, and not-applicable items separately. Nothing is treated as a legal requirement merely because the AI suggested it.</Text></Card></Screen>;

  return (
    <Screen footer={<Button title={question?.expected_answer_type === 'document' ? 'Choose document' : 'Continue'} icon="→" loading={loading} disabled={!question} onPress={submit} />}>
      <PageHeader title="A few focused questions" subtitle={onboarding?.classification.summary ?? 'We only ask for facts that change your compliance path.'} back={() => router.back()} />
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(6, progress)}%` }]} /></View><Text style={styles.progressText}>{progress}% profile complete</Text>
      {onboarding?.workflowPacks?.length ? <View style={styles.packs}>{onboarding.workflowPacks.map((pack) => <Badge key={pack.id} label={pack.name} />)}</View> : null}
      {question && <Card><Text selectable style={styles.question}>{question.question_text}</Text>{question.help_text && <Text selectable style={styles.help}>{question.help_text}</Text>}
        {(question.expected_answer_type === 'choice' || isRegistration) && <View style={styles.options}>{question.options_json.map((option) => <Pressable key={option} onPress={() => setChoice(question.expected_answer_type === 'choice' ? (choice.includes(option) ? choice.filter((item) => item !== option) : [...choice, option]) : [option])} style={[styles.option, choice.includes(option) && styles.optionSelected]}><Text style={[styles.optionText, choice.includes(option) && styles.optionTextSelected]}>{optionLabels[option] ?? option}</Text></Pressable>)}</View>}
        {(!['choice','document','registration'].includes(question.expected_answer_type) || (isRegistration && ['VERIFY_NUMBER','ENTER_NUMBER'].includes(choice[0]))) && <View style={styles.fields}><TextInput value={value} onChangeText={setValue} autoCapitalize={(isPan || isGst) ? 'characters' : 'sentences'} keyboardType={question.expected_answer_type === 'number' || isFssai ? 'number-pad' : 'default'} placeholder={prompt} placeholderTextColor="#8A98B5" style={styles.field} />{isPan && choice[0] === 'VERIFY_NUMBER' && <><TextInput value={name} onChangeText={setName} placeholder="Name exactly as on PAN" placeholderTextColor="#8A98B5" style={styles.field} /><TextInput value={dob} onChangeText={setDob} placeholder="DOB / incorporation date (DD/MM/YYYY)" placeholderTextColor="#8A98B5" style={styles.field} /></>}</View>}
      </Card>}
      <ErrorBanner message={error} />
      <View style={styles.trust}><Text style={styles.trustTitle}>🔒 Your evidence stays private</Text><Text style={styles.trustCopy}>Uploads go directly to your private Supabase Storage path and are linked to your business record. AI keys and verification credentials never ship in the app.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 7, backgroundColor: palette.line, borderRadius: 5, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: palette.blue }, progressText: { color: palette.muted, fontSize: 10, textAlign: 'right', marginTop: -12 }, packs: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, question: { color: palette.ink, fontSize: 20, lineHeight: 27, fontWeight: '900' }, help: { color: palette.muted, fontSize: 12, lineHeight: 18 }, options: { gap: 9 }, option: { minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 13, justifyContent: 'center' }, optionSelected: { borderColor: palette.blue, backgroundColor: palette.sky }, optionText: { color: palette.ink, fontWeight: '700', fontSize: 13 }, optionTextSelected: { color: palette.blue }, fields: { gap: 9 }, field: { minHeight: 50, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 13, color: palette.ink, backgroundColor: palette.white }, trust: { padding: 14, borderRadius: 12, backgroundColor: '#F5F8FD' }, trustTitle: { color: palette.ink, fontWeight: '800', fontSize: 11 }, trustCopy: { color: palette.muted, fontSize: 10, lineHeight: 15, paddingTop: 5 }, completeTitle: { color: palette.ink, fontSize: 21, fontWeight: '900' },
});
