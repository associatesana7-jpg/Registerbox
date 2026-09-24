import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/design';

export function TownIllustration() {
  return <View style={styles.town}><View style={styles.moon} /><Shop color="#1464C8" label="CAFE" /><Shop color="#6B4AC9" label="CAVE" tall /><View style={styles.road} /></View>;
}

function Shop({ color, label, tall }: { color: string; label: string; tall?: boolean }) {
  return <View style={[styles.shop, { backgroundColor: color, height: tall ? 124 : 105 }]}><View style={styles.awning}><Text style={styles.shopText}>{label}</Text></View><View style={styles.window} /><View style={styles.door} /></View>;
}

export function BotIllustration({ rocket = false }: { rocket?: boolean }) {
  if (rocket) return <View style={styles.orbit}><Text style={styles.rocket}>🚀</Text><View style={styles.orbitLine} /></View>;
  return <View style={styles.botWrap}><LinearGradient colors={['#EEF5FF', '#DDEAFF']} style={styles.botGlow}><View style={styles.botHead}><View style={styles.botScreen}><Text style={styles.botFace}>•‿•</Text></View></View><View style={styles.botBody}><Text style={{ color: palette.blue, fontWeight: '900' }}>✓</Text></View></LinearGradient></View>;
}

export function DocumentCelebration() {
  return <View style={styles.docWrap}><Text style={styles.confetti}>✦   •   ✧</Text><View style={styles.document}><View style={styles.docLine} /><View style={[styles.docLine, { width: 46 }]} /><Text style={styles.docCheck}>✓</Text></View></View>;
}

const styles = StyleSheet.create({
  town: { height: 210, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 14, position: 'relative' },
  moon: { position: 'absolute', right: 30, top: 10, width: 58, height: 58, borderRadius: 30, backgroundColor: 'rgba(159,111,255,0.3)' },
  shop: { width: 108, borderRadius: 8, alignItems: 'center', paddingTop: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.24)' },
  awning: { position: 'absolute', top: -14, width: 116, height: 29, backgroundColor: '#F0B15D', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  shopText: { fontSize: 10, fontWeight: '900', color: palette.white },
  window: { width: 46, height: 35, marginTop: 20, borderRadius: 4, backgroundColor: '#80CFFF', borderWidth: 5, borderColor: '#153A71' },
  door: { width: 30, height: 40, position: 'absolute', bottom: 0, backgroundColor: '#102E64', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  road: { position: 'absolute', left: 0, right: 0, bottom: -7, height: 12, borderRadius: 8, backgroundColor: '#12356E' },
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
