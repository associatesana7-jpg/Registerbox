import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';
import { palette } from '@/constants/design';

const artwork = {
  gstReturn: require('../../assets/images/action-icons/gst-return.png'),
  businessCheck: require('../../assets/images/action-icons/business-check.png'),
  gstRegistration: require('../../assets/images/action-icons/gst-registration.png'),
  newBusiness: require('../../assets/images/action-icons/new-business.png'),
  company: require('../../assets/images/action-icons/company.png'),
  llp: require('../../assets/images/action-icons/llp.png'),
  food: require('../../assets/images/action-icons/food.png'),
  retail: require('../../assets/images/action-icons/retail.png'),
  manufacturing: require('../../assets/images/action-icons/manufacturing.png'),
  online: require('../../assets/images/action-icons/online.png'),
  branch: require('../../assets/images/action-icons/branch.png'),
} satisfies Record<string, ImageSourcePropType>;

export const businessGoals = [
  { art:artwork.gstRegistration,title:'Apply for GST\nRegistration',prompt:'I want to apply for GST registration' },
  { art:artwork.newBusiness,title:'Start a New\nBusiness',prompt:'I want to start a new business' },
  { art:artwork.company,title:'Register a Private\nLimited Company',prompt:'I want to register a private limited company' },
  { art:artwork.llp,title:'Register an LLP',prompt:'I want to register an LLP' },
  { art:artwork.food,title:'Start a Food\nBusiness',prompt:'I want to start a food business' },
  { art:artwork.retail,title:'Open a Shop /\nRetail Business',prompt:'I want to open a retail shop' },
  { art:artwork.manufacturing,title:'Start\nManufacturing',prompt:'I want to start a manufacturing business' },
  { art:artwork.online,title:'Start an Online\nBusiness',prompt:'I want to start an online business' },
  { art:artwork.branch,title:'Open a New Branch',prompt:'I want to open a new branch of my business',compact:true },
];
export function BusinessActionGrid({onGoal,onGst,onExisting}:{onGoal:(prompt:string)=>void;onGst:()=>void;onExisting:()=>void}) {
  return <View style={{gap:9}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
      <Tile art={artwork.gstReturn} title="File a GST Return" detail="GSTR-1 · GSTR-3B · Nil" onPress={onGst} featured/>
      <Tile art={artwork.businessCheck} title="Check My Business" detail="Review compliance" onPress={onExisting}/>
      {businessGoals.map(goal=><Tile key={goal.prompt} {...goal} onPress={()=>onGoal(goal.prompt)}/>)}
    </View>
  </View>;
}
function Tile({art,title,detail,onPress,featured=false,compact=false}:{art:ImageSourcePropType;title:string;detail?:string;onPress:()=>void;featured?:boolean;compact?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title.replace(/\n/g,' ')} onPress={onPress} style={({pressed})=>({width:'48.6%',minHeight:compact?98:148,paddingHorizontal:9,paddingVertical:10,borderWidth:1,borderColor:featured?'#A6C9FF':'#E0E9F7',borderRadius:14,backgroundColor:featured?'#EEF5FF':palette.white,alignItems:'center',justifyContent:'center',gap:4,opacity:pressed?0.75:1})}>
    <Image source={art} accessibilityIgnoresInvertColors style={{width:compact?58:78,height:compact?58:78}} resizeMode="contain"/><Text style={{textAlign:'center',fontSize:13,lineHeight:17,fontWeight:'800',color:palette.ink}}>{title}</Text>{detail?<Text style={{fontSize:10,color:palette.muted,textAlign:'center'}}>{detail}</Text>:null}
  </Pressable>;
}
