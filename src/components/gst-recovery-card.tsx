import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card } from './registerbox-ui';
import { GstCheckbox } from './gst-checkbox';
import { palette } from '@/constants/design';
import type { GstRecovery } from '@/lib/gst-return-recovery';

export function GstRecoveryCard({recovery,disabled,onResolve}:{recovery:GstRecovery;disabled:boolean;onResolve:()=>void}) {
  const [approved,setApproved]=useState(false);
  return <Card>
    <Text accessibilityRole="header" style={{color:palette.ink,fontSize:19,fontWeight:'600'}}>{recovery.title}</Text>
    <Text style={{color:palette.muted,fontSize:14,lineHeight:22}}>{recovery.detail}</Text>
    {recovery.consent?<GstCheckbox label={recovery.consent} checked={approved} disabled={disabled} onPress={()=>setApproved(!approved)}/>:null}
    <Button title={recovery.label} disabled={disabled||!!recovery.consent&&!approved} onPress={onResolve}/>
  </Card>;
}
