import { Link } from 'expo-router';
import { deletionInformation } from '@/data/privacy-policy';
export function PrivacyRetention() {
  return <section aria-labelledby="deletion-heading"><h2 id="deletion-heading">Account deletion & retention</h2><p><Link href="/delete-account">Request account or selected data deletion →</Link></p>{deletionInformation.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</section>;
}
