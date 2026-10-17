import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApp } from '@/hooks/use-app';
import { supabase } from '@/lib/supabase';
import { readWorkspaceDrafts } from '@/lib/workspace-journey';
import { applicationCategories } from '@/data/application-categories';

export function useBusinessRecords() {
  const { business } = useApp();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadRecords>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scope,setScope]=useState<string|undefined>(undefined);
  const requestRevision=useRef(0);
  const refresh = useCallback(async () => {
    const revision=++requestRevision.current;
    setLoading(true); setError('');
    try { const next=business.id ? await loadRecords(business.id) : null;if(revision===requestRevision.current){setData(next);setScope(business.id);} }
    catch (cause) { if(revision===requestRevision.current){setData(null);setScope(business.id);setError(cause instanceof Error ? cause.message : 'Could not load your records. Please retry.');} }
    finally { if(revision===requestRevision.current)setLoading(false); }
  }, [business.id]);
  useFocusEffect(useCallback(() => { void refresh();return()=>{requestRevision.current++;}; }, [refresh]));
  return { data:scope===business.id?data:null, loading:scope!==business.id||loading, error:scope===business.id?error:'', refresh };
}

async function loadRecords(businessId: string) {
  const [applications, documents, licenses, actions,profile] = await Promise.all([
    supabase.from('applications').select('id,status,application_number,certificate_document_id,submitted_at,created_at,services(name,slug)').eq('business_id', businessId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('documents').select('id,type,source,original_filename,storage_path,verification_status,verified,uploaded_at').eq('business_id', businessId).is('deleted_at', null).order('uploaded_at', { ascending: false }),
    supabase.from('licenses').select('id,status,expiry_date,verification_status').eq('business_id', businessId),
    supabase.from('customer_actions').select('id,title,description,status').eq('business_id', businessId).eq('status', 'open'),
    supabase.from('business_profiles').select('questionnaire').eq('id',businessId).single(),
  ]);
  for (const result of [applications, documents, licenses, actions,profile]) if (result.error) throw new Error(result.error.message);
  const drafts=readWorkspaceDrafts(profile.data?.questionnaire,Object.keys(applicationCategories));
  return { applications: applications.data ?? [], documents: documents.data ?? [], licenses: licenses.data ?? [], actions: actions.data ?? [],drafts };
}
