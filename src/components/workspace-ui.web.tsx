import { useId, useState, type PropsWithChildren } from 'react';

import { AppIcon, type AppIconName } from './app-icon';
import { Button } from './registerbox-ui';
import './workspace-primitives.css';

export function WorkspaceHeading({ eyebrow, title, detail, action, onAction }: { eyebrow?: string; title: string; detail?: string; action?: string; onAction?: () => void }) {
  return <header className="rb-wp-heading">
    <div className="rb-wp-heading__copy">{eyebrow ? <p className="rb-wp-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{detail ? <p className="rb-wp-heading__detail">{detail}</p> : null}</div>
    {action && onAction ? <button type="button" className="rb-wp-heading__action" onClick={onAction}><span aria-hidden="true"><AppIcon name="add" size={18} color="#0071E3"/></span><span>{action}</span></button> : null}
  </header>;
}

export function NextStepCard({ eyebrow = 'YOUR NEXT STEP', title, detail, action, onPress, secondary, onSecondary }: { eyebrow?: string; title: string; detail: string; action: string; onPress: () => void; secondary?: string; onSecondary?: () => void }) {
  const headingId = useId();
  return <section className="rb-wp-next" aria-labelledby={headingId}>
    <div className="rb-wp-next__copy"><p className="rb-wp-eyebrow">{eyebrow}</p><h2 id={headingId}>{title}</h2><p className="rb-wp-next__detail">{detail}</p></div>
    <div className="rb-wp-next__actions"><Button title={action} onPress={onPress}/>{secondary && onSecondary ? <button type="button" className="rb-wp-text-button" onClick={onSecondary}>{secondary}<span aria-hidden="true">↗</span></button> : null}</div>
  </section>;
}

export function ActionRow({ title, detail, icon = 'arrow', onPress, trailing }: { title: string; detail?: string; icon?: AppIconName; onPress: () => void; trailing?: string }) {
  return <button type="button" className="rb-wp-action-row" onClick={onPress}>
    <span className="rb-wp-action-row__icon" aria-hidden="true"><AppIcon name={icon} size={22} color="#0071E3"/></span>
    <span className="rb-wp-action-row__copy"><span className="rb-wp-action-row__title">{title}</span>{detail ? <span className="rb-wp-action-row__detail">{detail}</span> : null}</span>
    {trailing ? <span className="rb-wp-action-row__trailing">{trailing}</span> : <span className="rb-wp-action-row__chevron" aria-hidden="true"><AppIcon name="chevron" size={18} color="#86868B"/></span>}
  </button>;
}

export function EmptyState({ icon = 'folder', title, detail, action, onAction }: { icon?: AppIconName; title: string; detail: string; action?: string; onAction?: () => void }) {
  const headingId = useId();
  return <section className="rb-wp-empty" aria-labelledby={headingId}>
    <span className="rb-wp-empty__icon" aria-hidden="true"><AppIcon name={icon} size={28} color="#86868B"/></span>
    <h2 id={headingId}>{title}</h2><p>{detail}</p>{action && onAction ? <div className="rb-wp-empty__action"><Button title={action} onPress={onAction}/></div> : null}
  </section>;
}

export function Disclosure({ title, detail, children }: PropsWithChildren<{ title: string; detail?: string }>) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return <div className={`rb-wp-disclosure${open ? ' is-open' : ''}`}>
    <button type="button" className="rb-wp-disclosure__toggle" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>
      <span className="rb-wp-disclosure__copy"><span className="rb-wp-disclosure__title">{title}</span>{detail ? <span className="rb-wp-disclosure__detail">{detail}</span> : null}</span><span className="rb-wp-disclosure__indicator" aria-hidden="true">+</span>
    </button>
    <div id={contentId} className="rb-wp-disclosure__content" hidden={!open}>{open ? children : null}</div>
  </div>;
}

export function JourneyRail({ steps, current, completed }: { steps: string[]; current: number; completed?: number[] }) {
  if (!steps.length) return null;
  const activeIndex = Math.max(0, Math.min(current, steps.length - 1));
  return <div className="rb-wp-journey" role="group" aria-label={`Step ${activeIndex + 1} of ${steps.length}: ${steps[activeIndex]}`}>
    <ol className="rb-wp-journey__steps">{steps.map((step, index) => {
      const done = completed ? completed.includes(index) : index < current;
      return <li key={`${step}-${index}`} className={`${done ? 'is-done ' : ''}${index === activeIndex ? 'is-current' : ''}`} aria-current={index === activeIndex ? 'step' : undefined}>
        <span className="rb-wp-journey__track" aria-hidden="true"/><span className="rb-wp-journey__label">{done ? <><span aria-hidden="true">✓ </span><span className="rb-ui-visually-hidden">Completed: </span></> : null}{step}</span>
      </li>;
    })}</ol>
    <p className="rb-wp-journey__summary">Step {activeIndex + 1} of {steps.length}<span aria-hidden="true"> · </span>{steps[activeIndex]}</p>
  </div>;
}

export function LoadingCards() {
  return <div className="rb-wp-loading" role="status" aria-label="Loading your workspace" aria-busy="true"><span className="rb-ui-visually-hidden">Loading your workspace…</span>{[0, 1].map(index => <div key={index} className="rb-wp-loading__card" aria-hidden="true"><span/><span/><span/></div>)}</div>;
}
