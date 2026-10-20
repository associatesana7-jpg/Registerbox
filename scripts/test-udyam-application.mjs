import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the same category, branching, validation and destination functions
// used by the shared application screen, without mocking their decisions.
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    URL,
    require(name) { throw new Error(`Unexpected dependency in application data: ${name}`); },
  });
  return exports;
}

const { applicationCategories, questionsFor, documentsFor, validateQuestion, categoryFromLegacyPrompt } = load('src/data/application-categories.ts');
const { services, servicePath, safeNext } = load('src/components/website/content.ts');
const udyam = applicationCategories.udyam;
assert.ok(udyam, 'Udyam must have an application configuration');
assert.equal(new URL(udyam.source).origin, 'https://udyamregistration.gov.in');
assert.equal(new URL(udyam.source).pathname, '/');

const initial = questionsFor('udyam', {});
const question = key => {
  const value = udyam.questions.find(item => item.key === key);
  assert.ok(value, `Missing Udyam question: ${key}`);
  return value;
};
const visibleKeys = answers => Array.from(questionsFor('udyam', answers), item => item.key);
assert.equal(initial.some(item => item.key === 'udyam_number'), false, 'Do not ask for a number before the existing-registration decision');

for (const decision of ['No', 'Not sure', 'Yes']) {
  const answers = { existing_udyam: decision };
  const visible = visibleKeys(answers);
  assert.equal(visible.includes('udyam_number'), decision === 'Yes', `Existing Udyam number must follow the ${decision} branch`);
  assert.equal(documentsFor('udyam', answers).length, 0, 'No branch may request identity or business-document uploads');
  assert.equal(new Set(visible).size, visible.length, 'A user must see each question once');
}

const existingNumber = question('udyam_number');
assert.ok(validateQuestion(existingNumber, { existing_udyam: 'Yes', udyam_number: '' }), 'A known existing registration must have its reference');
assert.equal(validateQuestion(existingNumber, { udyam_number: 'UDYAM-KR-03-0123456' }), '');
for (const value of ['123456789012', 'UDYAM-KR-03-123', 'UDYAM-KR-03-12345678', 'UDYAM-KR-AA-0123456', 'https://example.com']) {
  assert.ok(validateQuestion(existingNumber, { udyam_number: value }), `Reject a malformed existing reference: ${value}`);
}

// A pre-trading enterprise can truthfully report zero. Counts stay integral,
// while investment and turnover can include paise without accepting bad input.
for (const key of ['investment', 'turnover', 'employees']) {
  const q = question(key);
  assert.equal(validateQuestion(q, { [key]: '0' }), '', `${key}=0 must not be treated as missing`);
  assert.equal(validateQuestion(q, { [key]: ' 0 ' }), '', `${key} accepts trimmed zero`);
  for (const value of ['', ' ', '-1', 'NaN', 'Infinity', '1e5', '₹100', '1,000', '1.234']) {
    assert.ok(validateQuestion(q, { [key]: value }), `Reject invalid ${key}: ${JSON.stringify(value)}`);
  }
}
for (const key of ['investment', 'turnover']) {
  assert.equal(validateQuestion(question(key), { [key]: '0.25' }), '', `${key} allows valid decimal amounts`);
}
assert.ok(validateQuestion(question('employees'), { employees: '0.25' }), 'A fraction of a person is not an employee count');
assert.equal(validateQuestion(question('employees'), { employees: '5' }), '');
assert.equal(validateQuestion(question('commencement'), { commencement: '2024-02-29' }), '');
assert.ok(validateQuestion(question('commencement'), { commencement: '2026-02-29' }), 'Reject impossible dates even when their format looks valid');

