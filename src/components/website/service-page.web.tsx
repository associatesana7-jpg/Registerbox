import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { contact, servicePath } from './content';
import { serviceDetails } from './service-details';
import { publicServices } from './service-pages';
import { Seo, siteUrl } from './seo.web';
export default function ServicePage({ slug }: { slug: string }) {
  const service = publicServices.find(item => item.slug === slug)!;
  const details = serviceDetails[service.category];
  const path = `/services/${service.slug}`;
  return <div className="rb-public-page"><Seo title={`${service.title} in India | RegisterBox`} description={`${service.detail} Get guided preparation and support from RegisterBox in Bengaluru.`} path={path} schema={[
    {'@type':'Service', name:service.title, description:service.detail, url:`${siteUrl}${path}`, provider:{'@id':`${siteUrl}/#organization`}, areaServed:{'@type':'Country',name:'India'}},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${siteUrl}/`},{'@type':'ListItem',position:2,name:'Services',item:`${siteUrl}/services`},{'@type':'ListItem',position:3,name:service.title,item:`${siteUrl}${path}`}]},
  ]}/><header className="rb-public-header rb-container"><WebBrand/><Link href="/services">All services →</Link></header>
    <main className="rb-policy rb-container"><nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / {service.title}</nav><div className="rb-eyebrow">{service.group}</div><h1>{service.title}</h1><p>{service.detail}</p>
    <h2>Who this is for</h2><p>{details.audience}</p><h2>What to prepare</h2><ul>{details.prepare.map(item=><li key={item}>{item}</li>)}</ul><h2>Prepare your next step with RegisterBox</h2><p>Bring your business information and supporting documents together in a guided workspace. Save your progress, return to your draft and discuss your next steps with our Bengaluru team.</p>
    <h2>How to get started</h2><ol><li>Sign in with your email and choose or create a business profile.</li><li>Complete the questions for {service.title.toLowerCase()} and gather the documents requested in your workspace.</li><li>Ask our team to confirm scope, fees and the next review steps before proceeding.</li></ol>
    <h2>What to expect</h2><p>Saving a draft is separate from professional review and government submission. Requirements, fees and processing depend on your business and the relevant authority. We do not guarantee approval or a processing date.</p>
    <div className="rb-service-actions"><Link className="rb-button" href={{pathname:'/auth',params:{next:servicePath(service.category)}}}>Start your application →</Link><Link className="rb-secondary-button" href="/contact">Discuss your business</Link></div>
    <h2>{details.question}</h2><p>{details.answer}</p><h2>Related services</h2><ul>{publicServices.filter(item=>item.category!==service.category && item.group===service.group).map(item=><li key={item.slug}><Link href={`/services/${item.slug}` as Href}>{item.title}</Link></li>)}</ul><p>Need help? <a href={contact.whatsapp}>Chat with RegisterBox</a> or read our <Link href="/policies">privacy and service information</Link>.</p>
    </main></div>;
}
