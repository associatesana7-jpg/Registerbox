import { createPaymentWebhookHandler } from '../_shared/payment-operations-webhook.ts';
Deno.serve(createPaymentWebhookHandler({ env: Deno.env.toObject() }));
