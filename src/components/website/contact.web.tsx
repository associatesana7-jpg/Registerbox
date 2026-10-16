import { Link } from 'expo-router';
import { useState } from 'react';
import { Seo } from './seo.web';
import { WebBrand } from './brand.web';
import { contact } from './content';
import { publicServices } from './service-pages';
import { BranchDetails, ContactActions, CustomerFeedback } from './local-support.web';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('General enquiry');
  const [message, setMessage] = useState('');
  const [prepared, setPrepared] = useState('');
  function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrepared(`Hi RegisterBox,\n\nI’m ${name.trim()}.\nEmail: ${email.trim()}\nInterested in: ${service}\n\n${message.trim()}`);
  }
  return <div className="rb-public-page">
    <Seo title="Contact RegisterBox | New Thippasandra & Marathahalli, Bengaluru" description="Call +91 81477 77843 for GST, FSSAI, trademark and company registration support in Bengaluru. RegisterBox branches in New Thippasandra and Marathahalli." path="/contact"/>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/">← Back to website</Link></header>
    <main className="rb-container">
      <div className="rb-contact-hero"><div className="rb-eyebrow">REAL PEOPLE. A MESSAGE AWAY.</div><h1>Business registration support in Bengaluru.</h1><p>Tell us the service you need, your business activity and area. Choose a callback, phone call, WhatsApp or email—no sign-in needed for an enquiry.</p><ContactActions/></div>
      <div className="rb-contact-grid">
        <div className="rb-contact-details">
          <div><h2>Call our team</h2><a href={contact.telephoneHref}>{contact.phone}</a></div>
          <div><h2>Chat on WhatsApp</h2><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Message RegisterBox ↗</a></div>
          <div><h2>Write to us</h2><a href={`mailto:${contact.email}`}>{contact.email} ↗</a></div>
          <p className="rb-form-help">Please keep PAN, Aadhaar, passwords, OTPs and private documents out of general enquiries. Use your signed-in document wallet for application evidence.</p>
        </div>
        <div className="rb-contact-card"><h2>What can we help with?</h2><p>Prepare an enquiry, then choose WhatsApp or email to send it. Prefer a call? Use the callback button above.</p>
          <form onSubmit={prepare} className="rb-form">
            <label>Your name<input autoComplete="name" required maxLength={100} value={name} onChange={event => { setName(event.target.value); setPrepared(''); }} placeholder="Your full name"/></label>
            <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setPrepared(''); }} placeholder="you@business.com"/></label>
            <label>I’m interested in<select value={service} onChange={event => { setService(event.target.value); setPrepared(''); }}><option>General enquiry</option>{publicServices.map(item => <option key={item.category}>{item.title}</option>)}<option>Documents or existing application</option><option>Tally connection</option></select></label>
            <label>Your message<textarea required minLength={10} maxLength={1500} value={message} onChange={event => { setMessage(event.target.value); setPrepared(''); }} placeholder="Your business type, Bengaluru area, requirement and convenient callback time…"/></label>
            <button type="submit" className="rb-button">Prepare my enquiry ↗</button><span className="rb-form-help">Your enquiry is sent only when you send it in WhatsApp or your email app.</span>
          </form>
          {prepared && <div className="rb-contact-compose" role="status"><b>Your enquiry is ready</b><p>{prepared}</p><a className="rb-button rb-button-small" href={`${contact.whatsapp}?text=${encodeURIComponent(prepared)}`} target="_blank" rel="noopener noreferrer">Send via WhatsApp ↗</a><a className="rb-secondary-button" href={`mailto:${contact.email}?subject=${encodeURIComponent(`RegisterBox enquiry: ${service}`)}&body=${encodeURIComponent(prepared)}`}>Send via email ↗</a></div>}
        </div>
      </div>
      <BranchDetails/>
      <CustomerFeedback/>
    </main>
    <footer className="rb-public-footer rb-container"><span>© {new Date().getFullYear()} RegisterBox</span><Link href="/policies">Privacy & service information</Link></footer>
  </div>;
}
