import Calculator from '@/components/website/ca-tax-tools.web';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { CA_TAX_TOOLS } from '@/lib/ca-tax-content';
import '@/components/website/ca-tools.css';
const id = 'presumptive-tax-calculator';
const tool = CA_TAX_TOOLS.find(item => item.id === id)!;
export default function Page() { return <TaxToolPage tool={tool} sources={tool.sources} facts={tool.facts} family="ca" relatedTools={CA_TAX_TOOLS}><Calculator id={id}/></TaxToolPage>; }
