import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ErrorBanner, Field } from './registerbox-ui';
import { palette } from '@/constants/design';
import { returnAction, type SavedSignatory } from '@/lib/gst-returns-api';

export function GstSignatorySelector({businessId,gstin,pan,disabled,onSelect}: {
  businessId:string;gstin:string;pan:string;disabled:boolean;onSelect:(pan:string)=>void;
}) {
  const [people,setPeople] = useState<SavedSignatory[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [adding,setAdding] = useState(false);
  const [name,setName] = useState('');
  const [newPan,setNewPan] = useState('');
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  const active = useRef(true), running = useRef(false);
  useEffect(() => {
    active.current=true;
    let cancelled=false;
    returnAction(businessId,'signatories',{gstin}).then(result=> {
      if (!cancelled) { setPeople(result.signatories ?? []); setError(''); }
    }).catch(cause=> { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load saved signatories.'); })
      .finally(()=> { if (!cancelled) setLoading(false); });
    return ()=> { cancelled=true; active.current=false; };
  },[businessId,gstin,attempt]);
  async function change(action:'save_signatory'|'remove_signatory',person?:SavedSignatory) {
    if (disabled || running.current) return;
    running.current=true;setBusy(true);setError('');
    try {
      const result=await returnAction(businessId,action,{gstin,consent:true,name:name.trim(),pan:newPan.trim().toUpperCase(),signatoryId:person?.id});
      if (!active.current) return;
      setPeople(result.signatories ?? []);
      if (action==='save_signatory') {
        onSelect(newPan.trim().toUpperCase());setAdding(false);setName('');setNewPan('');
      } else if (person?.pan===pan) onSelect('');
    } catch(cause) { if(active.current) setError(cause instanceof Error ? cause.message : 'Could not update saved details.'); }
    finally {running.current=false;if(active.current)setBusy(false);}
  }
  const locked=disabled||busy||loading;
  return <View style={{gap:10}}>
    <Text style={{color:palette.ink,fontSize:16,fontWeight:'700'}}>Authorized signatory</Text>
    <Text style={{color:palette.muted,fontSize:13}}>Saved details you entered for this GST account · Not fetched from GST.</Text>
    <ErrorBanner message={error}/>
    {error ? <Button title="Reload saved details" variant="ghost" disabled={locked} onPress={()=>{setLoading(true);setAttempt(value=>value+1);}}/> : null}
    {loading ? <Text>Loading saved signatories…</Text> : people.map(person=><View key={person.id} style={{borderWidth:1,borderColor:pan===person.pan?palette.blue:palette.line,borderRadius:12,padding:12}}>
      <Pressable accessibilityRole="radio" accessibilityState={{checked:pan===person.pan,disabled:locked}} disabled={locked} onPress={()=>{setAdding(false);onSelect(person.pan);}} style={{minHeight:48,justifyContent:'center',gap:4}}>
        <Text style={{color:palette.ink,fontWeight:'700'}}>{pan===person.pan?'●':'○'} {person.name}</Text>
        <Text style={{color:palette.muted}}>PAN ••••••{person.pan.slice(-4)}</Text>
      </Pressable>
      <Button title="Remove saved details" variant="ghost" disabled={locked} onPress={()=>void change('remove_signatory',person)}/>
    </View>)}
    {!loading && (adding || !people.length) ? <View style={{gap:10}}>
      <Field label="Signatory’s full name" value={name} maxLength={100} editable={!locked} onChangeText={setName}/>
      <Field label="Signatory’s personal PAN" value={newPan} autoCapitalize="characters" autoCorrect={false} maxLength={10} editable={!locked} onChangeText={value=>setNewPan(value.toUpperCase().replace(/\s/g,''))}/>
      <Text style={{color:palette.muted,fontSize:13}}>Use the PAN of the person registered as an authorized signatory on GST. Saving details does not register them on GST.</Text>
      <Button title="Save & select signatory" loading={busy} disabled={locked||!name.trim()||!/^[A-Z]{5}\d{4}[A-Z]$/.test(newPan)} onPress={()=>void change('save_signatory')}/>
      {people.length ? <Button title="Cancel" variant="ghost" disabled={locked} onPress={()=>setAdding(false)}/> : null}
    </View> : !loading ? <Button title="Add another signatory" variant="ghost" disabled={locked} onPress={()=>{onSelect('');setAdding(true);}}/> : null}
  </View>;
}
