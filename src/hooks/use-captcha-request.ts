import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthCaptchaAction } from '@/lib/auth-captcha';

type Request = { action: AuthCaptchaAction; id: string };
type Pending = { resolve: (token: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

// One challenge per attempt; never persist or reuse a token. Supabase redeems it.
export function useCaptchaRequest() {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<Pending | null>(null);
  const serial = useRef(0);
  const finish = useCallback((result: { token?: string; error?: string }) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    clearTimeout(current.timer);
    setRequest(null);
    if (result.token) current.resolve(result.token);
    else current.reject(new Error(result.error || 'Security check cancelled. Please try again when ready.'));
  }, []);
  const verify = useCallback((action: AuthCaptchaAction) => {
    if (pending.current) return Promise.reject(new Error('A security check is already in progress.'));
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => finish({ error: 'Security check timed out. Check your connection and try again.' }), 120_000);
      pending.current = { resolve, reject, timer };
      setRequest({ action, id: `${Date.now()}-${++serial.current}` });
    });
  }, [finish]);
  useEffect(() => () => {
    const current = pending.current;
    pending.current = null;
    if (current) { clearTimeout(current.timer); current.reject(new Error('Security check closed.')); }
  }, []);
  return { request, verify, finish };
}
