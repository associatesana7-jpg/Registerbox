import { hindiBusinessGuides } from './hindi-business';
import { hindiComplianceGuides } from './hindi-compliance';
import type { HindiBlogContent } from './hindi-core';
export type { HindiBlogContent } from './hindi-core';

export const blogHindiBySlug: Record<string, HindiBlogContent> = {
  ...hindiBusinessGuides,
  ...hindiComplianceGuides,
};
