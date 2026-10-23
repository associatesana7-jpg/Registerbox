import { servicePackages } from '@/lib/service-catalog';

// Editorial relevance only; checkout owns every published price and scope.
const relatedPackages: Record<string, string[]> = {
  'gst-registration-small-ecommerce-sellers-november-2026': ['gst-registration', 'gst-registration-monthly'],
  'gst-registration-documents-and-address-proof': ['gst-registration', 'gst-registration-monthly'],
  'gstr-1-vs-gstr-3b': ['gst-registration-monthly', 'gst-annual-itr'],
  'no-sales-nil-gstr-3b': [],
  'fssai-home-kitchen-cloud-kitchen': ['fssai-licence'],
  'private-limited-company-registration-documents': ['digital-signature-individual', 'mca-compliance-annual'],
  'llp-registration-partner-agreement': ['digital-signature-individual'],
  'start-business-sole-proprietorship-checklist': ['proprietorship-gst', 'gst-registration-monthly', 'udyam-registration'],
  'shop-establishment-registration-karnataka': ['shop-establishment', 'gst-registration'],
  'start-online-ecommerce-business-india': ['gst-registration', 'trademark-instant'],
  'manufacturing-business-approvals-checklist': ['udyam-registration', 'gst-registration'],
  'open-new-business-branch-gst': ['gst-registration'],
  'business-compliance-check-checklist': ['mca-compliance-annual', 'income-tax-filing', 'gst-annual-itr', 'digital-signature-organisation'],
  'trademark-registration-name-logo-search': ['trademark-instant', 'trademark-non-msme', 'trademark-form48'],
};

export function blogServiceOffers(slug: string, category: string) {
  const freeNil = category === 'gst_nil' || /(^|-)nil(-|$)/.test(slug);
  const ids = freeNil ? [] : relatedPackages[slug] ?? servicePackages.filter(item => item.serviceCategory === category).map(item => item.id);
  return {
    packages: ids.flatMap(id => servicePackages.filter(item => item.id === id)),
    freeNil,
    quoteRequired: !freeNil && !servicePackages.some(item => item.serviceCategory === category),
  };
}

export function blogPackagePrice(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amountPaise / 100);
}
