// Filing EVC is not the numeric-only login OTP. Preserve its case and letters.
// GST remains responsible for checking the actual code and its issued format.
export function validFilingOtp(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,32}$/.test(value);
}
