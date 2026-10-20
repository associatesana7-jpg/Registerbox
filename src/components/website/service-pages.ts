import { services } from './content';
const slugs: Record<string, string> = {
  company: 'private-limited-company-registration', llp: 'llp-registration', gst_registration: 'gst-registration', udyam: 'udyam-registration', food: 'fssai-food-business', retail: 'shop-establishment-registration', gst: 'gst-returns', new: 'start-a-business', online: 'online-ecommerce-business', manufacturing: 'manufacturing-business', branch: 'business-branch', existing: 'business-compliance-check',
};
export const publicServices = [...services.map(service => ({ ...service, slug: slugs[service.category] })), { category: 'trademark', title: 'Trademark application', group: 'Registrations', icon: 'business-check', detail: 'Prepare your brand name, applicant details and goods or services for a trademark enquiry.', tag: 'Plan your brand protection', slug: 'trademark-registration' }];
export function publicServicePath(category: string) { return publicServices.find(service=>service.category===category) ? `/services/${publicServices.find(service=>service.category===category)!.slug}` : '/services'; }
