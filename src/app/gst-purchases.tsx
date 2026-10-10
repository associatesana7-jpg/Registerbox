import { useEffect, useState } from 'react';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button, ErrorBanner, Field, Screen } from '@/components/registerbox-ui';
import { GstHeader, GstSelect, GstTabs, gstStyles as s } from '@/components/gst-ui';
import { useApp } from '@/hooks/use-app';
import { gstAction } from '@/lib/gst-api';
import { palette } from '@/constants/design';
import { addExtractedBillToBooks, chooseAndExtractGstBill, type BillExtraction, type ReviewedBillPurchase } from '@/lib/registerbox-api';
import { parsePurchaseCsv, validateBooks, type Purchase, type matchPurchases } from '../../supabase/functions/_shared/gst-purchases';

type Report=ReturnType<typeof matchPurchases>;
type Saved={books:Purchase[];revision:number;report:Report|null;fetched_at:string|null};
const labels={supplier:'Supplier GSTIN',number:'Invoice / note number',date:'Document date · DD-MM-YYYY',taxable:'Taxable value ₹',igst:'IGST ₹',cgst:'CGST ₹',sgst:'SGST / UTGST ₹',cess:'Cess ₹'};
const blank={supplier:'',number:'',date:'',taxable:'',igst:'',cgst:'',sgst:'',cess:'',kind:'INV'};
export default function PurchaseScreen(){
  const {business,session,loadingSession}=useApp(),params=useLocalSearchParams<{year?:string;month?:string}>();
  if(loadingSession)return <Screen><Text>Loading…</Text></Screen>;
  if(!session)return <Redirect href="/auth"/>;
  if(!business.id)return <Redirect href="/gst"/>;
  return <PurchaseWorkspace key={`${business.id}:${params.year}:${params.month}`} businessId={business.id} year={Number(params.year)} month={Number(params.month)}/>;
}
function PurchaseWorkspace({businessId,year,month}:{businessId:string;year:number;month:number}){
  const [saved,setSaved]=useState<Saved|null>(null),[books,setBooks]=useState<Purchase[]>([]),[entry,setEntry]=useState({...blank});
  const [pendingBill,setPendingBill]=useState<BillExtraction|null>(null);
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[consent,setConsent]=useState(false),[filter,setFilter]=useState('All'),[limit,setLimit]=useState(30),[tab,setTab]=useState('Books');
  const validPeriod=Number.isInteger(year)&&year>=2017&&Number.isInteger(month)&&month>=1&&month<=12;
  useEffect(()=>{let active=true;if(!validPeriod)return;gstAction<{purchase:Saved|null}>(businessId,'load_books',{year,month}).then(data=>{if(active){setSaved(data.purchase);setBooks(data.purchase?.books||[]);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[businessId,year,month,validPeriod]);
  const dirty=JSON.stringify(books)!==JSON.stringify(saved?.books||[]),report=dirty?null:saved?.report;
  function change(next:Purchase[]){setBooks(next);setConsent(false);}
  async function run(action:'save_books'|'read_2b'){
    setBusy(true);setError('');try{const data=await gstAction<{purchase:Saved}>(businessId,action,{year,month,books,revision:saved?.revision||0,consent:true});setSaved(data.purchase);setBooks(data.purchase.books);setConsent(false);if(action==='read_2b')setTab('Results');}catch(e){setError(e instanceof Error?e.message:'Could not complete reconciliation.');}finally{setBusy(false);}
  }
  async function importCsv(){setError('');try{const selected=await DocumentPicker.getDocumentAsync({type:['text/csv','text/comma-separated-values','application/vnd.ms-excel','text/plain'],copyToCacheDirectory:true});if(selected.canceled)return;const asset=selected.assets[0];if((asset.size||0)>1500000)throw Error('Choose a CSV under 1.5 MB.');const text=asset.file?await asset.file.text():await new File(asset.uri).text();if(text.length>1500000)throw Error('CSV is too large.');change([...books,...parsePurchaseCsv(text)]);}catch(e){setError(e instanceof Error?e.message:'Could not import CSV.');}}
  async function extractBill(){setBusy(true);setError('');try{const bill=await chooseAndExtractGstBill(businessId);if(!bill)return;const x=bill.extracted;setPendingBill(bill);setEntry({supplier:x.supplierGstin||'',number:x.invoiceNumber||'',date:x.invoiceDate||'',kind:x.documentKind,taxable:String(x.taxableValue??''),igst:String(x.igst??''),cgst:String(x.cgst??''),sgst:String(x.sgst??''),cess:String(x.cess??'')});}catch(e){setError(e instanceof Error?e.message:'Could not extract this bill.');}finally{setBusy(false);}}
  async function addEntry(){try{for(const key of ['taxable','igst','cgst','sgst','cess'] as const)if(!/^\d+(\.\d{1,2})?$/.test(entry[key]))throw Error(`Enter ${labels[key]}; use 0 where applicable.`);const row=validateBooks([{...entry,...Object.fromEntries(['taxable','igst','cgst','sgst','cess'].map(k=>[k,Number(entry[k as keyof typeof entry])]))}])[0];if(pendingBill){setBusy(true);const result=await addExtractedBillToBooks(businessId,pendingBill.extractionId,year,month,row as ReviewedBillPurchase);setSaved(result.purchase as unknown as Saved);setBooks(result.purchase.books as Purchase[]);}else change([...books,row]);setEntry({...blank});setPendingBill(null);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const visible=(report?.rows||[]).filter(row=>filter==='All'||row.status===filter);
  return <Screen><Stack.Screen options={{headerShown:false}}/><GstHeader title="Purchase Reconciliation" onBack={()=>router.back()}/><View style={s.stack}>
    <Text style={s.caption}>{validPeriod?new Date(year,month-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'Choose a period from GST Returns.'}</Text><ErrorBanner message={error}/>
    {validPeriod?<><GstTabs items={['Books','Results']} value={tab} onChange={setTab}/>
    {tab==='Books'?<><View style={s.card}><Text style={s.title}>Add a purchase document</Text><Text style={s.caption}>Upload a bill photo for AI autofill, or enter an invoice/credit/debit note manually. Every AI value must be reviewed.</Text>
      <Button title="Upload bill photo & autofill" variant="secondary" loading={busy} onPress={extractBill}/>
      {pendingBill?<View style={{backgroundColor:palette.sky,borderRadius:12,padding:12,gap:5}}><Text style={s.title}>AI draft · review before adding</Text><Text style={s.caption}>{pendingBill.filename} · Groq {pendingBill.model} · {Math.round(pendingBill.confidence*100)}% confidence</Text><Text style={s.caption}>The original image is stored privately. Compare every field below with it; nothing has been added or filed.</Text>{pendingBill.warnings.map((warning,index)=><Text key={index} style={{...s.caption,color:palette.amber}}>• {warning}</Text>)}</View>:null}
      <GstSelect label="Document type" value={entry.kind} options={[{value:'INV',label:'Invoice'},{value:'C',label:'Credit note'},{value:'D',label:'Debit note'}]} disabled={busy} onChange={kind=>setEntry({...entry,kind})}/>
      {Object.entries(labels).map(([key,label])=><Field key={key} label={label} value={entry[key as keyof typeof entry]} editable={!busy} autoCapitalize={key==='supplier'?'characters':'none'} keyboardType={['taxable','igst','cgst','sgst','cess'].includes(key)?'decimal-pad':'default'} onChangeText={value=>setEntry({...entry,[key]:key==='supplier'?value.toUpperCase():value})}/>)}
      <Button title={pendingBill?'Add reviewed AI draft to GST books':'Add to books'} disabled={busy} loading={busy} onPress={addEntry}/>
    </View><View style={s.card}><Text style={s.title}>Import from your accounting system</Text><Text selectable style={s.caption}>Export CSV columns: supplier,number,date,kind,taxable,igst,cgst,sgst,cess. Dates: DD-MM-YYYY. Type: INV, C or D. Imports add to your current books.</Text><Button title="Upload purchase CSV" variant="secondary" disabled={busy} onPress={importCsv}/></View>
    <View style={s.card}><Text style={s.title}>{books.length} purchase documents</Text>{books.slice(0,limit).map((row,i)=><View key={i} style={{borderBottomWidth:1,borderColor:palette.line,paddingVertical:10,gap:4}}><Text style={s.title}>{row.number} · {row.kind}</Text><Text style={s.caption}>{row.supplier} · {row.date}</Text><Text style={s.caption}>Taxable ₹{row.taxable.toFixed(2)} · Tax ₹{(row.igst+row.cgst+row.sgst+row.cess).toFixed(2)}</Text><Button title="Remove from books" variant="ghost" disabled={busy} onPress={()=>change(books.filter((_,index)=>index!==i))}/></View>)}{books.length>limit?<Button title="Show more documents" variant="ghost" onPress={()=>setLimit(limit+30)}/>:null}<Button title={books.length?'Save purchase books':'Save empty purchase books'} loading={busy} onPress={()=>run('save_books')}/></View></>:null}
    <View style={s.card}><Text style={s.title}>Compare with GSTR-2B</Text>{dirty?<Text style={s.caption}>Save your changed books before matching.</Text>:null}<Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} disabled={busy} onPress={()=>setConsent(!consent)} style={{flexDirection:'row',gap:8,paddingVertical:10}}><Text style={{color:palette.blue}}>{consent?'☑':'☐'}</Text><Text style={{...s.caption,flex:1}}>Fetch this period’s GSTR-2B from GST and compare it with my saved purchase books.</Text></Pressable><Button title="Fetch 2B & match purchases" loading={busy} disabled={dirty||!saved||!consent} onPress={()=>run('read_2b')}/></View>
    {tab==='Results'?report?<><View style={s.card}><Text style={s.title}>{report.counts.Matched} matched · {report.rows.length-report.counts.Matched} need attention</Text><Text style={s.caption}>{report.bookCount} book documents · {report.portalCount} GST documents</Text><Text style={s.caption}>Fetched {saved?.fetched_at?new Date(saved.fetched_at).toLocaleString('en-IN'):''}. Matching checks document identity, date and exact amounts. ITC eligibility still requires your review.</Text>{report.unsupported.length?<ErrorBanner message={'Review these additional GST sections separately: '+report.unsupported.join(', ')}/>:null}<GstSelect label="Show" value={filter} options={['All',...Object.keys(report.counts)].map(value=>({value,label:value+(value==='All'?'':` (${report.counts[value]})`)}))} onChange={value=>{setFilter(value);setLimit(30);}}/></View>
    {visible.slice(0,limit).map((row,index)=><View style={s.card} key={index}><Text style={{...s.title,color:row.status==='Matched'?palette.green:palette.amber}}>{row.status}</Text><Text style={s.title}>{(row.book||row.portal)?.number} · {(row.book||row.portal)?.kind}</Text><Text style={s.caption}>{row.portal?.name||row.book?.supplier||row.portal?.supplier}</Text><Text style={s.caption}>{(row.book||row.portal)?.date}</Text>{row.differences.map((text,i)=><Text style={s.caption} key={i}>{text}</Text>)}</View>)}{visible.length>limit?<Button title="Show more results" variant="secondary" onPress={()=>setLimit(limit+30)}/>:null}</>:<View style={s.card}><Text style={s.caption}>Save your books and fetch GSTR-2B to see matched, missing and different documents.</Text></View>:null}</>:null}
  </View></Screen>;
}
