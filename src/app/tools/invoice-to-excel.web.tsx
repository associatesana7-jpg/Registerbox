import Calculator from '@/components/website/ca-document-tools.web';
import { TaxToolPage } from '@/components/website/tax-tool-page.web';
import { CA_DOCUMENT_TOOLS } from '@/lib/ca-document-content';
import '@/components/website/ca-tools.css';
const id = 'invoice-to-excel';
const tool = CA_DOCUMENT_TOOLS.find(item => item.id === id)!;
export default function Page() { return <TaxToolPage tool={tool} sources={tool.sources} facts={tool.facts} family="ca" relatedTools={CA_DOCUMENT_TOOLS}><Calculator id={id}/></TaxToolPage>; }
