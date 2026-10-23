export type PaymentFollowUpStatus = 'open' | 'contacted' | 'resolved';

export type PaymentOperationsFilters = {
  page: number;
  pageSize: number;
  query: string;
  status: string;
  mode: string;
  dateFrom: string;
  dateTo: string;
};

export type PaymentOperationsRow = {
  id: string;
  orderId?: string | null;
  journeyId?: string | null;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  businessId: string | null;
  businessName: string | null;
  applicationId: string | null;
  applicationReference: string | null;
  packageId: string;
  packageTitle: string;
  amountPaise: number;
  currency: string;
  status: string;
  journeyStatus: string | null;
  createdAt: string;
  paidAt: string | null;
  lastActivityAt: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  mode: 'live' | 'test' | 'unknown' | string;
  refundedPaise?: number;
  disputeStatus?: string | null;
  settlementStatus?: string;
  reconciledAt?: string | null;
  attentionReasons: string[];
  followUpStatus: PaymentFollowUpStatus;
};

export type PaymentOperationsSummary = {
  receivedPaise: number;
  refundedPaise: number;
  paidCount: number;
  pendingCount: number;
  inactiveCount: number;
  failedCount: number;
  attentionCount: number;
  totalCount: number;
};

export type PaymentOperationsHealth = {
  webhookConfigured: boolean;
  lastWebhookAt: string | null;
  webhookFailures: number;
  unmatchedEvents: number;
  reconciliationRequired: number;
};

export type PaymentOperationsList = {
  rows: PaymentOperationsRow[];
  page: number;
  hasMore: boolean;
  total: number;
  generatedAt: string;
  summary: PaymentOperationsSummary;
  health: PaymentOperationsHealth;
};

export type PaymentOperationsTimelineItem = {
  id: string;
  type: string;
  title: string;
  detail?: string | null;
  source: 'browser' | 'provider' | 'server' | 'staff' | string;
  createdAt: string;
  actor?: string | null;
};

export type PaymentOperationsDetail = {
  order: PaymentOperationsRow;
  historyNotice?: string;
  alerts?: { id: string; severity: string; title: string; detail: unknown; created_at: string }[];
  timeline: PaymentOperationsTimelineItem[];
  attempts: {
    id: string;
    paymentId?: string | null;
    status: string;
    amountPaise?: number;
    currency?: string;
    method?: string | null;
    errorCode?: string | null;
    errorDescription?: string | null;
    createdAt: string;
  }[];
  notes: { id: string; body: string; createdAt: string; authorName?: string | null }[];
  refunds: { id: string; amountPaise: number; currency?: string; status: string; createdAt: string; paymentId?: string | null }[];
};

/** Prefix formula-like spreadsheet cells; double quotes are escaped independently. */
export function paymentCsvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function paymentCsv(rows: PaymentOperationsRow[]) {
  const fields: [string, (row: PaymentOperationsRow) => unknown][] = [
    ['Record ID', row => row.id], ['Customer', row => row.customerName], ['Email', row => row.customerEmail],
    ['Phone', row => row.customerPhone], ['Business', row => row.businessName],
    ['Application reference', row => row.applicationReference], ['Application ID', row => row.applicationId],
    ['Package', row => row.packageTitle], ['Amount (paise)', row => row.amountPaise], ['Currency', row => row.currency],
    ['Verified status', row => row.status], ['Browser activity', row => row.journeyStatus],
    ['Environment', row => row.mode], ['Razorpay order', row => row.razorpayOrderId],
    ['Razorpay payment', row => row.razorpayPaymentId], ['Refunded (paise)', row => row.refundedPaise ?? 0],
    ['Created', row => row.createdAt], ['Paid', row => row.paidAt], ['Last activity', row => row.lastActivityAt],
    ['Follow-up', row => row.followUpStatus], ['Attention', row => row.attentionReasons.join('; ')],
  ];
  return '\uFEFF' + [fields.map(([label]) => paymentCsvCell(label)).join(','), ...rows.map(row => fields.map(([, read]) => paymentCsvCell(read(row))).join(','))].join('\r\n');
}