// Readiness is a choice. It must never become a number, password, OTP or
// identity-document collection field inside this preparation request.
const readiness = new Set(['pan_ready', 'aadhaar_ready']);
const sensitive = /aadhaar|aadhar|\bpan\b|bank|account.?number|ifsc|\botp\b|identity.?number|tax.?id/i;
for (const q of udyam.questions) {
  if (readiness.has(q.key)) {
    assert.ok(q.options?.length > 1, `${q.key} must use predefined readiness choices`);
    assert.equal(q.numeric, undefined);
    assert.equal(q.pattern, undefined, `${q.key} must not accept an identity-number format`);
  } else {
    assert.equal(sensitive.test(`${q.key.replaceAll('_', ' ')} ${q.label}`), false, `Sensitive input unexpectedly added: ${q.key}`);
  }
}
assert.equal(udyam.documents.length, 0, 'Udyam preparation must stay upload-free');

// Complete every visible branch with plausible non-sensitive business data.
// This checks that the actual validators permit a useful zero-turnover intake.
const baseAnswers = {
  address: '12 Example Road, Bengaluru, Karnataka 560001',
  activity_sector: 'IT / software',
  activity: 'Website development services; not yet trading',
  structure: 'Sole proprietor',
  commencement: '2026-10-01',
  investment: '0',
  turnover: '0',
  employees: '0',
  pan_ready: 'Yes',
  gst_status: 'Not registered — need applicability review',
  aadhaar_ready: 'Yes',
  contact_name: 'Fixture Founder',
  contact_email: 'founder@example.com',
  contact_mobile: '9876543210',
};
for (const decision of ['No', 'Not sure', 'Yes']) {
  const answers = { ...baseAnswers, existing_udyam: decision, ...(decision === 'Yes' ? { udyam_number: 'UDYAM-KR-03-0123456' } : {}) };
  for (const q of questionsFor('udyam', answers)) {
    assert.equal(validateQuestion(q, answers), '', `A complete ${decision} branch must pass: ${q.key}`);
  }
}

for (const prompt of ['Udyam registration', 'udhyam registration support', 'MSME registration', 'Register my enterprise for UDYAM', 'MSME for a manufacturing company']) {
  const category = categoryFromLegacyPrompt(prompt);
  assert.equal(category, 'udyam', `Legacy prompt must reach the Udyam intake: ${prompt}`);
  assert.equal(servicePath(category), '/onboarding/application?category=udyam');
  assert.equal(safeNext(servicePath(category)), '/onboarding/application?category=udyam', 'Authentication must retain the selected application');
}

const expectedCategories = ['branch', 'company', 'existing', 'food', 'gst', 'gst_registration', 'llp', 'manufacturing', 'new', 'online', 'retail', 'udyam'];
assert.deepEqual(Object.keys(applicationCategories).sort(), expectedCategories, 'Adding Udyam must not rename or silently introduce another application category');
assert.deepEqual(Array.from(services, item => item.category).sort(), expectedCategories, 'The public service catalog must match the supported intake categories');
for (const category of expectedCategories) {
  const expectedPath = category === 'gst' ? '/gst' : `/onboarding/application?category=${category}`;
  assert.equal(servicePath(category), expectedPath, `${category} must preserve its own application destination`);
  assert.equal(safeNext(expectedPath), expectedPath, `${category} destination must survive authentication`);
}
assert.equal(safeNext('/onboarding/application?category=udyam&resume=1'), '/onboarding/application?category=udyam&resume=1');
for (const category of ['udhyam', 'MSME', 'unknown']) {
  assert.equal(servicePath(category), '/services', 'Only canonical categories may generate an application destination');
}
for (const path of [
  'https://example.com/onboarding/application?category=udyam',
  '//example.com/onboarding/application?category=udyam',
  '/onboarding/application?category=unknown',
  '/onboarding/application?category=udyam&next=https://example.com',
  '/onboarding/application?category=udyam&resume=2',
  '/onboarding/application?category=udyam&resume=1&resume=1',
  '/onboarding/application?resume=1',
  '/onboarding/application?category=udyam&category=company',
  '/onboarding/application?category=company&category=udyam',
]) {
  assert.equal(safeNext(path), '/dashboard', `Reject an unsafe or ambiguous authentication destination: ${path}`);
}

console.log('Udyam intake verified: existing-number branches, zero-value amounts/counts, identity-free preparation, official source, legacy prompts and category-safe authentication destinations.');
