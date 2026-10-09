import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Button,Card,Field} from './registerbox-ui';

/** Selecting the route is read-only. GST writes remain in the nil filing workflow. */
export function GstAiNilLauncher({initialForm='gstr-1'}:{initialForm?:'gstr-1'|'gstr-3b'}){
  const [last]=useState(()=>{const india=new Date(Date.now()+330*60*1000);return new Date(Date.UTC(india.getUTCFullYear(),india.getUTCMonth()-1,1));});
  const [form,setForm]=useState<'gstr-1'|'gstr-3b'>(initialForm);
  const [year,setYear]=useState(String(last.getUTCFullYear()));
  const [month,setMonth]=useState(String(last.getUTCMonth()+1).padStart(2,'0'));
  const valid=/^20\d{2}$/.test(year)&&/^(0?[1-9]|1[0-2])$/.test(month);
  return <Card>
    <Text style={{fontWeight:'700'}}>File a nil return for your selected business</Text>
    <Text>Confirm which return and month. GSTR-1 and GSTR-3B are separate filings.</Text>
    <View style={{flexDirection:'row',gap:8}}>{(['gstr-1','gstr-3b'] as const).map(value=><View key={value} style={{flex:1}}><Button title={value.toUpperCase()} variant={form===value?'primary':'secondary'} onPress={()=>setForm(value)}/></View>)}</View>
    <Field label="Return year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4}/>
    <Field label="Return month (01–12)" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2}/>
    <Button title="Continue to nil declaration & OTP" disabled={!valid} onPress={()=>router.push({pathname:'/gst-returns',params:{mode:'nil',form,year,month:month.padStart(2,'0')}})}/>
  </Card>;
}
