import Calculator from '@/components/website/gst-late-fee-calculator.web';
import { GST_LATE_FEE_TOOL_SOURCES as sources, GST_LATE_FEE_GUIDE_FACTS as facts } from '@/lib/gst-late-fee-calculator';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
export default function Page() { return <TaxToolPage tool={taxToolById('gst-late-fee-calculator')} sources={sources} facts={facts}><Calculator/></TaxToolPage>; }
