import { Link } from 'expo-router';
import { deletionInformation } from '@/data/privacy-policy';
import { PrivacyNotice } from '@/components/privacy-notice.web';
import { useState } from 'react';
export function PrivacyRetention() {
  const [language,setLanguage]=useState<'en'|'hi'>('en');
  return <section aria-labelledby="deletion-heading"><h2>Detailed privacy notice & choices</h2><PrivacyNotice language={language} onLanguage={setLanguage} headingLevel={3}/><h2 id="deletion-heading">Account deletion & retention</h2><p><Link href="/delete-account">Request account or selected data deletion →</Link></p>{deletionInformation.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</section>;
}
