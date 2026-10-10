import { Link, Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/registerbox-api';
import { WebBrand } from './brand.web';
import { contact, safeNext } from './content';
export default function WebAuth({ otpMode = false }: { otpMode?: boolean }) {
  const { next: requested } = useLocalSearchParams<{next?:string}>();
  const next = safeNext(requested);
  const { email, setEmail, session, refreshAccount, setDemoMode } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(20);
  useEffect(()=>{ if(!otpMode || seconds<=0)return; const timer=setTimeout(()=>setSeconds(value=>value-1),1000);return()=>clearTimeout(timer);},[otpMode,seconds]);
  if(session)return <Redirect href={next as Href}/>;
  if(otpMode&&!email)return <Redirect href={{pathname:'/auth',params:{next}}}/>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    try {
      setDemoMode(false);
      if(otpMode){const auth=await verifyEmailOtp(email,code);await refreshAccount(auth.session);router.replace(next as Href);}
      else{await sendEmailOtp(email);router.push({pathname:'/auth/otp',params:{next}});}
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not complete sign-in. Please try again.');}
    finally{setBusy(false);}
  }
  async function resend(){setBusy(true);setError('');try{await sendEmailOtp(email);setSeconds(20);}catch(cause){setError(cause instanceof Error?cause.message:'Could not resend the code.');}finally{setBusy(false);}}
  return <div className="rb-auth-page"><Head><title>{otpMode?'Verify your email':'Sign in'} | RegisterBox</title><meta name="robots" content="noindex"/></Head><header className="rb-public-header rb-container"><WebBrand/><Link href="/">← Back to website</Link></header><main className="rb-auth-grid rb-container"><div className="rb-auth-story"><div className="rb-eyebrow">YOUR BUSINESS. SORTED.</div><h1>Your next chapter.<br/><span>One simple<br/>starting point.</span></h1><p>Start an application, keep your documents together, and pick up right where you left off.</p><ul><li>Your existing app account works here</li><li>Business profiles stay in sync</li><li>Saved drafts and private documents</li></ul></div><div className="rb-auth-card"><div className="rb-eyebrow">{otpMode?'CHECK YOUR INBOX':'WELCOME TO REGISTERBOX'}</div><h2>{otpMode?'A small code. A fresh start.':'Let’s get down to business.'}</h2><p>{otpMode?`Enter the 6-digit sign-in code sent to ${email}.`:'Sign in or create your account with an email code. No password to remember.'}</p><form className="rb-form" onSubmit={submit}>{otpMode?<label htmlFor="rb-otp">Your sign-in code<input id="rb-otp" className="rb-otp" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus aria-describedby={error?'rb-auth-error':undefined}/></label>:<label htmlFor="rb-email">Email address<input id="rb-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@business.com" autoComplete="email" required autoFocus aria-describedby={error?'rb-auth-error':undefined}/></label>}{error&&<div className="rb-form-error" role="alert" id="rb-auth-error">{error}</div>}<button type="submit" className="rb-button" disabled={busy||(otpMode&&code.length!==6)}>{busy?'Please wait…':otpMode?'Verify & continue':'Send my sign-in code'} <span>↗</span></button><p className="rb-form-help">{otpMode?'This is your RegisterBox sign-in code. Government portal OTPs are handled separately.':'Use the same email as the RegisterBox app to access your existing businesses and records.'}</p></form>{otpMode&&<div className="rb-auth-actions"><Link href={{pathname:'/auth',params:{next}}}>Change email</Link><button disabled={busy||seconds>0} onClick={()=>void resend()}>{seconds>0?`Resend in ${seconds}s`:'Resend code'}</button></div>}<div className="rb-auth-bottom">See how we handle <Link href={{pathname:'/policies',params:{section:'privacy'}}}>your data</Link> and read our <Link href="/policies">service information</Link>.<br/>Need help? <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Chat with RegisterBox ↗</a></div></div></main></div>;
}
