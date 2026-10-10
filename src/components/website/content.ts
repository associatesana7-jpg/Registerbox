export const contact = {
  email: 'registerbox@yahoo.com',
  whatsapp: 'https://wa.me/918147777843',
  phone: '+91 81477 77843',
  address: 'Registerbox, BBMP Ward, Hal Aerospace Division, 5th Cross Road, New Thippasandra Main Rd, New Thippasandra, Bengaluru, Karnataka 560075',
};
export const services = [
  { category: 'company', title: 'Private limited company', group: 'Start a business', icon: 'company', detail: 'Build your company application with director, share capital and registered-office details.', tag: 'For your next big idea' },
  { category: 'llp', title: 'LLP registration', group: 'Start a business', icon: 'llp', detail: 'Prepare partner details, contributions, consent and your registered-office documents.', tag: 'Partner up, thoughtfully' },
  { category: 'gst_registration', title: 'GST registration', group: 'Registrations', icon: 'gst-registration', detail: 'Prepare your REG-01 intake with business, promoter, premises and signatory information.', tag: 'Get your tax foundation right' },
  { category: 'food', title: 'Food business & FSSAI', group: 'Registrations', icon: 'food', detail: 'Find your food-business route and gather the relevant FoSCoS application evidence.', tag: 'Made for food entrepreneurs' },
  { category: 'retail', title: 'Shop & establishment', group: 'Registrations', icon: 'retail', detail: 'Collect establishment information and documents for your state-specific requirements.', tag: 'Open your doors with clarity' },
  { category: 'gst', title: 'GST returns workspace', group: 'Manage & comply', icon: 'gst-return', detail: 'Connect your GST account, prepare drafts, review records and track filing acknowledgements.', tag: 'GSTR-1 · GSTR-3B · Nil' },
  { category: 'new', title: 'Start a new business', group: 'Start a business', icon: 'new-business', detail: 'Choose a structure, explain your activity and save the details for your business journey.', tag: 'Start with a clear plan' },
  { category: 'online', title: 'Online & e-commerce', group: 'Start a business', icon: 'online', detail: 'Plan your website or marketplace business and capture interstate-sales requirements.', tag: 'Your business, beyond borders' },
  { category: 'manufacturing', title: 'Manufacturing business', group: 'Registrations', icon: 'manufacturing', detail: 'Capture your products, workforce, premises and process documents for review.', tag: 'Turn ideas into production' },
  { category: 'branch', title: 'Open a new branch', group: 'Start a business', icon: 'branch', detail: 'Create a branch application with your existing registration and new premises evidence.', tag: 'Make room for growth' },
  { category: 'existing', title: 'Business compliance check', group: 'Manage & comply', icon: 'business-check', detail: 'Capture your current business activity and registrations to review relevant requirements.', tag: 'Know your next step' },
];
export function servicePath(category: string) {
  return category === 'gst' ? '/gst' : `/onboarding/application?category=${encodeURIComponent(category)}`;
}
// Only allow known internal customer destinations after authentication.
export function safeNext(value?: string | string[]) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next) return '/dashboard';
  const match = /^\/onboarding\/application\?category=([a-z_]+)$/.exec(next);
  if (match && services.some(service => service.category === match[1])) return next;
  return ['/dashboard', '/gst', '/gst-returns', '/gst-purchases', '/compliance', '/documents', '/ai', '/account', '/tally', '/document-locker', '/onboarding/identify'].includes(next) ? next : '/dashboard';
}
