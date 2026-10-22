import { Link } from 'expo-router';
import { PrivacyDeletion } from '@/components/privacy-deletion';
import { WebBrand } from '@/components/website/brand.web';
import { SiteFooter } from '@/components/website/footer.web';
import Head from 'expo-router/head';
export default function DeleteAccountPage() {
  return <div className="rb-public-page"><Head><title>Account & Data Deletion | RegisterBox</title><meta name="description" content="Request deletion of your RegisterBox account or selected data, and learn about processing and retention."/></Head><header className="rb-public-header rb-container"><WebBrand/><Link href="/policies">Privacy information</Link></header><main className="rb-policy rb-container"><h1>Account & data deletion</h1><p>For RegisterBox app and website accounts. You can request deletion without reinstalling the app.</p><PrivacyDeletion/></main><SiteFooter/></div>;
}
