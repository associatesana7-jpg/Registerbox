import fs from "node:fs";
import path from "node:path";

const sampleRate = 48000;
const duration = 12;
const frames = sampleRate * duration;
const bpm = 112;
const beat = 60 / bpm;
const step = beat / 2;
const chords = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [110.0, 130.81, 164.81, 196.0], // Am7
  [87.31, 130.81, 164.81, 196.0], // Fmaj7
  [98.0, 146.83, 196.0, 220.0], // Gadd9
];
const arp = [261.63, 329.63, 392.0, 493.88, 440.0, 329.63, 293.66, 392.0];
const pcm = Buffer.alloc(frames * 4);
let seed = 0x51f15e;
const noise = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0xffffffff * 2 - 1;
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const section = Math.min(3, Math.floor(t / 3));
  const local = t - section * 3;
  const chord = chords[section];
  const edge = Math.min(1, local / 0.32, (3 - local) / 0.42);
  let pad = 0;
  for (let n = 0; n < chord.length; n++) {
    const f = chord[n];
    pad += (Math.sin(2 * Math.PI * f * t + n * 0.41) + 0.23 * Math.sin(2 * Math.PI * f * 2 * t)) / chord.length;
  }
  pad *= 0.19 * Math.max(0, edge) * (0.92 + 0.08 * Math.sin(2 * Math.PI * 0.17 * t));

  const stepIndex = Math.floor(t / step);
  const stepT = t - stepIndex * step;
  const arpEnv = Math.exp(-7.5 * stepT / step) * Math.min(1, stepT / 0.012);
  const arpFreq = arp[stepIndex % arp.length] * (section === 1 ? 0.84 : section === 2 ? 0.667 : section === 3 ? 0.75 : 1);
  const arpTone = (Math.sin(2 * Math.PI * arpFreq * t) + 0.28 * Math.sin(2 * Math.PI * arpFreq * 2 * t)) * 0.12 * arpEnv;

  const beatT = t % beat;
  const kick = Math.sin(2 * Math.PI * (54 + 38 * Math.exp(-18 * beatT)) * beatT) * Math.exp(-13 * beatT) * 0.25;
  const hatT = t % step;
  const hat = noise() * Math.exp(-65 * hatT) * (stepIndex % 2 ? 0.045 : 0.026);
  const lift = 0.85 + 0.15 * (t / duration);
  const fade = Math.min(1, t / 0.35, (duration - t) / 0.75);
  const pan = stepIndex % 2 === 0 ? -0.24 : 0.24;
  let left = (pad + arpTone * (1 - pan) + kick + hat) * lift * Math.max(0, fade);
  let right = (pad + arpTone * (1 + pan) + kick + hat * 0.82) * lift * Math.max(0, fade);
  left = Math.tanh(left * 1.35) * 0.72;
  right = Math.tanh(right * 1.35) * 0.72;
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const output = path.resolve(process.argv[2] ?? ".media/audio/bgm/registerbox-pulse.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([header, pcm]));
console.log(output);
