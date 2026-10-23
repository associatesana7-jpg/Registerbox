import type { BlogArticle } from './types';

export const ecommerceGstGuide: BlogArticle[] = [{
  slug: 'gst-registration-small-ecommerce-sellers-november-2026',
  title: 'GST registration for small e-commerce sellers: the 1 November 2026 update',
  description: 'A reported 1 November start, the proposed Rule 14B warehouse route, and practical preparation for small goods sellers. Source status reviewed on 23 October 2026.',
  publishedAt: '2026-10-23',
  category: 'Registrations',
  serviceCategory: 'gst_registration',
  image: 'ecommerce-gst-november-2026',
  imageAlt: 'An Indian small-business owner packing online orders beside her laptop',
  officialApplication: { label: 'Check the official GST portal', url: 'https://www.gst.gov.in/' },
  howToSection: 'prepare-before-november',
  availabilityNote: 'Reviewed 23 October 2026: the Council recommendation and official FAQ are verified. Commencement notification and portal advisory have not been verified for this guide. Confirm the operative position before applying; the reported start date is not an approval guarantee.',
  intro: [
    'Selling online can mean packing orders at home, using a marketplace warehouse, or combining both. Before acting on a GST headline, identify where your stock will sit, who dispatches it and which business issues the invoice. Those facts help determine which registration question you actually need to answer.',
    'The Tribune reported on 22 October that the proposed facility would begin on 1 November 2026. Treat that as reporting, pending verification of the operative notification and portal instructions. This guide separates the date from the official proposal and gives you a preparation plan.',
  ],
  sections: [
    { id: 'proposed-warehouse-route', heading: 'What is the proposed Rule 14B route?', paragraphs: [
      'The 57th GST Council meeting on 8 October recommended a warehouse-based registration mechanism for small goods sellers expanding through electronic commerce operators (ECOs). Where the seller lacks physical presence in a State or Union Territory, the proposal would allow an ECO warehouse as the principal place of business, subject to conditions.',
      'The recommendation needs implementing legal instruments. It should not be presented as a registration entitlement already available to every online seller. A services website, direct-sales channel and marketplace fulfilment arrangement should not be put into one eligibility bucket.',
    ], sourceIds: ['council-recommendation', 'reported-start'] },
    { id: 'official-faq-conditions', heading: 'What does the official FAQ add?', paragraphs: [
      'The 9 October FAQ describes goods supplied exclusively through ECOs collecting tax at source under section 52. It calls for prior ECO consent, regular home-state registration rather than only Rule 14A status, and home-state biometric Aadhaar/authentication and verification checks. It describes one registration per PAN in a State or Union Territory, with records retained at the home-state principal place of business.',
      'The ECO consent step has a seven-working-day window in the FAQ. That is not a GSTIN approval deadline. Do not promise a customer or warehouse operator an issue date based on that window.',
    ], sourceIds: ['official-faq'] },
    { id: 'dispatch-versus-warehouse', heading: 'Home-state dispatch or another State’s warehouse?', paragraphs: [
      'Example A — home-state dispatch: assume a Bengaluru stationery business keeps all stock in Karnataka and ships from there. An order from a customer elsewhere does not itself show that the business stores goods in another State. Map its existing GST position, dispatch location and selling channels before treating this warehouse proposal as its solution.',
      'Example B — remote warehouse: assume the business plans to place stock in an ECO warehouse in Maharashtra, with those goods sold exclusively through that platform. Take this expansion question to an adviser when reviewing the proposed route. This is not an eligibility conclusion: operative conditions, home-state status and the ECO arrangement still need checking.',
      'These are planning examples, not official illustrations. Draw your own stock-and-order map before paying for an additional-State application. Marketplace onboarding instructions describe commercial requirements; they do not replace a tax review.',
    ], sourceIds: ['council-recommendation'] },
    { id: 'tax-limit-not-turnover', heading: '₹2.5 lakh is not a monthly sales allowance', paragraphs: [
      'The Council recommendation refers to ITC passed on, excluding stock transfers between distinct persons. The FAQ describes relevant output tax on supplies to registered persons. Neither is a ₹2.5 lakh sales-turnover limit. The FAQ uses different boundary wording across answers; obtain adviser review for a case at that boundary against the operative text.',
      'Keep sales value, tax amounts and stock movements in separate columns. A marketplace settlement after commissions or refunds is not a substitute for that analysis. Give your adviser invoices and movement records, not just a payout screenshot.',
    ], sourceIds: ['council-recommendation', 'official-faq'] },
    { id: 'different-existing-routes', heading: 'Do not confuse this with Rule 14A or the 2023 exemption', paragraphs: [
      'Rule 14A is a different simplified-registration option. The GST Council’s October 2025 newsletter records its introduction from 1 November 2025. That earlier date does not establish that the proposed warehouse mechanism is operational.',
      'Notification 34/2023–Central Tax, effective 1 October 2023, separately covers certain below-threshold goods suppliers through ECOs. Conditions include no inter-State goods supply, ECO supply in only one State or Union Territory, PAN and portal enrolment. It is not a general permission for unregistered sellers to expand through warehouses across India.',
      'Ask for the name of the route recommended for your business. “Small online seller” describes a business; it is not a complete legal classification. Retain the adviser’s conclusion and supporting documents together.',
    ], sourceIds: ['rule14a-newsletter', 'notification34'] },
    { id: 'planning-checklist', heading: 'Build a useful application preparation folder', paragraphs: [
      'This is a RegisterBox planning checklist, not a notified Rule 14B document list. It helps an adviser understand your case; final portal instructions may request a different pack. Keep private identity documents in your secure application workspace.',
    ], bullets: [
      'Business identity: legal name, PAN, constitution, existing GSTINs and the person authorised to act.',
      'Operating map: home-state premises, planned warehouses, stock ownership and dispatch arrangements.',
      'Platform evidence: ECO correspondence, proposed warehouse agreement and the contact responsible for consent.',
      'Numbers: recent invoices and a monthly forecast separating sales value, relevant tax and stock transfers.',
      'Channel list: marketplace goods, direct orders, your website and any services, shown separately.',
      'Open issues: existing registration options, pending corrections and facts needing adviser review.',
    ] },
    { id: 'prepare-before-november', heading: 'What to do before planning a 1 November launch', paragraphs: [
      'Give one person ownership of the launch checklist. Save the notification, official portal advisory and current ECO instructions when your adviser verifies them. Record the date and business facts alongside that decision so another team member can understand the chosen route.',
      'Ask what support the ECO actually provides for its warehouse address and consent. Separate application readiness from inventory readiness: when will stock move, who checks the address record, and what event permits invoicing to start? Avoid delivery promises tied to an expected GSTIN.',
      'Retain the actual application reference when issued and check authoritative portal status. If a request times out, check before repeating it. A preparation checklist or payment receipt is not proof that registration has been granted.',
    ], sourceIds: ['gst-portal'] },
    { id: 'fees-and-aftercare', heading: 'Understand assistance fees and the work after registration', paragraphs: [
      'RegisterBox’s GST registration assistance is ₹1,999, with no GST added to that service fee. The ₹1,499 introductory GST Registration + Monthly Filing package covers registration assistance and one agreed filing month. It is not twelve months of filing or an automatic subscription. Review the package scope before paying.',
      'These are RegisterBox assistance charges, not a government approval fee. Payment does not establish eligibility for the proposed route or secure a GSTIN. Submit your registration details, review the package and payment step, and agree what your adviser will deliver.',
      'Before the first order, name the owner of invoices, warehouse stock movements, marketplace settlements, returns and reconciliation. Keep a calendar for each registration’s actual obligations. Eligible nil GST filing has a ₹0 RegisterBox service fee; no-sales months still require a proper eligibility review.',
    ] },
  ],
  faqs: [
    { question: 'Is 1 November 2026 a verified commencement date?', answer: 'It is a reported start date; this guide has not verified the commencement instrument. Check the source-status note and operative portal instructions before applying.' },
    { question: 'Does ₹2.5 lakh mean I can sell only that much each month?', answer: 'No. The proposal concerns relevant tax/ITC amounts, not a sales-turnover allowance. Have your adviser classify the figures and review a boundary case.' },
    { question: 'Can I use this without regular home-state GST registration?', answer: 'The official FAQ requires regular home-state registration and distinguishes it from Rule 14A-only status. Review your existing position before choosing a route.' },
    { question: 'Will ECO consent guarantee registration in seven days?', answer: 'No. The FAQ’s seven-working-day consent window is not an approval deadline. Plan against actual application status.' },
    { question: 'What does the ₹1,499 monthly package include?', answer: 'RegisterBox’s introductory package includes GST registration assistance and one agreed filing month. Further months need a separate agreement. No GST is added to the stated assistance fee; review the complete scope before checkout.' },
    { question: 'Does registration payment cover every future return?', answer: 'No. Registration and ongoing filing support have different scopes. Agree the period, forms and business covered. Eligible nil GST filing has a ₹0 RegisterBox service fee, subject to eligibility checks.' },
  ],
  sources: [
    { id: 'council-recommendation', title: 'PIB: recommendations of the 57th GST Council meeting, 8 October 2026 — registration section 4', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2320934&lang=1&reg=48' },
    { id: 'official-faq', title: 'PIB: official FAQs on simplified registration schemes for ECO sellers, 9 October 2026', url: 'https://www.pib.gov.in/FaqDetails.aspx?ModuleId=4&NoteId=160387&lang=1&reg=3' },
    { id: 'reported-start', title: 'The Tribune, 22 October 2026: reported start date — news report, not a commencement notification', url: 'https://www.tribuneindia.com/news/business/gst-registration-for-small-e-commerce-sellers-to-begin-on-november-1/amp/' },
    { id: 'rule14a-newsletter', title: 'GST Council Secretariat: October 2025 newsletter — earlier Rules 9A and 14A changes', url: 'https://gstcouncil.gov.in/sites/default/files/2025-11/october_issue_0.pdf' },
    { id: 'notification34', title: 'Notification 34/2023–Central Tax: conditional exemption for certain goods suppliers through ECOs', url: 'https://gstcouncil.gov.in/sites/default/files/2024-05/gst-ct-34-2023.pdf' },
    { id: 'gst-portal', title: 'Official GST portal: check current registration instructions and application status', url: 'https://www.gst.gov.in/' },
  ],
  searchQuestions: ['GST registration small e commerce sellers November 2026', 'Rule 14B ECO warehouse GST registration', 'GST registration November 1 news verified', '2.5 lakh limit GST ecommerce tax or turnover', 'home state GSTIN warehouse consent', 'GST registration assistance price 1999'],
  relatedSlugs: ['gst-registration-documents-and-address-proof', 'start-online-ecommerce-business-india', 'gstr-1-vs-gstr-3b'],
}];
