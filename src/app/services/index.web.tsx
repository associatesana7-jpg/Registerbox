import { Link, type Href } from 'expo-router';
import { WebBrand } from '@/components/website/brand.web';
import { Seo, siteUrl } from '@/components/website/seo.web';
import { publicServices } from '@/components/website/service-pages';
export default function ServicesPage() {
  return <div className="rb-public-page"><Seo title="Business Registration & Compliance Services | RegisterBox" description="Explore company, LLP, GST, food business and shop registration preparation, plus business compliance workspaces. Find your next step with RegisterBox." path="/services" schema={[{'@type':'ItemList',itemListElement:publicServices.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.title,url:`${siteUrl}/services/${item.slug}`}))}]}/><header className="rb-public-header rb-container"><WebBrand/><Link href="/contact">Contact us →</Link></header><main className="rb-container rb-service-directory"><h1>Business registration & compliance services</h1><p>Find your starting point, explore the service, then prepare your application in a secure workspace.</p><div className="rb-services-grid">{publicServices.map(item=><Link href={`/services/${item.slug}` as Href} className="rb-service-card" key={item.slug}><h2>{item.title}</h2><p>{item.detail}</p>{item.priceLabel&&<b className="rb-price-tag">{item.priceLabel}</b>}<span>Explore service →</span></Link>)}</div></main></div>;
}
