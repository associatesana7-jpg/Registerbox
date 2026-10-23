import { createJourneyHandler } from '../_shared/payment-operations-journey.ts';
Deno.serve(createJourneyHandler({ env: Deno.env.toObject() }));
