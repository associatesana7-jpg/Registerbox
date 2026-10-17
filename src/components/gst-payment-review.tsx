import { Text, View } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Button, Field } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { GstCheckbox } from './gst-checkbox';
import { CREDIT_FIELDS, HEADS, type PaymentContext, type preparePayment } from '../../supabase/functions/_shared/gst-payment';
type Review=ReturnType<typeof preparePayment>;
const note={color:palette.muted,lineHeight:21};
const rupee=(n:number)=>'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export function GstPaymentReview({context,review,choices,onChoices,minimumCash,onMinimumCash,rulesReviewed,onRulesReviewed,disabled}:{context:PaymentContext|null;review:Review|null;choices:Record<string,string>;onChoices:(v:Record<string,string>)=>void;minimumCash:string;onMinimumCash:(v:string)=>void;rulesReviewed:boolean;onRulesReviewed:()=>void;disabled:boolean}) {
  const [details,setDetails]=useState(false);
  if(!context)return <Text style={note}>Fetch payment details to see GST-reported liability and cash/credit balances. Missing balances are never assumed to be zero.</Text>;
  const totalTax=context.liabilities.reduce((sum,row)=>sum+HEADS.reduce((n,h)=>n+row.charges[h].tx,0),0);
  const totalCharges=context.liabilities.reduce((sum,row)=>sum+HEADS.reduce((n,h)=>n+row.charges[h].intr+row.charges[h].fee,0),0);
  return <View style={{gap:14}}><Text style={note}>These balances come from GST. No money is moved by this review. Credit balances are reduced conservatively by reported blocked credit.</Text>
    <View style={{padding:16,borderRadius:12,backgroundColor:palette.sky,gap:8}}>
      <Text style={{color:palette.ink,fontSize:24,fontWeight:'700'}}>{rupee(totalTax+totalCharges)} payable before credit</Text>
      <Text style={note}>Tax {rupee(totalTax)} · Interest & late fees {rupee(totalCharges)}</Text>
      {totalTax+totalCharges===0?<Text style={note}>No cash is currently required. GST may still need a zero-value offset / credit-posting step before filing. This does not make a return with ITC a nil return.</Text>:null}
    </View>
    <Button title={details?'Hide tax-head balances':'View cash & credit balances by tax head'} variant="ghost" onPress={()=>setDetails(!details)}/>
    {details?HEADS.map(head=><View key={head} style={{gap:6,padding:12,backgroundColor:palette.sky,borderRadius:12}}><Text style={{fontWeight:'700',color:palette.ink}}>{head.toUpperCase()}</Text><Text selectable style={note}>Tax payable {rupee(context.liabilities.reduce((n,r)=>n+r.charges[head].tx,0))}</Text><Text selectable style={note}>Cash tax balance {rupee(context.cash[head].tx)} · Credit available {rupee(context.credit[head])}</Text><Text selectable style={note}>Cash interest balance {rupee(context.cash[head].intr)} · Fee balance {rupee(context.cash[head].fee)}</Text></View>):null}
    {totalTax>0||Object.values(choices).some(value=>Number(value)!==0)?<><Text style={{color:palette.ink,fontWeight:'700'}}>Choose credit utilisation</Text><Text style={note}>Starts at zero ITC (cash-only). Enter eligible credit you want to use. Reverse charge, interest and fees remain payable in cash; CGST↔SGST use is not allowed.</Text>
    {Object.entries(CREDIT_FIELDS).map(([key,label])=><Field key={key} label={label+' ₹'} value={choices[key]??''} editable={!disabled} keyboardType="decimal-pad" onChangeText={value=>onChoices({...choices,[key]:value})}/>)}</>:<Text style={note}>There is no tax to allocate credit against. All credit-utilisation amounts remain zero; your saved ITC claim is preserved in the return.</Text>}
    <Field label="Minimum regular tax that must be paid in cash ₹" value={minimumCash} editable={!disabled} keyboardType="decimal-pad" onChangeText={onMinimumCash}/><Text style={note}>Enter the applicable minimum after checking Rule 86B and other restrictions. Enter 0 only if no minimum applies; the app does not determine exemptions.</Text>
    <Button title="No minimum cash restriction applies · use ₹0" variant="secondary" disabled={disabled} onPress={()=>onMinimumCash('0')}/>
    <GstCheckbox checked={rulesReviewed} label="I checked ITC eligibility, blocked credit, cash-only supplies and applicable minimum-cash restrictions. This return has no unsupported special adjustments." disabled={disabled} onPress={onRulesReviewed}/>
    {review?<><Text style={{fontWeight:'700',color:palette.ink}}>Payment review</Text>{review.shortfalls.filter(r=>r.required>0||r.shortfall>0).map(r=><Text selectable key={r.head+r.part} style={note}>{r.head.toUpperCase()} {({tx:'tax',intr:'interest',fee:'late fee'})[r.part]}: cash required {rupee(r.required)} · available {rupee(r.available)} · top-up {rupee(r.shortfall)}</Text>)}<Text selectable style={{fontWeight:'700',color:review.ready?palette.green:palette.ink}}>{review.ready?'Cash ledger covers this allocation.':`Cash top-up needed: ${rupee(review.totalShortfall)}`}</Text>{!review.ready?<><Text style={note}>Create/pay the challan on GST under the exact tax heads above. A bank payment is not return filing. Return here and fetch balances again after the credit appears.</Text><Button title="Open official GST portal to pay challan" variant="secondary" onPress={()=>WebBrowser.openBrowserAsync('https://services.gst.gov.in/services/login')}/></>:null}</>:null}
  </View>;
}
