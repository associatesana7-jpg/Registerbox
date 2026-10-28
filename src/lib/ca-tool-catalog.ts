import { CA_GST_TOOLS } from './ca-gst-content';
import { CA_TAX_TOOLS } from './ca-tax-content';
import { CA_DOCUMENT_TOOLS } from './ca-document-content';

export type CaToolContent = {
  id: string; name: string; title: string; description: string; heading: string;
  intro: string; answerTitle: string; answer: string; steps: string[];
  examples: { label: string; value: string }[]; scope: string;
  faqs: { question: string; answer: string }[];
  service: { path: string; label: string };
  sources: { title: string; url: string }[]; facts: string[];
};

export const CA_TOOL_GROUPS = [
  { id: 'tax-and-accounts', name: 'Tax & accounts', description: 'Presumptive income, advance tax, depreciation, professional tax, company filing fees and financial statements.', tools: CA_TAX_TOOLS },
  { id: 'gst-checks', name: 'GST checks & calculations', description: 'Credit utilisation, e-invoices, e-way bill validity, place of supply and reverse charge.', tools: CA_GST_TOOLS },
  { id: 'documents-and-reconciliation', name: 'Documents & reconciliation', description: 'Compare purchase records with GSTR-2B, extract bank transactions and turn invoice data into Excel.', tools: CA_DOCUMENT_TOOLS },
] as const;

export const CA_TOOLS: readonly CaToolContent[] = CA_TOOL_GROUPS.flatMap(group => group.tools);
export function caToolById(id: string): CaToolContent {
  const tool = CA_TOOLS.find(item => item.id === id);
  if (!tool) throw new Error(`Unknown CA tool: ${id}`);
  return tool;
}
