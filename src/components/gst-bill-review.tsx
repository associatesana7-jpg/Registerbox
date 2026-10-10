import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner, Field } from '@/components/registerbox-ui';
import { GstSelect, gstStyles } from '@/components/gst-ui';
import { palette } from '@/constants/design';
import type { BillExtraction, ReviewedBillPurchase } from '@/lib/registerbox-api';

const amountKeys = ['taxable','igst','cgst','sgst','cess'] as const;
type Draft = Record<(typeof amountKeys)[number], string> & { supplier: string; number: string; date: string; kind: 'INV'|'C'|'D' };

export function GstBillReview({ bill, busy, onApprove }: { bill: BillExtraction; busy?: boolean; onApprove: (purchase: ReviewedBillPurchase, year: number, month: number) => Promise<void> }) {
  const initial = bill.extracted;
  const [draft,setDraft]=useState<Draft>({ supplier:initial.supplierGstin||'',number:initial.invoiceNumber||'',date:initial.invoiceDate||'',kind:initial.documentKind,taxable:String(initial.taxableValue??''),igst:String(initial.igst??''),cgst:String(initial.cgst??''),sgst:String(initial.sgst??''),cess:String(initial.cess??'') });
  const derived=useMemo(()=>{const match=/^\d{2}-(\d{2})-(\d{4})$/.exec(draft.date);return {month:match?.[1]||'',year:match?.[2]||''};},[draft.date]);
  const [periodMonth,setPeriodMonth]=useState(derived.month),[periodYear,setPeriodYear]=useState(derived.year),[consent,setConsent]=useState(false),[error,setError]=useState('');
  async function approve(){try{
    const year=Number(periodYear),month=Number(periodMonth);
    if(!consent)throw Error('Review the fields and tick the approval box.');
    if(!Number.isInteger(year)||year<2017||year>2100||!Number.isInteger(month)||month<1||month>12)throw Error('Enter a valid GST purchase period.');
    if(!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(draft.supplier))throw Error('Review and enter the supplier GSTIN.');
    if(!draft.number.trim()||!/^\d{2}-\d{2}-\d{4}$/.test(draft.date))throw Error('Review the invoice number and date.');
    const amounts=Object.fromEntries(amountKeys.map(key=>{if(!/^\d+(\.\d{1,2})?$/.test(draft[key]))throw Error(`Review ${key} and enter 0 when it does not apply.`);return [key,Number(draft[key])];})) as Pick<ReviewedBillPurchase,(typeof amountKeys)[number]>;
    setError('');await onApprove({...draft,...amounts},year,month);
  }catch(caught){setError(caught instanceof Error?caught.message:'Could not add this bill.');}}
  return <View style={gstStyles.card}>
    <Text style={gstStyles.title}>Review extracted bill</Text>
    <Text style={gstStyles.caption}>{bill.filename} · Groq {bill.model} · {Math.round(bill.confidence*100)}% extraction confidence</Text>
    <Text style={styles.notice}>AI can misread invoices. Compare every value with the image before saving. Nothing is filed with GST here.</Text>
    <ErrorBanner message={error}/>
    {bill.warnings.map((warning,index)=><Text key={index} style={styles.warning}>• {warning}</Text>)}
    <GstSelect label="Document type" value={draft.kind} disabled={busy} options={[{value:'INV',label:'Invoice'},{value:'C',label:'Credit note'},{value:'D',label:'Debit note'}]} onChange={kind=>{setDraft({...draft,kind:kind as Draft['kind']});setConsent(false);}}/>
    <Field label="Supplier GSTIN" value={draft.supplier} editable={!busy} autoCapitalize="characters" onChangeText={value=>{setDraft({...draft,supplier:value.toUpperCase()});setConsent(false);}}/>
    <Field label="Invoice / note number" value={draft.number} editable={!busy} onChangeText={value=>{setDraft({...draft,number:value});setConsent(false);}}/>
    <Field label="Document date · DD-MM-YYYY" value={draft.date} editable={!busy} onChangeText={value=>{setDraft({...draft,date:value});setConsent(false);}}/>
    {amountKeys.map(key=><Field key={key} label={`${key==='taxable'?'Taxable value':key.toUpperCase()} ₹`} value={draft[key]} editable={!busy} keyboardType="decimal-pad" onChangeText={value=>{setDraft({...draft,[key]:value});setConsent(false);}}/>)}
    <View style={styles.period}><View style={{flex:1}}><Field label="Books month · MM" value={periodMonth} editable={!busy} keyboardType="number-pad" onChangeText={value=>{setPeriodMonth(value);setConsent(false);}}/></View><View style={{flex:1}}><Field label="Books year · YYYY" value={periodYear} editable={!busy} keyboardType="number-pad" onChangeText={value=>{setPeriodYear(value);setConsent(false);}}/></View></View>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} disabled={busy} onPress={()=>setConsent(!consent)} style={styles.checkbox}><Text style={styles.tick}>{consent?'☑':'☐'}</Text><Text style={styles.consent}>I reviewed this bill and approve adding it to GST purchase books.</Text></Pressable>
    <Button title="Add reviewed bill to GST books" loading={busy} disabled={!consent} onPress={approve}/>
  </View>;
}

const styles=StyleSheet.create({notice:{backgroundColor:palette.sky,color:palette.ink,borderRadius:12,padding:12,fontSize:12,lineHeight:18},warning:{color:palette.amber,fontSize:11,lineHeight:17,fontWeight:'700'},period:{flexDirection:'row',gap:10},checkbox:{flexDirection:'row',gap:9,alignItems:'flex-start',paddingVertical:8},tick:{color:palette.blue,fontSize:20},consent:{flex:1,color:palette.ink,fontSize:12,lineHeight:18,fontWeight:'700'}});
