import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/business-licence-checker.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { evaluateBusinessLicences: evaluate, STATES, SOURCES, RULE_CONFIGURATION, RULE_VERSION, REVIEWED_ON } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

const base = {
  state: 'KA', city: 'Bengaluru', activity: 'services', entity: 'sole',
  premises: 'home', turnover: '1000000', employees: '0', channels: ['local'], special: [],
};
const result = (id, overrides = {}) => evaluate({ ...base, ...overrides }).find(item => item.id === id);
const l = value => {
  for (const locale of ['en', 'hi', 'kn']) assert.ok(typeof value[locale] === 'string' && value[locale].trim(), `Missing ${locale} localization`);
};

test('the fixed rule registry records provenance and effective dates', () => {
  assert.equal(RULE_VERSION, '2026-10-28.1');
  assert.equal(REVIEWED_ON, '2026-10-28');
  assert.equal(RULE_CONFIGURATION.fssai.effectiveFrom, '2026-04-01');
  assert.equal(RULE_CONFIGURATION.socialSecurity.effectiveFrom, '2025-11-21');
  for (const value of Object.values(SOURCES)) {
    const url = new URL(value.url);
    assert.equal(url.protocol, 'https:');
    assert.match(url.hostname, /(?:gov\.in|nic\.in|^sansad\.in)$/);
    assert.ok(value.title.length > 12);
    assert.equal(value.reviewedOn, REVIEWED_ON);
  }
});

test('all 28 states and 8 UTs are unique and localized', () => {
  assert.equal(STATES.length, 36);
  assert.equal(new Set(STATES.map(value => value.id)).size, 36);
  for (const state of STATES) l(state.name);
  for (const id of ['AN', 'CH', 'DN', 'DL', 'JK', 'LA', 'LD', 'PY']) assert.ok(STATES.some(value => value.id === id));
  assert.ok(!STATES.some(value => ['DD', 'DH', 'OR'].includes(value.id)), 'No duplicate former territories or old Odisha code');
});

test('every profile returns a deterministic localized checklist with resolvable official sources', () => {
  const activities = ['food', 'retail', 'services', 'professional', 'ecommerce', 'manufacturing', 'health', 'education', 'other'];
  for (const state of STATES) {
    for (const activity of activities) {
      const answers = { ...base, state: state.id, activity };
      const results = evaluate(answers);
      assert.equal(results.length, 15);
      assert.equal(new Set(results.map(item => item.id)).size, 15);
      assert.deepEqual(results, evaluate(answers));
      for (const item of results) {
        for (const field of ['title', 'reason', 'nextStep', 'authority']) l(item[field]);
        item.documents.forEach(l);
        assert.ok(['required', 'check', 'recommended', 'not-triggered'].includes(item.status));
        assert.ok(item.sourceIds.length > 0);
        for (const id of item.sourceIds) assert.ok(SOURCES[id], `Source ${id} exists`);
        if (item.servicePath) assert.match(item.servicePath, /^\/services\/[a-z-]+$/);
      }
    }
  }
});

test('GST uses the state-specific service boundaries without treating the boundary as exceeded', () => {
  assert.equal(result('gst', { turnover: '2000000' }).status, 'not-triggered');
  assert.equal(result('gst', { turnover: '2000000.01' }).status, 'check');
  for (const state of ['MN', 'MZ', 'NL', 'TR']) {
    assert.equal(result('gst', { state, turnover: '1000000' }).status, 'not-triggered');
    assert.equal(result('gst', { state, turnover: '1000001' }).status, 'check');
    assert.match(result('gst', { state }).reason.en, /₹10 lakh/);
  }
  assert.equal(result('gst', { state: 'SK', turnover: '1500000' }).status, 'not-triggered', 'Not every north-eastern state has the ₹10 lakh service limit');
});

