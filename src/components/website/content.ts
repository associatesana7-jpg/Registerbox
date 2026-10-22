export const contact = {
  email: 'registerboxindia@gmail.com',
  whatsapp: 'https://wa.me/918147777843',
  phone: '+91 81477 77843',
  telephoneHref: 'tel:+918147777843',
  address: '3rd Floor, Site No. 71, 5th Cross Road, above Kookie Kids, New Thippasandra Main Road, HAL Aerospace Division, Bengaluru, Karnataka 560075',
  callback: 'https://docs.google.com/forms/d/e/1FAIpQLSfFF7938FGJPuLRipOPcH1VndwzDA17RIFMDOU4AMcpzzpSMA/viewform',
  googleReview: 'https://g.page/r/CeRt8CUDmIO6EBM/review',
  googleProfile: 'https://www.google.com/maps?cid=13439752852292529636',
};
export const branches = [
  { id: 'new-thippasandra', name: 'New Thippasandra', address: contact.address, streetAddress: '3rd Floor, Site No. 71, 5th Cross Road, above Kookie Kids, New Thippasandra Main Road, HAL Aerospace Division', postalCode: '560075', maps: 'https://www.google.com/maps/search/?api=1&query=12.9718924%2C77.6524058', latitude: 12.9718924, longitude: 77.6524058 },
  { id: 'marathahalli', name: 'Marathahalli', address: '149, RegisterBox, 1st Cross, Trinity School Rd, Marathahalli, Bengaluru, Karnataka 560037', streetAddress: '149, RegisterBox, 1st Cross, Trinity School Rd, Marathahalli', postalCode: '560037', maps: contact.googleProfile, latitude: 12.9547917, longitude: 77.6944716 },
];
export const services = [
  { category: 'company', title: 'Private limited company', group: 'Start a business', icon: 'company', detail: 'Build your company application with director, share capital and registered-office details.', tag: 'For your next big idea' },
  { category: 'llp', title: 'LLP registration', group: 'Start a business', icon: 'llp', detail: 'Prepare partner details, contributions, consent and your registered-office documents.', tag: 'Partner up, thoughtfully' },
  { category: 'gst_registration', title: 'GST registration', group: 'Registrations', icon: 'gst-registration', detail: 'Share your business name, address, business activity and contact details, then upload your documents.', tag: 'Simple questions. Easy document uploads.' },
  { category: 'udyam', title: 'Udyam (MSME) registration', group: 'Registrations', icon: 'new-business', detail: 'Prepare your enterprise details in a guided application and send them to RegisterBox for review before the official Udyam process.', tag: 'Business details, one step at a time' },
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
  if (category === 'gst') return '/gst';
  if (category === 'trademark') return '/contact?service=trademark';
  return services.some(service => service.category === category) ? `/onboarding/application?category=${encodeURIComponent(category)}` : '/services';
}
// Only allow known internal customer destinations after authentication.
export function safeNext(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.length > 1500 || !raw.startsWith('/') || raw.startsWith('//') || /[\\\s\u0000-\u001f]/.test(raw)) return '/dashboard';
  const next = raw.replace(/^\/\(tabs\)(?=\/|$)/, '') || '/dashboard';
  const url = new URL(next, 'https://registerbox.invalid');
  if(url.pathname==='/application-details')return [...url.searchParams].every(([key,value])=>key==='id'&&/^[0-9a-f-]{36}$/i.test(value))&&url.searchParams.has('id')?next:'/dashboard';
  if(url.pathname==='/documents'&&url.searchParams.has('application'))return [...url.searchParams].every(([key,value])=>key==='application'&&/^[0-9a-f-]{36}$/i.test(value))?next:'/dashboard';
  const allowed = ['/dashboard', '/gst', '/gst-returns', '/gst-purchases', '/compliance', '/documents', '/ai', '/account', '/document-locker', '/delete-account', '/privacy', '/services', '/onboarding/identify', '/onboarding/welcome', '/onboarding/intent', '/onboarding/business', '/onboarding/questions', '/onboarding/report', '/onboarding/review', '/onboarding/documents'];
  if (url.pathname === '/onboarding/application') {
    return url.searchParams.getAll('category').length === 1 && url.searchParams.getAll('resume').length <= 1 && services.some(service => service.category === url.searchParams.get('category')) && [...url.searchParams].every(([key,value]) => key === 'category'||key==='resume'&&value==='1') ? next : '/dashboard';
  }
  if (!allowed.includes(url.pathname)) return '/dashboard';
  const validators: Record<string, (value:string)=>boolean> = url.pathname === '/gst-returns' ? {
    form: value => ['gstr-1','gstr-3b'].includes(value),
    mode: value => ['nil','regular','payment'].includes(value),
    year: value => /^\d{4}$/.test(value), month: value => /^(0?[1-9]|1[0-2])$/.test(value),
  } : url.pathname === '/gst-purchases' ? {year: value => /^\d{4}$/.test(value),month: value => /^(0?[1-9]|1[0-2])$/.test(value)} : {};
  return [...url.searchParams].every(([key,value]) => validators[key]?.(value)) ? next : '/dashboard';
}
