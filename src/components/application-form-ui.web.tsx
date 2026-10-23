import { useId } from 'react';

export function ApplicationProgress({ step, documentStep, reviewStep, hasDocuments = true, optionalDocuments = false }: { step: number; documentStep: number; reviewStep: number; hasDocuments?: boolean; optionalDocuments?: boolean }) {
  const phase = step === 0 ? 0 : step < documentStep ? 1 : step < reviewStep ? 2 : 3;
  const phases = [{ name: 'Business', index: 0 }, { name: 'Details', index: 1 }, ...(hasDocuments ? [{ name: optionalDocuments ? 'Records' : 'Documents', index: 2 }] : []), { name: 'Review', index: 3 }];
  return <nav className="rb-intake-progress" aria-label="Application progress"><ol>{phases.map((item, index) => <li key={item.name} className={phase === item.index ? 'is-current' : phase > item.index ? 'is-done' : ''} aria-current={phase === item.index ? 'step' : undefined}><span aria-hidden="true">{phase > item.index ? '✓' : index + 1}</span><b>{item.name}</b></li>)}</ol><span className="rb-intake-step" aria-live="polite">{phase === 1 ? `Question ${step} of ${documentStep - 1}` : `Step ${phases.findIndex(item => item.index === phase) + 1} of ${phases.length}`}</span></nav>;
}

export function ApplicationChoices({ options, value, onChange, disabled, label }: { options: string[]; value: string; onChange: (value: string) => void; disabled: boolean; label?: string }) {
  const name = useId();
  return <div className="rb-intake-choices" role="radiogroup" aria-label={label}>{options.map(option => <label key={option} className={value === option ? 'is-selected' : ''}><input type="radio" name={name} value={option} checked={option === value} disabled={disabled} onChange={() => onChange(option)}/><span>{option}</span></label>)}</div>;
}

export function ApplicationFooter({ title, busy, disabled, onContinue, onBack, review = false, saved = false }: { title: string; busy: boolean; disabled: boolean; onContinue: () => void; onBack?: () => void; review?: boolean; saved?: boolean }) {
  return <div className="rb-intake-actions"><p role="status">{saved ? 'Sent to RegisterBox for review.' : busy ? review ? 'Sending to RegisterBox…' : 'Saving your progress…' : review ? 'Review by RegisterBox comes before government filing.' : 'Your progress is saved when you continue.'}</p><div>{onBack && !saved && <button type="button" disabled={busy || disabled} onClick={onBack} className="rb-intake-back">Back</button>}<button type="button" disabled={busy || disabled} aria-busy={busy} onClick={onContinue} className="rb-intake-next">{busy ? 'Please wait…' : title}<span aria-hidden="true">→</span></button></div></div>;
}
