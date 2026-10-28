import Calculator from '@/components/website/ca-gst-tools.web';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { CA_GST_TOOLS } from '@/lib/ca-gst-content';
import '@/components/website/ca-tools.css';
const id = 'itc-set-off-calculator';
const tool = CA_GST_TOOLS.find(item => item.id === id)!;
export default function Page() { return <TaxToolPage tool={tool} sources={tool.sources} facts={tool.facts} family="ca" relatedTools={CA_GST_TOOLS}><Calculator id={id}/></TaxToolPage>; }
