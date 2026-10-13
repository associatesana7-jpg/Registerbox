import { supabase } from '@/lib/supabase';

export type PrivacyRequest = {
  id: string; scope: 'account' | 'data'; details: string;
  status: 'pending' | 'processing' | 'completed' | 'retained';
  created_at: string; target_at: string; response: string | null;
};

const requests = () => supabase.from('privacy_deletion_requests');
export async function listPrivacyRequests(): Promise<PrivacyRequest[]> {
  const { data, error } = await requests().select('id,scope,details,status,created_at,target_at,response').order('created_at', { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function submitPrivacyRequest(scope: 'account' | 'data', details: string): Promise<PrivacyRequest> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Sign in to verify the account making this request.');
  const { data, error } = await requests().insert({ user_id: user.id, scope, details: details.trim() }).select('id,scope,details,status,created_at,target_at,response').single();
  if (error?.code === '23505') throw new Error('An open request of this type already exists. Check its status below.');
  if (error) throw new Error(error.message);
  return data;
}
