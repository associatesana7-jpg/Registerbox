import { useEffect, useId, useRef, useState } from 'react';
import './clients.css';

const clients = [
  { name: 'Tea Day', logo: '/images/clients/tea-day.png', key: 'tea-day', href: 'https://www.teadaycompany.com/' },
  { name: 'Absolute Shawarma', logo: '/images/clients/absolute-shawarma-web.png', key: 'absolute-shawarma', href: 'https://absoluteshawarma.com/' },
  { name: 'Kunafa Bakery', logo: '/images/clients/kunafa-bakery-web.png', key: 'kunafa-bakery' },
] as const;

function ClientCards({ duplicate = false }: { duplicate?: boolean }) {
  return <div className={`rb-clients-group${duplicate ? ' rb-clients-group-copy' : ''}`} aria-hidden={duplicate || undefined} inert={duplicate || undefined}>
    {clients.map((client, index) => <article className={`rb-client-card is-${client.key}`} key={client.key}>
      <div className="rb-client-card-label"><span aria-hidden="true">0{index + 1}</span><span><i aria-hidden="true"/>REGISTERBOX CLIENT</span></div>
      <div className="rb-client-logo"><img src={client.logo} alt={`${client.name} logo`} width={220} height={118} loading="lazy" decoding="async"/></div>
      <h3>{client.name}</h3>
    </article>)}
  </div>;
}

/** Original client content stays readable before hydration and with reduced motion. */
export function ClientSection() {
  const section = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const galleryId = useId();

  useEffect(() => {
    section.current?.setAttribute('data-enhanced', 'true');
  }, []);

  return <section ref={section} className="rb-clients" id="our-clients" aria-labelledby="rb-clients-title" data-paused={paused}>
    <div className="rb-container">
      <div className="rb-clients-heading">
        <div><div className="rb-eyebrow"><span/>IN GOOD COMPANY</div><h2 id="rb-clients-title">Their next chapter.<br/><span>A part of our story.</span></h2></div>
        <div className="rb-clients-intro"><p>Meet some of the businesses that have chosen RegisterBox.</p><div className="rb-clients-tools"><span className="rb-clients-caption"><i aria-hidden="true"/>Our clients</span><button className="rb-clients-motion" type="button" onClick={() => setPaused(current => !current)} aria-pressed={paused} aria-controls={galleryId} aria-label={paused ? 'Play client animation' : 'Pause client animation'}><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">{paused ? <path d="M4 2.5a.5.5 0 0 1 .75-.43l9 5.5a.5.5 0 0 1 0 .86l-9 5.5A.5.5 0 0 1 4 13.5z"/> : <path d="M3 2h3v12H3zm7 0h3v12h-3z"/>}</svg><span>{paused ? 'Play motion' : 'Pause motion'}</span></button></div></div>
      </div>
      <div className="rb-clients-window" id={galleryId} tabIndex={0} role="region" aria-label="RegisterBox client gallery">
        <div className="rb-clients-track"><ClientCards/><ClientCards duplicate/></div>
      </div>
      <div className="rb-clients-bottom"><p>Different businesses. Shared ambition.</p><nav aria-label="Client websites"><a href={clients[0].href} target="_blank" rel="noopener noreferrer">Tea Day <span aria-hidden="true">↗</span></a><span className="rb-clients-link-dot" aria-hidden="true">·</span><a href={clients[1].href} target="_blank" rel="noopener noreferrer">Absolute Shawarma <span aria-hidden="true">↗</span></a></nav></div>
    </div>
  </section>;
}
