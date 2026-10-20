import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthCaptchaAction } from '@/lib/auth-captcha';

export type AuthCaptchaVerifier = (action: AuthCaptchaAction) => Promise<string>;
type GatewayResult = { sent?: boolean; deviceProof?: string; code?: string; error?: string };
const deviceKey = 'registerbox:auth-device-proof:v1';

function gatewayUrl() {
  const configured = process.env.EXPO_PUBLIC_AUTH_GATEWAY_URL || 'https://registerbox-auth-gateway.fekupsony.workers.dev';
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/'
    || !/^registerbox-auth-gateway\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)) {
    throw new Error('Secure sign-in is not configured correctly. Please contact support.');
  }
  return url.origin;
}

async function gatewayActive(base: string) {
  const response = await fetch(`${base}/status`, { signal: AbortSignal.timeout(10_000) });
  if (response.status === 403) {
    const denied = await response.json().catch(() => null) as { code?: unknown } | null;
    if (denied?.code === 'region_not_allowed') throw new Error('Sign-in is currently available from India only. If you are in India, turn off your VPN and try again, or contact RegisterBox support.');
  }
  if (!response.ok) throw new Error('Could not check secure sign-in availability. Please try again.');
  const data = await response.json() as { active?: unknown };
  if (typeof data.active !== 'boolean') throw new Error('Secure sign-in returned an invalid status. Please try again.');
  // Only an explicit server-controlled inactive state permits the pre-rollout
  // flow. A timeout, malformed response or gateway rejection must never fail open.
  return data.active;
}

async function saveProof(proof: unknown) {
  if (typeof proof === 'string' && proof.length <= 1024) await AsyncStorage.setItem(deviceKey, proof).catch(() => {});
}

export async function adaptiveAuthRequest(action: AuthCaptchaAction, email: string, verify?: AuthCaptchaVerifier): Promise<GatewayResult | null> {
  const base = gatewayUrl();
  if (!await gatewayActive(base)) return null;
  const proof = await AsyncStorage.getItem(deviceKey).catch(() => null);
  const send = async (captchaToken?: string) => {
    const response = await fetch(`${base}/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({ action, email, deviceProof: proof, captchaToken }),
    });
    const data = await response.json() as GatewayResult;
    return { response, data };
  };
  let result = await send();
  if (result.response.status === 403 && result.data.code === 'challenge_required') {
    if (!verify) throw new Error('Please reopen sign-in to complete the security check.');
    // Only the server's early risk decision opens the CAPTCHA. A fresh token is
    // redeemed once by the gateway, never by both gateway and Supabase.
    result = await send(await verify(action));
  }
  if (!result.response.ok) throw new Error(result.data.error || 'Sign-in could not complete. Please try again.');
  await saveProof(result.data.deviceProof);
  return result.data;
}

export async function rememberAuthenticatedDevice(accessToken: string) {
  // Device recognition is optional and must never prevent a successful sign-in.
  try {
    const base = gatewayUrl();
    if (!await gatewayActive(base)) return;
    const response = await fetch(`${base}/remember`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: '{}', signal: AbortSignal.timeout(5000),
    });
    if (response.ok) await saveProof((await response.json() as GatewayResult).deviceProof);
  } catch { /* A device hint is not authentication or authorization. */ }
}
