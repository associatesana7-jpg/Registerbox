import {Easing} from 'remotion';

export const theme = {
  navy: '#071946', blue: '#0865F7', sky: '#EAF3FF', pale: '#F5F9FF',
  ink: '#0A1943', muted: '#617399', line: '#E0E9F7', green: '#009D62',
  greenBg: '#E6F8EE', white: '#FFFFFF', gold: '#FFB800',
  font: 'Arial, Helvetica, sans-serif',
};
export const motion = {
  ease: Easing.bezier(0.16, 1, 0.3, 1),
  spring: {damping: 24, stiffness: 180, mass: 0.8},
  reveal: 20, stagger: 10,
};
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
