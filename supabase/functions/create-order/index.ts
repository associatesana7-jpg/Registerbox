import { createCheckoutHandler } from '../_shared/razorpay.ts';
Deno.serve(createCheckoutHandler('create', { env: Deno.env.toObject() }));
