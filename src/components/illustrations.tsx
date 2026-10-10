import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/design';

export function TownIllustration() {
  const buildings = [70, 92, 122, 83, 112, 78, 138, 95, 115, 74];
  return <View style={styles.town}>
    <View style={styles.skyGlow} />
    <View style={styles.skyline}>{buildings.map((height,index)=><View key={index} style={[styles.skyBuilding,{height,width:index%3===0?34:28,opacity:index%2===0?0.7:0.45}]}>
      {index%3===0?<View style={styles.skyDome}/>:null}
      {index%4===0?<View style={styles.spire}/>:null}
      <View style={styles.skyWindows}><View style={styles.skyWindow}/><View style={styles.skyWindow}/></View>
    </View>)}</View>
    <View style={styles.skyGround} />
    <View style={styles.skyRoad} />
  </View>;
}

export function BotIllustration({ rocket = false }: { rocket?: boolean }) {
  if (rocket) return <View style={styles.orbit}><Text style={styles.rocket}>🚀</Text><View style={styles.orbitLine} /></View>;
  return <View style={styles.botWrap}><LinearGradient colors={['#EEF5FF', '#DDEAFF']} style={styles.botGlow}><View style={styles.botHead}><View style={styles.botScreen}><Text style={styles.botFace}>•‿•</Text></View></View><View style={styles.botBody}><Text style={{ color: palette.blue, fontWeight: '900' }}>✓</Text></View></LinearGradient></View>;
}

export function DocumentCelebration() {
  return <View style={styles.docWrap}><Text style={styles.confetti}>✦   •   ✧</Text><View style={styles.document}><View style={styles.docLine} /><View style={[styles.docLine, { width: 46 }]} /><Text style={styles.docCheck}>✓</Text></View></View>;
}

const styles = StyleSheet.create({
  town: { height: 250, justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' },
  skyGlow: { position: 'absolute', alignSelf: 'center', top: 0, width: 280, height: 170, borderRadius: 160, backgroundColor: '#EDF6FF' },
  skyline: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  skyBuilding: { backgroundColor: '#B6D9FB', borderTopLeftRadius: 9, borderTopRightRadius: 9, alignItems: 'center', paddingTop: 22 },
  skyDome: { position: 'absolute', top: -15, width: 25, height: 22, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#A5D1FB' },
  spire: { position: 'absolute', top: -27, width: 3, height: 28, backgroundColor: '#A5D1FB' },
  skyWindows: { flexDirection: 'row', gap: 6 },
  skyWindow: { width: 4, height: 7, borderRadius: 2, backgroundColor: '#F8FCFF' },
  skyGround: { position: 'absolute', bottom: 0, height: 30, left: 0, right: 0, backgroundColor: '#C7E5FE', borderTopLeftRadius: 45, borderTopRightRadius: 45 },
  skyRoad: { position: 'absolute', bottom: -95, alignSelf: 'center', height: 125, width: 140, backgroundColor: '#F6FAFF', borderTopLeftRadius: 70, borderTopRightRadius: 70 },
  botWrap: { alignItems: 'center', paddingVertical: 8 },
  botGlow: { width: 210, height: 190, borderRadius: 105, alignItems: 'center', justifyContent: 'center' },
  botHead: { width: 94, height: 67, borderRadius: 30, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#BFD4F8' },
  botScreen: { width: 65, height: 38, borderRadius: 16, backgroundColor: palette.navy2, alignItems: 'center', justifyContent: 'center' },
  botFace: { color: '#69C7FF', fontWeight: '900', fontSize: 22 },
  botBody: { width: 65, height: 48, backgroundColor: palette.white, borderRadius: 20, borderWidth: 3, borderColor: '#BFD4F8', alignItems: 'center', justifyContent: 'center', marginTop: -5 },
  orbit: { height: 180, alignItems: 'center', justifyContent: 'center' },
  rocket: { fontSize: 78, transform: [{ rotate: '-10deg' }], zIndex: 2 },
  orbitLine: { position: 'absolute', width: 170, height: 170, borderRadius: 90, borderWidth: 1, borderColor: '#D8E5FA' },
  docWrap: { height: 210, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 18, color: '#FCB223', fontSize: 28 },
  document: { width: 110, height: 140, borderRadius: 12, backgroundColor: palette.white, borderWidth: 2, borderColor: '#C7D8F5', padding: 20, gap: 12, transform: [{ rotate: '-4deg' }], boxShadow: '0 16px 30px rgba(40,104,240,0.15)' },
  docLine: { width: 68, height: 7, borderRadius: 4, backgroundColor: '#A9C6F7' },
  docCheck: { position: 'absolute', right: -18, bottom: 18, width: 48, height: 48, borderRadius: 24, backgroundColor: palette.green, color: palette.white, textAlign: 'center', lineHeight: 48, fontSize: 28, fontWeight: '900' },
});
