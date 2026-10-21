import { services, servicePath } from './content';
const slugs: Record<string, string> = {
  company: 'private-limited-company-registration', llp: 'llp-registration', gst_registration: 'gst-registration', food: 'fssai-food-business', retail: 'shop-establishment-registration', gst: 'gst-returns', new: 'start-a-business', online: 'online-ecommerce-business', manufacturing: 'manufacturing-business', branch: 'business-branch', existing: 'business-compliance-check',
};
// Marketing destination only; filing keeps the existing GST workspace checks.
export const freeNilGstService = {
  category: 'gst_nil', title: 'Free nil GST filing', group: 'Manage & comply',
  detail: 'Check eligibility for nil GSTR-1 and GSTR-3B with a ₹0 RegisterBox service fee.',
  slug: 'free-nil-gst-filing', icon: 'gst-return', tag: 'For eligible nil returns', priceLabel: 'RegisterBox fee ₹0',
};
export const publicServices = [
  ...services.map(service => ({ ...service, slug: slugs[service.category] })),
  freeNilGstService,
  { category: 'trademark', title: 'Trademark application', group: 'Registrations', detail: 'Discuss your brand, goods or services and application documents with RegisterBox.', slug: 'trademark-registration', priceLabel: 'Ask for quotation' },
];
export function publicServicePath(category: string) {
  const service = publicServices.find(item => item.category === category);
  return service ? `/services/${service.slug}` : '/services';
}
export function publicServiceStartPath(category: string) {
  return category === freeNilGstService.category ? '/gst' : servicePath(category);
}
