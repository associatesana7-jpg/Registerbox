import { supabase } from '@/lib/supabase';

export type TrademarkCheckoutDetails = {
  applicant_type: 'individual_msme' | 'other';
  pan_or_gstin: string;
  brand_name: string;
  trademark_class: number;
};

export type CheckoutOrder = {
  order_id: string;
  amount: number;
  currency: 'INR';
  key_id: string;
  checkout_token: string;
  receipt: string;
  is_test_mode: boolean;
  application_id?: string | null;
};

export type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type VerifiedPayment = {
  success: true;
  status: 'paid' | 'authorized';
  payment_id?: string;
  order_id?: string;
};

export type PendingCheckoutPayment = RazorpayPaymentResponse & {
  checkout_token: string;
  package_id: string;
  user_id: string;
  is_test_mode?: boolean;
  application_id?: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  prefill: { name?: string; email?: string; contact?: string };
  theme: { color: string };
  handler: (payment: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void; confirm_close: boolean };
  retry: { enabled: boolean };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', callback: (event: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let checkoutScript: Promise<void> | undefined;

/** Load the payment provider only after the customer chooses to pay. */
export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Open checkout in your browser to pay.'));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => finish(new Error('The payment window took too long to load. Please try again.')), 20000);
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve();
    }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => finish(window.Razorpay ? undefined : new Error('The payment window is unavailable. Please try again.'));
    script.onerror = () => finish(new Error('Could not load secure checkout. Check your connection and try again.'));
    document.head.appendChild(script);
  }).catch(error => { checkoutScript = undefined; throw error; });
  return checkoutScript;
}

async function checkoutRequest<T>(endpoint: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(endpoint, { body });
  if (error) {
    const response = error.context as Response | undefined;
    const detail = response && typeof response.clone === 'function'
      ? await response.clone().json().catch(() => null) as { error?: string; message?: string } | null : null;
    throw new Error(detail?.error || detail?.message || 'We could not reach the payment service. Please try again.');
  }
  if (!data) throw new Error('The payment service returned no response. Please try again.');
  return data;
}

export async function createCheckoutOrder(input: {
  package_id: string;
  idempotency_key: string;
  business_id?: string;
  application_id?: string;
  trademark?: TrademarkCheckoutDetails;
}): Promise<CheckoutOrder> {
  const order = await checkoutRequest<CheckoutOrder>('create-order', input);
  if (!order.order_id || !order.key_id || !order.checkout_token || !Number.isSafeInteger(order.amount) || order.amount < 100 || order.currency !== 'INR') {
    throw new Error('The order could not be prepared. Please contact RegisterBox before paying.');
  }
  return order;
}

export async function verifyCheckoutPayment(payment: PendingCheckoutPayment): Promise<VerifiedPayment> {
  const result = await checkoutRequest<VerifiedPayment>('verify-payment', {
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    razorpay_signature: payment.razorpay_signature,
    checkout_token: payment.checkout_token,
  });
  if (result.success !== true || !['paid', 'authorized'].includes(result.status)) throw new Error('Payment confirmation is still pending. Please check it again before paying.');
  return result;
}

/** A reload must offer verification of the existing payment before a new charge. */
export function readPendingCheckout(userId: string): PendingCheckoutPayment | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(`rb:checkout:pending:${userId}`);
    if (!value) return null;
    const payment = JSON.parse(value) as Partial<PendingCheckoutPayment>;
    if (payment.user_id !== userId || !payment.package_id || !payment.checkout_token || !payment.razorpay_payment_id || !payment.razorpay_order_id || !payment.razorpay_signature) return null;
    return payment as PendingCheckoutPayment;
  } catch { return null; }
}

export function rememberPendingCheckout(payment: PendingCheckoutPayment) {
  try { window.sessionStorage.setItem(`rb:checkout:pending:${payment.user_id}`, JSON.stringify(payment)); }
  catch { /* The current page still retains the verification callback in memory. */ }
}

export function clearPendingCheckout(userId: string) {
  try { window.sessionStorage.removeItem(`rb:checkout:pending:${userId}`); }
  catch { /* Storage can be unavailable in a private browser. */ }
}

export function openRazorpayCheckout(order: CheckoutOrder, input: {
  title: string;
  name: string;
  email: string;
  contact?: string;
  onSuccess: (payment: RazorpayPaymentResponse) => void;
  onDismiss: () => void;
  onFailure: (message: string) => void;
}) {
  if (!window.Razorpay) throw new Error('Secure checkout has not loaded. Please try again.');
  let submitted = false;
  const checkout = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: 'RegisterBox',
    description: input.title,
    image: `${window.location.origin}/images/registerbox-logo-v1.webp`,
    prefill: { name: input.name, email: input.email, contact: input.contact || undefined },
    theme: { color: '#2462ed' },
    retry: { enabled: true },
    modal: { confirm_close: true, ondismiss: () => { if (!submitted) input.onDismiss(); } },
    handler: payment => { if (!submitted) { submitted = true; input.onSuccess(payment); } },
  });
  checkout.on('payment.failed', event => input.onFailure(event.error?.description || 'That payment attempt failed. You can choose another payment method or close checkout and try again.'));
  checkout.open();
}
