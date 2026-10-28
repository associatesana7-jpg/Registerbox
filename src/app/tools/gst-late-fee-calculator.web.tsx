import Calculator from '@/components/website/gst-late-fee-calculator.web';
import { GST_LATE_FEE_TOOL_SOURCES as sources, GST_LATE_FEE_GUIDE_FACTS as facts } from '@/lib/gst-late-fee-calculator';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
import { HISTORY_SOURCES, HISTORY_FACTS } from '@/lib/gst-late-fee-history';
import { GST_LATE_FEE_RANGE_SOURCES } from '@/lib/gst-late-fee-range';
export default function Page() { const allSources=[...sources,...HISTORY_SOURCES,...GST_LATE_FEE_RANGE_SOURCES].filter((source,i,list)=>list.findIndex(item=>item.url===source.url)===i);return <TaxToolPage reviewedDate="2026-10-29" tool={taxToolById('gst-late-fee-calculator')} sources={allSources} facts={[...facts, ...HISTORY_FACTS]}><Calculator/></TaxToolPage>; }
