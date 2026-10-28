import Calculator from '@/components/website/income-tax-calculator.web';
import { TOOL_SOURCES as sources, INCOME_TAX_NOTES as facts } from '@/lib/income-tax-calculator';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
export default function Page() { return <TaxToolPage tool={taxToolById('income-tax-regime-calculator')} sources={sources} facts={facts}><Calculator/></TaxToolPage>; }
