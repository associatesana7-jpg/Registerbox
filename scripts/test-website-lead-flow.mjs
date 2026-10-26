import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [prompt, shell, intake, migration, adminApi, adminUi, controlCenter] = await Promise.all([
  read('src/components/website/public-lead-prompt.web.tsx'),
  read('src/components/website/shell.web.tsx'),
  read('supabase/functions/public-lead-intake/index.ts'),
  read('supabase/migrations/20261026165803_website_callback_leads.sql'),
  read('supabase/functions/control-center/website-leads.ts'),
  read('src/components/admin-website-leads.tsx'),
  read('src/components/control-center.tsx'),
]);

assert.match(prompt, /setTimeout\(showWhenCalm, 10_000\)/, 'prompt must wait ten seconds');
assert.match(prompt, /document\.visibilityState !== 'visible'/, 'prompt must not interrupt a hidden tab');
assert.match(prompt, /callbackConsent: true/, 'submission must record affirmative callback consent');
assert.match(prompt, /privacy notice/, 'form must disclose the privacy notice');
assert.match(shell, /PublicLeadPrompt/, 'public shell must mount the prompt');
assert.match(shell, /pathname\.startsWith\('\/blog\/'\)/, 'blog guides must be eligible for the prompt');
assert.match(intake, /productionOrigins/, 'intake must restrict origins');
assert.match(intake, /body\.website/, 'intake must include a bot trap');
assert.match(intake, /elapsed < 4_000/, 'intake must reject impossibly fast submissions');
assert.match(intake, /callback-v1-2026-10-26/, 'intake must record a consent version');
assert.match(migration, /enable row level security/i, 'lead table must enable RLS');
assert.match(migration, /revoke all.*anon, authenticated/i, 'browser roles must not access the lead table');
assert.match(migration, /status in \('new','contacted','closed'\)/, 'lead status must be constrained');
assert.match(adminApi, /customer\.read/, 'lead list must require staff read permission');
assert.match(adminApi, /customer\.update/, 'lead updates must require staff update permission');
assert.match(adminApi, /WEBSITE_LEAD_STATUS_UPDATED/, 'lead updates must be audited');
assert.match(adminUi, /tel:\+91/, 'admin queue must provide a direct call action');
assert.match(controlCenter, /Website enquiries/, 'Control Center must expose the queue');

console.log('Website callback lead flow contract passed.');
