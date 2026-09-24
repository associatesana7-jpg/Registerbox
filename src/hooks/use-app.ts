import { use } from 'react';

import { AppContext } from '@/providers/app-provider';

export function useApp() {
  const value = use(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
