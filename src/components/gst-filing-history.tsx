import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card } from '@/components/registerbox-ui';
import { returnAction } from '@/lib/gst-returns-api';
import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';
import { palette } from '@/constants/design';
import { classifyPortalStatus, portalStateCopy } from '@/lib/gst-filing-workflow';

export function GstFilingHistory({businessId,year,month,onStatus}:{businessId:string;year:string;month:string;onStatus?:(history:FilingHistory|null)=>void}) {
  const [result,setResult]=useState<FilingHistory|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
  const period=month.padStart(2,'0')+year;
  const valid=/^\d{4}$/.test(year)&&Number(month)>=1&&Number(month)<=12;
  useEffect(()=>{
    let active=true;
    const timer=setTimeout(()=>{
    setResult(null);setError('');onStatus?.(null);
    if(!valid)return;
    setLoading(true);
    returnAction(businessId,'history',{year:Number(year),month:Number(month)}).then(data=>{
      if(active){if(!data.history)throw Error('No filing history returned.');setResult(data.history);onStatus?.(data.history);}
    }).catch(cause=>{if(active)setError(cause.message||'Filing status unavailable.');}).finally(()=>{if(active)setLoading(false);});
    },350);
    return()=>{active=false;clearTimeout(timer);};
  },[businessId,year,month,valid,revision,onStatus]);
  if(!valid)return null;
  const history=result?.period===period?result:null;
  return <Card><Text style={{fontSize:15,fontWeight:'800',color:palette.ink}}>GST portal filing status · {month}/{year}</Text>
    {loading?<Text>Checking GST portal…</Text>:error?<Text accessibilityRole="alert" style={{color:palette.red}}>{error} Filing stays blocked until the server can verify the status.</Text>:history?<>
      {['GSTR1','GSTR3B'].map(form=>{const rows=history.records.filter(row=>row.form===form),state=classifyPortalStatus(rows[0]?.status);return <View key={form} style={{gap:5}}><Badge label={`${form==='GSTR1'?'GSTR-1':'GSTR-3B'} · ${rows.length?rows.map(row=>row.status).join(', '):'No filing entry returned'}`} tone={state==='FILED'?'green':state==='REJECTED'||state==='UNKNOWN'?'red':'amber'}/><Text style={{color:palette.muted,fontSize:12,lineHeight:18}}>{portalStateCopy(state)}</Text>{rows.map((row,index)=><Text selectable key={index} style={{color:palette.muted,fontSize:12}}>{row.arn?`ARN: ${row.arn}`:''}{row.filedOn?` · Filed: ${row.filedOn}`:''}</Text>)}</View>;})}
      <Text style={{color:palette.muted,fontSize:12}}>Checked {new Date(history.checkedAt).toLocaleString()}. The server refreshes this status before every GST write.</Text>
    </>:null}
    <Button title="Refresh portal status" variant="ghost" disabled={loading} onPress={()=>setRevision(value=>value+1)}/>
  </Card>;
}
