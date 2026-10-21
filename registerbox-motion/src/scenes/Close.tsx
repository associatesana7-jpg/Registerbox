import {AbsoluteFill, CanvasImage, staticFile} from 'remotion';
import {Reveal} from '../components';
import {theme as t} from '../theme';

export const Close = () => <AbsoluteFill style={{background: t.white, color: t.navy, fontFamily: t.font, padding: '100px 84px'}}>
  <Reveal><div style={{fontSize: 28, letterSpacing: 5, color: t.blue, fontWeight: 700}}>BUSINESS, MADE SIMPLER.</div></Reveal>
  <Reveal delay={3}><div style={{height: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 70}}><CanvasImage src={staticFile('registerbox-logo.png')} style={{height: 690, width: 470, objectFit: 'contain'}}/></div></Reveal>
  <Reveal delay={15}><h1 style={{fontSize: 94, lineHeight: 1.07, margin: '36px 0', letterSpacing: -5}}>Less paperwork.<br/><span style={{color: t.blue}}>More business.</span></h1></Reveal>
  <Reveal delay={25}><div style={{marginTop: 55, borderTop: `2px solid ${t.line}`, paddingTop: 38, fontSize: 35, lineHeight: 1.4}}>Your nil-return flow.<br/>All in RegisterBox.</div></Reveal>
  <div style={{position: 'absolute', bottom: 110, left: 84, right: 84, fontSize: 25, color: t.muted, lineHeight: 1.4}}>Product demonstration · For eligible nil returns.<br/>Filing is subject to GST validation.</div>
</AbsoluteFill>;
