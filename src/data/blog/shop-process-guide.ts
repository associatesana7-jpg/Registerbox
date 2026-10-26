import type { BlogArticle } from './types';

export const shopProcessGuide: BlogArticle[] = [
  {
    slug: 'shop-and-establishment-registration-process',
    title: 'Karnataka shop & establishment registration online',
    description: 'Apply through Karnataka e-Karmika: prepare Form A details and documents, check the assessed fee, save your receipt and track the registration certificate.',
    publishedAt: '2026-10-21',
    modifiedAt: '2026-10-26',
    reviewedAt: '2026-10-26',
    howToSection: 'check-the-route',
    category: 'Registrations',
    serviceCategory: 'retail',
    officialApplication: {
      label: 'Open Karnataka e-Karmika',
      url: 'https://www.ekarmika.karnataka.gov.in/ekarmika/Static/Home.aspx',
    },
    image: 'shop-registration',
    imageAlt: 'Editorial illustration of a Karnataka shop owner preparing establishment records and an online registration checklist',
    intro: [
      'To apply for shop and establishment registration in Karnataka, use the Labour Department’s e-Karmika portal. Check applicability, prepare Form A details and documents, complete the online application, pay the assessed fee and save the acknowledgement. The officer’s acceptance, not payment alone, leads to the registration certificate.',
      'The steps below cover Bengaluru and the rest of Karnataka, not a single nationwide shop-licence process. Already registered online? Start with your existing e-Karmika account instead of a duplicate application. Our separate eligibility and certificate guide covers broader registration questions and later changes.',
    ],
    sections: [
      {
        id: 'check-the-route',
        heading: '1. Confirm what you are registering',
        paragraphs: [
          'Start with the premises and the activity, not a document someone else calls a “shop licence”. Karnataka’s Act covers shops and commercial establishments through its definitions and exemptions. An office or service business should not assume it falls outside the rules simply because it has no retail counter. If applicability is unclear, explain the actual operation to the relevant Labour Department office.',
          'For example, an owner opening a Bengaluru clothing store should list the shop and any separate stock location. A business moving into a second State needs a separate State-specific review. This registration does not incorporate a company or settle every GST, food-safety or local permission requirement.',
        ],
        sourceIds: ['karnataka-act'],
        relatedSlugs: ['shop-establishment-registration-karnataka'],
      },
      {
        id: 'prepare-one-record',
        heading: '2. Put the application information in one place',
        paragraphs: [
          'Use the official Form A as a preparation checklist. It asks for the establishment and head-office details, proprietor, managing partner or directors, the responsible unit head or authorised signatory, activity, commencement date, family members working in the establishment, employee numbers and weekly holiday.',
          'Make one checked record before typing into the portal. Agree which person can confirm employee numbers and which date accurately describes commencement. Check the complete premises address, including floor and unit. Do not guess a business start date just to get past a required field.',
        ],
        sourceIds: ['form-a'],
      },
      {
        id: 'prepare-documents',
        heading: '3. Check the required registration documents',
        paragraphs: [
          'The e-Karmika homepage lists establishment address evidence, owner identity or address evidence, relevant company documents, signatory authorisation or owner self-attestation, payment evidence and a signed registration form. Read the live checklist for your constitution and service; do not treat a generic list as permission to omit an item.',
          'Open each scan yourself. A page can look readable on a phone and still lose the address or signature at the edge. Keep filenames clear, put pages in order and compare names across documents. If the lease names a different entity, resolve the explanation before uploading. Never alter an official document to hide a mismatch.',
        ],
        sourceIds: ['ekarmika'],
      },
      {
        id: 'account-and-jurisdiction',
        heading: '4. Sign in to e-Karmika with the right account',
        paragraphs: [
          'Open the official e-Karmika portal linked above. A new applicant should follow its user-registration instructions; the homepage also provides the existing-user login. Use business contact details the owner can continue accessing. Keep passwords and verification codes private.',
          'Before creating anything new, check whether the establishment already has an online record. The department tells existing registrants to retain the same credentials for renewal, amendment, closure and annual returns. If account access is the problem, use the official contact route rather than making a duplicate registration to work around it.',
          'For a location or jurisdiction question, consult the Labour Commissioner’s official inspector directory. A similar-sounding office name is not enough to establish jurisdiction.',
        ],
        sourceIds: ['ekarmika', 'labour-directory'],
      },
      {
        id: 'complete-and-pay',
        heading: '5. Review the application and government fee, then pay',
        paragraphs: [
          'The department’s procedure runs from checking the checklist to completing the online form, uploading relevant documents, paying through the payment gateway and downloading the acknowledgement. Follow the live screens, including any signing or verification they require. Read declarations before agreeing to them.',
          'Before payment, compare the final form with your checked record. A typo in a phone number can be harder to notice than a missing upload. The fee depends on the employee band; use the amount assessed for your application, not a price in an old screenshot. The portal homepage and its older downloadable procedure display different fee tables, so obtain department clarification if the amount is unclear.',
          'Keep the government payment separate from any assistance charge. A RegisterBox service fee is not the department’s registration fee. Confirm both amounts and what support is included before paying for assistance.',
        ],
        sourceIds: ['ekarmika-sop', 'ekarmika'],
      },
      {
        id: 'track-result',
        heading: '6. Check the application status and registration certificate',
        paragraphs: [
          'Save the acknowledgement and payment reference, then return to your official account to check the application record and any further action. The officer reviews the application and accepts or rejects it. A payment receipt shows a payment; it is not proof that the registration has been approved.',
          'After acceptance, the official procedure provides for the certificate to be generated. When it becomes available, retain a copy and check the name and address immediately. If the result is unclear, use your reference when contacting the department; do not pay again merely because you have not yet found the certificate.',
          'Use the existing account for later services and check the current rules and issued record for renewal or amendment requirements. Moving premises or changing the business should trigger a review. We do not promise a fixed approval time or assume that an old validity period still applies.',
        ],
        sourceIds: ['ekarmika-sop'],
      },
      {
        id: 'registerbox-help',
        heading: 'Start your preparation with RegisterBox',
        paragraphs: [
          'Use the RegisterBox application button to organise your shop or office details and supporting records for preparation and review. The call button is useful if you are unsure which premises, entity or existing certificate to use. Explain the uncertainty first; there is no need to send identity documents in a general enquiry.',
          'Confirm the assistance scope and charges before work begins. A RegisterBox draft or request is not a government filing or an approval. Official submission, verification, authority queries and the final certificate are separate stages. Keep control of your account and complete sensitive verification yourself.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Where do I apply for shop and establishment registration in Bengaluru?',
        answer: 'Karnataka’s Labour Department provides the e-Karmika portal. Check the establishment’s applicability and jurisdiction, then follow the current application checklist.',
      },
      {
        question: 'Can I use this process for a shop outside Karnataka?',
        answer: 'Not as the governing checklist. Use the other State’s official portal and requirements. Forms, fees, exemptions and continuing duties can differ.',
      },
      {
        question: 'Does starting a RegisterBox application submit Form A to the government?',
        answer: 'No. It starts preparation and review with RegisterBox. Government submission and the authority’s decision are separate steps.',
      },
      {
        question: 'Should I create a new account for e-Karmika renewal?',
        answer: 'The department tells existing online registrants to use their existing credentials for renewal and other later services. Resolve an access problem through the official route rather than creating a duplicate registration.',
      },
      {
        question: 'How do I know whether my shop registration is approved?',
        answer: 'Check the application record in your official account and keep the acknowledgement and payment reference. Payment alone is not approval. The procedure generates a certificate after the officer accepts the application.',
      },
      {
        question: 'What fee should I pay for Karnataka shop registration?',
        answer: 'Check the employee band and amount assessed by the current official portal. Its homepage and older manual display different fee tables. Ask the department to clarify a discrepancy; any RegisterBox assistance charge is separate.',
      },
    ],
    sources: [
      {
        id: 'ekarmika',
        title: 'Karnataka Labour Department: e-Karmika registration, upload checklist and existing-user instructions',
        url: 'https://www.ekarmika.karnataka.gov.in/ekarmika/Static/Home.aspx',
      },
      {
        id: 'ekarmika-sop',
        title: 'Karnataka Labour Department: official registration and renewal procedure and help manual',
        url: 'https://www.ekarmika.karnataka.gov.in/ekarmika/Documents/SOP%20HELP%20MANUAL%20Shops%20and%20establishment.pdf',
      },
      {
        id: 'form-a',
        title: 'Karnataka Labour Department: Form A establishment registration details',
        url: 'https://www.ekarmika.karnataka.gov.in/ekarmika/Documents/FormA.pdf',
      },
      {
        id: 'karnataka-act',
        title: 'India Code: Karnataka Shops and Commercial Establishments Act, 1961; definitions and exemptions',
        url: 'https://www.indiacode.nic.in/bitstream/123456789/7609/1/8_of_1962_%28e%29.pdf',
      },
      {
        id: 'labour-directory',
        title: 'Karnataka Labour Commissioner: Labour Inspector jurisdiction directory',
        url: 'https://karmikaspandana.karnataka.gov.in/11/labour-inspector/en',
      },
    ],
    searchQuestions: [
      'What is the shop and establishment registration process in Karnataka?',
      'How do I apply for shop registration online in Bengaluru?',
      'What details does Karnataka Form A require?',
      'Is an e-Karmika payment receipt the registration certificate?',
      'Where do existing e-Karmika users log in?',
      'How do I check Karnataka shop registration application status?',
    ],
    relatedSlugs: ['shop-establishment-registration-karnataka', 'open-new-business-branch-gst', 'business-compliance-check-checklist'],
  },
];
