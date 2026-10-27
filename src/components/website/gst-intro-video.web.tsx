import { Link, type Href } from 'expo-router';
import { useId, useRef, useState } from 'react';
import { gstIntroVideo, gstIntroWalkthrough } from '@/data/gst-intro-video';
import './gst-intro-video.css';

export function GstWalkthrough() {
  return <div className="rb-gst-walkthrough-copy">
    <p>This 72-second walkthrough follows Aarav Studio, a sample business, through a nil GSTR-1 and GSTR-3B example for September 2026.</p>
    <ol className="rb-gst-walkthrough-steps">{gstIntroWalkthrough.map(step => <li key={step.start}>
      <span className="rb-gst-walkthrough-time">{step.time}</span>
      <div><strong>{step.title}</strong><p>{step.detail}</p></div>
    </li>)}</ol>
    <p className="rb-gst-walkthrough-note">Real app screens. Sample business, codes and filing results. The acknowledgements are illustrative; this video does not submit a return to the government.</p>
    <div className="rb-gst-walkthrough-links"><Link href={gstIntroVideo.watchPath as Href}>Open the video page <span aria-hidden="true">↗</span></Link><Link href="/services/gst-returns">Explore GST filing <span aria-hidden="true">↗</span></Link></div>
    <p className="rb-gst-walkthrough-credit">Music: <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037" target="_blank" rel="noopener noreferrer">Carefree — Kevin MacLeod</a>, used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Excerpted and mixed for this video.</p>
  </div>;
}

export function GstIntroVideo({ variant = 'hero' }: { variant?: 'hero' | 'watch' }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionId = useId();
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');

  async function playVideo() {
    const video = videoRef.current;
    if (!video || starting) return;
    setError('');
    setStarting(true);
    try {
      if (video.error) video.load();
      if (video.ended) video.currentTime = 0;
      await video.play();
      setStarted(true);
      setEnded(false);
      video.focus();
    } catch {
      setError('The video could not start.');
    } finally {
      setStarting(false);
    }
  }

  return <div className={`rb-gst-intro rb-gst-intro-${variant}`}>
    <div className="rb-gst-intro-stage" aria-busy={starting}>
      <video
        ref={videoRef}
        controls={variant === 'watch' || started}
        playsInline
        preload="metadata"
        poster={gstIntroVideo.poster}
        width={gstIntroVideo.width}
        height={gstIntroVideo.height}
        tabIndex={variant === 'watch' || started ? 0 : -1}
        aria-label={gstIntroVideo.title}
        aria-describedby={variant === 'hero' ? captionId : undefined}
        onPlaying={() => { setStarted(true); setEnded(false); setError(''); }}
        onEnded={() => setEnded(true)}
        onError={() => { setStarted(false); setStarting(false); setError('The video is unavailable.'); }}
      >
        <source src={gstIntroVideo.src} type="video/mp4"/>
        Your browser does not support embedded video. <a href={gstIntroVideo.src}>Open the GST walkthrough</a>.
      </video>
      {variant === 'hero' && (!started || ended) ? <button
        type="button"
        className="rb-gst-intro-play"
        onClick={playVideo}
        disabled={starting}
        aria-label={ended ? 'Replay the GST filing walkthrough' : 'Play the GST filing walkthrough'}
      >
        <span aria-hidden="true"><svg width="28" height="32" viewBox="0 0 24 28" fill="currentColor"><path d="M3 2.8a1.5 1.5 0 0 1 2.25-1.3l17 10.2a2.7 2.7 0 0 1 0 4.6l-17 10.2A1.5 1.5 0 0 1 3 25.2Z"/></svg></span>
      </button> : null}
    </div>
    {error ? <p className="rb-gst-intro-error" role="status">{error} <a href={gstIntroVideo.src} target="_blank" rel="noopener noreferrer">Open video ↗</a></p> : null}
    {variant === 'hero' ? <div className="rb-gst-intro-context">
      <p id={captionId} className="rb-gst-intro-caption">{gstIntroVideo.caption}</p>
      <details className="rb-gst-intro-walkthrough"><summary><span>Read the walkthrough</span><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></summary><GstWalkthrough/></details>
    </div> : null}
  </div>;
}
