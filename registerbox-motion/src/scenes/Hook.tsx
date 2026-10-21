import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Brand, Reveal} from '../components';
import {clamp, motion, theme as t} from '../theme';

export const Hook = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: t.navy, fontFamily: t.font, color: t.white, padding: '108px 84px'}}>
    <Brand light/>
    <div style={{position: 'absolute', top: 280, right: -170, width: 650, height: 650, border: '1px solid #ffffff18', borderRadius: '50%', scale: interpolate(f, [0, 120], [0.92, 1.05], clamp)}}/>
    <Reveal delay={0}><div style={{marginTop: 185, color: '#91B8FF', fontSize: 28, fontWeight: 700, letterSpacing: 5}}>GST / NIL RETURN</div></Reveal>
    <Reveal delay={4}><h1 style={{fontSize: 145, lineHeight: 0.98, letterSpacing: -8, margin: '42px 0'}}>Nil return?</h1></Reveal>
    <Reveal delay={25}><div style={{fontSize: 89, lineHeight: 1.08, letterSpacing: -4, color: '#ABC9FF'}}>A few<br/>simple steps.</div></Reveal>
    <div style={{position: 'absolute', top: 1090, left: 84, right: 84}}>
      <Reveal delay={39}><div style={{background: 'white', borderRadius: 30, color: t.navy, padding: '38px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', translate: `0 ${interpolate(f,[40,75],[22,0],{...clamp,easing:motion.ease})}px`}}><div><div style={{fontSize: 26, color: t.muted, marginBottom: 12}}>YOUR GST WORKSPACE</div><div style={{fontSize: 46, fontWeight: 700}}>File Nil GSTR-3B</div></div><span style={{fontSize: 60, color: t.blue}}>↗</span></div></Reveal>
      <Reveal delay={55}><div style={{fontSize: 34, color: '#ABC9FF', marginTop: 40}}>Choose. Confirm. Verify.</div></Reveal>
    </div>
    <div style={{position: 'absolute', bottom: 112, fontSize: 27, letterSpacing: 3, color: '#91B8FF'}}>MADE FOR YOUR BUSINESS.</div>
  </AbsoluteFill>;
};
