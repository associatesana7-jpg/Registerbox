import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { blogVideos } from '../src/data/blog-video.ts';

const root = resolve(process.argv[2] || 'dist');
for (const [slug, video] of Object.entries(blogVideos)) {
  const html = readFileSync(join(root, 'blog', slug + '.html'), 'utf8');
  const player = html.match(/<video\b[^>]*>/)?.[0];
  assert.ok(player, slug + ': visible player before JavaScript');
  assert.match(player, /\bcontrols\b/);
  assert.match(player, /preload="none"/);
  assert.doesNotMatch(player, /autoplay/i);
  assert.ok(html.includes('srcLang="hi"') || html.includes('srclang="hi"'), slug + ': Hindi captions');
  for (const asset of [video.src, video.poster, video.captions]) assert.ok(existsSync(join(root, asset)), 'Missing video asset ' + asset);
  const vtt = readFileSync(join(root, video.captions), 'utf8');
  assert.match(vtt, /^WEBVTT/);
  assert.ok(vtt.includes('मंज़ूरी') || vtt.includes('मंजूरी'), 'Captions retain the approval limit');
  const graph = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph'] || []);
  const schema = graph.find(item => item['@type'] === 'VideoObject');
  assert.equal(schema?.duration, video.duration);
  assert.equal(schema?.inLanguage, 'hi-IN');
  assert.ok(schema?.contentUrl.endsWith(video.src));
  assert.equal(schema?.transcript, video.transcript);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', join(root, video.src)], {encoding:'utf8'}));
  assert.ok(probe.streams.some(item => item.codec_type === 'audio'), 'Final video must contain narration');
  assert.ok(probe.streams.some(item => item.codec_type === 'video' && item.width >= 1280 && item.height >= 720), 'Final video resolution');
  const parts = video.duration.match(/^PT(?:(\d+)M)?([\d.]+)S$/);
  assert.ok(parts, 'Parse ISO duration');
  const seconds = Number(parts[1] || 0) * 60 + Number(parts[2]);
  assert.ok(Math.abs(Number(probe.format.duration) - seconds) < 0.15, 'Video duration agrees with structured data');
}
console.log('Verified Hindi video: static embed, controls, deferred loading, captions, audio, resolution and VideoObject metadata.');
