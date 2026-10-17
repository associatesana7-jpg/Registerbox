import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/constants/design';

export function GstHeader({title,onBack}:{title:string;onBack:()=>void}) {
  return <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}><Text style={{fontSize:28,color:palette.ink}}>‹</Text></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={{width:36}}/></View>;
}
export function GstTabs({items,value,onChange}:{items:string[];value:string;onChange:(value:string)=>void}) {
  return <View style={styles.tabs}>{items.map(item=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:item===value}} onPress={()=>onChange(item)} style={[styles.tab,item===value&&styles.activeTab]}><Text style={[styles.tabLabel,item===value&&{color:palette.blue}]}>{item}</Text></Pressable>)}</View>;
}
export function GstSelect({label,value,options,onChange,disabled=false}:{label:string;value:string;options:{label:string;value:string}[];onChange:(value:string)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const {width}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const mobile=width<=600;
  const visibleOptions=options.filter(option=>option.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={{gap:8}}><Text style={[styles.label,{fontSize:13,color:palette.ink}]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{text:options.find(option=>option.value===value)?.label||'Not selected'}} accessibilityState={{disabled,expanded:open}} disabled={disabled} onPress={()=>{setQuery('');setOpen(true);}} style={[styles.select,{minHeight:54,paddingVertical:13,opacity:disabled?0.55:1}]}><Text style={{flex:1,minWidth:0,fontSize:16,lineHeight:23,color:value?palette.ink:palette.muted,fontWeight:'600'}}>{options.find(option=>option.value===value)?.label||'Tap to choose'}</Text><Text style={{color:palette.muted,paddingLeft:12}}>⌄</Text></Pressable>
    <Modal visible={open} transparent animationType="none" onRequestClose={()=>setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined} style={[styles.overlay,mobile&&{justifyContent:'flex-end',padding:0}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close options" onPress={()=>setOpen(false)} style={StyleSheet.absoluteFill}/>
        <View accessibilityViewIsModal style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)},mobile&&{maxWidth:600,borderBottomLeftRadius:0,borderBottomRightRadius:0,maxHeight:'85%'}]}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{label}</Text>
          {options.length>8&&<TextInput accessibilityLabel={`Search ${label}`} placeholder="Search options…" placeholderTextColor={palette.muted} autoCorrect={false} autoCapitalize="none" value={query} onChangeText={setQuery} style={{fontSize:16,minHeight:48,paddingHorizontal:13,paddingVertical:10,borderWidth:1,borderColor:palette.line,borderRadius:10,color:palette.ink,marginBottom:10}}/>}
          <ScrollView keyboardShouldPersistTaps="handled">{visibleOptions.map(option=><Pressable accessibilityRole="radio" accessibilityState={{checked:option.value===value,disabled}} disabled={disabled} key={option.value} onPress={()=>{onChange(option.value);setOpen(false);}} style={[styles.option,{gap:14,minHeight:56,backgroundColor:option.value===value?'#F1F6FF':palette.white,paddingHorizontal:10,borderRadius:8}]}><Text style={{flex:1,minWidth:0,lineHeight:23,color:option.value===value?palette.blue:palette.ink,fontSize:16}}>{option.label}</Text><Text style={{color:palette.blue}}>{option.value===value?'●':'○'}</Text></Pressable>)}{!visibleOptions.length&&<Text style={{padding:18,color:palette.muted,fontSize:14}}>No matches. Try a different word.</Text>}</ScrollView>
          <Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={[styles.option,{justifyContent:'center',minHeight:52,borderBottomWidth:0}]}><Text style={{color:palette.blue,fontWeight:'700',fontSize:15}}>Cancel</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
export function GstActionRow({icon,title,onPress}:{icon:string;title:string;onPress:()=>void}) {return <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}><View style={styles.actionIcon}><Text style={{color:palette.blue,fontSize:16}}>{icon}</Text></View><Text style={styles.actionTitle}>{title}</Text><Text style={{color:palette.muted}}>›</Text></Pressable>;}
export const gstStyles=StyleSheet.create({card:{padding:22,borderRadius:22,backgroundColor:palette.white,borderWidth:1,borderColor:'#DFE7F3',boxShadow:'0 6px 24px rgba(18,42,83,0.04)',gap:18},title:{fontSize:18,lineHeight:25,fontWeight:'800',color:palette.ink},caption:{fontSize:14,lineHeight:22,color:palette.muted},stack:{gap:20}});
const styles=StyleSheet.create({header:{minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},back:{width:44,height:48,justifyContent:'center'},headerTitle:{fontSize:21,fontWeight:'800',color:palette.ink,textAlign:'center',flex:1},tabs:{flexDirection:'row',padding:4,borderRadius:16,backgroundColor:'#EDF1F7',gap:3},tab:{flex:1,alignItems:'center',minHeight:48,justifyContent:'center',paddingVertical:12,borderRadius:12},activeTab:{backgroundColor:palette.white,boxShadow:'0 2px 5px rgba(20,60,130,0.07)',borderBottomWidth:2,borderBottomColor:palette.blue},tabLabel:{fontSize:12,color:palette.muted,fontWeight:'600'},label:{fontSize:11,color:palette.muted},select:{minHeight:44,borderWidth:1,borderColor:palette.line,borderRadius:8,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:palette.white},overlay:{flex:1,backgroundColor:'rgba(9,23,58,0.3)',alignItems:'center',justifyContent:'center',padding:24},sheet:{width:'100%',maxWidth:380,maxHeight:'75%',backgroundColor:palette.white,borderRadius:18,padding:18},sheetTitle:{fontSize:16,fontWeight:'800',color:palette.ink,marginBottom:10},option:{minHeight:48,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#EDF1F7'},action:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:'#F1F4FA'},actionIcon:{height:29,width:29,borderRadius:8,backgroundColor:'#EDF4FF',alignItems:'center',justifyContent:'center'},actionTitle:{flex:1,fontSize:14,color:palette.muted},});