test('GST goods boundaries reflect the ten reduced-threshold jurisdictions', () => {
  assert.equal(result('gst', { activity: 'retail', turnover: '4000000' }).status, 'not-triggered');
  assert.equal(result('gst', { activity: 'retail', turnover: '4000001' }).status, 'check');
  for (const state of ['AR', 'MN', 'ML', 'MZ', 'NL', 'PY', 'SK', 'TS', 'TR', 'UK']) {
    assert.equal(result('gst', { activity: 'retail', state, turnover: '2000000' }).status, 'not-triggered');
    assert.equal(result('gst', { activity: 'retail', state, turnover: '2000001' }).status, 'check');
  }
});

test('GST does not turn channels or exempt sectors into a false automatic registration / exemption', () => {
  for (const activity of ['ecommerce', 'health', 'education', 'other']) assert.equal(result('gst', { activity, turnover: '0' }).status, 'check');
  for (const channels of [['marketplace'], ['import'], ['interstate'], ['export']]) {
    assert.equal(result('gst', { activity: 'retail', channels, turnover: '100' }).status, 'check');
  }
  assert.equal(result('gst', { activity: 'services', channels: ['interstate'], turnover: '1000000' }).status, 'not-triggered', 'Interstate services can retain the threshold exemption');
  assert.match(result('gst').reason.en, /not confirmation of exemption/);
});

test('unknown/invalid turnover is never interpreted as zero or an exemption', () => {
  for (const turnover of ['', ' ', '-1', 'Infinity', 'NaN', '1e6', '1,2', '2,000,00', 'abc', '₹1000', '100.123', '9'.repeat(100)]) {
    assert.equal(result('gst', { turnover }).status, 'check', turnover);
    assert.match(result('gst', { turnover }).reason.en, /Unknown turnover/);
  }
  assert.equal(result('gst', { turnover: '0' }).status, 'not-triggered');
  assert.equal(result('gst', { turnover: '20,00,000' }).status, 'not-triggered');
  assert.equal(result('gst', { turnover: '2,000,001' }).status, 'check');
  assert.equal(result('gst', { state: 'unknown', turnover: '0' }).status, 'check');
});

test('FSSAI uses the effective 2026 bands and includes exact-boundary cases', () => {
  for (const turnover of ['1200000', '15000000']) {
    const value = result('fssai', { activity: 'food', turnover });
    assert.equal(value.status, 'required');
    assert.match(value.nextStep.en, /Registration \(up to ₹1.5 crore\)/);
  }
  for (const turnover of ['15000000.01', '500000000']) assert.match(result('fssai', { activity: 'food', turnover }).nextStep.en, /State Licence/);
  assert.match(result('fssai', { activity: 'food', turnover: '500000001' }).nextStep.en, /Central Licence/);
  assert.equal(result('fssai', { activity: 'retail', special: ['food'] }).status, 'required');
  assert.equal(result('fssai').status, 'not-triggered');
});

test('FSSAI does not apply turnover-only conclusions to street vendors or import/export', () => {
  assert.equal(result('fssai', { activity: 'food', premises: 'mobile' }).status, 'check');
  assert.match(result('fssai', { activity: 'food', premises: 'mobile' }).reason.en, /deemed registration/);
  for (const channels of [['import'], ['export']]) {
    assert.match(result('fssai', { activity: 'food', turnover: '100', channels }).nextStep.en, /Central Licence irrespective of turnover/);
  }
  assert.match(result('fssai', { activity: 'food', turnover: '' }).nextStep.en, /not the only eligibility test/);
});

test('IEC distinguishes service exports from goods and does not register all freelancers automatically', () => {
  const services = result('iec', { channels: ['export'] });
  assert.equal(services.status, 'check');
  assert.match(services.reason.en, /services do not automatically require IEC/);
  assert.match(result('iec', { activity: 'retail', channels: ['import'] }).reason.en, /unless a specific exemption/);
  assert.equal(result('iec').status, 'not-triggered');
});

