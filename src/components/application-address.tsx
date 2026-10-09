import {useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {Choice,ErrorBanner,Field} from './registerbox-ui';
import {GstSelect,gstStyles} from './gst-ui';
import {indianStates,parsePostalLocations,type PostalLocation} from '@/data/india-address';
type Answers=Record<string,string>;
export function ApplicationAddress({value,onChange,disabled}:{value:Answers;onChange:(a:Answers)=>void;disabled:boolean}){
  const [locations,setLocations]=useState<PostalLocation[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const latest=useRef(value),change=useRef(onChange);useEffect(()=>{latest.current=value;change.current=onChange;},[value,onChange]);
  const pin=value.pincode||'';
  useEffect(()=>{
    if(!/^[1-9]\d{5}$/.test(pin))return;
    const controller=new AbortController();let active=true;
    const timer=setTimeout(async()=>{
      setBusy(true);setError('');const timeout=setTimeout(()=>controller.abort(),12000);
      try{const response=await fetch('https://api.postalpincode.in/pincode/'+pin,{signal:controller.signal});if(!response.ok)throw Error('Postal lookup is unavailable. Enter the address manually.');const rows=parsePostalLocations(await response.json(),pin);if(!active||latest.current.pincode!==pin)return;setLocations(rows);
        // Never replace an already reviewed saved address merely because the screen was reopened.
        if(latest.current.address_lookup_pin!==pin){const states=[...new Set(rows.map(r=>r.state))],districts=[...new Set(rows.map(r=>r.district))];change.current({...latest.current,state:states.length===1?states[0]:'',district:districts.length===1?districts[0]:'',post_office:rows.length===1?rows[0].name:'',address_lookup_pin:pin,address_source:'Postal directory suggestion',address_confirmed:'No'});}
      }catch(e){if(active)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Postal lookup timed out. You can enter the address manually.');}finally{clearTimeout(timeout);if(active)setBusy(false);}
    },450);
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[pin]);
  const update=(key:string,text:string)=>onChange({...value,[key]:text,address_confirmed:'No'});
  return <View style={{gap:14}}><Field label="PIN code" value={pin} keyboardType="number-pad" maxLength={6} editable={!disabled} onChangeText={text=>{setLocations([]);setError('');onChange({...value,pincode:text.replace(/\D/g,''),state:'',district:'',city:'',post_office:'',address_lookup_pin:'',address_source:'Manual',address_confirmed:'No'});}}/>
    <Text style={gstStyles.caption}>{busy?'Looking up postal locations…':'Only your PIN is sent to a public postal directory. Suggestions are not government verification. Confirm your exact address below.'}</Text><ErrorBanner message={error}/>
    {locations.length?<GstSelect label="Post office / locality" value={value.post_office||''} options={locations.map(r=>({value:r.name,label:r.name+' · '+r.district}))} disabled={disabled||busy} onChange={name=>{const r=locations.find(item=>item.name===name)!;onChange({...value,post_office:r.name,state:r.state,district:r.district,address_confirmed:'No'});}}/>:null}
    <GstSelect label="State / union territory" value={value.state||''} options={indianStates.map(state=>({value:state,label:state}))} disabled={disabled||busy} onChange={state=>onChange({...value,state,district:'',city:'',post_office:'',address_source:'Manual correction',address_confirmed:'No'})}/>
    <Field label="District" value={value.district||''} editable={!disabled&&!busy} onChangeText={v=>update('district',v)}/>
    <Field label="City / town / village (confirm actual location)" value={value.city||''} editable={!disabled} onChangeText={v=>update('city',v)}/>
    <Field label="Building / house number and street" value={value.address_line_1||''} editable={!disabled} onChangeText={v=>update('address_line_1',v)}/>
    <Field label="Area / landmark (optional)" value={value.address_line_2||''} editable={!disabled} onChangeText={v=>update('address_line_2',v)}/>
    <Choice label="I checked this address against the premises proof" selected={value.address_confirmed==='Yes'} onPress={()=>{if(!disabled&&!busy)onChange({...value,address_confirmed:value.address_confirmed==='Yes'?'No':'Yes'});}}/>
  </View>;
}
