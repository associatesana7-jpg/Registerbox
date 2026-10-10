import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { BusinessProfilePicker } from '@/components/business-profile-picker';
import { useApp } from '@/hooks/use-app';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationCategories } from '@/data/application-categories';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { contact, services, servicePath } from './content';
const object = (value: unknown): Record<string, unknown> => value && typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export default function WebDashboard(){
  const { business, session } = useApp();
  const { data, error, loading } = useBusinessRecords();
  const [draftState, setDraftState] = useState<{id?:string;rows:{category:string;updatedAt?:string}[];error:string}>({rows:[],error:''});
  const drafts = draftState.id === business.id ? draftState.rows : [];
  const draftError = draftState.id === business.id ? draftState.error : '';
  useEffect(()=>{
    let active=true;
    const id=business.id;
    if(!id)return;
    supabase.from('business_profiles').select('questionnaire').eq('id',id).single().then(({data:profile,error:loadError})=>{
      if(!active)return;
      if(loadError){setDraftState({id,rows:[],error:loadError.message});return;}
      const stored=object(object(profile.questionnaire).application_drafts);
      const rows=Object.entries(stored).filter(([category])=>!!applicationCategories[category]).map(([category,value])=>({category,updatedAt:typeof object(value).updated_at==='string'?object(value).updated_at as string:undefined}));
      setDraftState({id,rows,error:''});
    });
    return()=>{active=false;};
  },[business.id]);
  return <div className="rb-dashboard"><Head><title>Business workspace | RegisterBox</title><meta name="robots" content="noindex"/></Head><div className="rb-dashboard-heading"><div><div className="rb-eyebrow">YOUR BUSINESS WORKSPACE</div><h1>{business.tradeName||business.legalName||'Big plans start here.'}</h1><p className="rb-dashboard-sub">{business.id?'Your applications, documents and next steps, together.':`Welcome${session?.user.email?`, ${session.user.email.split('@')[0]}`:''}. Choose a goal to create your first business profile.`}</p></div><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="rb-secondary-button">Talk to our team ↗</a></div><BusinessProfilePicker/><div className="rb-dashboard-toolbar"><Link href="/(tabs)/compliance">▤ {loading?'…':data?.applications.length??0} applications</Link><Link href="/(tabs)/documents">▱ {loading?'…':data?.documents.length??0} documents</Link><Link href="/gst">₹ GST workspace</Link><Link href="/(tabs)/ai">✦ Ask RegisterBox AI</Link></div>{(error||draftError)&&<div role="alert" className="rb-form-error">{error||draftError}</div>}{data?.actions.map(action=><div key={action.id} className="rb-dashboard-notice"><div><b>{action.title}</b><p>{action.description}</p></div><Link href="/(tabs)/compliance">Review applications →</Link></div>)}{drafts.length>0&&<><h2>Pick up where you left off</h2><p className="rb-dashboard-sub">Saved preparation drafts for the selected business.</p><div className="rb-draft-list">{drafts.map(draft=><div className="rb-draft-card" key={draft.category}><b>{applicationCategories[draft.category].title}</b><p>Draft{draft.updatedAt?` · Saved ${new Date(draft.updatedAt).toLocaleDateString('en-IN')}`:''} · Not submitted</p><Link href={servicePath(draft.category) as Href}>Continue application →</Link></div>)}</div></>}<div className="rb-dashboard-notice"><div><b>A little guidance for your next move.</b><br/>Describe your business idea or question in plain language.</div><Link href="/(tabs)/ai">Ask RegisterBox AI ↗</Link></div><h2>What would you like to do?</h2><p className="rb-dashboard-sub">Start a guided application or open a connected workspace.</p><div className="rb-services-grid">{services.map(service=><Link className="rb-service-card" key={service.category} href={servicePath(service.category) as Href}><div className="rb-service-card-top"><Image source={iconFor(service.icon)} contentFit="contain" style={{height:52,width:52}} alt=""/><span>↗</span></div><h3>{service.title}</h3><p>{service.detail}</p><div className="rb-service-footer">{service.category==='gst'?'Open workspace':'Start application'} <span>→</span></div></Link>)}</div></div>;
}
function iconFor(icon:string){const icons:Record<string,number>={company:require('../../../assets/images/action-icons/company.png'),llp:require('../../../assets/images/action-icons/llp.png'),'gst-registration':require('../../../assets/images/action-icons/gst-registration.png'),food:require('../../../assets/images/action-icons/food.png'),retail:require('../../../assets/images/action-icons/retail.png'),'gst-return':require('../../../assets/images/action-icons/gst-return.png'),'new-business':require('../../../assets/images/action-icons/new-business.png'),online:require('../../../assets/images/action-icons/online.png'),manufacturing:require('../../../assets/images/action-icons/manufacturing.png'),branch:require('../../../assets/images/action-icons/branch.png'),'business-check':require('../../../assets/images/action-icons/business-check.png')};return icons[icon];}
