import { Image } from 'expo-image';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { palette } from '@/constants/design';
import './workspace-primitives.css';

const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <View style={styles.brandRow}>
    <Image source={require('../../assets/images/registerbox-app-icon.png')} contentFit="contain" accessibilityLabel="RegisterBox brand logo" style={{ width: compact ? 34 : 44, height: compact ? 34 : 44, backgroundColor: '#FFFFFF', borderRadius: 8 }} />
    <Text selectable style={[styles.brandText, light && { color: palette.white }, compact && { fontSize: 17 }]}>RegisterBox</Text>
  </View>;
}

type ScreenProps = PropsWithChildren<{ footer?: ReactNode; dark?: boolean; padded?: boolean; header?: ReactNode }>;

export function Screen({ children, footer, dark = false, padded = true, header }: ScreenProps) {
  return <div className={`rb-ui-screen${dark ? ' rb-ui-screen--dark' : ''}`}>
    <div className={`rb-ui-screen__scroll${padded ? '' : ' rb-ui-screen__scroll--unpadded'}`}>
      <div className="rb-ui-screen__content">{header}{children}</div>
    </div>
    {footer ? <div className="rb-ui-screen__footer"><div className="rb-ui-screen__content">{footer}</div></div> : null}
  </div>;
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return <header className="rb-ui-page-header">
    {back ? <button type="button" className="rb-ui-icon-button" aria-label="Go back" onClick={back}><span aria-hidden="true">‹</span></button> : null}
    <div className="rb-ui-page-header__copy"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
  </header>;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, icon }: { title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'dark'; loading?: boolean; disabled?: boolean; icon?: string }) {
  return <button type="button" className={`rb-ui-button rb-ui-button--${variant}`} aria-label={title} aria-busy={loading || undefined} disabled={disabled || loading} onClick={onPress}>
    <span className="rb-ui-button__label">{title}{icon ? <span aria-hidden="true">{icon}</span> : null}</span>
    {loading ? <span className="rb-ui-spinner" aria-hidden="true"/> : null}
  </button>;
}

export function Field({ label, prefix, style, onFocus, onBlur, ...props }: TextInputProps & { label?: string; prefix?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}>
    {label ? <Text selectable style={styles.label}>{label}</Text> : null}
    <View testID="rb-ui-field" style={[styles.fieldWrap, focused && { borderColor: '#0071E3', backgroundColor: '#FFFFFF' }, props.editable === false && { backgroundColor: '#F5F5F7' }]}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput placeholderTextColor="#6E6E73" {...props} accessibilityLabel={props.accessibilityLabel || label} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} style={[styles.field, style]} />
    </View>
  </View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View testID="rb-ui-card" style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray' }) {
  const tones = { blue: ['#EDF5FF', '#0068D0'], green: ['#EBF5EF', '#267347'], amber: ['#FFF5E5', '#895D18'], red: ['#FFF0F1', '#B4232A'], gray: ['#F1F1F3', '#626268'] } as const;
  return <View style={[styles.badge, { backgroundColor: tones[tone][0] }]}><Text style={[styles.badgeText, { color: tones[tone][1] }]}>{label}</Text></View>;
}

export function Choice({ label, selected, onPress, icon, detail, disabled = false }: { label: string; selected?: boolean; onPress?: () => void; icon?: string; detail?: string; disabled?: boolean }) {
  return <button type="button" className={`rb-ui-choice${selected ? ' is-selected' : ''}`} aria-pressed={selected ?? false} disabled={disabled} onClick={onPress}>
    {icon ? <span className="rb-ui-choice__icon" aria-hidden="true">{icon}</span> : null}
    <span className="rb-ui-choice__copy"><span className="rb-ui-choice__label">{label}</span>{detail ? <span className="rb-ui-choice__detail">{detail}</span> : null}</span>
    {selected ? <span className="rb-ui-choice__check" aria-hidden="true">✓</span> : null}
  </button>;
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: string }>) {
  return <div className="rb-ui-section-title"><h2>{children}</h2>{action ? <span>{action}</span> : null}</div>;
}

export function StepDot({ state = 'todo' }: { state?: 'done' | 'active' | 'todo' }) {
  return <View style={[styles.stepDot, state === 'done' && styles.stepDone, state === 'active' && styles.stepActive]}>{state === 'done' ? <Text style={styles.stepCheck}>✓</Text> : null}</View>;
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="rb-ui-error" role="alert">{message}</div>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollContent: { flexGrow: 1, alignItems: 'center', gap: 20 },
  contentWidth: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 20 },
  footer: { paddingVertical: 16, paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E5E7' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 19 },
  brandText: { fontFamily: systemFont, fontSize: 20, color: '#1D1D1F', fontWeight: '700', letterSpacing: -0.7 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 8 },
  backButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E7' },
  back: { color: '#1D1D1F', fontSize: 30, lineHeight: 34 },
  h1: { fontFamily: systemFont, color: '#1D1D1F', fontWeight: '600', fontSize: 32, lineHeight: 39, letterSpacing: -1 },
  subtitle: { fontFamily: systemFont, color: '#6E6E73', fontSize: 15, lineHeight: 23, paddingTop: 8 },
  button: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 11, backgroundColor: '#0071E3' },
  buttonText: { fontFamily: systemFont, color: '#FFFFFF', fontWeight: '600', fontSize: 14, lineHeight: 21, textAlign: 'center', flexShrink: 1 },
  buttonTextSecondary: { color: '#0071E3' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7D7DB' },
  ghostButton: { minHeight: 44, backgroundColor: 'transparent' },
  darkButton: { backgroundColor: '#1D1D1F' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
  label: { fontFamily: systemFont, color: '#1D1D1F', fontSize: 13, fontWeight: '600' },
  fieldWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7D7DB', borderRadius: 10, overflow: 'hidden' },
  field: { fontFamily: systemFont, flex: 1, minWidth: 0, minHeight: 44, color: '#1D1D1F', fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingVertical: 11 },
  prefix: { fontFamily: systemFont, color: '#626268', fontWeight: '600', paddingLeft: 14, paddingRight: 4 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 18, padding: 24, gap: 16 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontFamily: systemFont, fontSize: 11, fontWeight: '600', lineHeight: 16 },
  choice: { minHeight: 58, borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceSelected: { borderColor: '#0071E3', backgroundColor: '#F1F7FF' },
  choiceIcon: { width: 30, fontSize: 20, textAlign: 'center' },
  choiceLabel: { fontFamily: systemFont, color: '#1D1D1F', fontWeight: '600', fontSize: 15 },
  choiceDetail: { fontFamily: systemFont, color: '#6E6E73', fontSize: 13, lineHeight: 20, paddingTop: 5 },
  check: { color: '#0071E3', fontWeight: '700', fontSize: 17 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  sectionTitle: { fontFamily: systemFont, color: '#1D1D1F', fontWeight: '600', fontSize: 18 },
  link: { color: '#0071E3', fontWeight: '600', fontSize: 13 },
  stepDot: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#C7C7CC', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#267347', borderColor: '#267347' },
  stepActive: { borderColor: '#0071E3', borderWidth: 5 },
  stepCheck: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  error: { backgroundColor: '#FFF3F3', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F4D5D7' },
  errorText: { fontFamily: systemFont, color: '#B4232A', fontSize: 14, lineHeight: 22, fontWeight: '500' },
});

export const uiStyles = styles;
