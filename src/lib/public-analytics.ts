// Exact public-page allowlist. Never collect application IDs, search terms,
// auth tokens, private route names, or arbitrary customer-provided paths.
export const analyticsPublicPaths = [
  '/', '/services', '/contact', '/blog', '/blog/editorial-policy', '/privacy', '/policies',
  '/services/private-limited-company-registration', '/services/llp-registration',
  '/services/gst-registration', '/services/udyam-registration', '/services/fssai-food-business',
  '/services/shop-establishment-registration', '/services/gst-returns', '/services/start-a-business',
  '/services/online-ecommerce-business', '/services/manufacturing-business', '/services/business-branch',
  '/services/business-compliance-check', '/services/trademark-registration',
  '/blog/udyam-registration-process-online', '/blog/llp-vs-private-limited-company-startup',
  '/blog/professional-tax-registration-for-employers-karnataka', '/blog/esi-epf-registration-for-startups',
  '/blog/fssai-licence-cost-government-fees', '/blog/gst-registration-documents-and-address-proof',
  '/blog/gstr-1-vs-gstr-3b', '/blog/no-sales-nil-gstr-3b', '/blog/fssai-home-kitchen-cloud-kitchen',
  '/blog/private-limited-company-registration-documents', '/blog/llp-registration-partner-agreement',
  '/blog/start-business-sole-proprietorship-checklist', '/blog/shop-establishment-registration-karnataka',
  '/blog/start-online-ecommerce-business-india', '/blog/manufacturing-business-approvals-checklist',
  '/blog/open-new-business-branch-gst', '/blog/business-compliance-check-checklist',
  '/blog/trademark-registration-name-logo-search',
  '/blog/gstr-3b-filing-process-online', '/blog/dir-3-kyc-filing-online-process',
  '/blog/esic-registration-online-for-employers', '/blog/shop-and-establishment-registration-process',
] as const;
const allowedPaths = new Set<string>(analyticsPublicPaths);
export function publicAnalyticsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['registerbox.in', 'www.registerbox.in'].includes(url.hostname)
      || url.port || url.username || url.password || !allowedPaths.has(url.pathname)) return null;
    return `https://www.registerbox.in${url.pathname}`;
  } catch { return null; }
}
