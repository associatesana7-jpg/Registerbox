import type { BlogArticle } from './types';

export const startupGuides: BlogArticle[] = [
  {
    slug: 'udyam-registration-process-online',
    title: 'Udyam registration online: process, requirements and application support',
    description: 'Find the official Udyam registration link, current MSME limits, Aadhaar and PAN requirements, GST applicability and a practical checklist before you apply.',
    category: 'Registrations',
    serviceCategory: 'udyam',
    officialApplication: { label: 'Official Udyam registration portal', url: 'https://udyamregistration.gov.in/' },
    image: 'formation',
    imageAlt: 'Illustration of business owners organising their business information before an online registration',
    intro: [
      'Udyam registration identifies an eligible micro, small or medium enterprise under the Government of India’s MSME framework. You can use RegisterBox for paid assistance with organising the business information, reviewing existing records and understanding the application steps. You complete official verification and declarations yourself.',
      'Before opening the form, check which enterprise you are registering, whose Aadhaar applies and whether the business needs a GSTIN. This guide explains the current limits and a sensible preparation process. Udyam recognises an eligible MSME; it does not create a company or replace the permissions needed to run a particular activity.',
    ],
    sections: [
      {
        id: 'current-msme-limits',
        heading: 'What are the current MSME limits?',
        paragraphs: [
          'The revised limits took effect on 1 April 2025 under Ministry of MSME notification S.O. 1364(E), dated 21 March 2025. Classification considers investment in plant and machinery or equipment together with turnover. Both limits matter; do not choose a category from turnover alone.',
          'For example, an enterprise with ₹1 crore of relevant investment and ₹8 crore turnover is within the micro limits. If its relevant investment were ₹3 crore instead, it would exceed the micro investment ceiling even though turnover stayed below ₹10 crore. This is an illustration, not a substitute for the portal’s calculation.',
        ],
        bullets: [
          'Micro: investment not exceeding ₹2.5 crore and turnover not exceeding ₹10 crore.',
          'Small: investment not exceeding ₹25 crore and turnover not exceeding ₹100 crore.',
          'Medium: investment not exceeding ₹125 crore and turnover not exceeding ₹500 crore.',
        ],
        sourceIds: ['msme-2025-notification'],
      },
      {
        id: 'aadhaar-pan-gst',
        heading: 'Whose Aadhaar, PAN and GST details do you use?',
        paragraphs: [
          'For a proprietorship, the form requires the proprietor’s Aadhaar. For a partnership, it is the managing partner’s Aadhaar; for an HUF, the karta’s. Companies, LLPs and the other organisations described on the official form use the organisation or authorised signatory details specified there, together with the applicable PAN and GSTIN information.',
          'PAN is required. GSTIN requirements follow the applicability of the CGST Act and the MSME clarification; Udyam does not make every small business liable for GST registration by itself. If you are unsure about GST, resolve that question from your activity and supply facts before selecting an answer.',
          'Check names against the actual records. A proprietor’s trade name and PAN name may serve different purposes. Keep the distinction clear instead of changing spellings merely to make a field accept an entry.',
        ],
        sourceIds: ['udyam-application', 'msme-gst-clarification'],
      },
      {
        id: 'online-process',
        heading: 'How the online Udyam process works',
        paragraphs: [
          'Use the New Registration link on the official portal if you have not already registered as an MSME. The form starts with Aadhaar verification, then PAN verification and business information. Follow the live form and read each declaration before giving consent or submitting.',
          'Prepare the enterprise name, constitution, official address, unit locations and a clear description of what the business does. Read the activity choices carefully. If you run a workshop and also provide repair services, your notes should explain both activities, rather than forcing the business into a vague description.',
          'A useful preparation habit is to write one accurate business summary first. Have the person who knows the records check it. Keep OTPs and identity information private, and complete verification yourself in the official process.',
        ],
        sourceIds: ['udyam-application', 'udyam-sample-form'],
      },
      {
        id: 'documents-and-duplicates',
        heading: 'Keep accurate records and check for an existing registration',
        paragraphs: [
          'PAN and GST-linked investment and turnover information comes from government databases. Keep the records supporting what you declare and review information that appears inconsistent. An existing registration certificate can help you and the assistance team compare names and details before proceeding.',
          'An enterprise must not file multiple Udyam registrations. Manufacturing and service activities can be included in one registration. Search your own records before starting afresh: the old email, certificate or registration number may show that an update or migration route is needed instead.',
          'For a shared business, agree who will maintain the certificate and portal contact details. Saving the result in one person’s private inbox makes later corrections harder when staff or partners change.',
        ],
        sourceIds: ['udyam-important'],
      },
      {
        id: 'certificate-and-next-steps',
        heading: 'What happens after registration?',
        paragraphs: [
          'The government issues a permanent registration number and an online certificate with a dynamic QR code. Registration does not need renewal. Keep enterprise information current through the official update process; no renewal does not mean the business record can be left inaccurate.',
          'Save the certificate in your business folder and note who will check changes to the activity, address and other details. Then return to the remaining launch tasks. A food business, employer or manufacturing unit may have separate requirements that an MSME certificate cannot answer.',
          'Do not budget for a guaranteed loan, subsidy or tender award simply because you have Udyam registration. Check the particular scheme’s eligibility and application requirements before treating a possible benefit as available funding.',
        ],
        sourceIds: ['udyam-official', 'udyam-important'],
      },
      {
        id: 'get-help',
        heading: 'Apply with RegisterBox for guided assistance',
        paragraphs: [
          'RegisterBox’s guided application gathers your enterprise activity, locations, existing registration status and contact details. If you already have an Udyam or GST certificate, you can optionally add it for review. The team confirms the assistance fee and scope before paid work begins.',
          'RegisterBox provides independent preparation and guidance. The Ministry identifies its portal and government single-window systems as the authorised registration channels. You remain responsible for official identity verification and declarations. Keep Aadhaar copies and OTPs out of your RegisterBox application.',
        ],
        sourceIds: ['udyam-official'],
      },
    ],
    faqs: [
      { question: 'Why is RegisterBox assistance paid if government Udyam registration has no fee?', answer: 'The government does not charge an Udyam filing fee. RegisterBox charges separately for the agreed preparation, review and guidance. Confirm the quote and scope before work begins.' },
      { question: 'Is GST registration compulsory just to get Udyam?', answer: 'GSTIN is required according to the applicability of the CGST Act and the MSME clarification. Check the GST position for the actual enterprise rather than assuming every applicant needs a new GSTIN.' },
      { question: 'Do I need to renew my Udyam certificate every year?', answer: 'The official portal says registration does not need renewal. Keep your business information accurate through the applicable update process.' },
      { question: 'Can I include manufacturing and services in one Udyam registration?', answer: 'Yes. The official guidance permits multiple manufacturing or service activities in one registration and says an enterprise must not file more than one Udyam registration.' },
    ],
    sources: [
      { id: 'udyam-official', title: 'Ministry of MSME: official Udyam portal and registration channels', url: 'https://udyamregistration.gov.in/' },
      { id: 'msme-2025-notification', title: 'Ministry of MSME: S.O. 1364(E), 21 March 2025; revised limits effective 1 April 2025', url: 'https://udyamregistration.gov.in/docs/261838_220191.pdf' },
      { id: 'udyam-application', title: 'Official Udyam application: Aadhaar, PAN and business-detail stages', url: 'https://udyamregistration.gov.in/UdyamRegistration.aspx' },
      { id: 'msme-gst-clarification', title: 'Ministry of MSME: S.O. 1055(E), 5 March 2021; GST applicability clarification', url: 'https://udyamregistration.gov.in/docs/225669.pdf' },
      { id: 'udyam-sample-form', title: 'Ministry of MSME: Udyam application sample', url: 'https://udyamregistration.gov.in/docs/UdyamApplication.pdf' },
      { id: 'udyam-important', title: 'Ministry of MSME: registration rules, records and enterprise information', url: 'https://udyamregistration.gov.in/Important.aspx' },
    ],
    searchQuestions: ['How do I complete Udyam registration online?', 'What does Udyam application assistance cover?', 'What are the current MSME limits?', 'Can I get Udyam registration without GST?'],
    relatedSlugs: ['start-business-sole-proprietorship-checklist', 'manufacturing-business-approvals-checklist', 'gst-registration-documents-and-address-proof'],
  },
  {
    slug: 'llp-vs-private-limited-company-startup',
    title: 'LLP or private limited company: which fits your startup?',
    description: 'Compare an LLP with a private limited company using ownership, investor plans, decision-making and recurring work, with a practical founder checklist.',
    category: 'Start a business',
    serviceCategory: 'company',
    additionalServiceCategory: 'llp',
    image: 'formation',
    imageAlt: 'Illustration of two founders comparing ownership and business structure choices at a desk',
    intro: [
      'A private limited company often fits founders planning share-based investment and employee equity. An LLP may fit a business whose owners want to work through a partner agreement and share profits on agreed terms. Neither structure is best for every startup: compare the next few years of ownership, funding and work before choosing.',
      'A low incorporation price is only one part of the decision. The structure must also work when someone joins, leaves, disagrees or invests. Start with those situations, then compare the registration and continuing obligations for each option.',
    ],
    sections: [
      {
        id: 'ownership',
        heading: 'Start with who will own and run the business',
        paragraphs: [
          'In a company, members hold shares and directors manage company affairs through the company’s governance framework. A private company normally needs at least two members and two directors; the same founders can hold both roles. An LLP works through partners and its agreement, with at least two partners and the required designated partners.',
          'These are different ways of recording relationships. Write down who supplies money, who works in the business, who can approve spending and what each person expects to receive. Avoid treating a title such as “co-founder” as a complete ownership arrangement.',
        ],
        sourceIds: ['companies-act', 'mca-llp-overview', 'startup-legal'],
      },
      {
        id: 'funding',
        heading: 'Match the structure to the funding plan',
        paragraphs: [
          'Company shares provide a familiar route for admitting equity investors and setting up employee share arrangements, subject to the applicable rules and approvals. An LLP does not use company share capital: an investor’s rights need to fit a partnership structure. Both businesses can need outside finance, but the legal arrangements differ.',
          'For example, two software founders expect to approach investors and offer employee equity next year. They should assess the company route and future ownership changes before registering. Two consultants who plan to fund the business themselves and distribute profits under a partner agreement may find an LLP worth comparing.',
          'These examples are a way to frame the discussion, not an instruction to incorporate. Ask a prospective investor about its requirements early. It is better to learn about a structure constraint before signing documents and moving contracts into the new entity.',
        ],
        sourceIds: ['startup-business-types', 'mca-llp-overview'],
      },
      {
        id: 'agreements',
        heading: 'Agree the difficult decisions before the forms',
        paragraphs: [
          'An LLP agreement records the partners’ mutual rights and duties within the legal framework. Discuss contributions, profit and loss sharing, decision-making, remuneration, new partners, disputes and departure. Default legal provisions can apply where the agreement leaves a matter unresolved.',
          'Company founders should likewise settle ownership, management, future investment and departure expectations. Record how the proposed shareholder arrangements fit the company’s constitutional documents. An equal split may sound simple until one founder leaves after six months and the other continues for years.',
          'Make the conversation practical: who owns work created for the business, what requires both founders’ consent and how will an unresolved disagreement be handled? Clear answers are more valuable than choosing a structure because its name sounds established.',
        ],
        sourceIds: ['llp-act', 'startup-legal'],
      },
      {
        id: 'liability',
        heading: 'Understand what limited liability actually protects',
        paragraphs: [
          'An LLP is a legal entity separate from its partners. Its liability framework protects partners in specified circumstances, but it is not a promise that an owner can never be personally responsible. Fraud, a person’s own conduct and obligations personally undertaken need separate attention.',
          'For either structure, read guarantees and contracts carefully. If a lender asks a founder to sign a personal guarantee, ask what that promise covers. The entity’s name alone does not answer the question. Keep business spending, contracts and records clear from the beginning.',
        ],
        sourceIds: ['mca-llp-overview'],
      },
      {
        id: 'continuing-cost',
        heading: 'Compare the recurring work and total cost',
        paragraphs: [
          'Both structures need records and continuing compliance. A company has company-law accounts, returns, governance and audit work. An LLP also has accounts and statutory filings; its audit requirements must be checked against the applicable rules. Low activity does not automatically remove those duties.',
          'Request a first-year and continuing-cost estimate, with assumptions stated. Separate government charges, stamp duty, digital signatures, professional work and taxes. Ask what happens when a founder changes, the office moves or a filing is late. A cheap opening quote may leave important later work outside scope.',
          'Do not choose from a blanket claim that one structure always pays less tax. Compare realistic profit, owner payments, retained earnings and proposed distributions under the current tax rules. That calculation is separate from selecting the easier-looking incorporation form.',
        ],
        sourceIds: ['companies-act', 'llp-act', 'startup-legal'],
      },
      {
        id: 'registration',
        heading: 'What changes when you start the application?',
        paragraphs: [
          'Company incorporation uses MCA’s SPICe+ process and applicable linked forms. LLP incorporation uses FiLLiP, with the agreement handled through its separate filing process. In both cases, accurate names, activity, office evidence and participant information matter.',
          'Before starting either RegisterBox application, prepare a short founder brief: business activity, owners, funding plans, proposed office and unresolved decisions. Review the company and LLP service pages, then use the application that matches the chosen structure. Bring questions to the team if the ownership arrangement is still unsettled.',
          'The useful outcome is a structure you understand, an agreed scope and a list of next actions. Incorporation is the start of operating the entity, so assign responsibility for books, deadlines and changes before the first filing is submitted.',
        ],
        sourceIds: ['mca-spice', 'mca-fillip'],
      },
    ],
    faqs: [
      { question: 'Is a private limited company compulsory for every startup?', answer: 'No. Compare the actual ownership, funding, liability and compliance needs. Calling a business a startup does not by itself make a company the right structure.' },
      { question: 'Can an LLP issue shares like a company?', answer: 'An LLP uses partners, contributions and an agreement rather than company share capital. Discuss the investor’s intended rights before assuming an LLP can provide the same equity arrangement.' },
      { question: 'Does an LLP have no annual compliance?', answer: 'No. LLPs have accounting and filing obligations. Check the applicable audit and other requirements for the LLP’s facts.' },
      { question: 'Which is cheaper: an LLP or a private limited company?', answer: 'Compare incorporation and continuing costs using the same scope. Contribution or capital, office State, professional work and future changes affect the cost; one headline price is not a complete comparison.' },
    ],
    sources: [
      { id: 'companies-act', title: 'India Code: Companies Act, 2013; formation, directors, accounts and returns', url: 'https://www.indiacode.nic.in/bitstream/123456789/2114/5/A2013-18.pdf' },
      { id: 'llp-act', title: 'India Code: Limited Liability Partnership Act, 2008; agreement, accounts and returns', url: 'https://www.indiacode.nic.in/bitstream/123456789/2023/1/A2009-06.pdf' },
      { id: 'mca-llp-overview', title: 'MCA: LLP legal entity, partner agreement and liability framework', url: 'https://www.mca.gov.in/Ministry/pdf/LLP.pdf' },
      { id: 'startup-legal', title: 'Startup India: founder agreements and factors in choosing a legal entity', url: 'https://www.startupindia.gov.in/content/sih/en/Legal-Considerations-for-a-Startup-.html' },
      { id: 'startup-business-types', title: 'Startup India: business structures and equity-funding considerations', url: 'https://www.startupindia.gov.in/content/sih/en/startup-scheme/international/go-to-market-guide/types-of-businesses.html' },
      { id: 'mca-spice', title: 'MCA: SPICe+ company incorporation instruction kit', url: 'https://www.mca.gov.in/Ministry/pdf/SPICe%2B_help.pdf' },
      { id: 'mca-fillip', title: 'MCA: FiLLiP name reservation and LLP incorporation instruction kit', url: 'https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf' },
    ],
    searchQuestions: ['LLP vs private limited company: which is better for a startup?', 'Can an LLP issue shares to investors?', 'Which business structure suits co-founders?', 'Does an LLP have annual compliance?'],
    relatedSlugs: ['private-limited-company-registration-documents', 'llp-registration-partner-agreement', 'start-business-sole-proprietorship-checklist'],
  },
];
