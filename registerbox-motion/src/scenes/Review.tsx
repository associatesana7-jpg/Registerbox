import {Card, Check, Shell} from '../components';
import {theme as t} from '../theme';

export const Review = () => <Shell step={2} label="Review & confirm" title={<>First, check<br/>it’s truly nil.</>} subtitle="Review the conditions for this period.">
  <Card>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 30, fontWeight: 700}}><span>Nil declaration</span><span style={{fontSize: 24, color: t.blue, background: t.sky, padding: '12px 16px', borderRadius: 12}}>GSTR-3B</span></div>
    <div style={{marginTop: 14}}>
      <Check at={40}>No supplies, amendments<br/>or advances to report.</Check>
      <Check at={64}>No inward supplies, ITC claims<br/>or outstanding liability.</Check>
      <Check at={88}>No auto-populated activity.<br/>GSTR-1 already filed as nil.</Check>
    </div>
    <div style={{borderTop: `2px solid ${t.line}`, marginTop: 10, paddingTop: 12}}><Check at={130} tap><strong>I’ve checked my complete books</strong><br/>and confirm the nil conditions.</Check></div>
  </Card>
  <div style={{fontSize: 32, lineHeight: 1.45, color: t.muted, marginTop: 34}}>If any condition does not apply,<br/>prepare a regular return.</div>
</Shell>;
