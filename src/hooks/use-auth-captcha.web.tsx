import { useEffect, useRef } from 'react';
import { captchaPageUrl, readCaptchaMessage } from '@/lib/auth-captcha';
import { useCaptchaRequest } from './use-captcha-request';

export function useAuthCaptcha() {
  const { request, verify, finish } = useCaptchaRequest();
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!request) return;
    dialog.current?.showModal();
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const result = readCaptchaMessage(event.data, request.id);
      if (result) finish(result);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [request, finish]);
  const challenge = request ? <dialog ref={dialog} aria-labelledby="rb-security-title" onCancel={event => { event.preventDefault(); finish({}); }} style={{ width: 'min(400px, calc(100vw - 32px))', boxSizing: 'border-box', border: '1px solid #DDE5EE', borderRadius: 20, padding: 24, color: '#132747', background: '#FFF', boxShadow: '0 24px 80px #14274440' }}>
    <h2 id="rb-security-title" style={{ fontSize: 20, margin: '0 0 8px' }}>A quick security check</h2>
    <p style={{ fontSize: 14, lineHeight: 1.5, color: '#52637A' }}>This helps keep RegisterBox safe from automated sign-ins.</p>
    <iframe ref={frame} key={request.id} title="RegisterBox security verification" src={captchaPageUrl(window.location.origin, request.action, request.id)} style={{ width: '100%', height: 180, border: 0 }} />
    <button type="button" onClick={() => finish({})} style={{ minHeight: 44, width: '100%', border: '1px solid #DDE5EE', borderRadius: 10, background: '#FFF', color: '#132747', cursor: 'pointer' }}>Cancel</button>
  </dialog> : null;
  return { verify, challenge };
}
