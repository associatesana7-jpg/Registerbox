import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { contentWidth, palette, radius } from '@/constants/design';

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <LinearGradient colors={['#387DFF', '#174CCF']} style={[styles.logo, compact && { width: 27, height: 27, borderRadius: 8 }]}>
        <Text style={[styles.logoText, compact && { fontSize: 14 }]}>◇</Text>
      </LinearGradient>
      <Text selectable style={[styles.brandText, light && { color: palette.white }, compact && { fontSize: 17 }]}>RegisterBox</Text>
    </View>
  );
}

type ScreenProps = PropsWithChildren<{ footer?: ReactNode; dark?: boolean; padded?: boolean; header?: ReactNode }>;

export function Screen({ children, footer, dark = false, padded = true, header }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.page, { backgroundColor: dark ? palette.navy : palette.pale }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 20) + (footer ? 88 : 0) },
          padded && { paddingHorizontal: width > 700 ? 32 : 20 },
        ]}>
        <View style={styles.contentWidth}>{header}{children}</View>
      </ScrollView>
      {footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}><View style={styles.contentWidth}>{footer}</View></View>}
    </View>
  );
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return (
    <View style={styles.pageHeader}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>}
      <View style={{ flex: 1 }}>
        <Text selectable style={styles.h1}>{title}</Text>
        {subtitle && <Text selectable style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, icon }: { title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'dark'; loading?: boolean; disabled?: boolean; icon?: string }) {
  const content = loading ? <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? palette.blue : palette.white} /> : <Text style={[styles.buttonText, (variant === 'secondary' || variant === 'ghost') && styles.buttonTextSecondary]}>{title}{icon ? `  ${icon}` : ''}</Text>;
  if (variant === 'primary') return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}><LinearGradient colors={[palette.blue2, palette.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>{content}</LinearGradient></Pressable>;
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondaryButton, variant === 'ghost' && styles.ghostButton, variant === 'dark' && styles.darkButton, pressed && styles.pressed, disabled && styles.disabled]}>{content}</Pressable>;
}

export function Field({ label, prefix, style, ...props }: TextInputProps & { label?: string; prefix?: string }) {
  return <View style={{ gap: 7 }}>{label && <Text selectable style={styles.label}>{label}</Text>}<View style={styles.fieldWrap}>{prefix && <Text style={styles.prefix}>{prefix}</Text>}<TextInput placeholderTextColor="#97A4BF" {...props} style={[styles.field, style]} /></View></View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[styles.card, style]}>{children}</View>; }

export function Badge({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray' }) {
  const map = { blue: [palette.sky, palette.blue], green: [palette.greenBg, palette.green], amber: [palette.amberBg, palette.amber], red: [palette.redBg, palette.red], gray: ['#F0F3F8', palette.muted] } as const;
  return <View style={[styles.badge, { backgroundColor: map[tone][0] }]}><Text style={[styles.badgeText, { color: map[tone][1] }]}>{label}</Text></View>;
}

export function Choice({ label, selected, onPress, icon, detail }: { label: string; selected?: boolean; onPress?: () => void; icon?: string; detail?: string }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>{icon && <Text style={styles.choiceIcon}>{icon}</Text>}<View style={{ flex: 1 }}><Text selectable style={styles.choiceLabel}>{label}</Text>{detail && <Text selectable style={styles.choiceDetail}>{detail}</Text>}</View>{selected && <Text style={styles.check}>✓</Text>}</Pressable>;
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: string }>) { return <View style={styles.sectionTitleRow}><Text selectable style={styles.sectionTitle}>{children}</Text>{action && <Text style={styles.link}>{action}</Text>}</View>; }

export function StepDot({ state = 'todo' }: { state?: 'done' | 'active' | 'todo' }) { return <View style={[styles.stepDot, state === 'done' && styles.stepDone, state === 'active' && styles.stepActive]}>{state === 'done' && <Text style={styles.stepCheck}>✓</Text>}</View>; }

export function ErrorBanner({ message }: { message?: string }) { if (!message) return null; return <View style={styles.error}><Text selectable style={styles.errorText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', gap: 20 },
  contentWidth: { width: '100%', maxWidth: contentWidth, alignSelf: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: palette.line },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }] },
  logoText: { color: palette.white, fontWeight: '900', fontSize: 19 },
  brandText: { fontSize: 20, color: palette.ink, fontWeight: '800', letterSpacing: -0.5 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 20 },
  back: { color: palette.ink, fontSize: 34, lineHeight: 34 },
  h1: { color: palette.ink, fontWeight: '800', fontSize: 25, lineHeight: 31, letterSpacing: -0.5 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, paddingTop: 5 },
  button: { minHeight: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { color: palette.white, fontWeight: '800', fontSize: 15 },
  buttonTextSecondary: { color: palette.blue },
  secondaryButton: { backgroundColor: palette.white, borderWidth: 1.5, borderColor: palette.blue },
  ghostButton: { minHeight: 44, backgroundColor: 'transparent' },
  darkButton: { backgroundColor: palette.navy2 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.992 }] },
  disabled: { opacity: 0.5 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '700' },
  fieldWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: radius.sm, overflow: 'hidden' },
  field: { flex: 1, minHeight: 50, color: palette.ink, fontSize: 15, paddingHorizontal: 14 },
  prefix: { color: palette.green, fontWeight: '800', paddingLeft: 14, paddingRight: 4 },
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: radius.md, padding: 16, gap: 12, boxShadow: '0 8px 24px rgba(21, 63, 135, 0.07)' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  choice: { minHeight: 58, borderWidth: 1, borderColor: palette.line, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceSelected: { borderColor: palette.blue, backgroundColor: palette.sky },
  choiceIcon: { width: 30, fontSize: 20, textAlign: 'center' },
  choiceLabel: { color: palette.ink, fontWeight: '700', fontSize: 14 },
  choiceDetail: { color: palette.muted, fontSize: 11, paddingTop: 3 },
  check: { color: palette.blue, fontWeight: '900', fontSize: 17 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  sectionTitle: { color: palette.ink, fontWeight: '800', fontSize: 17 },
  link: { color: palette.blue, fontWeight: '700', fontSize: 12 },
  stepDot: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#B8C6DD', backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: palette.green, borderColor: palette.green },
  stepActive: { borderColor: palette.blue, borderWidth: 5 },
  stepCheck: { color: palette.white, fontSize: 10, fontWeight: '900' },
  error: { backgroundColor: palette.redBg, borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: '#FFD5D5' },
  errorText: { color: '#B4232A', fontSize: 13, lineHeight: 18, fontWeight: '600' },
});

export const uiStyles = styles;
