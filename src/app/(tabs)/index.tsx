import { router } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { BusinessActionGrid } from '@/components/business-action-grid';
import { Brand, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { BusinessProfilePicker } from '@/components/business-profile-picker';
import { categoryFromLegacyPrompt } from '@/data/application-categories';

export default function HomeScreen() {
  const begin=(prompt:string)=>router.push({pathname:'/onboarding/application',params:{category:categoryFromLegacyPrompt(prompt)}});
  return <Screen><View style={{gap:20}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Brand compact/><Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={()=>router.push('/(tabs)/account')} style={{height:38,width:38,alignItems:'center',justifyContent:'center'}}><Image source={require('../../../assets/images/action-icons/settings.png')} style={{width:42,height:42}} resizeMode="contain"/></Pressable></View>
    <View style={{gap:7,paddingTop:10}}><Text style={{color:palette.ink,fontSize:27,lineHeight:31,fontWeight:'900',letterSpacing:-0.7}}>What would you like{`\n`}to do?</Text><Text style={{color:palette.muted,fontSize:13,lineHeight:19}}>Choose from the options below to get started. You can always explore more later.</Text></View>
    <BusinessProfilePicker/>
    <BusinessActionGrid onGoal={begin} onGst={()=>router.push('/gst')} onExisting={()=>begin('Check compliance requirements for my existing business')}/>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/ai')} style={{flexDirection:'row',gap:12,alignItems:'center',borderWidth:1,borderColor:palette.line,borderRadius:12,padding:14,backgroundColor:palette.white}}><Text style={{fontSize:25,color:palette.blue}}>✦</Text><View style={{flex:1,gap:3}}><Text style={{fontSize:13,color:palette.ink,fontWeight:'800'}}>Not sure where to start?</Text><Text style={{fontSize:11,color:palette.muted}}>Ask RegisterBox AI in plain language</Text></View><Text style={{color:palette.blue}}>›</Text></Pressable>
  </View></Screen>;
}
