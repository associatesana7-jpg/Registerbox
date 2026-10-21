const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const out = path.join(__dirname, '../public/audio');
fs.mkdirSync(out, {recursive: true});
const lines = [
  ['01-hook', "Nil return? Let's make it simple."],
  ['02-period', 'Choose your tax period. Then tap File Nil G S T R three B.'],
  ['03-review', "Review the nil conditions, and confirm you've checked your books."],
  ['04-authorize', 'Add your signatory P A N. Authorize, and request your filing code.'],
  ['05-verify', 'Enter the code, confirm your declaration, then tap Verify and file.'],
  ['06-close', 'Register Box. Less paperwork. More business.'],
];
for (const [name, text] of lines) {
  execFileSync('/usr/bin/say', ['-v', 'Rishi', '-r', '178', '-o', path.join(out, `${name}.aiff`), text]);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(out, `${name}.aiff`), '-af', 'loudnorm=I=-17:TP=-2:LRA=7', '-ar', '48000', '-ac', '2', path.join(out, `${name}.wav`)]);
}

// Original 100 BPM cue, synthesized deterministically. No sampled recordings.
const rate = 48000, seconds = 32, length = rate * seconds;
const left = new Float64Array(length), right = new Float64Array(length);
const tau = 2 * Math.PI;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const note = (start, duration, midi, amp, pan = 0, kind = 'pluck') => {
  const begin = Math.floor(start * rate), count = Math.floor(duration * rate), freq = hz(midi);
  for (let i = 0; i < count && begin + i < length; i++) {
    const time = i / rate;
    const envelope = Math.min(time / 0.014, 1) * Math.min((duration - time) / 0.12, 1) * Math.exp(-time * (kind === 'pad' ? 0.5 : 3.8));
    const wave = Math.sin(tau * freq * time) + (kind === 'pad' ? 0.12 : 0.35) * Math.sin(tau * freq * 2 * time) + 0.08 * Math.sin(tau * freq * 3 * time);
    const sample = wave * envelope * amp;
    left[begin+i] += sample * (1 - pan * 0.35);
    right[begin+i] += sample * (1 + pan * 0.35);
  }
};
const chords = [[60,64,67,71], [57,60,64,67], [53,57,60,64], [55,59,62,67]];
for (let bar = 0; bar < 14; bar++) {
  const start = bar * 2.4, chord = chords[bar % 4];
  chord.forEach((midi, i) => note(start, 2.6, midi, 0.035, (i-1.5)/2, 'pad'));
  for (let beat = 0; beat < 4; beat++) {
    note(start+beat*0.6, 0.5, chord[0]-24, 0.12, 0, 'pad');
    note(start+beat*0.6+0.3, 0.8, chord[(beat+bar)%4]+12, 0.055, beat % 2 ? 0.65 : -0.65);
    const begin = Math.floor((start + beat * 0.6) * rate);
    for (let i = 0; i < rate * 0.18 && begin+i < length; i++) {
      const time = i / rate;
      const v = 0.11 * Math.sin(tau * (48*time + 7*(1-Math.exp(-time*35)))) * Math.exp(-time*24);
      left[begin+i] += v; right[begin+i] += v;
    }
  }
}
const buffer = Buffer.alloc(44 + length*4);
buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length-8,4); buffer.write('WAVE',8);
buffer.write('fmt ',12); buffer.writeUInt32LE(16,16); buffer.writeUInt16LE(1,20);
buffer.writeUInt16LE(2,22); buffer.writeUInt32LE(rate,24); buffer.writeUInt32LE(rate*4,28);
buffer.writeUInt16LE(4,32); buffer.writeUInt16LE(16,34); buffer.write('data',36); buffer.writeUInt32LE(length*4,40);
for(let i=0;i<length;i++) {
  const time=i/rate, fade=Math.min(time/1.2, 1, (seconds-time)/1.5);
  buffer.writeInt16LE(Math.round(Math.tanh(left[i])*fade*26000),44+i*4);
  buffer.writeInt16LE(Math.round(Math.tanh(right[i])*fade*26000),46+i*4);
}
fs.writeFileSync(path.join(out,'original-music.wav'),buffer);
console.log('Created six narration clips and original stereo music.');