test('EPF and ESI distinguish inclusive headcount thresholds and unresolved ESI conditions', () => {
  assert.equal(result('epf', { employees: '19' }).status, 'not-triggered');
  assert.equal(result('epf', { employees: '20' }).status, 'required');
  assert.equal(result('esi', { employees: '9' }).status, 'not-triggered');
  assert.equal(result('esi', { employees: '10' }).status, 'check');
  assert.match(result('esi', { employees: '10' }).reason.en, /Wages, establishment type/);
  assert.equal(result('esi', { employees: '1', special: ['hazardous'] }).status, 'check');
  assert.match(result('epf', { employees: '0' }).reason.en, /Past coverage/);
  for (const employees of ['', '-1', '1.5', '1,2', 'unknown']) {
    assert.equal(result('epf', { employees }).status, 'check');
    assert.equal(result('esi', { employees }).status, 'check');
  }
});

test('new company linked registrations are not confused with contribution liability', () => {
  for (const id of ['epf', 'esi']) {
    const value = result(id, { entity: 'company', employees: '0' });
    assert.equal(value.status, 'required');
    assert.match(value.reason.en, /does not itself establish contribution liability/);
    assert.ok(value.sourceIds.includes('mca-linked'));
  }
  assert.equal(result('entity-registration', { entity: 'llp' }).status, 'required');
  assert.equal(result('entity-registration', { entity: 'sole' }).status, 'check');
});

test('every jurisdiction has an honest local review; home premises / zero employees do not suppress it', () => {
  for (const state of STATES) {
    const results = evaluate({ ...base, state: state.id, premises: 'home', employees: '0' });
    for (const id of ['shops-establishment', 'trade-licence', 'professional-tax', 'fire-premises', 'local-approvals']) assert.equal(results.find(item => item.id === id).status, 'check');
    assert.match(results.find(item => item.id === 'local-approvals').reason.en, /not a complete database/);
  }
  assert.ok(result('professional-tax').sourceIds.includes('ka-pt'));
  assert.match(result('professional-tax', { state: 'DL' }).reason.en, /not levied everywhere/);
});

test('regulated products, manufacturing and instruments are routed for the right reviews', () => {
  assert.equal(result('legal-metrology', { special: ['packaged'] }).status, 'check');
  assert.equal(result('legal-metrology', { special: ['weights'] }).status, 'check');
  assert.match(result('legal-metrology', { special: ['packaged'] }).reason.en, /retailer is not automatically a packer/);
  for (const overrides of [{ activity: 'manufacturing' }, { activity: 'health' }, { premises: 'industrial' }, { special: ['hazardous'] }]) assert.equal(result('pollution', overrides).status, 'check');
  assert.equal(result('sector-approvals', { special: ['regulated'] }).status, 'check');
  assert.equal(result('udyam').status, 'recommended');
  assert.match(result('udyam').reason.en, /cannot confirm eligibility/);
});

test('malicious text cannot become HTML, a remote URL, a source ID or a regulation', () => {
  const attack = '<img src=x onerror=alert(1)><script>fetch("https://evil.test")</script>';
  const input = { ...base, city: attack, state: attack, activity: attack, entity: attack, premises: attack, turnover: attack, employees: attack, channels: ['javascript:alert(1)', '__proto__'], special: ['food<script>'] };
  const frozen = structuredClone(input);
  const values = evaluate(input);
  assert.deepEqual(input, frozen, 'The engine never mutates input');
  const serialized = JSON.stringify(values);
  assert.ok(!serialized.includes(attack));
  assert.ok(!serialized.includes('evil.test'));
  assert.equal(values.find(item => item.id === 'fssai').status, 'not-triggered');
  assert.equal(values.find(item => item.id === 'gst').status, 'check');
  assert.ok(!/fetch\(|localStorage|sessionStorage|document\.|innerHTML|eval\(/.test(source), 'Screening has no upload, storage, HTML or code execution path');
});

test('duplicated and unexpected checkbox values have no extra effect', () => {
  const one = { ...base, channels: ['marketplace'], special: ['food'] };
  assert.deepEqual(evaluate(one), evaluate({ ...one, channels: ['marketplace', 'marketplace', 'unknown'], special: ['food', 'food', 'unknown'] }));
});
