/** Publish the same public catalogue used by checkout. Run after changing package details. */
import { writeFile } from 'node:fs/promises';
import { servicePackages } from '../src/lib/service-catalog.ts';
const base = 'https://www.registerbox.in';
const serviceSlugs = {
  gst_registration: 'gst-registration', food: 'fssai-food-business', retail: 'shop-establishment-registration',
  income_tax: 'income-tax-filing', mca: 'mca-compliance', trademark: 'trademark-registration',
  dsc: 'digital-signature', gst: 'gst-returns', proprietorship: 'proprietorship', udyam: 'udyam-registration',
};
const feed = {
  name: 'RegisterBox public service packages', currency: 'INR', country: 'IN',
  price_note: 'Final RegisterBox prices. No GST is added. Government fees and statutory dues are separate where applicable, except that the eligible FSSAI Basic Registration package includes the first annual government registration fee of ₹100. State and Central licences require a separate quote.',
  service_fee_updated: '2026-10-24',
  services: servicePackages.map(item => ({
    id: item.id, title: item.title, description: item.description, brand: 'RegisterBox',
    category: item.serviceCategory, price: item.amountPaise / 100, currency: item.currency,
    billing_period: item.billingLabel, includes: item.includes, fee_note: item.feeNote,
    url: `${base}/services/${serviceSlugs[item.serviceCategory]}#package-${item.id}`,
    canonical_url: `${base}/services/${serviceSlugs[item.serviceCategory]}`,
    checkout_url: `${base}/checkout?package=${item.id}`,
    image: `${base}/images/registerbox-og.jpg`, country_of_service: 'IN',
  })),
  free_service: {
    id: 'free-nil-gst-filing', title: 'Free nil GST filing', price: 0, currency: 'INR',
    canonical_url: `${base}/services/free-nil-gst-filing`,
    eligibility: 'Eligible nil GSTR-1 and GSTR-3B only. Complete books, period checks, filing authorisation and actual acknowledgement are required. Statutory dues remain separate.',
  },
};
if (feed.services.some(item => item.url.includes('/undefined'))) throw new Error('Missing public service route');
await writeFile(new URL('../public/service-feed.json', import.meta.url), `${JSON.stringify(feed, null, 2)}\n`);
console.log(`Published ${feed.services.length} paid service packages and the free nil GST offer.`);
