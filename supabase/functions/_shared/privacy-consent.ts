import { PRIVACY_NOTICE_VERSION, type PrivacyPurpose } from './privacy-domain.ts';

// A service-role client is permitted only after the handler verified the user.
// Missing state/errors fail closed; request-body consent alone cannot override withdrawal.
export async function hasPrivacyConsent(client: any, userId: string, purpose: PrivacyPurpose): Promise<boolean> {
  const { data, error } = await client.from('privacy_purpose_preferences')
    .select('allowed,notice_version').eq('user_id', userId).eq('purpose', purpose).maybeSingle();
  return !error && data?.allowed === true && data.notice_version === PRIVACY_NOTICE_VERSION;
}
