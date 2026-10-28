import Calculator from '@/components/website/gst-rate-finder.web';
import { TOOL_SOURCES as sources } from '@/lib/gst-rate-finder';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
export default function Page() { return <TaxToolPage tool={taxToolById('hsn-sac-gst-rate-finder')} sources={sources}><Calculator/></TaxToolPage>; }
