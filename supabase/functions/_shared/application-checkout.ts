type ApplicationService = { slug?: string | null };
type CheckoutApplication = { form_data?: unknown; services?: ApplicationService | null };

// Only registrations with a published, fixed package can be charged here.
const categoryPackages: Record<string, string[]> = {
  gst_registration: ['gst-registration'],
  food: ['fssai-licence'],
  retail: ['shop-establishment'],
  udyam: ['udyam-registration'],
};
const serviceCategories: Record<string, string> = {
  'gst-registration': 'gst_registration',
  fssai: 'food',
  'fssai-licence': 'food',
  'shops-establishment': 'retail',
  'shop-establishment': 'retail',
  udyam: 'udyam',
  'udyam-registration': 'udyam',
};

export function applicationCategory(application: CheckoutApplication): string | null {
  const slug = application.services?.slug;
  // The saved service is authoritative; draft form data must not override it.
  if (slug) return serviceCategories[slug] ?? null;
  if (application.form_data && typeof application.form_data === 'object' && !Array.isArray(application.form_data)) {
    const category = (application.form_data as Record<string, unknown>).category;
    if (typeof category === 'string') return category;
  }
  return null;
}

export function applicationCheckoutPackageIds(category: string | null | undefined): string[] {
  return category ? [...(categoryPackages[category] ?? [])] : [];
}
