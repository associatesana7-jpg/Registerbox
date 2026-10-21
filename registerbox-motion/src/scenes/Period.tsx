import {useCurrentFrame} from 'remotion';
import {Action, Card, Field, Shell} from '../components';
import {theme as t} from '../theme';

export const Period = () => {
  const f = useCurrentFrame();
  return <Shell step={1} label="Choose your period" title={<>Your return.<br/>Your month.</>} subtitle="Choose the period you’re filing for.">
    <Card><div style={{fontSize: 34, fontWeight: 700}}>GST Returns</div><div style={{display: 'flex', marginTop: 30, gap: 16}}>{['GSTR-1', 'GSTR-3B', 'ITC'].map(item => <div key={item} style={{padding: '18px 22px', borderRadius: 14, background: item === 'GSTR-3B' ? t.sky : t.pale, color: item === 'GSTR-3B' ? t.blue : t.muted, fontSize: 29, fontWeight: 700}}>{item}</div>)}</div>
    <Field label="Financial year" value="2026–27"/>
    <Field label="Tax period" value="September 2026" active={f >= 44} tapAt={42}/>
    <div style={{marginTop: 26, padding: 24, background: t.greenBg, color: t.green, borderRadius: 18, fontSize: 28}}>✓ GST account connected</div>
    <Action pressed={f >= 112 && f < 121} tapAt={110}>File Nil GSTR-3B →</Action></Card>
    <div style={{fontSize: 34, lineHeight: 1.4, color: t.muted, marginTop: 40}}>No invoice upload for the nil flow.</div>
  </Shell>;
};
