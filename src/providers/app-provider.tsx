import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { demoCompliances, type ComplianceItem } from '@/data/demo';
import type { IntentResult } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';

type BusinessDraft = {
  id?: string;
  legalName: string;
  ownerName: string;
  pan: string;
  gstin: string;
  city: string;
  state: string;
  dineIn: boolean;
  alcohol: boolean;
  employees: number;
  turnover: number;
  entityType?: string;
  tradeName?: string;
  address?: string;
  pincode?: string;
  verificationId?: string;
  verificationType?: 'PAN' | 'GSTIN';
  verifiedAt?: string;
  registrationStatus?: string;
  taxpayerType?: string;
  natureOfBusinessActivities?: string[];
};

type AppContextValue = {
  session: Session | null;
  loadingSession: boolean;
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  email: string;
  setEmail: (value: string) => void;
  business: BusinessDraft;
  updateBusiness: (patch: Partial<BusinessDraft>) => void;
  businessProfiles: { id: string; name: string; gstin: string | null }[];
  selectBusiness: (id: string) => Promise<void>;
  compliances: ComplianceItem[];
  setCompliances: (items: ComplianceItem[]) => void;
  onboarding: IntentResult | null;
  setOnboarding: (value: IntentResult | null) => void;
  resumeSession: { sessionId: string; intentId: string } | null;
  refreshAccount: (nextSession?: Session | null, selectedId?: string) => Promise<{ businessId?: string; resumeSession?: { sessionId: string; intentId: string } }>;
};

const initialBusiness: BusinessDraft = {
  legalName: '', ownerName: '', pan: '', gstin: '', city: '', state: '',
  dineIn: false, alcohol: false, employees: 0, turnover: 0,
};

const demoBusiness: BusinessDraft = {
  legalName: 'ABC Foods', ownerName: 'Demo Owner', pan: 'DEMO-PAN', gstin: 'DEMO-GSTIN',
  city: 'Bengaluru', state: 'Karnataka', dineIn: true, alcohol: false, employees: 8, turnover: 4000000,
};

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState(initialBusiness);
  const [businessProfiles,setBusinessProfiles]=useState<{id:string;name:string;gstin:string|null}[]>([]);
  const [compliances, setCompliances] = useState<ComplianceItem[]>([]);
  const [onboarding, setOnboarding] = useState<IntentResult | null>(null);
  const [resumeSession, setResumeSession] = useState<{ sessionId: string; intentId: string } | null>(null);

  const refreshAccount = useCallback(async (nextSession?: Session | null, selectedId?: string) => {
    const activeSession = nextSession === undefined ? (await supabase.auth.getSession()).data.session : nextSession;
    setSession(activeSession);
    if (!activeSession) {
      setBusiness(initialBusiness); setBusinessProfiles([]); setResumeSession(null); setOnboarding(null); setCompliances([]); setLoadingSession(false);
      return {};
    }
    const user = activeSession.user;
    await supabase.from('profiles').upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });
    const preferredId=selectedId || await AsyncStorage.getItem(`registerbox:selected-business:${user.id}`);
    const [{ data: profile }, { data: savedBusinesses }, { data: savedSession }] = await Promise.all([
      supabase.from('profiles').select('full_name,email,onboarding_status').eq('id', user.id).maybeSingle(),
      supabase.from('business_profiles').select('id,legal_name,trade_name,entity_type,pan,gstin,business_category,business_subcategory,annual_turnover,employee_count,questionnaire').is('deleted_at', null).order('updated_at', { ascending: false }),
      supabase.from('onboarding_sessions').select('id,intent_id').eq('status', 'ACTIVE').order('last_activity_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const savedBusiness=savedBusinesses?.find(row=>row.id===preferredId) || savedBusinesses?.[0];
    setBusinessProfiles((savedBusinesses||[]).map(row=>({id:row.id,name:row.trade_name||row.legal_name||'Business profile',gstin:row.gstin})));
    if(savedBusiness)await AsyncStorage.setItem(`registerbox:selected-business:${user.id}`,savedBusiness.id);
    let address: { address_line_1: string; city: string; state: string; pincode: string } | null = null;
    if (savedBusiness) {
      const response = await supabase.from('business_addresses').select('address_line_1,city,state,pincode').eq('business_id', savedBusiness.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      address = response.data;
    }
    const questionnaire = savedBusiness?.questionnaire && typeof savedBusiness.questionnaire === 'object' && !Array.isArray(savedBusiness.questionnaire) ? savedBusiness.questionnaire : {};
    const nextBusiness = savedBusiness ? {
      id: savedBusiness.id,
      legalName: savedBusiness.legal_name ?? savedBusiness.trade_name ?? '',
      tradeName: savedBusiness.trade_name ?? undefined,
      ownerName: profile?.full_name ?? user.email?.split('@')[0] ?? '',
      pan: savedBusiness.pan ?? '', gstin: savedBusiness.gstin ?? '', entityType: savedBusiness.entity_type ?? undefined,
      city: address?.city ?? '', state: address?.state ?? '', address: address?.address_line_1, pincode: address?.pincode,
      dineIn: questionnaire.dine_in === true, alcohol: questionnaire.alcohol === true,
      employees: savedBusiness.employee_count ?? 0, turnover: Number(savedBusiness.annual_turnover ?? 0),
    } : { ...initialBusiness, ownerName: profile?.full_name ?? user.email?.split('@')[0] ?? '' };
    setBusiness(nextBusiness);
    const resumable = savedSession ? { sessionId: savedSession.id, intentId: savedSession.intent_id } : null;
    setResumeSession(resumable);
    setLoadingSession(false);
    return { businessId: savedBusiness?.id, resumeSession: resumable ?? undefined };
  }, []);

  const selectBusiness=useCallback(async(id:string)=>{await refreshAccount(undefined,id);setCompliances([]);setOnboarding(null);},[refreshAccount]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { void refreshAccount(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase holds the auth lock during this callback. Defer queries until it returns.
      setTimeout(() => { void refreshAccount(next); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshAccount]);

  const changeDemoMode = useCallback((value: boolean) => {
    setDemoMode(value);
    if (value) { setBusiness(demoBusiness); setCompliances(demoCompliances); }
  }, []);

  const value = useMemo(() => ({
    session, loadingSession, demoMode, setDemoMode: changeDemoMode, email, setEmail, business,
    updateBusiness: (patch: Partial<BusinessDraft>) => setBusiness((current) => ({ ...current, ...patch })),
    businessProfiles,selectBusiness,compliances, setCompliances, onboarding, setOnboarding, resumeSession, refreshAccount,
  }), [session, loadingSession, demoMode, changeDemoMode, email, business,businessProfiles,selectBusiness, compliances, onboarding, resumeSession, refreshAccount]);

  return <AppContext value={value}>{children}</AppContext>;
}
