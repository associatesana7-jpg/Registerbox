import { supabase } from '@/lib/supabase';

// Standard Supabase authentication: no fixed OTP, hardcoded credential or bypass.
export async function signInWithAccountPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !password) {
    throw new Error('Enter your account email and password.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error || !data.session) throw new Error('Could not sign in. Check the supplied account details and try again.');
  return data.session;
}
