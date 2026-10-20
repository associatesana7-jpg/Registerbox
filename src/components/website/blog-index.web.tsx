import { useState } from 'react';
import { Link, type Href } from 'expo-router';
import { blogArticles } from '@/data/blog';
import { Seo, siteUrl } from './seo.web';
import { BlogCard, BlogFooter, BlogHeader } from './blog-chrome.web';
import './blog.css';
const categories = ['All guides', 'Start a business', 'Registrations', 'GST & records', 'Grow & comply'];
export default function BlogIndex() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All guides');
  const normalized = query.trim().toLowerCase();
  const shown = blogArticles.filter(article => (category === 'All guides' || article.category === category) && normalized.split(/\s+/).every(term => `${article.title} ${article.description} ${article.searchQuestions.join(' ')}`.toLowerCase().includes(term)));
  const featured = !normalized && category === 'All guides' ? shown[0] : undefined;
  return <div className="rbg-page"><Seo title="Business guides: Udyam, company setup, FSSAI & compliance | RegisterBox" description="Plain-English guides to Udyam, LLP vs company, FSSAI fees, GST, professional tax, ESI and EPF. Checklists, practical examples and linked official sources." path="/blog" schema={[{'@type':'CollectionPage',name:'RegisterBox business guides',url:`${siteUrl}/blog`,mainEntity:{'@type':'ItemList',itemListElement:blogArticles.map((article,index)=>({'@type':'ListItem',position:index+1,url:`${siteUrl}/blog/${article.slug}`,name:article.title}))}}]}/><BlogHeader/><main id="blog-main" className="rbg-main"><div className="rbg-index-intro"><div className="rbg-kicker">THE REGISTERBOX JOURNAL</div><h1>Good questions.<br/>Clear next steps.</h1><p>Starting a business brings enough questions. Here are practical answers on registrations, paperwork and keeping things in order.</p><Link href={'/blog/editorial-policy' as Href}>Our sources & editorial approach ↗</Link></div>
    <section aria-label="Find a guide" className="rbg-controls"><label className="rbg-search"><span>What do you need help with?</span><input type="search" placeholder="Try “GST documents” or “home kitchen”" value={query} onChange={event=>setQuery(event.target.value)}/></label><div className="rbg-filters" aria-label="Filter by topic">{categories.map(item=><button key={item} aria-pressed={item===category} onClick={()=>setCategory(item)}>{item}</button>)}</div></section>
    <p role="status" className="rbg-count">{shown.length} {shown.length===1?'guide':'guides'}{normalized ? ` for “${query.trim()}”` : ' for Indian business owners'}</p>{featured&&<BlogCard article={featured} featured/>}<section aria-label="Business guides" className="rbg-grid">{shown.filter(article=>article!==featured).map(article=><BlogCard key={article.slug} article={article}/>)}</section>{!shown.length&&<div className="rbg-empty"><h2>No guide matches that search yet.</h2><p>Try a service name, or tell us what you are trying to do.</p><button onClick={()=>{setQuery('');setCategory('All guides');}}>Show all guides</button><Link href="/contact">Ask RegisterBox</Link></div>}
    <aside className="rbg-bottom-cta"><div><h2>Ready to put the plan into practice?</h2><p>See what to prepare and how RegisterBox can help with your next step.</p></div><Link href="/services">Find your service ↗</Link></aside></main><BlogFooter/></div>;
}
