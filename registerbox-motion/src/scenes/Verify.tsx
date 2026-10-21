import {useCurrentFrame} from 'remotion';
import {Action, Card, Check, Field, Shell} from '../components';
import {theme as t} from '../theme';

export const Verify = () => {
  const f = useCurrentFrame();
  const dots = '••••••'.slice(0, Math.max(0, Math.min(6, Math.floor((f-32)/6))));
  return <Shell step={4} label="Verify & file" title={<>One final<br/>confirmation.</>} subtitle="Review, authorize, then submit.">
    <Card><div style={{fontSize: 32, fontWeight: 700}}>Enter GST filing OTP</div><div style={{fontSize: 28, color: t.muted, lineHeight: 1.4, marginTop: 18}}>Sent to the authorized signatory’s<br/>registered GST contact.</div>
      <Field label="GST filing code" value={<span style={{letterSpacing: 18, fontSize: 44}}>{dots || ' '}</span>} active/>
      <Check at={96} tap>I confirm my nil declaration<br/>and authorize filing with this code.</Check>
      <Action pressed={f >= 134 && f < 146} tapAt={132}>Verify OTP & file nil return</Action>
    </Card>
    <div style={{fontSize: 32, lineHeight: 1.45, color: t.muted, marginTop: 34}}>Your explicit approval is the final step.</div>
  </Shell>;
};
