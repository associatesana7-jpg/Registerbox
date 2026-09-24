import type { Session } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { demoCompliances, type ComplianceItem } from '@/data/demo';
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
  compliances: ComplianceItem[];
  setCompliances: (items: ComplianceItem[]) => void;
};

const initialBusiness: BusinessDraft = {
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
  const [compliances, setCompliances] = useState<ComplianceItem[]>(demoCompliances);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    session, loadingSession, demoMode, setDemoMode, email, setEmail, business,
    updateBusiness: (patch: Partial<BusinessDraft>) => setBusiness((current) => ({ ...current, ...patch })),
    compliances, setCompliances,
  }), [session, loadingSession, demoMode, email, business, compliances]);

  return <AppContext value={value}>{children}</AppContext>;
}
