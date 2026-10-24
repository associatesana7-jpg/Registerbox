import { supabase } from './supabase';
export { applicationCategory, applicationCheckoutPackageIds } from '../../supabase/functions/_shared/application-checkout.ts';
export { applicationPaymentPath, applicationCheckoutPath, isApplicationId } from './application-checkout-paths';

export async function loadApplicationCheckout(applicationId: string, userId: string) {
  const { data: application, error } = await supabase.from('applications')
    .select('id,business_id,status,application_number,services(name,slug)')
    .eq('id', applicationId).is('deleted_at', null).single();
  if (error || !application) throw new Error('This application is unavailable under your account. Open it from My applications.');
  const { data: profile, error: profileError } = await supabase.from('business_profiles')
    .select('id,legal_name,user_id,questionnaire').eq('id', application.business_id).eq('user_id', userId).is('deleted_at', null).single();
  if (profileError || !profile) throw new Error('This application is unavailable under your account.');
  const { data: orders, error: orderError } = await supabase.from('service_checkout_orders')
    .select('id,package_id,package_title,amount,status,razorpay_payment_id,paid_at')
    .eq('application_id', applicationId).eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  if (orderError) throw new Error('We could not check this application’s payment status. Try again before paying.');
  return { ...application, questionnaire: profile.questionnaire, businessName: profile.legal_name, orders: orders || [] };
}

export type ApplicationCheckout = Awaited<ReturnType<typeof loadApplicationCheckout>>;
