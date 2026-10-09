import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';

export function useBusinessRecords() {
  const { business } = useApp();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadRecords>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(business.id ? await loadRecords(business.id) : null); }
    catch (cause) { setData(null); setError(cause instanceof Error ? cause.message : 'Could not load your records. Please retry.'); }
    finally { setLoading(false); }
  }, [business.id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { data, loading, error, refresh };
}

async function loadRecords(businessId: string) {
  const [applications, documents, licenses, actions] = await Promise.all([
    supabase.from('applications').select('id,status,submitted_at,created_at,services(name)').eq('business_id', businessId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('documents').select('id,type,original_filename,storage_path,verification_status,verified,uploaded_at').eq('business_id', businessId).is('deleted_at', null).order('uploaded_at', { ascending: false }),
    supabase.from('licenses').select('id,status,expiry_date,verification_status').eq('business_id', businessId),
    supabase.from('customer_actions').select('id,title,description,status').eq('business_id', businessId).eq('status', 'open'),
  ]);
  for (const result of [applications, documents, licenses, actions]) if (result.error) throw new Error(result.error.message);
  return { applications: applications.data ?? [], documents: documents.data ?? [], licenses: licenses.data ?? [], actions: actions.data ?? [] };
}
