import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Card, Button } from '@/components/registerbox-ui';
import { privacyContact, privacyNoticeSections, PRIVACY_NOTICE_VERSION } from '@/data/privacy-notice';

// Explicit HTML heading levels keep an embedded notice below its page heading.
// The native PrivacyNotice keeps its existing accessibility and layout behavior.
export function PrivacyNotice({ language, onLanguage, headingLevel = 2 }: { language: 'en' | 'hi'; onLanguage: (value: 'en' | 'hi') => void; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', gap: 12 }}><Button title="English" variant={language === 'en' ? 'primary' : 'secondary'} onPress={() => onLanguage('en')}/><Button title="हिन्दी" variant={language === 'hi' ? 'primary' : 'secondary'} onPress={() => onLanguage('hi')}/></View>
    <Text selectable>Privacy notice · {PRIVACY_NOTICE_VERSION}</Text>
    {privacyNoticeSections[language].map(section => <Card key={section.title}><Heading style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0, lineHeight: '26px', margin: 0 }}>{section.title}</Heading><Text selectable style={{ lineHeight: 24 }}>{section.body}</Text></Card>)}
    <Link href={`mailto:${privacyContact.email}?subject=RegisterBox%20privacy%20request`}>{privacyContact.email}</Link>
    <Link href="/privacy">Privacy Centre · permissions and requests</Link>
    <Link href="/delete-account">Account and data deletion</Link>
  </View>;
}
