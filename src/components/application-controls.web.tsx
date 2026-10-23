import { useId, type PropsWithChildren, type CSSProperties } from 'react';
import { StyleSheet, type TextInputProps } from 'react-native';
import './website/application-form.css';

export function ApplicationField({ label, prefix, value, onChangeText, editable = true, multiline, keyboardType, autoComplete, autoCapitalize, autoCorrect, maxLength, placeholder, accessibilityLabel, style, onFocus, onBlur }: TextInputProps & { label?: string; prefix?: string }) {
  const id = useId();
  const numeric = keyboardType === 'number-pad' || keyboardType === 'numeric';
  const type = keyboardType === 'email-address' ? 'email' : keyboardType === 'phone-pad' ? 'tel' : 'text';
  const inputStyle = StyleSheet.flatten(style);
  const common = { id, value: value ?? '', disabled: !editable, placeholder, maxLength, 'aria-label': accessibilityLabel || label, autoComplete: autoComplete as string, autoCapitalize, autoCorrect: autoCorrect === false ? 'off' : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText?.(event.target.value), onFocus: onFocus as unknown as React.FocusEventHandler<HTMLInputElement & HTMLTextAreaElement>, onBlur: onBlur as unknown as React.FocusEventHandler<HTMLInputElement & HTMLTextAreaElement> };
  return <div className="rb-intake-field">{label && <label htmlFor={id}>{label}</label>}<div className="rb-intake-input-wrap">{prefix && <span>{prefix}</span>}{multiline ? <textarea {...common} rows={3} style={inputStyle?.minHeight ? { minHeight: inputStyle.minHeight } as CSSProperties : undefined}/> : <input {...common} type={type} inputMode={numeric ? 'numeric' : keyboardType === 'decimal-pad' ? 'decimal' : undefined}/>}</div></div>;
}

export function ApplicationSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId();
  return <div className="rb-intake-field"><label htmlFor={id}>{label}</label><select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}><option value="" disabled>Choose an option</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

export function ApplicationConfirm({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress?: () => void }) {
  return <label className={`rb-intake-confirm ${selected ? 'is-checked' : ''}`}><input type="checkbox" checked={!!selected} disabled={disabled} onChange={() => onPress?.()}/><span>{label}</span></label>;
}
export function ApplicationRow({ children }: PropsWithChildren) { return <div className="rb-intake-row">{children}</div>; }
export function ApplicationHint({ children }: PropsWithChildren) { return <p className="rb-intake-hint" role="status">{children}</p>; }
export function ApplicationCard({ children, variant }: PropsWithChildren<{ style?: object; variant?: 'review' | 'document' }>) { return <section className={`rb-intake-card ${variant ? `is-${variant}` : ''}`}>{children}</section>; }
export function ApplicationReviewItem({ children }: PropsWithChildren) { return <div className="rb-intake-review-item">{children}</div>; }
