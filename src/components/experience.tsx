import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { palette, radius } from '@/constants/design';

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={{ color: palette.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 }}>{children}</Text>;
}

export function ScreenTitle({ title, subtitle, overline }: { title: string; subtitle?: string; overline?: string }) {
  return <View style={{ gap: 7, paddingBottom: 6 }}>
    {overline ? <Eyebrow>{overline}</Eyebrow> : null}
    <Text selectable style={{ color: palette.ink, fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8 }}>{title}</Text>
    {subtitle ? <Text selectable style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>{subtitle}</Text> : null}
  </View>;
}

export function SoftNotice({ title, detail, tone = 'blue', icon }: { title: string; detail?: string; tone?: 'blue' | 'green' | 'amber' | 'red'; icon?: string }) {
  const values = {
    blue: { bg: '#EAF3FF', fg: palette.blue },
    green: { bg: palette.greenBg, fg: palette.green },
    amber: { bg: palette.amberBg, fg: palette.amber },
    red: { bg: palette.redBg, fg: palette.red },
  }[tone];
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: radius.sm, backgroundColor: values.bg }}>
    <Text style={{ color: values.fg, fontSize: 18, fontWeight: '900', width: 24, textAlign: 'center' }}>{icon || (tone === 'green' ? '✓' : tone === 'red' ? '!' : '✦')}</Text>
    <View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: values.fg, fontSize: 13, fontWeight: '800' }}>{title}</Text>{detail ? <Text selectable style={{ color: palette.ink, fontSize: 11, lineHeight: 17 }}>{detail}</Text> : null}</View>
  </View>;
}

export function FlowProgress({ current, total, labels }: { current: number; total: number; labels?: string[] }) {
  const progress = Math.min(100, Math.max(0, (current / total) * 100));
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700' }}>{labels?.[current - 1] || `Step ${current} of ${total}`}</Text><Text style={{ color: palette.blue, fontSize: 11, fontWeight: '800' }}>{Math.round(progress)}%</Text></View>
    <View style={{ height: 7, borderRadius: 4, backgroundColor: '#E7EFFB', overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: 7, borderRadius: 4, backgroundColor: palette.blue }} /></View>
  </View>;
}

export function DataRow({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : tone === 'red' ? palette.red : palette.ink;
  return <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, minHeight: 28 }}>
    <Text selectable style={{ flex: 1, color: strong ? palette.ink : palette.muted, fontSize: 12, fontWeight: strong ? '800' : '500' }}>{label}</Text>
    <Text selectable style={{ color, fontSize: strong ? 15 : 12, fontWeight: '800', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{value}</Text>
  </View>;
}

export function StatTile({ label, value, detail, tone = 'blue' }: { label: string; value: string; detail?: string; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : tone === 'red' ? palette.red : palette.blue;
  return <View style={{ flex: 1, minWidth: 110, minHeight: 92, gap: 5, borderWidth: 1, borderColor: palette.line, borderRadius: radius.sm, backgroundColor: palette.white, padding: 12 }}>
    <Text selectable style={{ color: palette.muted, fontSize: 10, lineHeight: 15, fontWeight: '700' }}>{label}</Text>
    <Text selectable style={{ color, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{value}</Text>
    {detail ? <Text selectable style={{ color: palette.muted, fontSize: 10 }}>{detail}</Text> : null}
  </View>;
}

export function NavTile({ title, detail, icon, onPress, selected = false, trailing }: { title: string; detail?: string; icon: string; onPress: () => void; selected?: boolean; trailing?: ReactNode }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, padding: 12, borderWidth: 1, borderColor: selected ? palette.blue : palette.line, borderRadius: radius.sm, backgroundColor: selected ? palette.sky : palette.white, opacity: pressed ? 0.86 : 1 })}>
    <View style={{ width: 39, height: 39, borderRadius: 11, backgroundColor: selected ? '#D9E9FF' : '#F0F5FD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.blue, fontSize: 18 }}>{icon}</Text></View>
    <View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: palette.ink, fontSize: 13, fontWeight: '800' }}>{title}</Text>{detail ? <Text selectable style={{ color: palette.muted, fontSize: 10, lineHeight: 15 }}>{detail}</Text> : null}</View>
    {trailing || <Text style={{ color: palette.blue, fontSize: 19 }}>{selected ? '◉' : '›'}</Text>}
  </Pressable>;
}

export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text selectable style={{ color: palette.ink, fontSize: 16, fontWeight: '900' }}>{title}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction}><Text style={{ color: palette.blue, fontSize: 12, fontWeight: '800' }}>{action}</Text></Pressable> : null}</View>;
}
