export const applicationPaymentPath = (applicationId: string) => `/onboarding/payment?application=${encodeURIComponent(applicationId)}`;
export const applicationCheckoutPath = (applicationId: string, packageId: string) => `/checkout?package=${encodeURIComponent(packageId)}&application=${encodeURIComponent(applicationId)}`;
export const isApplicationId = (value?: string): value is string => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
