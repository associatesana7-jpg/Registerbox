import { Text, View, type ColorValue } from 'react-native';
import { useFonts } from 'expo-font';
import { palette } from '@/constants/design';

// Material Symbols codepoints, not platform-dependent emoji. Uses the existing bundled font.
const glyphs={home:'e9b2',grid:'e9b0',document:'e873',shield:'e9e0',receipt:'ef6e',spark:'e65f',person:'f0d3',arrow:'e5c8',chevron:'e5cc',back:'e5cb',search:'ef7a',add:'e145',business:'e7ee',check:'e668',close:'e5cd',folder:'e2c7',upload:'f09b',info:'e88e',logout:'e9ba',bell:'e7f5',verified:'ef76',clock:'efd6',lock:'e899',settings:'e429',help:'e8fd',download:'f090',pending:'f1bb',done:'e2e6'} as const;
export type AppIconName=keyof typeof glyphs;
export function AppIcon({name,size=22,color=palette.ink}:{name:AppIconName;size?:number;color?:ColorValue}){
  const [loaded]=useFonts({RegisterBoxSymbols:require('../../assets/fonts/MaterialSymbols-Regular.ttf')});
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>{loaded?<Text selectable={false} style={{fontFamily:'RegisterBoxSymbols',fontSize:size,lineHeight:size,includeFontPadding:false,color}}>{String.fromCodePoint(parseInt(glyphs[name],16))}</Text>:<View style={{width:size*0.55,height:size*0.55,borderRadius:4,borderWidth:1.5,borderColor:color,opacity:0.4}}/>}</View>;
}
