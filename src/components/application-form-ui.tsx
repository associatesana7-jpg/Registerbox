import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/constants/design';
import { applicationPhase } from '@/lib/application-form-presentation';

export function ApplicationProgress({step,documentStep,reviewStep,hasDocuments=true,optionalDocuments=false}:{step:number;documentStep:number;reviewStep:number;hasDocuments?:boolean;optionalDocuments?:boolean}){
  const phase=!hasDocuments&&step>=reviewStep?3:applicationPhase(step,documentStep,reviewStep);
  const phases=hasDocuments?['Business','Details',optionalDocuments?'Records':'Docs','Review']:['Business','Details','Review'];
  const displayPhase=!hasDocuments&&phase===3?2:phase;
  const label=phase===0?'Start with your business':phase===1?`Question ${step} of ${documentStep-1}`:phase===2?(optionalDocuments?'Optional supporting records':'Add your documents'):'Check before sending';
  return <View style={styles.progress}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text accessibilityLiveRegion="polite" style={styles.progressLabel}>{label}</Text><Text style={styles.phaseCount}>{displayPhase+1} / {phases.length}</Text></View>
    <View accessibilityRole="progressbar" accessibilityValue={{min:1,max:phases.length,now:displayPhase+1,text:phases[displayPhase]}} style={styles.phaseRow}>{phases.map((item,index)=><View key={item} style={{flex:1,gap:7}}><View style={[styles.phaseBar,index<=displayPhase&&{backgroundColor:palette.blue}]}/><Text style={[styles.phaseName,index===displayPhase&&{color:palette.ink,fontWeight:'800'}]}>{item}</Text></View>)}</View>
  </View>;
}

export function ApplicationChoices({options,value,onChange,disabled}:{options:string[];value:string;onChange:(value:string)=>void;disabled:boolean;label?:string}){
  return <View style={{gap:10}}>{options.map(option=><Pressable key={option} accessibilityRole="radio" accessibilityState={{checked:option===value,disabled}} disabled={disabled} onPress={()=>onChange(option)} style={({pressed})=>[styles.choice,option===value&&styles.selected,pressed&&{opacity:0.85},disabled&&{opacity:0.6}]}><Text style={[styles.choiceLabel,option===value&&{color:palette.blue}]}>{option}</Text><View style={[styles.radio,option===value&&{borderColor:palette.blue}]}>{option===value&&<View style={styles.radioFill}/>}</View></Pressable>)}</View>;
}

export function ApplicationFooter({title,busy,disabled,onContinue,onBack,review=false,saved=false}:{title:string;busy:boolean;disabled:boolean;onContinue:()=>void;onBack?:()=>void;review?:boolean;saved?:boolean}){
  return <View style={{gap:10}}>
    <Text style={styles.footerNote}>{saved?'Sent to RegisterBox, not a government portal':busy?(review?'Sending to RegisterBox…':'Saving your progress…'):review?'Sends your case to RegisterBox for review. Not government filing.':'Your progress is saved when you continue.'}</Text>
    <View style={{flexDirection:'row',gap:10}}>{onBack&&!saved&&<Pressable accessibilityRole="button" accessibilityLabel="Previous question" disabled={busy||disabled} onPress={onBack} style={[styles.back,(busy||disabled)&&{opacity:0.5}]}><Text style={{fontSize:15,fontWeight:'700',color:palette.ink}}>Back</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:busy||disabled,busy}} disabled={busy||disabled} onPress={onContinue} style={[styles.continue,(busy||disabled)&&{opacity:0.5}]}><Text style={styles.continueText}>{busy?'Please wait…':title}</Text>{!busy&&<Text style={{color:'white',fontSize:19}}>→</Text>}</Pressable></View>
  </View>;
}

const styles=StyleSheet.create({
  progress:{gap:12,paddingBottom:6},progressLabel:{fontSize:13,lineHeight:20,color:palette.ink,fontWeight:'700',flex:1},phaseCount:{fontSize:12,color:palette.muted},phaseRow:{flexDirection:'row',gap:10},phaseBar:{height:4,borderRadius:4,backgroundColor:palette.line},phaseName:{fontSize:11,color:palette.muted},
  choice:{minHeight:58,paddingHorizontal:16,paddingVertical:14,borderRadius:13,borderWidth:1,borderColor:palette.line,backgroundColor:palette.white,flexDirection:'row',alignItems:'center',gap:16},selected:{borderColor:palette.blue,backgroundColor:'#F0F6FF'},choiceLabel:{flex:1,fontSize:16,lineHeight:23,color:palette.ink,fontWeight:'600'},radio:{height:21,width:21,borderRadius:11,borderWidth:1.5,borderColor:'#A3B0C8',alignItems:'center',justifyContent:'center'},radioFill:{width:11,height:11,borderRadius:6,backgroundColor:palette.blue},
  footerNote:{fontSize:11,lineHeight:16,color:palette.muted,textAlign:'center'},back:{minWidth:76,minHeight:54,paddingHorizontal:16,paddingVertical:14,borderWidth:1,borderColor:palette.line,borderRadius:12,backgroundColor:'white',alignItems:'center',justifyContent:'center'},continue:{flex:1,minWidth:0,minHeight:54,paddingHorizontal:17,paddingVertical:14,backgroundColor:palette.blue,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},continueText:{color:'white',fontSize:16,lineHeight:23,fontWeight:'800',flexShrink:1},
});
