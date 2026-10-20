import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the same category, branching, validation and destination functions
// used by the shared application screen, without mocking their decisions.
function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    URL,
    require(name) {
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name in modules) return modules[name];
      throw new Error(`Unexpected dependency in application data: ${name}`);
    },
  });
  return exports;
}

const { applicationCategories, questionsFor, documentsFor, applicationFlowFor, validateQuestion, categoryFromLegacyPrompt } = load('src/data/application-categories.ts');
const { services, servicePath, safeNext } = load('src/components/website/content.ts');
const udyam = applicationCategories.udyam;
const { ApplicationProgress } = load('src/components/application-form-ui.tsx', {
  'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
  '@/constants/design': { palette: {} },
  '@/lib/application-form-presentation': load('src/lib/application-form-presentation.ts'),
});
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
  assert.equal(new Set(visible).size, visible.length, 'A user must see each question once');
}

// Existing certificates are useful supporting records, not new requirements.
// Only show the matching optional upload and skip the screen when none applies.
for (const existing_udyam of ['No', 'Not sure', 'Yes']) {
  for (const gst_status of ['Registered', 'Not registered — need applicability review', 'Not required — already reviewed']) {
    const answers = { existing_udyam, gst_status };
    const docs = documentsFor('udyam', answers);
    const expected = [
      ...(existing_udyam === 'Yes' ? ['EXISTING_REGISTRATION'] : []),
      ...(gst_status === 'Registered' ? ['GST_CERTIFICATE'] : []),
    ];
    assert.deepEqual(Array.from(docs, doc => doc.type), expected, 'Certificate uploads must match the applicant’s existing records');
    assert.ok(docs.every(doc => doc.optional === true), 'Supporting certificates must never block sending the application');
    assert.ok(docs.every(doc => !/aadhaar|aadhar|identity|pan.?card|passport|otp/i.test(`${doc.type} ${doc.label}`)), 'Do not request personal identity copies');
    const flow = applicationFlowFor('udyam', answers);
    assert.equal(flow.hasDocumentStep, docs.length > 0);
    assert.equal(flow.reviewStep, flow.questions.length + 1 + (docs.length > 0 ? 1 : 0), 'No empty document screen between the final question and review');
    const progress = ApplicationProgress({ step: flow.reviewStep, documentStep: flow.documentStep, reviewStep: flow.reviewStep, hasDocuments: flow.hasDocumentStep, optionalDocuments: true });
    const value = progress.props.children[1].props.accessibilityValue;
    assert.equal(value.now, docs.length > 0 ? 4 : 3, 'Review progress must follow the visible number of phases');
    assert.equal(value.max, value.now, 'Review is the final visible phase');
    assert.equal(value.text, 'Review');
  }
}
for (const category of ['company', 'llp', 'new', 'gst_registration']) {
  const flow = applicationFlowFor(category, {});
  assert.equal(flow.hasDocumentStep, true, `${category} retains its normal document screen`);
  assert.equal(flow.reviewStep, flow.questions.length + 2);
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
// identity-document collection field inside this assistance application.
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
assert.equal(udyam.documents.length, 2, 'Only existing Udyam and GST certificates are offered as supporting uploads');
assert.ok(udyam.documents.every(doc => doc.when && doc.optional === true), 'Every Udyam upload must be conditional and optional');

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

console.log('Udyam intake verified: existing-number branches, optional matching certificates, no empty document step, zero-value amounts/counts, no identity-copy or OTP collection, official source and category-safe destinations.');
