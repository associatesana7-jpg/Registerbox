import {useCurrentFrame} from 'remotion';
import {Action, Card, Check, Field, Reveal, Shell} from '../components';
import {theme as t} from '../theme';

export const Authorize = () => {
  const f = useCurrentFrame();
  const pan = 'ABCDE••••F'.slice(0, Math.max(0, Math.min(10, Math.floor((f-30)/4))));
  return <Shell step={3} label="Authorize" title={<>Your approval.<br/>Your control.</>} subtitle="Use the signatory registered on GST.">
    <Card><div style={{fontSize: 31, fontWeight: 700}}>Authorized signatory</div><Field label="Signatory PAN" value={<span style={{letterSpacing: 5}}>{pan || ' '}</span>} active/>
      <Check at={93} tap>I authorize the declaration<br/>and the filing OTP request.</Check>
      <Action pressed={f >= 126 && f < 137} tapAt={124}>{f >= 137 ? 'Filing OTP requested ✓' : 'Continue to OTP →'}</Action>
    </Card>
    <Reveal delay={140}><div style={{marginTop: 36, padding: 26, borderRadius: 18, color: t.green, background: t.greenBg, fontSize: 31, lineHeight: 1.4}}>Sent to your registered GST contact.</div></Reveal>
    <div style={{fontSize: 32, lineHeight: 1.45, color: t.muted, marginTop: 32}}>Requesting the code does not<br/>submit your return.</div>
  </Shell>;
};
