// Public widget identifier only. The secret belongs in Supabase Auth, never here.
export const AUTH_CAPTCHA_SITEKEY = '0x4AAAAAAFZI0vvJIr2vSz2b';
// The apex domain redirects here; use the final origin for the native bridge.
export const AUTH_CAPTCHA_ORIGIN = 'https://www.registerbox.in';
export type AuthCaptchaAction = 'customer_email' | 'admin_email';

export function requireAuthCaptchaToken(token: string) {
  if (typeof token !== 'string' || !token.length || token.length > 2048 || /\s/.test(token)) {
    throw new Error('Please complete the security check and try again.');
  }
  return token;
}

export function captchaPageUrl(origin: string, action: AuthCaptchaAction, requestId: string) {
  return `${origin}/auth-challenge.html?action=${action}&request=${encodeURIComponent(requestId)}`;
}

export function readCaptchaMessage(value: unknown, requestId: string): { token?: string; error?: string } | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.type !== 'registerbox-captcha' || message.request !== requestId) return null;
  if (message.status === 'verified') {
    try { return { token: requireAuthCaptchaToken(message.token as string) }; } catch { return null; }
  }
  if (message.status === 'error') return { error: 'The security check could not finish. Please try again.' };
  return null;
}
