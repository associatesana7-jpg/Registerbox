import { services } from './content';
const slugs: Record<string, string> = {
  company: 'private-limited-company-registration', llp: 'llp-registration', gst_registration: 'gst-registration', food: 'fssai-food-business', retail: 'shop-establishment-registration', gst: 'gst-returns', new: 'start-a-business', online: 'online-ecommerce-business', manufacturing: 'manufacturing-business', branch: 'business-branch', existing: 'business-compliance-check',
};
export const publicServices = services.map(service => ({ ...service, slug: slugs[service.category] }));
export function publicServicePath(category: string) { return `/services/${slugs[category]}`; }
