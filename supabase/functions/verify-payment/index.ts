import { createCheckoutHandler } from '../_shared/razorpay.ts';
Deno.serve(createCheckoutHandler('verify', { env: Deno.env.toObject() }));
