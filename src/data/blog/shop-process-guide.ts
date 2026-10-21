import type { BlogArticle } from './types';

export const shopProcessGuide: BlogArticle[] = [
  {
    slug: 'shop-and-establishment-registration-process',
    title: 'Karnataka shop and establishment registration: the online process, step by step',
    description: 'A practical e-Karmika application guide for Bengaluru and Karnataka: choose the right route, prepare Form A details, check uploads, pay and track the result.',
    publishedAt: '2026-10-21',
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
      'For a shop or commercial establishment in Karnataka, the official online registration route is the Labour Department’s e-Karmika portal. The practical sequence is to check applicability, prepare the establishment details, complete the application, upload the requested evidence, pay the applicable charge and save the acknowledgement. The authority reviews the application before issuing a certificate.',
      'This is a Karnataka guide, including Bengaluru, not one national shop-licence process. Our separate Karnataka preparation guide covers the wider registration questions. Here, we focus on getting an online application ready without avoidable mistakes.',
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
        heading: '3. Check the uploads before you start',
        paragraphs: [
          'The e-Karmika homepage lists establishment address evidence, owner identity or address evidence, relevant company documents, signatory authorisation or owner self-attestation, payment evidence and a signed registration form. Read the live checklist for your constitution and service; do not treat a generic list as permission to omit an item.',
          'Open each scan yourself. A page can look readable on a phone and still lose the address or signature at the edge. Keep filenames clear, put pages in order and compare names across documents. If the lease names a different entity, resolve the explanation before uploading. Never alter an official document to hide a mismatch.',
        ],
        sourceIds: ['ekarmika'],
      },
      {
        id: 'account-and-jurisdiction',
        heading: '4. Use the right account and location',
        paragraphs: [
          'Open e-Karmika from the official link above and follow its new-user or sign-in route. Use business contact details the owner can continue accessing. An employee’s personal inbox may be convenient today but difficult to recover after that employee leaves.',
          'Check whether the establishment already has an online record before starting a duplicate. The portal tells existing online registrants to use their existing credentials for renewals, amendments, closure and annual returns. For a location or jurisdiction question, consult the Labour Commissioner’s official inspector directory rather than choosing an office because it sounds nearby.',
        ],
        sourceIds: ['ekarmika', 'labour-directory'],
      },
      {
        id: 'complete-and-pay',
        heading: '5. Complete, review and pay through the official flow',
        paragraphs: [
          'The department’s procedure runs from checking the checklist to completing the online form, uploading relevant documents, paying through the payment gateway and downloading the acknowledgement. Follow the live screens, including any signing or verification they require. Read declarations before agreeing to them.',
          'Before payment, compare the final form with your checked record. A typo in a phone number can be harder to notice than a missing upload. Use the amount assessed for your application, not a price in an old screenshot: the portal homepage and its downloadable procedure currently display different fee tables. Obtain clarification if the payable amount is unclear.',
        ],
        sourceIds: ['ekarmika-sop', 'ekarmika'],
      },
      {
        id: 'track-result',
        heading: '6. Keep the acknowledgement and check the outcome',
        paragraphs: [
          'Payment is not the same as approval. The official procedure includes an officer’s review and acceptance or rejection; a certificate follows acceptance. Save the application acknowledgement and payment reference in the same folder. Check the record for further action instead of assuming that a receipt is the certificate.',
          'When a certificate becomes available, check its name and address immediately. Keep later changes, renewal and closure on the compliance checklist, using the applicable rules and the issued record. This guide does not promise a fixed approval time or assume one validity period fits every situation.',
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
    ],
    relatedSlugs: ['shop-establishment-registration-karnataka', 'open-new-business-branch-gst', 'business-compliance-check-checklist'],
  },
];
