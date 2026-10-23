import { useEffect, useMemo } from 'react';

import { supabase } from '@/lib/supabase';

// These describe browser activity only. The server/provider alone confirms money.
const eventNames = ['payment_page_viewed', 'checkout_cta_clicked', 'order_creation_requested',
  'checkout_opened', 'checkout_dismissed', 'payment_failed_client', 'verification_started',
  'verification_succeeded_client', 'verification_error_client', 'checkout_error_client'] as const;
export type PaymentJourneyEvent = typeof eventNames[number];
const safeCodes = ['SCRIPT_UNAVAILABLE', 'ORDER_UNAVAILABLE', 'OPEN_UNAVAILABLE',
  'PAYMENT_ATTEMPT_FAILED', 'VERIFICATION_UNAVAILABLE', 'CAPTURE_PENDING', 'VERIFIED_PAID'] as const;
type SafeCode = typeof safeCodes[number];

export type PaymentJourneyScope = {
  userId: string;
  packageId: string;
  businessId?: string;
  applicationId?: string;
};

type EventDetails = { checkoutId?: string; safeCode?: SafeCode };
type StoredJourney = { id: string; scope: string; touched: number; viewedAt?: number };
type JourneyPayload = {
  journey_id: string;
  event_id: string;
  event: PaymentJourneyEvent;
  package_id: string;
  business_id?: string;
  application_id?: string;
  checkout_id?: string;
  safe_code?: SafeCode;
};

const storageKey = 'rb:checkout:journeys:v1';
const maxContexts = 24;
const maxPending = 64;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contexts = new Map<string, StoredJourney>();
let contextsLoaded = false;
let pendingCount = 0;
let delivery = Promise.resolve();

function contextFor(scope: PaymentJourneyScope): StoredJourney | null {
  if (typeof window === 'undefined' || !window.crypto?.randomUUID || !uuidPattern.test(scope.userId)
    || !/^[a-z0-9-]{1,80}$/.test(scope.packageId)
    || (scope.businessId && !uuidPattern.test(scope.businessId))
    || (scope.applicationId && !uuidPattern.test(scope.applicationId))) return null;
  const key = JSON.stringify([scope.userId, scope.businessId || '', scope.applicationId || '', scope.packageId]);
  loadContexts();
  let stored = contexts.get(key);
  if (!stored) {
    stored = { id: window.crypto.randomUUID(), scope: key, touched: Date.now() };
    contexts.set(key, stored);
    if (contexts.size > maxContexts) contexts.delete(contexts.keys().next().value!);
  }
  stored.touched = Date.now();
  persistContexts();
  return stored;
}

function loadContexts() {
  if (contextsLoaded) return;
  contextsLoaded = true;
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(saved)) return;
    for (const value of saved.slice(-maxContexts)) {
      if (!value || typeof value.scope !== 'string' || typeof value.id !== 'string' || !uuidPattern.test(value.id)
        || typeof value.touched !== 'number' || Date.now() - value.touched >= 24 * 60 * 60 * 1000) continue;
      const scope: unknown = JSON.parse(value.scope);
      if (!Array.isArray(scope) || scope.length !== 4 || !scope.every(item => typeof item === 'string')
        || !uuidPattern.test(scope[0]) || (scope[1] && !uuidPattern.test(scope[1]))
        || (scope[2] && !uuidPattern.test(scope[2])) || !/^[a-z0-9-]{1,80}$/.test(scope[3])) continue;
      contexts.set(value.scope, { id: value.id, scope: value.scope, touched: value.touched,
        ...(typeof value.viewedAt === 'number' ? { viewedAt: value.viewedAt } : {}) });
    }
  } catch { /* A private browser can still keep a journey in memory. */ }
}

function persistContexts() {
  try { window.sessionStorage.setItem(storageKey, JSON.stringify([...contexts.values()].slice(-maxContexts))); }
  catch { /* Journey tracking must never prevent checkout. */ }
}

async function send(userId: string, body: JourneyPayload): Promise<void> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<void>(resolve => {
    timeout = setTimeout(() => { controller.abort(); resolve(); }, 3500);
  });
  try {
    await Promise.race([expired, (async () => {
      // Recheck the active account before delivery. Never attribute a queued
      // event to a newly signed-in user, even if they share this browser tab.
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (controller.signal.aborted || session?.user.id !== userId) return;
      await supabase.functions.invoke('payment-journey', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
    })()]);
  } catch { /* Activity is best effort; payment and recovery continue normally. */ }
  finally { if (timeout) clearTimeout(timeout); }
}

export type PaymentJourney = {
  id: () => string | undefined;
  record: (event: PaymentJourneyEvent, details?: EventDetails) => void;
};

/** Per-tab, account/business/application/package-scoped activity; no form values. */
export function createPaymentJourney(scope: PaymentJourneyScope): PaymentJourney {
  return {
    id: () => contextFor(scope)?.id,
    record(event, details = {}) {
      if (!eventNames.includes(event)) return;
      const context = contextFor(scope);
      if (!context || pendingCount >= maxPending) return;
      // Both the application handoff and checkout can mount the same journey.
      // Debounce the view, while retaining deliberate retries and modal actions.
      if (event === 'payment_page_viewed') {
        if (context.viewedAt && Date.now() - context.viewedAt < 60000) return;
        context.viewedAt = Date.now();
        persistContexts();
      }
      const body: JourneyPayload = {
        journey_id: context.id, event_id: window.crypto.randomUUID(), event,
        package_id: scope.packageId,
        ...(scope.businessId ? { business_id: scope.businessId } : {}),
        ...(scope.applicationId ? { application_id: scope.applicationId } : {}),
        ...(details.checkoutId && uuidPattern.test(details.checkoutId) ? { checkout_id: details.checkoutId } : {}),
        ...(details.safeCode && safeCodes.includes(details.safeCode) ? { safe_code: details.safeCode } : {}),
      };
      pendingCount++;
      delivery = delivery.catch(() => {}).then(() => send(scope.userId, body))
        .finally(() => { pendingCount--; });
    },
  };
}

export function usePaymentJourney(scope: PaymentJourneyScope | null, enabled = true): PaymentJourney | null {
  const userId = scope?.userId;
  const packageId = scope?.packageId;
  const businessId = scope?.businessId;
  const applicationId = scope?.applicationId;
  const journey = useMemo(() => userId && packageId
    ? createPaymentJourney({ userId, packageId, businessId, applicationId }) : null,
  [userId, packageId, businessId, applicationId]);
  useEffect(() => {
    if (enabled) journey?.record('payment_page_viewed');
  }, [journey, enabled]);
  return enabled ? journey : null;
}
