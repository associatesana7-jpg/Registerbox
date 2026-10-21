import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame} from 'remotion';
import {clamp, motion, theme as t} from './theme';

export const Brand = ({light = false}: {light?: boolean}) => <div style={{display: 'flex', alignItems: 'center', gap: 17, color: light ? t.white : t.navy}}><div style={{width: 58, height: 58, border: `3px solid ${light ? t.white : t.navy}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 800, position: 'relative'}}>R<span style={{position: 'absolute', right: -12, top: -18, color: t.gold, fontSize: 32}}>★</span></div><span style={{fontSize: 40, fontWeight: 700, letterSpacing: -1.6}}>RegisterBox</span></div>;

export const Reveal = ({children, delay = 0, style = {}}: {children: React.ReactNode; delay?: number; style?: React.CSSProperties}) => {
  const frame = useCurrentFrame();
  return <div style={{...style, opacity: interpolate(frame, [delay, delay + 15], [0, 1], clamp), translate: `0 ${interpolate(frame, [delay, delay + motion.reveal], [46, 0], {...clamp, easing: motion.ease})}px`}}>{children}</div>;
};

export const Shell = ({step, label, title, subtitle, children}: {step: number; label: string; title: React.ReactNode; subtitle: string; children: React.ReactNode}) => <AbsoluteFill style={{background: t.pale, color: t.ink, fontFamily: t.font, padding: '102px 84px'}}>
  <Brand/>
  <div style={{display: 'flex', gap: 12, marginTop: 66}}>{[1, 2, 3, 4].map(n => <div key={n} style={{height: 6, flex: 1, borderRadius: 6, background: n <= step ? t.blue : t.line}}/>)}</div>
  <Reveal delay={3}><div style={{color: t.blue, fontWeight: 700, fontSize: 27, letterSpacing: 4, marginTop: 38}}>0{step} / {label.toUpperCase()}</div></Reveal>
  <Reveal delay={7}><h1 style={{fontSize: 91, lineHeight: 1.04, letterSpacing: -5.5, margin: '28px 0 22px', fontWeight: 750}}>{title}</h1></Reveal>
  <Reveal delay={13}><div style={{fontSize: 36, lineHeight: 1.35, color: t.muted, maxWidth: 890}}>{subtitle}</div></Reveal>
  <Reveal delay={18} style={{marginTop: 50}}>{children}</Reveal>
  <div style={{position: 'absolute', bottom: 108, left: 84, right: 84, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: t.muted}}><span>REGISTERBOX / GST</span><span>Illustrative demo · Details masked</span></div>
</AbsoluteFill>;

export const Card = ({children, style = {}}: {children: React.ReactNode; style?: React.CSSProperties}) => <div style={{background: t.white, border: `2px solid ${t.line}`, borderRadius: 32, padding: 38, boxShadow: '0 22px 65px rgba(7,25,70,0.07)', position: 'relative', ...style}}>{children}</div>;

export const Field = ({label, value, active = false, tapAt}: {label: string; value: React.ReactNode; active?: boolean; tapAt?: number}) => <div style={{marginTop: 26}}><div style={{fontSize: 28, fontWeight: 600, color: t.muted, marginBottom: 14}}>{label}</div><div style={{position: 'relative', border: `2px solid ${active ? t.blue : t.line}`, borderRadius: 18, background: active ? t.sky : t.pale, padding: '23px 26px', fontSize: 38, fontWeight: 600, minHeight: 96}}>{value}{tapAt !== undefined ? <Tap at={tapAt} x="82%" y="50%"/> : null}</div></div>;

export const Action = ({children, pressed = false, tapAt}: {children: React.ReactNode; pressed?: boolean; tapAt?: number}) => <div style={{position: 'relative', marginTop: 30, padding: '27px 18px', borderRadius: 18, background: pressed ? t.navy : t.blue, color: t.white, fontSize: 36, fontWeight: 700, textAlign: 'center', scale: pressed ? 0.985 : 1}}>{children}{tapAt !== undefined ? <Tap at={tapAt} x="82%" y="50%"/> : null}</div>;

export const Check = ({at, children, tap = false}: {at: number; children: React.ReactNode; tap?: boolean}) => {
  const f = useCurrentFrame();
  return <div style={{position: 'relative', display: 'flex', gap: 22, alignItems: 'flex-start', padding: '24px 0'}}><div style={{flexShrink: 0, width: 45, height: 45, borderRadius: 11, border: `2px solid ${f >= at ? t.green : t.line}`, background: f >= at ? t.green : t.white, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, scale: f < at ? 1 : 0.85 + 0.15 * spring({frame: f-at, fps: 30, config: motion.spring})}}>{f >= at ? '✓' : ''}</div><div style={{fontSize: 31, lineHeight: 1.4, paddingTop: 1}}>{children}</div>{tap ? <Tap at={at-4} x={22} y={46}/> : null}</div>;
};

export const Tap = ({at, x, y}: {at: number; x: number | string; y: number | string}) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 25) return null;
  return <div style={{position: 'absolute', left: typeof x === 'number' ? x - 47 : `calc(${x} - 47px)`, top: typeof y === 'number' ? y - 47 : `calc(${y} - 47px)`, width: 94, height: 94, borderRadius: '50%', border: `3px solid ${t.blue}`, background: '#0865F733', scale: interpolate(f, [0, 25], [0.4, 1.8]), opacity: interpolate(f, [0, 6, 25], [0, 1, 0]), pointerEvents: 'none'}}/>;
};
