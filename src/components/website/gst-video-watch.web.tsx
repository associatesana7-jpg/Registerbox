import { Link, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { gstIntroVideo, gstIntroVideoSchema } from '@/data/gst-intro-video';
import { WebBrand } from './brand.web';
import { GstIntroVideo, GstWalkthrough } from './gst-intro-video.web';
import { Seo } from './seo.web';
import './gst-video-watch.css';

export default function GstVideoWatchPage() {
  return <div className="rb-public-page rb-gst-watch-page">
    <Seo
      title="Watch: GST filing in the RegisterBox app | RegisterBox"
      description={gstIntroVideo.description}
      path={gstIntroVideo.watchPath}
      image={gstIntroVideo.poster}
      imageAlt="Real RegisterBox app interface in the GST filing walkthrough"
      schema={[gstIntroVideoSchema]}
    />
    <Head><meta name="googlebot" content="index,follow,max-image-preview:large,max-video-preview:-1"/></Head>
    <a className="rb-gst-watch-skip" href="#gst-watch-main">Skip to video</a>
    <header className="rb-gst-watch-header"><WebBrand/><Link href="/">Back to RegisterBox <span aria-hidden="true">↗</span></Link></header>
    <main id="gst-watch-main" className="rb-gst-watch-main">
      <div className="rb-gst-watch-heading"><p>REGISTERBOX IN ACTION · 1 MIN 12 SEC</p><h1>GST filing.<br/>See every step.</h1><div>Email sign-in. Your GST workspace. Review, authorize and track.</div></div>
      <GstIntroVideo variant="watch"/>
      <div className="rb-gst-watch-below"><p className="rb-gst-watch-example">Real app screens · Sample business and filing results</p><Link href={'/services/free-nil-gst-filing' as Href}>Explore nil GST filing <span aria-hidden="true">↗</span></Link></div>
      <section className="rb-gst-watch-transcript" aria-labelledby="gst-watch-transcript-title"><h2 id="gst-watch-transcript-title">Read the walkthrough</h2><GstWalkthrough/></section>
    </main>
    <footer className="rb-gst-watch-footer"><span>© 2026 RegisterBox</span><nav aria-label="Video page links"><Link href="/services/gst-returns">GST filing services</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav></footer>
  </div>;
}
