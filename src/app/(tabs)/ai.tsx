import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

const prompts = ['Do I need an FSSAI licence for a cloud kitchen?', 'Can I open another branch in Mysore?', 'Explain this GST notice', 'What licences do I need for a food truck?', 'Help me renew my trade licence'];

export default function AiScreen() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  function ask(value = question) {
    if (!value.trim()) return;
    setQuestion('');
    setAnswer(value.toLowerCase().includes('fssai') ? 'Based on ABC Foods preparing and selling food, FSSAI is marked Required by the compliance rules engine. The exact licence category still depends on turnover and activity details.' : 'I can help with that using your Business Profile, active applications, documents, and verified compliance rules. For a definitive answer, I’ll ask for any missing details first.');
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<View style={styles.inputRow}><TextInput value={question} onChangeText={setQuestion} onSubmitEditing={() => ask()} placeholder="Type your question..." placeholderTextColor="#97A4BF" style={styles.input} /><Pressable onPress={() => ask()} style={styles.send}><Text style={styles.sendText}>↑</Text></Pressable></View>}>
        <PageHeader title="Ask RegisterBox AI" subtitle="Instant answers grounded in your business and verified rules." />
        {answer ? <View style={styles.answer}><Text selectable style={styles.answerLabel}>RegisterBox AI</Text><Text selectable style={styles.answerText}>{answer}</Text><Text style={styles.confidence}>Rule-backed answer • Confidence shown when applicable</Text></View> : <View style={styles.stack}>{prompts.map((prompt) => <Pressable key={prompt} onPress={() => ask(prompt)} style={styles.prompt}><Text style={styles.bubble}>◉</Text><Text selectable style={styles.promptText}>{prompt}</Text></Pressable>)}</View>}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ stack: { gap: 11 }, prompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, padding: 14, borderRadius: 13 }, bubble: { color: palette.blue }, promptText: { color: palette.muted, fontSize: 12, fontWeight: '700' }, inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, input: { flex: 1, height: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 24, backgroundColor: palette.white, paddingHorizontal: 17, color: palette.ink }, send: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' }, sendText: { color: palette.white, fontWeight: '900', fontSize: 20 }, answer: { backgroundColor: palette.sky, borderRadius: 16, padding: 18, gap: 9 }, answerLabel: { color: palette.blue, fontWeight: '900', fontSize: 12 }, answerText: { color: palette.ink, fontSize: 14, lineHeight: 22 }, confidence: { color: palette.muted, fontSize: 9 } });
