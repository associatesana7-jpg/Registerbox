import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorBanner, Field } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { SECTION_NAMES, ROW_NAMES, zeroBlanks, netItc, validate3b, type Obj } from '../../supabase/functions/_shared/gstr3b';

const note={color:palette.muted,lineHeight:21};
function Fields({value,onChange,disabled,path=''}:{value:unknown;onChange:(v:unknown)=>void;disabled:boolean;path?:string}) {
  if(Array.isArray(value))return <View style={{gap:16}}>{value.map((item,i)=><View key={i} style={{gap:8,padding:12,backgroundColor:'#F4F7FF',borderRadius:12}}><Text style={{color:palette.ink,fontWeight:'700'}}>{ROW_NAMES[String(item.ty)]||`Entry ${i+1}`}</Text><Fields value={item} path={path} disabled={disabled} onChange={next=>onChange(value.map((old,n)=>n===i?next:old))}/>{path.endsWith('_details')&&path!=='isup_details'?<Button title="Remove state" variant="ghost" disabled={disabled} onPress={()=>onChange(value.filter((_,n)=>n!==i))}/>:null}</View>)}{['unreg_details','comp_details','uin_details'].includes(path)?<Button title="Add place of supply" variant="secondary" disabled={disabled} onPress={()=>onChange([...value,{pos:'',txval:'',iamt:''}])}/>:null}</View>;
  if(value&&typeof value==='object')return <View style={{gap:12}}>{Object.entries(value as Obj).filter(([key])=>key!=='ty').map(([key,v])=><View key={key} style={{gap:8}}>{typeof v==='object'?<Text style={{fontWeight:'700',color:palette.ink}}>{ROW_NAMES[key]||key}</Text>:null}<Fields value={v} path={key} disabled={disabled} onChange={next=>onChange({...value,[key]:next})}/></View>)}</View>;
  return <Field label={ROW_NAMES[path]||path} value={String(value??'')} keyboardType={path==='pos'?'number-pad':'decimal-pad'} editable={!disabled} onChangeText={text=>onChange(path==='pos'?text:/^-?\d+(\.\d{1,2})?$/.test(text)?Number(text):text)}/>;
}
export function Gstr3bEditor({data,onChange,disabled}:{data:Obj;onChange:(v:Obj)=>void;disabled:boolean}) {
  const [open,setOpen]=useState('sup_details'),[error,setError]=useState('');
  return <View style={{gap:14}}><Text style={note}>Enter the period totals from your books. Blank amounts must be completed or explicitly marked zero. These are your entries, not fetched or verified records.</Text><Text style={note}>Scope: standard monthly GSTR-3B tables below. Imported section 9(5) figures can be reviewed in table 3.1.1. Ecommerce submission is awaiting acceptance testing. Special restrictions and negative-liability adjustments require review.</Text>
    {Object.entries(SECTION_NAMES).filter(([key])=>key!=='eco_dtls'||data.eco_dtls!==undefined).map(([key,title])=><View key={key} style={{gap:12}}><Button title={`${open===key?'−':'+'} ${title}`} variant="secondary" disabled={disabled} onPress={()=>setOpen(open===key?'':key)}/>{open===key?<><Fields value={data[key]} disabled={disabled} onChange={value=>onChange({...data,[key]:value})}/><Button title="Confirm remaining blank amounts in this section are zero" variant="ghost" disabled={disabled} onPress={()=>onChange({...data,[key]:zeroBlanks(data[key])})}/>{key==='itc_elg'?<Button title="Calculate net ITC from A minus B" disabled={disabled} onPress={()=>{try{onChange({...data,itc_elg:{...(data.itc_elg as Obj),itc_net:netItc(data)}});setError('');}catch(e){setError((e as Error).message);}}}/>:null}</>:null}</View>)}
    <ErrorBanner message={error}/><Button title="Check my GSTR-3B entries" variant="secondary" disabled={disabled} onPress={()=>{try{validate3b(data);setError('');setOpen('');}catch(e){setError((e as Error).message);}}}/>
  </View>;
}
