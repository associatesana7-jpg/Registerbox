import Head from 'expo-router/head';
import { branches, contact } from './content';
export const siteUrl = 'https://www.registerbox.in';
export const organization = {
  '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'RegisterBox', url: siteUrl,
  logo: `${siteUrl}/images/registerbox-logo.png`, image: `${siteUrl}/images/registerbox-og.jpg`,
  email: contact.email, telephone: contact.phone, sameAs: [contact.googleProfile],
  contactPoint: { '@type': 'ContactPoint', telephone: contact.phone, email: contact.email, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['English', 'Hindi', 'Kannada'] },
};
const branchSchema = branches.map(branch => ({
  '@type': ['LocalBusiness', 'ProfessionalService'], '@id': `${siteUrl}/#${branch.id}`, name: `RegisterBox — ${branch.name}`,
  url: `${siteUrl}/contact#bengaluru-branches`, parentOrganization: { '@id': organization['@id'] },
  description: `Business registration, GST, FSSAI, trademark and compliance support from RegisterBox in ${branch.name}, Bengaluru.`,
  image: `${siteUrl}/images/registerbox-og.jpg`, telephone: contact.phone, email: contact.email, hasMap: branch.maps,
  areaServed: { '@type': 'City', name: 'Bengaluru' }, sameAs: branch.id === 'marathahalli' ? [contact.googleProfile] : undefined,
  address: { '@type': 'PostalAddress', streetAddress: branch.streetAddress, addressLocality: 'Bengaluru', addressRegion: 'Karnataka', postalCode: branch.postalCode, addressCountry: 'IN' },
  ...('latitude' in branch ? { geo: { '@type': 'GeoCoordinates', latitude: branch.latitude, longitude: branch.longitude } } : {}),
}));
export function Seo({ title, description, path, schema = [], image = '/images/registerbox-og.jpg', imageAlt = 'RegisterBox — Your business. Sorted.', type = 'website', publishedTime, language = 'en-IN', alternatePath, alternates }: { title: string; description: string; path: string; schema?: Record<string, unknown>[]; image?: string; imageAlt?: string; type?: 'website' | 'article'; publishedTime?: string; language?: string; alternatePath?: string; alternates?: { language: string; path: string }[] }) {
  const url = `${siteUrl}${path}`;
  const imageUrl = `${siteUrl}${image}`;
  return <><Head>
    <title>{title}</title>
    {path === '/' && <meta name="google-site-verification" content="tHYGV4Nf7s-_9zUnDr7Go8WytrfDnJvteo3-zCyZr7k"/>}<meta name="description" content={description}/>
    <meta name="robots" content="index,follow,max-image-preview:large"/><link rel="canonical" href={url}/>
    {alternates?.map(alternate => <link key={alternate.language} rel="alternate" hrefLang={alternate.language} href={`${siteUrl}${alternate.path}`}/>)}
    {!alternates&&alternatePath&&<link rel="alternate" hrefLang={language} href={url}/>}
    {!alternates&&alternatePath&&<link rel="alternate" hrefLang={language === 'hi-IN' ? 'en-IN' : 'hi-IN'} href={`${siteUrl}${alternatePath}`}/>}
    {!alternates&&alternatePath&&<link rel="alternate" hrefLang="x-default" href={`${siteUrl}${language === 'hi-IN' ? alternatePath : path}`}/>}
    <meta property="og:type" content={type}/><meta property="og:site_name" content="RegisterBox"/><meta property="og:locale" content={language.replace(/-/g,'_')}/>
    <meta property="og:title" content={title}/><meta property="og:description" content={description}/><meta property="og:url" content={url}/>
    <meta property="og:image" content={imageUrl}/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content={type==='article'?'800':'630'}/><meta property="og:image:alt" content={imageAlt}/>
    {publishedTime&&<meta property="article:published_time" content={publishedTime}/>}
    {publishedTime&&<meta property="article:modified_time" content={publishedTime}/>}
    <meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content={title}/><meta name="twitter:description" content={description}/><meta name="twitter:image" content={imageUrl}/>
  </Head><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@graph':[organization, ...(path === '/' || path === '/contact' || path.startsWith('/services/') ? branchSchema : []), ...schema]}).replace(/</g,'\\u003c')}}/></>;
}
