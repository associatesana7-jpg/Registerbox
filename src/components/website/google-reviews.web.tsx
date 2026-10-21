import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { googleReviews, googleReviewSnapshot } from '@/data/google-reviews';
import { contact } from './content';
import './google-reviews.css';

export function GoogleMark() {
  return <svg className="rb-google-mark" viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.95a6 6 0 0 1 0-3.9V7.46H3.07a10 10 0 0 0 0 9.08l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.46l3.34 2.59C7.2 7.7 9.4 5.95 12 5.95Z"/></svg>;
}

function Stars({ rating = 5 }: { rating?: number }) {
  return <span className="rb-review-stars" role="img" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m10 1.5 2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9L10 1.5Z"/></svg>)}</span>;
}

export function GoogleReviewBadge() {
  return <a className="rb-google-proof" href="#customer-feedback" aria-label={`${googleReviewSnapshot.rating} out of 5 on Google, ${googleReviewSnapshot.count} reviews. Read customer reviews`}><GoogleMark/><span><b>{googleReviewSnapshot.rating}</b><Stars/><span><strong>{googleReviewSnapshot.count}</strong> Google reviews</span></span><span className="rb-proof-arrow" aria-hidden="true">↗</span></a>;
}

export function GoogleReviews() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [position, setPosition] = useState({ previous: false, next: true });
  const [autoplay, setAutoplay] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [expandedReview, setExpandedReview] = useState(false);
  const playing = autoplay && !reducedMotion && visible && !hovering && !focused && !expandedReview;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const node = section.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) {
        node.classList.add('rb-reviews-arrived');
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = track.current;
    if (!node || !playing) return;
    const timer = window.setInterval(() => {
      if (document.hidden || node.querySelector('details[open]')) return;
      const firstCard = node.firstElementChild;
      if (!firstCard) return;
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 8;
      node.scrollTo({ left: atEnd ? 0 : node.scrollLeft + firstCard.getBoundingClientRect().width + 20, behavior: 'smooth' });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const update = () => {
      const previous = node.scrollLeft > 8;
      const next = node.scrollLeft + node.clientWidth < node.scrollWidth - 8;
      setPosition(current => current.previous === previous && current.next === next ? current : { previous, next });
    };
    update();
    node.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(node);
    return () => { node.removeEventListener('scroll', update); observer?.disconnect(); };
  }, []);

  function move(direction: number) {
    setAutoplay(false);
    const node = track.current;
    const firstCard = node?.firstElementChild;
    if (!node || !firstCard) return;
    node.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + 20), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return <section ref={section} className="rb-google-reviews" id="customer-feedback" aria-labelledby="rb-reviews-title">
    <div className="rb-container">
      <div className="rb-reviews-heading"><div><div className="rb-eyebrow"><span/>THEIR BUSINESS. THEIR WORDS.</div><h2 id="rb-reviews-title">Good work.<br/><span>Kind words.</span></h2><p>Real experiences, shared by our customers on Google.</p></div><a className="rb-reviews-score" href={googleReviewSnapshot.reviewsUrl} target="_blank" rel="noopener noreferrer"><span className="rb-reviews-source"><GoogleMark/><span>Google reviews</span><span aria-hidden="true">↗</span></span><span className="rb-reviews-rating"><b>{googleReviewSnapshot.rating}</b><span><Stars/><small>from {googleReviewSnapshot.count} reviews</small></span></span><span className="rb-reviews-score-note">RegisterBox · Marathahalli, Bengaluru</span></a></div>
      <div className="rb-reviews-toolbar"><p><span className="rb-review-dot"/>From our community</p><div className="rb-review-controls"><button className="rb-review-autoplay" type="button" disabled={reducedMotion} onClick={() => setAutoplay(current => !current)} aria-label={reducedMotion ? 'Review animation off: reduced motion enabled' : autoplay ? 'Pause review animation' : 'Play review animation'} aria-pressed={autoplay && !reducedMotion} aria-controls={trackId}><span aria-hidden="true">{autoplay && !reducedMotion ? 'Ⅱ' : '▶'}</span>{reducedMotion ? 'Motion off' : autoplay ? 'Pause' : 'Play'}</button><button type="button" onClick={() => move(-1)} disabled={!position.previous} aria-label="Previous reviews" aria-controls={trackId}>←</button><button type="button" onClick={() => move(1)} disabled={!position.next} aria-label="Next reviews" aria-controls={trackId}>→</button></div></div>
      <div className={`rb-review-timing${playing ? ' is-playing' : ''}`} aria-hidden="true"><span/></div>
      <div className="rb-reviews-track" id={trackId} ref={track} role="region" aria-label="Customer reviews; scroll or use the arrow buttons" tabIndex={0} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onPointerDown={() => setAutoplay(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } }}>
        {googleReviews.map((review, index) => <article className="rb-review-card" key={review.id} style={{ '--review-order': index } as CSSProperties} aria-label={`Google review by ${review.name}`}>
          <div className="rb-review-card-top"><Stars rating={review.rating}/><GoogleMark/></div>
          <blockquote><p>{review.text}</p>{'continuation' in review && <details className="rb-review-full" onToggle={() => setExpandedReview(Boolean(track.current?.querySelector('details[open]')))}><summary><span>Read full review</span><span>Close full review</span></summary><p>{review.continuation}</p></details>}</blockquote>
          <div className="rb-review-person"><span className={`rb-review-avatar is-${review.color}`} aria-hidden="true">{review.initials}</span><div><h3>{review.name}</h3><p>{review.localGuide ? 'Local Guide · Google review' : 'Google review'}</p></div><span className="rb-review-quote" aria-hidden="true">“</span></div>
        </article>)}
      </div>
      <div className="rb-reviews-bottom"><a href={googleReviewSnapshot.reviewsUrl} className="rb-reviews-all" target="_blank" rel="noopener noreferrer">Read all reviews on Google <span aria-hidden="true">↗</span></a><p>Worked with us? <a href={contact.googleReview} target="_blank" rel="noopener noreferrer">Share your experience ↗</a></p></div>
      <p className="rb-reviews-disclosure">Selected Google reviews, in customers’ own words. Rating and review count checked <time dateTime={googleReviewSnapshot.checkedAt}>{googleReviewSnapshot.checkedLabel}</time>.</p>
    </div>
  </section>;
}
