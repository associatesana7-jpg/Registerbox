import { services, servicePath } from './content';
import { servicePackages } from '@/lib/service-catalog';
const slugs: Record<string, string> = {
  company: 'private-limited-company-registration', llp: 'llp-registration', gst_registration: 'gst-registration', udyam: 'udyam-registration', food: 'fssai-food-business', retail: 'shop-establishment-registration', gst: 'gst-returns', new: 'start-a-business', online: 'online-ecommerce-business', manufacturing: 'manufacturing-business', branch: 'business-branch', existing: 'business-compliance-check',
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
  { category: 'trademark', title: 'Trademark application', group: 'Registrations', detail: 'Compare single-class trademark filing packages and prepare your brand and applicant details.', slug: 'trademark-registration', priceLabel: 'From ₹1,899' },
  { category: 'income_tax', title: 'Income tax filing', group: 'Manage & comply', detail: 'Prepare, review and file your income tax return for the agreed scope.', slug: 'income-tax-filing', priceLabel: 'RegisterBox fee ₹1,999' },
  { category: 'mca', title: 'MCA compliance · 1 year', group: 'Manage & comply', detail: 'Organise a year of company compliance, preparation and filing coordination.', slug: 'mca-compliance', priceLabel: 'RegisterBox fee ₹9,999' },
  { category: 'dsc', title: 'Digital signature certificate', group: 'Registrations', detail: 'Individual and organisation signing certificates with token and application support.', slug: 'digital-signature', priceLabel: 'Package fee ₹2,100' },
  { category: 'proprietorship', title: 'Proprietorship & GST packages', group: 'Start a business', detail: 'Compare GST registration with monthly filing, annual proprietorship support, and GST filing with ITR.', slug: 'proprietorship', priceLabel: 'Packages from ₹1,499' },
];
export function publicServicePath(category: string) {
  const service = publicServices.find(item => item.category === category);
  return service ? `/services/${service.slug}` : '/services';
}
export function servicePackagesForCategory(category: string) {
  if (category === 'proprietorship') {
    return ['gst-registration-monthly', 'proprietorship-gst', 'gst-annual-itr'].flatMap(id => servicePackages.filter(item => item.id === id));
  }
  return servicePackages.filter(item => item.serviceCategory === category);
}
export function publicServiceStartPath(category: string) {
  if (category === freeNilGstService.category || category === 'gst') return '/gst';
  if (['gst_registration', 'food', 'retail', 'udyam'].includes(category)) return servicePath(category);
  const packages = servicePackagesForCategory(category);
  if (packages.length > 1) return `${publicServicePath(category)}#packages`;
  return packages.length ? `/checkout?package=${packages[0].id}` : servicePath(category);
}
