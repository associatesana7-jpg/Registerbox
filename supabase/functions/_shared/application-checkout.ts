type ApplicationService = { slug?: string | null };
type CheckoutApplication = { id?: string; form_data?: unknown; services?: ApplicationService | null; questionnaire?: unknown };

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

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

// This is a conservative package-scope check on the saved intake, not a legal
// eligibility determination. Specialist, incomplete and legacy cases need review.
function isNewBasicFoodIntake(application?: CheckoutApplication): boolean {
  if (!application?.id) return false;
  const drafts = object(object(application.questionnaire)?.application_drafts);
  const draft = object(drafts?.food);
  if (draft?.application_id !== application.id || draft.status !== 'submitted_to_registerbox') return false;
  const answers = object(draft.answers);
  if (!answers || answers.food_route !== 'Registration' || answers.existing_fssai !== 'No' || answers.multi_state !== 'No') return false;
  // Manufacturing can involve proprietary/specialist products; catering has a
  // different route. The intake cannot establish their fixed Basic scope.
  if (!['Restaurant', 'Cloud kitchen', 'Retail'].includes(String(answers.food_activity))) return false;
  if (typeof answers.food_products !== 'string' || !answers.food_products.trim()) return false;
  if (typeof answers.turnover !== 'string' || !/^\d+(\.\d{1,2})?$/.test(answers.turnover)) return false;
  const turnover = Number(answers.turnover);
  return Number.isFinite(turnover) && turnover >= 0 && turnover <= 15000000;
}

export function applicationCheckoutPackageIds(category: string | null | undefined, application?: CheckoutApplication): string[] {
  if (category === 'food' && !isNewBasicFoodIntake(application)) return [];
  return category ? [...(categoryPackages[category] ?? [])] : [];
}
