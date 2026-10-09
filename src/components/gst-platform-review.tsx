import { reviewOperatorTcs } from '../../supabase/functions/_shared/gst-tcs-review';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button, ErrorBanner } from './registerbox-ui';
import { platformWorkspace, type SavedPlatformWorkspace } from '@/lib/gst-platform-api';
import { palette } from '@/constants/design';
import { PLATFORM_TEMPLATE, mapPlatformRow, type PlatformContext } from '../../supabase/functions/_shared/gst-platform-import';

export function GstPlatformReview({businessId,gstin,period,disabled,form,onAddToDraft,initialRole='seller'}:{businessId:string;gstin:string;period:string;disabled:boolean;initialRole?:PlatformContext['role'];form:'gstr-1'|'gstr-3b';onAddToDraft?:(rows:import('../../supabase/functions/_shared/gst-platform-import').PlatformRow[],role:PlatformContext['role'])=>void}) {
  const [role,setRole]=useState<PlatformContext['role']>(initialRole);
  const [workspace,setWorkspace]=useState<SavedPlatformWorkspace>({revision:0,rows:[],batches:[]});
  const [loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  const rows=workspace.rows;
  const batch=workspace.batches.at(-1);
  const tcs=role==='operator'?reviewOperatorTcs(rows,{gstin,period,role}):null;
  const review=batch?{accepted:rows.map(row=>mapPlatformRow(row,{gstin,period,role})),issues:batch.issues,duplicates:[] as {row:number;message:string}[]}:null;
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[template,setTemplate]=useState(false);
  const running=useRef(false),generation=useRef(0);
  useEffect(()=>{
    const version=++generation.current;
    if(!/^(0[1-9]|1[0-2])20\d{2}$/.test(period)||!gstin)return;
    platformWorkspace(businessId,{gstin,period,role},{action:'load'}).then(result=>{
      if(generation.current===version){setWorkspace(result.workspace);setError('');}
    }).catch(cause=>{if(generation.current===version)setError(cause instanceof Error?cause.message:'Could not load saved imports.');})
      .finally(()=>{if(generation.current===version)setLoading(false);});
    return ()=>{generation.current=version+1;};
  },[businessId,gstin,period,role,reload]);
  async function importReport() {
    if(running.current||disabled||loading)return;const version=generation.current;running.current=true;setBusy(true);setError('');
    try {
      const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','text/comma-separated-values','text/plain'],copyToCacheDirectory:true,multiple:false});
      if(picked.canceled)return;
      const asset=picked.assets[0];if((asset.size??0)>500_000)throw Error('Choose a CSV smaller than 500 KB.');
      const text=asset.file?await asset.file.text():await new File(asset.uri).text();
      const result=await platformWorkspace(businessId,{gstin,period,role},{action:'import',csv:text,name:asset.name,revision:workspace.revision,consent:true});
      if(generation.current===version)setWorkspace(result.workspace);
    }catch(cause){if(generation.current===version)setError(cause instanceof Error?cause.message:'Could not import report.');}
    finally {running.current=false;setBusy(false);}
  }
  return <View style={{gap:10,padding:12,borderWidth:1,borderColor:palette.line,borderRadius:12}}>
    <Text style={{fontSize:16,fontWeight:'700',color:palette.ink}}>Platform sales · saved imports</Text>
    <Text style={{color:palette.muted}}>Review reporting destinations before preparing the return. Source reports and accepted records are saved privately to this GST account and period. Importing does not send anything to GST.</Text>
    {(['seller','operator'] as const).map(value=><Button key={value} title={(role===value?'✓ ':'')+(value==='seller'?'I sell through a platform':'I operate the platform')} variant="secondary" disabled={disabled||busy||loading||role===value} onPress={()=>{setLoading(true);setWorkspace({revision:0,rows:[],batches:[]});setRole(value);}}/>)}
    <Text style={{color:palette.muted}}>Import invoice-level platform and POS records using the common CSV layout. Gross sales and tax must be separate from payout, commission and deductions. Raw Swiggy/Zomato statement layouts are not yet supported.</Text>
    <Button title="Import & save platform / POS CSV" disabled={disabled||busy||loading||!gstin||!/^(0[1-9]|1[0-2])20\d{2}$/.test(period)} loading={busy} onPress={()=>void importReport()}/>
    <Button title={template?'Hide CSV columns':'Show CSV columns'} variant="ghost" onPress={()=>setTemplate(!template)}/>
    {template?<Text selectable style={{color:palette.muted,fontSize:12}}>{PLATFORM_TEMPLATE}Optional columns for table 15: rate, supplyType (INTER/INTRA), invoiceType (R for regular registered-recipient documents), originalDate (YYYY-MM-DD for invoice amendments). Dates: YYYY-MM-DD. Treatment: section52 or section9_5, confirmed from supply facts. Kind: invoice, credit_note, debit_note or amendment. Enter explicit zero tax amounts where applicable. TCS source columns: tcsIgst, tcsCgst, tcsSgst. These are separate from invoice GST amounts.</Text>:null}
    <ErrorBanner message={error}/>
    {review?<><Text style={{color:palette.ink}}>{rows.length} saved documents · {batch?.duplicates ?? 0} duplicates excluded from latest import</Text>
      {review.issues.length?<Text style={{color:palette.red}}>Latest source file was saved for review; its rows were not added. Resolve every exception and import a corrected file.</Text>:null}
      {[...review.issues,...review.duplicates].slice(0,20).map((issue,index)=><Text key={index} style={{color:palette.muted}}>Row {issue.row}: {issue.message}</Text>)}
      {review.issues.length+review.duplicates.length>20?<Text>Showing the first 20 messages.</Text>:null}
      {review.accepted.slice(0,20).map((item,index)=><View key={index} style={{gap:4,paddingVertical:8}}>
        <Text style={{fontWeight:'700'}}>{item.row.document} · {item.row.source} · ₹{item.row.taxable.toFixed(2)}</Text>
        <Text>GSTR-1: {item.gstr1}</Text><Text>GSTR-3B: {item.gstr3b}</Text>
        <Text>GST payable by {item.taxPaidBy==='operator'?'the platform':'the seller'}.</Text>
        {item.requiresOrdinarySales?<Text>Also include the sale in its ordinary sales section. Table 14 adds no second liability.</Text>:null}
        {item.requiresGstr8Review?<Text>GSTR-8/TCS workflow required. In-app GSTR-8 filing is not available.</Text>:null}
      </View>)}
      {review.accepted.length>20?<Text>Showing the first 20 reporting destinations.</Text>:null}
    </>:null}
    {tcs&&(tcs.groups.length>0||tcs.issues.length>0)?<View style={{gap:6}}>
      <Text style={{fontWeight:'700'}}>TCS source reconciliation · GSTR-8 workpaper</Text>
      <Text>{tcs.scope} In-app GSTR-8 submission is not connected.</Text>
      {tcs.groups.slice(0,20).map(group=><Text key={group.supplierGstin+group.pos}>{group.supplierGstin} · POS {group.pos}: supplies ₹{group.gross.toFixed(2)}, returns ₹{group.returned.toFixed(2)}, net ₹{group.net.toFixed(2)}. {group.tcsComplete?`Source TCS: IGST ₹${group.tcsIgst.toFixed(2)}, CGST ₹${group.tcsCgst.toFixed(2)}, SGST ₹${group.tcsSgst.toFixed(2)}.`:'Source TCS amounts incomplete.'}</Text>)}
      {tcs.issues.slice(0,20).map((issue,index)=><Text key={index} style={{color:palette.red}}>{issue}</Text>)}
    </View>:null}
    {loading?<Text>Loading saved imports…</Text>:null}
    <Button title="Reload saved imports" variant="ghost" disabled={busy||disabled||loading} onPress={()=>{setLoading(true);setReload(value=>value+1);}}/>
    {rows.length&&onAddToDraft?<Button title={role==='operator'?(form==='gstr-1'?"Add table 15 / 15A to draft":"Add operator liability to draft"):"Add section 9(5) sales to draft"} disabled={busy||disabled||loading||!!batch?.issues.length} onPress={()=>{try{onAddToDraft(rows,role);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Could not add figures.');}}}/>:null}
    <Text style={{color:palette.muted,fontSize:12}}>Ecommerce portal submission is awaiting acceptance testing. Draft figures can be reviewed now.</Text>
    {workspace.batches.map(batch=><Text key={batch.checksum} style={{color:palette.muted,fontSize:12}}>{batch.name} · {batch.accepted} added · {batch.duplicates} duplicates · {batch.issues.length} exceptions</Text>)}
  </View>;
}
