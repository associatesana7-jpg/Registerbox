import assert from 'node:assert/strict';
import { periodIsClosed } from '../supabase/functions/gst-workspace/domain.ts';

assert.equal(periodIsClosed(2026, 9, new Date('2026-09-25T08:19:15Z')), false);
assert.equal(periodIsClosed(2026, 9, new Date('2026-09-30T18:29:59Z')), false);
assert.equal(periodIsClosed(2026, 9, new Date('2026-09-30T18:30:00Z')), true);
assert.equal(periodIsClosed(2026, 8, new Date('2026-09-25T08:19:15Z')), true);
console.log('GST period closure follows midnight in India.');
