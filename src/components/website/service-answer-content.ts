export type ServiceAnswerContent = {
  question: string;
  answer: string;
  recommendation: string;
};

// Editorial guidance drawn from the existing service checklists. Prices and
// application destinations remain owned by the shared service catalogue.
export const serviceAnswerContent: Record<string, ServiceAnswerContent> = {
  company: {
    question: 'How do I register a private limited company?',
    answer: 'Start with the founders, ownership, business activity and registered office. Prepare the director, subscriber and office records, then review the incorporation and linked forms before submission to MCA. Incorporation creates the company; tax, local and sector approvals may still be needed before it operates.',
    recommendation: 'Settle ownership and funding plans before reserving a name. A company can suit share-based ownership and future investors, but the incorporation decision also brings continuing governance and filing work. Compare that commitment with an LLP or another structure first.',
  },
  llp: {
    question: 'How do I register an LLP?',
    answer: 'Agree the partners, contributions, profit sharing and registered office before preparing the MCA application. Incorporation is followed by the LLP agreement, applicable stamping and filing. An LLP is a separate legal entity with continuing annual filing and tax obligations.',
    recommendation: 'Agree how partners make decisions, join and leave before filing. An LLP can suit a closely held or professional business, but it does not offer share capital in the way a company does. Choose it for the ownership arrangement you need, rather than incorporation cost alone.',
  },
  gst_registration: {
    question: 'How do I register my business for GST?',
    answer: 'First check whether your actual business activity, sales and location require GST registration. Then prepare consistent business, authorised-person and premises records for the application. Registration is complete when the GST portal issues the certificate; sending details to RegisterBox is a preparation step.',
    recommendation: 'Review the address evidence before starting the application. Resolving a mismatch in the lease, owner consent or business details early can avoid reworking the same records later. Check registration applicability as well as document readiness.',
  },
  udyam: {
    question: 'How do I register my business for Udyam?',
    answer: 'Use the official Udyam portal with accurate enterprise, ownership and activity information, and check for an existing registration first. Official Udyam registration is free. RegisterBox offers optional preparation assistance; the correct applicant or authorised person completes official identity verification and declarations.',
    recommendation: 'Use the free official route directly if your information is consistent and you are comfortable completing it. Choose optional help when you need to organise or review the facts. Keep official identity verification with the person required by the Udyam process and never share an OTP.',
  },
  food: {
    question: 'Which FSSAI registration or licence does my food business need?',
    answer: 'The correct route depends on the actual food activity, premises and current FoSCoS eligibility rules. Review those facts before choosing Basic Registration, a State licence or a Central licence. A home kitchen or delivery-only business still needs the appropriate food registration or licence.',
    recommendation: 'Describe how you prepare, store and sell food before comparing packages. A category review is more useful than choosing the cheapest route first, because a different activity or additional premises can change both the documents and scope.',
  },
  retail: {
    question: 'How do I register my shop or establishment?',
    answer: 'Check the Shops and Establishments requirements for the State where the premises operates. The activity, employer, workforce and commencement details determine the application and checklist. Prepare consistent employer and address evidence, then verify the certificate issued by the State authority.',
    recommendation: 'Confirm the State, actual commencement date and workforce before collecting documents. A clear premises record makes the application easier to prepare, while a separate branch or later change can require its own registration or amendment.',
  },
  gst: {
    question: 'How do I prepare and file GST returns?',
    answer: 'Select the correct business, GSTIN, return and period, then prepare and reconcile the complete records. Review exceptions, figures, any cash requirement and filing authorisation before submission. Check the actual portal filed status and acknowledgement to confirm completion.',
    recommendation: 'Resolve missing invoices and reconciliation differences before approving a return. Starting with complete books takes more preparation than accepting displayed totals, but gives you a clearer basis for the figures and for deciding whether a return is genuinely nil.',
  },
  gst_nil: {
    question: 'Can I file a nil GST return for free?',
    answer: 'Eligible nil GSTR-1 and GSTR-3B filing has a zero RegisterBox service fee. Complete records, period eligibility, required authorisation and the actual acknowledgement still matter. No sales or a zero displayed total alone does not establish nil eligibility.',
    recommendation: 'Check the full period records before selecting nil. The free route is useful when the facts support it; purchases, adjustments or other activity may mean you need a different return preparation process.',
  },
  new: {
    question: 'Which registrations do I need to start a business?',
    answer: 'There is no single registration that covers every new business. Your ownership structure, activity, location, workforce and selling model determine the entity, tax, sector and local approvals to check. Map those requirements and their sequence before starting operations.',
    recommendation: 'Make an approval map before committing to a structure or premises. A quick incorporation may be convenient, but a slower sector or premises approval can determine when the business can actually open.',
  },
  online: {
    question: 'What do I need to start selling online?',
    answer: 'Map what you sell, your seller or marketplace role, payment flow, warehouses and customers. Those facts determine the GST, product, packaging, consumer and other requirements. There is no universal e-commerce licence, and a live storefront does not establish permission to sell a regulated product.',
    recommendation: 'Prepare the product and fulfilment checklist alongside the storefront. Reusing one setup for every new product is convenient, but a regulated category or another warehouse can change the registrations, labels and customer policies you need.',
  },
  manufacturing: {
    question: 'Which approvals do I need for manufacturing?',
    answer: 'The product, process, materials, capacity, machinery, workforce and location determine the approval map. Check land use, factory, pollution, fire and relevant sector requirements at the appropriate project stage. Incorporation or Udyam alone does not authorise manufacturing operations.',
    recommendation: 'Check site suitability and approval dependencies before installing machinery. A premises that looks economical can create extra work if its permitted use, layout or environmental requirements do not fit the proposed process.',
  },
  branch: {
    question: 'What should I check before opening a business branch?',
    answer: 'Review the new State or address, activity, workforce, stock and invoicing plans. Obtain the entity authorisation and assess GST, local and sector changes before the branch begins relevant operations. A new location cannot always be added to the existing GST registration.',
    recommendation: 'Check whether the branch is in the same State before reusing the existing records. Reusing verified entity information saves preparation, but premises evidence and registration coverage still need a location-specific review.',
  },
  existing: {
    question: 'How do I check my business compliance?',
    answer: 'Compare your actual entities, activities, locations and periods with current registrations, filings, notices and supporting records. A scoped compliance review identifies evidence and gaps, then sets out the work needed. It does not automatically certify that the business is fully compliant.',
    recommendation: 'Define the entities, locations and periods before requesting a review. A focused check can make urgent gaps easier to act on, while an undefined request to check everything can leave important areas outside the agreed scope.',
  },
  trademark: {
    question: 'How do I apply for a trademark?',
    answer: 'Identify who will own the mark, the name or logo, and the goods or services it identifies. Review the search, proposed classes, applicant evidence and fee breakdown before authorising the application. Filing an application does not guarantee trademark registration.',
    recommendation: 'Resolve the owner and classification before choosing a filing package. A search can inform the decision to file, but it cannot promise the examination outcome. Questions about rights or objections need appropriate professional advice.',
  },
  income_tax: {
    question: 'How do I prepare and file my income tax return?',
    answer: 'Confirm the taxpayer, return year and all income sources, then collect and reconcile the relevant records. Review the return, any tax payment and the exact filing authorisation. Required verification and the official acknowledgement must be checked separately from preparation or payment.',
    recommendation: 'Agree the income scope before comparing fees. A return with business, investment or foreign-income records can need different preparation from a simpler case. Complete the record checklist first so the quoted work matches the return you need.',
  },
  mca: {
    question: 'What does annual MCA compliance involve?',
    answer: 'Start with the company, financial year, financial statements, meetings and applicable forms. Organise the records, required professional review, approvals and signatures, then verify the filing acknowledgements. The annual coordination package does not replace statutory audit or professional certification.',
    recommendation: 'Agree the covered year and forms before choosing an annual plan. Combining the calendar and document collection can simplify coordination, but outstanding years, events, audit and certification may need separate work.',
  },
  dsc: {
    question: 'How do I get a digital signature certificate?',
    answer: 'Choose the individual or organisation certificate route for the portal you intend to use. Complete the licensed certifying authority’s identity and organisation checks, then verify the issued certificate and token delivery. RegisterBox supports the application; the certifying authority decides issuance.',
    recommendation: 'Check the intended portal and signing use before ordering. Choosing a familiar certificate name is quicker, but the wrong type or applicant route can leave you with a certificate that does not serve the intended task.',
  },
  proprietorship: {
    question: 'Which GST support does my proprietorship need?',
    answer: 'Choose support for the actual business and periods: registration with an introductory filing month, annual proprietorship support, or annual GST filing with ITR. Compare each plan’s included work and records. Tax, statutory charges and work outside the agreed period remain separate.',
    recommendation: 'Choose the period you need rather than the lowest headline price. Introductory support can suit an immediate start; an annual plan can bring more of the year’s work together. Confirm the covered business, returns and later months before paying.',
  },
};
