import { Pressable, Text, View } from 'react-native';
import { palette } from '@/constants/design';

export function GstCheckbox({checked,disabled=false,label,onPress}:{checked:boolean;disabled?:boolean;label:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked,disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>({minHeight:52,flexDirection:'row',alignItems:'flex-start',gap:12,paddingVertical:12,opacity:disabled?0.5:pressed?0.75:1})}>
    <View style={{width:24,height:24,marginTop:1,borderRadius:7,borderWidth:2,borderColor:checked?palette.blue:'#A7B5CC',backgroundColor:checked?palette.blue:palette.white,alignItems:'center',justifyContent:'center'}}>
      {checked?<Text style={{color:palette.white,fontSize:16,lineHeight:20,fontWeight:'800'}}>✓</Text>:null}
    </View><Text style={{flex:1,fontSize:14,lineHeight:22,color:palette.ink}}>{label}</Text>
  </Pressable>;
}
