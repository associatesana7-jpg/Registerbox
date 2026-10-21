import { Link, Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/registerbox-api';
import { useAuthCaptcha } from '@/hooks/use-auth-captcha';
import LandingPage from './landing.web';
import { contact, safeNext } from './content';

const codeLength = 6;

export default function WebAuth({ otpMode = false }: { otpMode?: boolean }) {
  const captcha = useAuthCaptcha();
  const { next: requested } = useLocalSearchParams<{next?:string}>();
  const next = safeNext(requested);
  const { email, setEmail, session, loadingSession, refreshAccount, setDemoMode } = useApp();
  const [code, setCode] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(20);
  useEffect(()=>{ if(!otpMode || seconds<=0)return; const timer=setTimeout(()=>setSeconds(value=>value-1),1000);return()=>clearTimeout(timer);},[otpMode,seconds]);
  if(session && !loadingSession)return <Redirect href={next as Href}/>;
  if(otpMode&&!email)return <Redirect href={{pathname:'/auth',params:{next}}}/>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    try {
      setDemoMode(false);
      if(otpMode){const auth=await verifyEmailOtp(email,code);await refreshAccount(auth.session);router.replace(next as Href);}
      else{await sendEmailOtp(email,captcha.verify);router.push({pathname:'/auth/otp',params:{next}});}
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not complete sign-in. Please try again.');}
    finally{setBusy(false);}
  }
  async function resend(){setBusy(true);setError('');try{await sendEmailOtp(email,captcha.verify);setSeconds(20);}catch(cause){setError(cause instanceof Error?cause.message:'Could not resend the code.');}finally{setBusy(false);}}
  const backHref: Href = otpMode ? {pathname:'/auth',params:{next}} : '/';
  return <div className="rb-auth-page">
    {captcha.challenge}
    <div className="rb-auth-site-preview" aria-hidden="true" inert><LandingPage/></div>
    <Head><title>{otpMode?'Verify your email':'Sign in'} | RegisterBox</title><meta name="robots" content="noindex"/></Head>
    <div className="rb-auth-overlay">
      <main className={`rb-auth-dialog ${otpMode?'is-otp':''}`} role="dialog" aria-modal="true" aria-labelledby="rb-auth-title" aria-describedby="rb-auth-description">
        <div className="rb-auth-dialog-top"><Link href={backHref} aria-label={otpMode?'Change email':'Back to website'}>←</Link>{otpMode?<strong>Email verification</strong>:<span/>}<span aria-hidden="true"/></div>
        {!otpMode&&<div className="rb-auth-mark" aria-hidden="true">R<span>★</span></div>}
        <div className="rb-auth-heading">
          <h1 id="rb-auth-title">{otpMode?'Check your email':'Your business. One login.'}</h1>
          <p id="rb-auth-description">{otpMode?<>We sent a 6-digit sign-in code to<br/><strong>{email}</strong></>:<>Sign in or create your account with a secure email code.<br/>No password to remember.</>}</p>
        </div>
        <form className="rb-form rb-auth-form" onSubmit={submit}>
          {otpMode?<label className={`rb-auth-code ${codeFocused?'is-focused':''}`} htmlFor="rb-otp"><span className="rb-visually-hidden">Your 6-digit sign-in code</span><span className="rb-code-cells" aria-hidden="true">{Array.from({length:codeLength},(_,index)=><span className={`${code[index]?'is-filled':''} ${codeFocused&&index===Math.min(code.length,codeLength-1)?'is-active':''}`} key={index}>{code[index]||''}</span>)}</span><input id="rb-otp" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,codeLength))} onFocus={()=>setCodeFocused(true)} onBlur={()=>setCodeFocused(false)} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={codeLength} required autoFocus aria-describedby={error?'rb-auth-error':undefined}/></label>:<label htmlFor="rb-email">Email address<input id="rb-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@business.com" autoComplete="email" required autoFocus aria-describedby={error?'rb-auth-error':undefined}/></label>}
          {error&&<div className="rb-form-error" role="alert" id="rb-auth-error">{error}</div>}
          <button type="submit" className="rb-button" disabled={busy||(otpMode&&code.length!==codeLength)}>{busy?'Please wait…':otpMode?'Verify & continue':'Continue with email'} <span>↗</span></button>
        </form>
        {otpMode?<div className="rb-auth-actions"><Link href={{pathname:'/auth',params:{next}}}>Change email</Link><button disabled={busy||seconds>0} onClick={()=>void resend()}>{seconds>0?`Resend code in ${seconds}s`:'Resend code'}</button></div>:<p className="rb-auth-trust">✓ Your existing RegisterBox account works here</p>}
        <div className="rb-auth-bottom"><p>{otpMode?'This code signs you in to RegisterBox. Government portal OTPs are handled separately.':'Your email is used only for account access and security.'}</p><Link href="/privacy">Privacy notice</Link><span aria-hidden="true">·</span><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Need help?</a></div>
      </main>
    </div>
  </div>;
}
