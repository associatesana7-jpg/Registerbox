import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'dist';
for (const route of ['blog/what-is-gst', 'blog/gst-registration-documents-and-address-proof', 'blog/fast-gst-registration-three-hours', 'hi/blog/gst-registration-documents-and-address-proof']) {
  const html = fs.readFileSync(path.join(root, `${route}.html`), 'utf8');
  assert(html.includes('/media/gst-explained-reel.mp4'), `${route}: video source`);
  assert(html.includes('/media/gst-explained-hi.vtt'), `${route}: Hindi captions`);
  assert(html.includes('rbg-video-portrait'), `${route}: portrait layout`);
  assert(html.includes('preload="none"'), `${route}: avoid automatic video download`);
  assert(!/<video[^>]*autoplay/i.test(html), `${route}: no autoplay`);
  const graphs = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph']);
  const video = graphs.find(item => item['@type'] === 'VideoObject');
  assert(video?.contentUrl.endsWith('/media/gst-explained-reel.mp4'), `${route}: crawlable video metadata`);
  assert.equal(video.duration, 'PT1M28.333S');
}
for (const asset of ['gst-explained-reel.mp4', 'gst-explained-poster.jpg', 'gst-explained-hi.vtt']) assert(fs.statSync(path.join(root, 'media', asset)).size > 0);
assert(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('<loc>https://www.registerbox.in/blog/what-is-gst</loc>'));
assert(fs.readFileSync(path.join(root, 'media/gst-explained-hi.vtt'), 'utf8').startsWith('WEBVTT'));
console.log('Verified GST reel, captions, poster, portrait player, VideoObject metadata and new guide sitemap entry.');
