import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/business-licence-services.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { CHECKLIST_SERVICES, serviceForLicence, matchingChecklistServices } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const result = (id, status = 'check') => ({ id, status });

test('service destinations are existing public pages with complete translations', () => {
  for (const service of Object.values(CHECKLIST_SERVICES)) {
    assert.match(service.path, /^\/services\/[a-z-]+$/);
    assert.ok(existsSync(new URL(`../src/app${service.path}.web.tsx`, import.meta.url)), service.path);
    for (const field of ['title','action','detail']) for (const locale of ['en','hi','kn']) assert.ok(service[field][locale]?.trim());
  }
});

test('registration results lead to the matching offered service and entity route', () => {
  assert.equal(serviceForLicence(result('gst'), {}).path, '/services/gst-registration');
  assert.equal(serviceForLicence(result('fssai'), {}).path, '/services/fssai-food-business');
  assert.equal(serviceForLicence(result('udyam'), {}).path, '/services/udyam-registration');
  assert.equal(serviceForLicence(result('shops-establishment'), {}).path, '/services/shop-establishment-registration');
  assert.equal(serviceForLicence(result('entity-registration'), { entity:'llp' }).path, '/services/llp-registration');
  assert.equal(serviceForLicence(result('entity-registration'), { entity:'company' }).path, '/services/private-limited-company-registration');
  assert.equal(serviceForLicence(result('entity-registration'), { entity:'sole' }).kind, 'review');
  assert.equal(serviceForLicence(result('entity-registration'), { entity:'partnership' }).kind, 'review');
});

test('unresolved approvals offer scoped review, and no-trigger items do not promote applications', () => {
  for (const id of ['trade-licence','professional-tax','iec','epf','esi','legal-metrology','pollution','fire-premises','sector-approvals','local-approvals']) {
    const service = serviceForLicence(result(id), {});
    assert.equal(service.kind, 'review');
    assert.equal(service.path, '/services/business-compliance-check');
    assert.equal(serviceForLicence(result(id, 'not-triggered'), {}), undefined);
  }
});

test('top service shortcuts deduplicate destinations and reflect active results', () => {
  const matches = matchingChecklistServices([result('gst'),result('fssai','not-triggered'),result('udyam','recommended'),result('gst'),result('local-approvals')], {});
  assert.deepEqual(matches.map(service=>service.id), ['gst','udyam']);
});
