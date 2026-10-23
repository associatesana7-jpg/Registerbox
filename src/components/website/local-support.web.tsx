import { branches, contact } from './content';
import './local-support.css';

export function ContactActions({ service }: { service?: string }) {
  const message = `Hi RegisterBox, I need help with ${service || 'business registration'} in Bengaluru. My business type and area are: `;
  return <div className="rb-service-actions rb-local-actions" aria-label="Contact RegisterBox">
    <a className="rb-button" href={contact.callback} target="_blank" rel="noopener noreferrer">Request a callback ↗</a>
    <a className="rb-secondary-button" href={contact.telephoneHref}>Call {contact.phone}</a>
    <a className="rb-text-link" href={`${contact.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Ask on WhatsApp ↗</a>
  </div>;
}

export function BranchDetails() {
  return <section className="rb-local-panel" id="bengaluru-branches">
    <div className="rb-eyebrow">LOCAL SUPPORT. TWO BENGALURU BRANCHES.</div>
    <h2>Speak to RegisterBox in Bengaluru</h2>
    <p>Tell us your service, business activity, area and preferred callback time. No account is needed to make an enquiry. Call before visiting to confirm availability.</p>
    <div className="rb-branch-grid">{branches.map(branch => <article key={branch.id}>
      <h3>{branch.name}</h3>
      <address>{branch.address}</address>
      <a href={branch.maps} target="_blank" rel="noopener noreferrer">Directions to {branch.name} ↗</a>
    </article>)}</div>
    <ContactActions/>
    <p className="rb-form-help">Please do not include PAN, Aadhaar, OTPs, passwords or private documents in a general enquiry. A callback request is not a government application or a confirmed appointment.</p>
  </section>;
}

export function CustomerFeedback() {
  return <section className="rb-feedback-panel" id="customer-feedback">
    <div className="rb-eyebrow">REAL EXPERIENCES. HONEST FEEDBACK.</div>
    <h2>Read real customer experiences</h2>
    <p><a href={contact.googleProfile} target="_blank" rel="noopener noreferrer">View RegisterBox and its customer reviews on Google ↗</a></p>
    <h3>Already worked with RegisterBox?</h3>
    <p>Share an honest account of your experience on Google, whether positive or negative. Please leave out personal identifiers and confidential business information.</p>
    <a className="rb-secondary-button" href={contact.googleReview} target="_blank" rel="noopener noreferrer">Share your experience on Google ↗</a>
    <p className="rb-form-help">We do not offer rewards for reviews or ask customers for a particular rating.</p>
  </section>;
}
