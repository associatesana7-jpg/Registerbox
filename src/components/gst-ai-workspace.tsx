import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Button,ErrorBanner,Field} from './registerbox-ui';
import {GstPlatformReview} from './gst-platform-review';
import {gstAction,type GstConnection} from '@/lib/gst-api';

/** Uses the same authenticated import service and review component as GST Returns. */
export function GstAiWorkspace({businessId,operator=false}:{businessId:string;operator?:boolean}){
  const last=new Date();last.setDate(1);last.setMonth(last.getMonth()-1);
  const [year,setYear]=useState(String(last.getFullYear())),[month,setMonth]=useState(String(last.getMonth()+1).padStart(2,'0'));
  const [connection,setConnection]=useState<GstConnection|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;gstAction<{connection:GstConnection}>(businessId,'status').then(r=>{if(active)setConnection(r.connection);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[businessId]);
  const period=month.padStart(2,'0')+year,valid=/^(0[1-9]|1[0-2])20\d{2}$/.test(period);
  return <View style={{gap:10}}>
    <Text style={{fontWeight:'700'}}>Upload to the selected GST business</Text>
    <Field label="Return year" value={year} onChangeText={setYear} keyboardType="number-pad"/>
    <Field label="Return month (01–12)" value={month} onChangeText={setMonth} keyboardType="number-pad"/>
    <ErrorBanner message={error}/>
    {connection?.gstin&&valid?<GstPlatformReview key={businessId+period+String(operator)} businessId={businessId} gstin={connection.gstin} period={period} form="gstr-1" initialRole={operator?'operator':'seller'} disabled={false}/>:<Text>{valid?'Connect this business’s GST account to load its imports.':'Enter a valid month and year.'}</Text>}
    <Button title="Review GSTR-1 draft" disabled={!connection?.gstin||!valid} onPress={()=>router.push({pathname:'/gst-returns',params:{form:'gstr-1',mode:'regular',year,month:month.padStart(2,'0')}})}/>
    <Button title="Review GSTR-3B draft" disabled={!connection?.gstin||!valid} onPress={()=>router.push({pathname:'/gst-returns',params:{form:'gstr-3b',mode:'regular',year,month:month.padStart(2,'0')}})}/>
  </View>;
}
