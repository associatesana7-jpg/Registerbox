import { GstinValidator as Calculator } from '@/components/website/gst-basic-tools.web';
import { GST_TOOL_SOURCES as sources } from '@/lib/public-gst-tools';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { taxToolById } from '@/lib/tax-tool-content';
export default function Page() { return <TaxToolPage tool={taxToolById('gstin-validator')} sources={sources}><Calculator/></TaxToolPage>; }
