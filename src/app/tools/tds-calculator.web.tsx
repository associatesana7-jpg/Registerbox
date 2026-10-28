import Calculator from '@/components/website/tds-calculator.web';
import { TDS_TOOL_SOURCES as sources, TDS_GUIDE_FACTS as facts } from '@/lib/tds-calculator';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
export default function Page() { return <TaxToolPage tool={taxToolById('tds-calculator')} sources={sources} facts={facts}><Calculator/></TaxToolPage>; }
