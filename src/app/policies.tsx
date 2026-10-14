import { Screen, PageHeader, Card } from '@/components/registerbox-ui';
import { Text } from 'react-native';
import { Link } from 'expo-router';
import { deletionInformation } from '@/data/privacy-policy';
import { PrivacyNotice } from '@/components/privacy-notice';
import { useState } from 'react';
export default function PoliciesScreen(){const [language,setLanguage]=useState<'en'|'hi'>('en');return <Screen><PageHeader title="Privacy & service information"/><PrivacyNotice language={language} onLanguage={setLanguage}/><Card><Text>Your account, business records and uploaded documents are stored in RegisterBox’s shared backend. A saved draft is not a submitted government application. Contact registerbox@yahoo.com for privacy or service questions.</Text><Link href="/delete-account">Request account or data deletion</Link></Card>{deletionInformation.map(item => <Card key={item.title}><Text style={{fontWeight:'700'}}>{item.title}</Text><Text style={{lineHeight:22}}>{item.body}</Text></Card>)}</Screen>;}
