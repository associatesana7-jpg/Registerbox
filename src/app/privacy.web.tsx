import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { PrivacyCenter } from '@/components/privacy-center';
import { WebBrand } from '@/components/website/brand.web';
import { SiteFooter } from '@/components/website/footer.web';
export default function PrivacyPage(){return <div className="rb-public-page"><Head><title>Privacy Centre | RegisterBox</title><meta name="description" content="Read RegisterBox's privacy notice, manage optional AI permissions and submit access, correction or privacy grievance requests."/></Head><header className="rb-public-header rb-container"><WebBrand/><Link href="/">Back to website</Link></header><main className="rb-policy rb-container"><h1>Privacy Centre</h1><PrivacyCenter/></main><SiteFooter/></div>;}
