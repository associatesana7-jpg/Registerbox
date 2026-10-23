import type { BlogVideo } from '@/data/blog-video';
import './blog-video.css';

export function BlogVideoPlayer({ video }: { video: BlogVideo }) {
  const hindi = video.language === 'hi-IN';
  return <section id="video-explainer" className="rbg-video-panel" lang={hindi ? 'hi' : 'en'} aria-labelledby="video-explainer-title">
    <div className="rbg-video-heading"><span className="rbg-kicker">{hindi ? 'हिंदी में समझें' : 'THE SHORT VERSION'}</span><h2 id="video-explainer-title">{hindi ? 'मीरा की कहानी: कारोबार बढ़े, तैयारी सही हो।' : 'Watch the explainer.'}</h2><p>{video.description}</p></div>
    <figure><video controls playsInline preload="none" poster={video.poster} width="1280" height="720" aria-label={video.title}>
      <source src={video.src} type="video/mp4"/>
      <track kind="captions" src={video.captions} srcLang={hindi ? 'hi' : 'en'} label={hindi ? 'हिंदी' : 'English'} default/>
      Your browser does not support embedded video. <a href={video.src}>Watch the video</a>.
    </video><figcaption>{hindi ? 'हिंदी कहानी और जनरेट की गई नैरेशन · पूरी शर्तों और लागू स्थिति के लिए नीचे आधिकारिक स्रोतों वाला गाइड पढ़ें।' : 'English explainer · Read the source-checked guide below for the full conditions and rollout status.'}</figcaption></figure>
    <details className="rbg-video-transcript"><summary>{hindi ? 'वीडियो का पूरा पाठ पढ़ें' : 'Read the video transcript'}</summary><p>{video.transcript}</p></details>
  </section>;
}
