import type { BlogArticle } from './types';

export const gstFoodGuides: BlogArticle[] = [
  {
    slug: 'gst-registration-documents-and-address-proof',
    title: 'GST legal ownership document & address proof explained',
    description: 'What does legal ownership document mean in GST registration? Check the address proof for owned, rented and consent premises, with official CBIC guidance.',
    modifiedAt: '2026-10-26',
    reviewedAt: '2026-10-26',
    category: 'Registrations',
    serviceCategory: 'gst_registration',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'A legal ownership document in GST registration is evidence of who owns the business premises. It supports the address declared in the application. If you rent or use someone else’s property, you also need the evidence for that arrangement; ownership proof and permission to occupy are not the same thing.',
      'Start by deciding whether the premises are owned, rented or used with the owner’s consent. Then prepare the applicant’s PAN-linked identity, business details and signatory authority. This checklist separates those documents so you can spot missing evidence before applying.',
    ],
    sections: [
      {
        id: 'identify-the-applicant',
        heading: 'Is premises ownership proof the same as business identity?',
        paragraphs: [
          'The GST portal distinguishes the legal name linked to PAN from the trade name customers see. A proprietor may trade under a shop name while applying using the proprietor’s PAN. A company or LLP has its own identity. Check the constitution, legal name and PAN together, then identify the person authorised to submit and receive communications.',
          'Before scanning documents, make a short reference sheet with the correct legal name, trade name, contact details, full premises address and business activity. Ask everyone helping with the application to use this version. It prevents a small spelling change from spreading through several forms.',
          'A PAN or partnership deed identifies the applicant or its business structure. Premises evidence answers a different question: who owns the place where the business operates, and on what basis does the applicant use it? Keep these checks separate rather than substituting one document for the other.',
        ],
        sourceIds: ['gst-application'],
      },
      {
        id: 'owned-rented-consent',
        heading: 'Which address proof works for owned, rented or consent premises?',
        paragraphs: [
          'CBIC Instruction 03/2025-GST, dated 17 April 2025, sets out these common arrangements. Read the applicable case, not a combined list for every property:',
          'Match the name and premises across the papers. A document belonging to a different property does not explain the address in your application.',
        ],
        bullets: [
          'Owned: one accepted ownership document, such as the latest property-tax receipt, municipal khata or owner’s electricity bill. Comparable local-law evidence can also qualify.',
          'Rented: a valid rent or lease agreement and one accepted ownership document. An unregistered agreement also needs the lessor’s identity proof; a registered agreement does not.',
          'Tenant utility connection: the instruction accepts the rent agreement with an electricity or water connection document in the applicant tenant’s name without additional lessor documents.',
          'Consent or family premises: a plain-paper owner consent letter, the consenter’s identity proof and one accepted document establishing the consenter’s ownership.',
        ],
        sourceIds: ['cbic-registration'],
        relatedSlugs: ['fast-gst-registration-three-hours'],
      },
      {
        id: 'address-mismatch',
        heading: 'What if the name or address does not match?',
        paragraphs: [
          'Compare the door or flat number, floor, building, street, locality and PIN code across the application and supporting papers. Mark each difference. A shorter street spelling may be explainable; a different unit or property owner needs closer attention. Identify whether the underlying document needs correction or whether separate evidence can explain the connection.',
          'For example, suppose a lease says “Unit 4, second floor” while the electricity bill covers the whole building. Keep a clear note of how the unit relates to that building and check whether the evidence actually supports the declared space. This is a preparation example, not an assurance that a particular combination will be accepted.',
        ],
      },
      {
        id: 'build-the-document-pack',
        heading: 'What other GST registration documents should you prepare?',
        paragraphs: [
          'Use descriptive filenames and retain the original scans. Open every upload on a phone as well as a computer: can you read the names, address, dates and signatures without guessing? Include the relevant pages of an agreement together and check the portal’s current file requirements before uploading.',
          'Keep a simple document register showing what each file proves and who can replace it if a clarification arrives. Do not alter a document to make facts match. If a tenancy or ownership record is wrong, resolve it with the person responsible for that record.',
        ],
        bullets: [
          'Applicant identity and constitution records that fit the business structure.',
          'Premises permission and ownership evidence that fit the actual arrangement.',
          'Authorised-person details and accessible contact channels.',
          'A note of unresolved differences and the person handling each one.',
        ],
      },
      {
        id: 'application-and-approval',
        heading: 'Follow the application through to the issued result',
        paragraphs: [
          'The portal separates a saved draft from a submitted application. Keep the submission reference and check for required action. If a clarification notice arrives, read its exact questions and response date, then answer each point with the relevant explanation or evidence. Uploading another copy of the same unclear file rarely answers the underlying question.',
          'RegisterBox can help organise the business profile, premises checklist and application preparation, then track the reference and clarification work. Registration approval comes from the GST authority. After issue, check the certificate details and plan invoicing, records and return responsibilities before treating the work as finished.',
        ],
        sourceIds: ['gst-application'],
      },
    ],
    faqs: [
      { question: 'Can I apply for GST registration from a family-owned home?', answer: 'The premises evidence must support the actual arrangement. CBIC describes an owner-consent route with the consenter’s identity and ownership evidence. Also check any separate restrictions on using the property for your activity.' },
      { question: 'Does a trade name have to be the same as the PAN name?', answer: 'The portal treats the legal name and trade name as separate fields. Use the correct PAN-linked legal identity and the actual trade name in their respective places.' },
      { question: 'Will a complete document pack guarantee my GSTIN?', answer: 'No. It helps the application explain the facts, but the authority still performs its checks and decides the application.' },
    ],
    sources: [
      { id: 'gst-application', title: 'GST portal: application for registration', url: 'https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm' },
      { id: 'cbic-registration', title: 'CBIC Instruction 03/2025-GST: registration application documents', url: 'https://cbic-gst.gov.in/pdf/ins-gst-no-03-2025.pdf' },
    ],
    searchQuestions: ['What does legal ownership document in GST mean?', 'What documents are required for GST registration?', 'Which address proof is required for GST registration?', 'Can I use a rented house for GST registration?', 'What if my GST registration address proof does not match?', 'Is an owner consent letter accepted for GST registration?'],
    relatedSlugs: ['fast-gst-registration-three-hours', 'gstr-1-vs-gstr-3b', 'no-sales-nil-gstr-3b'],
  },
  {
    slug: 'gstr-1-vs-gstr-3b',
    title: 'What is GSTR-3B? Meaning and difference from GSTR-1',
    description: 'GSTR-3B explained in plain English: summary GST liability, purchase credit, reverse charge, the difference from GSTR-1 and how to check filing status.',
    modifiedAt: '2026-10-26',
    reviewedAt: '2026-10-26',
    category: 'GST & records',
    serviceCategory: 'gst',
    image: 'records',
    imageAlt: 'Illustration of a business owner reviewing invoices with a calculator and laptop',
    intro: [
      'GSTR-3B is a summary GST return for a tax period. It reports tax liabilities, eligible input tax credit and how the liability is paid. It is not a list of every sales or purchase invoice. GSTR-1 is the separate statement of outward supplies, with the applicable invoice details and summaries.',
      'Is GSTR-3B for sales or purchases? Both can affect it. Sales can create outward-tax liability. Purchases can affect eligible input tax credit, reversals or reverse-charge liability. Filing GSTR-1 does not file GSTR-3B; check which forms apply to your GSTIN and period.',
    ],
    sections: [
      {
        id: 'gstr-1-role',
        heading: 'What is the difference between GSTR-1 and GSTR-3B?',
        paragraphs: [
          'GSTR-1 contains the applicable outward-supply details, rather than only one sales total. Depending on the business, that can include customer invoices, consumer sales, exports, notes, advances, exempt supplies and required summaries. The GST portal provides a final summary for review before the statement is filed.',
          'Group the records by their actual treatment. A sale to a registered business, a customer refund and an export should not disappear into a single spreadsheet line just because they belong to the same month. Keep a path back from every summary to the source documents.',
        ],
        bullets: [
          'GSTR-1: the outward-supply statement. It reports the required sales details and summaries, including invoice-level reporting where applicable.',
          'GSTR-3B: the summary return. It brings together liability, eligible credit and payment rather than repeating each invoice.',
          'GSTR-2B: an input-credit statement to reconcile with purchases. It is not a return you file.',
        ],
        sourceIds: ['gstr1-manual'],
      },
      {
        id: 'gstr-3b-role',
        heading: 'Is GSTR-3B for sales or purchases?',
        paragraphs: [
          'It is not a choice between the two. Review sales for outward liability, purchases for eligible input tax credit and required reversals, and applicable inward supplies for reverse charge. Do not put a purchase total into the sales field or assume all purchase GST is claimable.',
          'Review outward liability, reverse-charge transactions, credit claims and reversals, other required disclosures, and any interest or late fee. Then review how the liability will be discharged. GSTN’s comparison reports help compare GSTR-3B with GSTR-1/IFF/GSTR-1A and input-credit statements; a difference is a reason to investigate the records.',
          'Do not resolve a mismatch by changing a number simply to make two screens agree. Write down the cause: perhaps an invoice was missed, a note belongs to another reporting period or the tax treatment needs review. Correct the relevant record through the applicable route and retain the explanation.',
        ],
        sourceIds: ['gstr3b-faq', 'comparison'],
        relatedSlugs: ['gstr-3b-filing-process-online', 'no-sales-nil-gstr-3b'],
      },
      {
        id: 'gstr-2b-input-credit',
        heading: 'Use GSTR-2B alongside the purchase books',
        paragraphs: [
          'GSTR-2B is an input-tax-credit statement, not another return you file. Compare it with purchase records and supporting documents. GSTN specifically asks taxpayers to avoid claiming the same document twice, make required reversals and pay applicable reverse-charge tax. Credit showing in the statement still needs the legal eligibility checks relevant to the purchase.',
          'Imagine a purchase invoice appears twice in an imported sheet, while a supplier’s credit note is missing. Copying the sheet total would carry both errors forward. Match document numbers, supplier identity, values and notes first, then record what remains unresolved and who will follow it up.',
          'Illustrative record check: a shop has ten customer invoices, five supplier bills and one supplier credit note. GSTR-1 uses the applicable outward-supply details. GSTR-3B uses reviewed liability and credit summaries, not sixteen invoice rows. The supplier bills and credit note still need reconciliation before any credit claim. This example explains the workflow; it does not determine the shop’s tax or credit entitlement.',
        ],
        sourceIds: ['gstr2b'],
      },
      {
        id: 'approval-payment',
        heading: 'Approve the figures and payment before authorising filing',
        paragraphs: [
          'Use a review sheet that names the business, GSTIN, form and period. Show the liability, eligible credit, proposed use of credit and cash, and any additional cash needed. Ask the preparer to explain unusual movements from the previous period in ordinary language. A business owner should be able to understand what is being approved.',
          'Keep payment approval separate from approval of the return figures. Confirm the relevant ledgers and the exact operation before an authorised person completes the permitted OTP/EVC or DSC step. If the figures change after approval, review the changed version before continuing. These are practical controls for avoiding an unwanted or mistaken submission.',
        ],
      },
      {
        id: 'proof-of-filing',
        heading: 'Keep proof of the completed filing',
        paragraphs: [
          'A saved draft, generated summary or payment receipt should not be treated as proof that a return has been filed. Check the authoritative portal status and retain the filing acknowledgement or ARN and filed return for the correct GSTIN, form and period. If a request times out, check status before trying the same filing again.',
          'RegisterBox’s GST workspace helps organise records, prepare drafts, review the period and track acknowledgements. The relevant connection, records, approvals and filing route must be available for the selected case. A prepared draft remains preparation work until the completed filing can be verified.',
        ],
        sourceIds: ['gstr1-manual', 'nil-manual'],
      },
    ],
    faqs: [
      { question: 'If I filed GSTR-1, do I still need GSTR-3B?', answer: 'Where both forms apply to your registration and period, each has its own purpose and filing. Completing the outward-supply statement does not complete GSTR-3B.' },
      { question: 'Can I claim every amount shown in GSTR-2B?', answer: 'Do not assume that appearance alone establishes eligibility. Compare the purchase documents and apply the relevant credit conditions, restrictions and reversals.' },
      { question: 'Does paying a GST challan mean my return is filed?', answer: 'A payment record alone does not prove completed filing. Check the return status and keep the filed return and acknowledgement for that period.' },
    ],
    sources: [
      { id: 'gstr1-manual', title: 'GSTN: GSTR-1 purpose and outward-supply details', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm' },
      { id: 'gstr3b-faq', title: 'GSTN: what GSTR-3B reports and how it uses GSTR-1 and GSTR-2B', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm' },
      { id: 'comparison', title: 'GSTN: comparison of liabilities and input tax credit', url: 'https://tutorial.gst.gov.in/userguide/inputtaxcredit/Manual_comparison_of_liability_declared_and_ITC_claimed.htm' },
      { id: 'gstr2b', title: 'GSTN: GSTR-2B questions and reconciliation guidance', url: 'https://tutorial.gst.gov.in/userguide/returns/FAQ_gstr2b.htm' },
      { id: 'nil-manual', title: 'GSTN: draft, authorisation and filed-status steps for nil GSTR-3B', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B_-_File_Nil_Return.htm' },
    ],
    searchQuestions: ['What is GSTR-3B?', 'Is GSTR-3B for sales or purchases?', 'What is the difference between GSTR-1 and GSTR-3B?', 'Why are my GSTR-1 and GSTR-3B figures different?', 'Is GSTR-2B a return?', 'How do I know my GST return is filed?'],
    relatedSlugs: ['gstr-3b-filing-process-online', 'no-sales-nil-gstr-3b', 'gst-registration-documents-and-address-proof'],
  },
  {
    slug: 'no-sales-nil-gstr-3b',
    title: 'No sales this month: can I file a nil GSTR-3B?',
    description: 'No sales does not automatically mean a nil GST return. Check purchases, input credit, reverse charge, adjustments and outstanding charges first.',
    category: 'GST & records',
    serviceCategory: 'gst',
    image: 'records',
    imageAlt: 'Illustration of a business owner reviewing invoices with a calculator and laptop',
    intro: [
      'No sales does not automatically make GSTR-3B a nil return. You must also check inward supplies, credit activity, reverse charge, adjustments and any liability that belongs in the return. Decide from complete records for the selected period, rather than the balance in your bank account or an empty sales screen.',
      'This matters for a newly registered business, a seasonal shop and a company that has temporarily stopped trading. A quiet sales month can still include rent, stock purchases, professional services or earlier-period work that needs attention.',
    ],
    sections: [
      {
        id: 'nil-means-more-than-no-sales',
        heading: 'What the GST portal checks for nil filing',
        paragraphs: [
          'GSTN’s nil-return guidance requires the relevant absence of transactions and liabilities. Its questionnaire includes outward supplies, reverse-charge supplies, input-credit claims or reversals, exempt or non-GST inward supplies, interest, late fee and other liabilities. The online nil option also depends on the portal’s populated data and outstanding charges.',
          'These questions are useful because “nothing happened” can mean different things to different people. A founder may mean there were no customers. An accountant may still have supplier bills, credit notes and older adjustments to review. Agree what records have actually been checked before making the declaration.',
        ],
        sourceIds: ['gstr3b-faq'],
      },
      {
        id: 'collect-records',
        heading: 'Check the whole period, including small transactions',
        paragraphs: [
          'Gather the sales register, purchase register, notes, expense invoices, relevant portal statements and any pending items brought forward. Include channels outside the main accounting tool, such as a marketplace export or an invoice kept in email. Ask whether anything remains unrecorded rather than asking only whether sales were zero.',
          'A simple working note can say which records were checked, the last transaction date reviewed and which questions remain open. If one channel is missing, label the review incomplete. A blank import caused by an unavailable connection should never become evidence that the business had no transactions.',
        ],
      },
      {
        id: 'three-examples',
        heading: 'Three examples that show why the answer changes',
        paragraphs: [
          'A new shop makes no sales but buys stock. The purchase still needs review, including its input-credit treatment. The owner cannot decide nil eligibility solely from zero turnover. Keep the purchase invoice with the period’s records and determine the correct reporting before choosing the filing route.',
          'A consultant has no new clients but receives a service invoice. Ask what the service is, who supplied it and whether any reverse-charge or credit question arises. This example does not mean every expense attracts reverse charge; it means the underlying transaction must be checked.',
          'A business has no new trading activity but an earlier filing left an interest or late-fee question. Check the portal and records before proceeding. The absence of current sales does not answer what is payable or reportable from that earlier work.',
        ],
      },
      {
        id: 'nil-option-missing',
        heading: 'If the nil option is unavailable, investigate the reason',
        paragraphs: [
          'GSTN explains that populated GSTR-1/IFF or GSTR-2B data, manual entries, or outstanding interest and late fee can prevent the online nil option. Review the source of the amount. Do not remove a real invoice or erase an entry simply to activate a shortcut.',
          'If a figure appears to be wrong, preserve the supporting records and identify whether a supplier correction, accounting correction or another permitted action is needed. Ask for a clear explanation of the chosen treatment. The useful result is a correct return, whether its final tax payable is zero or a positive amount.',
        ],
        sourceIds: ['nil-manual'],
      },
      {
        id: 'review-and-complete',
        heading: 'Complete the review before the signatory acts',
        paragraphs: [
          'Confirm the GSTIN, return form, filing period and current status. Keep a record of the nil-eligibility review and resolve unanswered questions. The authorised person should see what is being declared before completing the applicable filing authorisation. Afterwards, verify the portal result and save the filed return and acknowledgement.',
          'RegisterBox can help collect period records and prepare a return review. Its GST workspace distinguishes preparation from filing and tracks acknowledgements. If records or a required connection are missing, complete that work first; a missing result is not a nil result.',
          'For the next quiet month, keep recording purchases and expenses as they occur. This makes the eventual decision easier to support and avoids reconstructing several months of activity from messages and bank entries close to a filing deadline.',
        ],
      },
    ],
    faqs: [
      { question: 'I had no sales but bought stock. Is my GSTR-3B nil?', answer: 'Do not assume nil. Review the purchase, its credit treatment and the other reportable items before deciding.' },
      { question: 'Can I delete purchase entries to enable nil filing?', answer: 'Do not remove real transactions to obtain a nil option. Investigate the source and use the correct reporting or correction route.' },
      { question: 'Does no tax payable mean the return is nil?', answer: 'No. A return can require transaction or credit reporting even when no additional cash tax is payable.' },
    ],
    sources: [
      { id: 'gstr3b-faq', title: 'GSTN: GSTR-3B questions, including nil eligibility', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm' },
      { id: 'nil-manual', title: 'GSTN: online nil GSTR-3B conditions and filing steps', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B_-_File_Nil_Return.htm' },
    ],
    searchQuestions: ['Can I file nil GSTR-3B if there are no sales?', 'No sales but purchases: do I file a nil GST return?', 'Why is the nil GSTR-3B option disabled?', 'Is zero tax payable the same as a nil return?'],
    relatedSlugs: ['gstr-3b-filing-process-online', 'gstr-1-vs-gstr-3b', 'gst-registration-documents-and-address-proof'],
  },
  {
    slug: 'fssai-home-kitchen-cloud-kitchen',
    title: 'FSSAI for a home kitchen or cloud kitchen: where to start in 2026',
    description: 'Check the current FSSAI route for a home food business or cloud kitchen, including the April 2026 thresholds, activity classification and documents.',
    category: 'Registrations',
    serviceCategory: 'food',
    image: 'food',
    imageAlt: 'Illustration of a food entrepreneur preparing takeaway meals in a small kitchen',
    intro: [
      'A food business does not become exempt from FSSAI registration or licensing because it runs from home or has no seating. FSSAI explicitly includes cloud kitchens. Start with the actual kitchen activity, premises and current FoSCoS eligibility criteria, then prepare the documents for that route.',
      'Use current guidance when comparing articles. FSSAI revised turnover thresholds from 1 April 2026, so an older guide using ₹12 lakh as the general registration threshold can send a new applicant in the wrong direction. Activity-specific categories still matter.',
    ],
    sections: [
      {
        id: 'describe-the-food-business',
        heading: 'Describe what the kitchen actually does',
        paragraphs: [
          'Write down the food you prepare, where it is made, how it is packed and how it reaches customers. Preparing lunch boxes, baking packaged products, catering an event and running a delivery-only restaurant are different descriptions. Select the FoSCoS kind of business that matches the work rather than the label that sounds easiest.',
          'For example, someone cooking daily lunch boxes for nearby offices should describe the preparation and distribution arrangement. A brand selling packaged sauces made by another manufacturer should describe that relationship too. This short exercise helps reveal extra activities that a one-line description such as “online food business” misses.',
        ],
      },
      {
        id: 'thresholds-2026',
        heading: 'Check the April 2026 thresholds against the correct category',
        paragraphs: [
          'FSSAI’s order dated 13 March 2026 introduced revised turnover bands effective 1 April 2026: registration up to ₹1.5 crore, State licence above ₹1.5 crore and up to ₹50 crore, and Central licence above ₹50 crore. Apply the current activity-specific eligibility table as well; this headline summary is not a classification for every business.',
          'The published April 2026 table gives restaurants those three bands. Its home-based canteens and dabba-wallas group shows registration up to ₹1.5 crore and State licence above that amount. Other food activities have their own criteria. Check the exact row before choosing a licence or paying for an application.',
        ],
        sourceIds: ['threshold-order', 'eligibility-2026'],
      },
      {
        id: 'documents',
        heading: 'Use the checklist for your application route',
        paragraphs: [
          'FoSCoS’s registration-certificate list asks for a photograph, government-issued photo identity and business-address proof when the activity address differs from the identity document. Licence documents depend on the kind of food business; FSSAI directs applicants to the relevant FoSCoS document list.',
          'Prepare a readable address and activity record before uploading anything. Check who operates the business, who has permission to use the kitchen and which premises the application covers. Follow the actual checklist for matters such as product details, layout, equipment or water evidence when relevant, instead of copying an oversized list from another business.',
        ],
        sourceIds: ['registration-documents', 'licensing-faq'],
      },
      {
        id: 'delivery-and-premises',
        heading: 'Keep the preparation address clear when selling through delivery apps',
        paragraphs: [
          'A customer may find you through a delivery platform while food is prepared at a home or shared kitchen. Keep the operating address and business identity clear across your records. Write down who cooks, packs, stores and dispatches the food, particularly when another business shares the premises.',
          'Use an expansion plan before adding another kitchen or changing products. List what will change and ask which records or approvals need updating. Do the same when moving from direct lunch orders to a different food activity. A new sales channel should trigger a review of the facts, rather than an assumption that the old description covers everything.',
        ],
      },
      {
        id: 'application-follow-through',
        heading: 'Track the application and check the issued details',
        paragraphs: [
          'Save the application reference, payment record and submitted document set. When the authority raises a question, answer the particular issue and retain the response. When a certificate or licence is issued, compare its business name, premises and activity coverage with the application you intended to make.',
          'RegisterBox helps food businesses map their activity and premises, assemble the relevant evidence and prepare the application. Ask for a clear split between the assistance quote and official charges for the selected route. Authority scrutiny and approval remain part of the process; an application receipt should not be presented as an issued licence.',
          'Keep the final documents where the person running the kitchen can find them. Record changes to the premises, operator or activity as they happen, then check the current FoSCoS process for the action needed. Good paperwork should make the real business easier to understand.',
        ],
      },
    ],
    faqs: [
      { question: 'Does a cloud kitchen with no tables need FSSAI registration or a licence?', answer: 'Yes. FSSAI’s licensing FAQ expressly says cloud kitchens need the registration or licence appropriate to their eligibility.' },
      { question: 'Is ₹12 lakh still the general FSSAI registration threshold in 2026?', answer: 'FSSAI’s March 2026 order revised the registration turnover band to up to ₹1.5 crore from 1 April 2026. Check the current kind-of-business criteria as well.' },
      { question: 'Will every home food business use the same category?', answer: 'No. A home canteen, packaged-food manufacturer and other activities can have different classifications. Describe the actual work and check the relevant FoSCoS row.' },
    ],
    sources: [
      { id: 'threshold-order', title: 'FSSAI order dated 13 March 2026: revised turnover thresholds', url: 'https://www.fssai.gov.in/upload/advisories/2026/03/69b4054bb6cd6Order%20dated%2013thMarch2026_Revised%20Turnover%20threshold.pdf' },
      { id: 'eligibility-2026', title: 'FoSCoS: kind-of-business eligibility table updated 1 April 2026', url: 'https://foscos.fssai.gov.in/assets/docs/Revised_31thMarch2026KindofBusinessEligibility.pdf' },
      { id: 'registration-documents', title: 'FoSCoS: documents for a registration certificate', url: 'https://foscos.fssai.gov.in/assets/docs/DocumentsrequiredforRegistrationCertificate.pdf' },
      { id: 'licensing-faq', title: 'FSSAI licensing FAQ: cloud kitchens and application document lists', url: 'https://www.fssai.gov.in/upload/uploadfiles/files/FAQs_Licensing_Registration_26_07_2022.pdf' },
    ],
    searchQuestions: ['Does a home kitchen need an FSSAI licence?', 'How do I register a cloud kitchen with FSSAI?', 'What is the FSSAI registration turnover limit in 2026?', 'What documents do I need for FSSAI home food business registration?'],
    relatedSlugs: ['gst-registration-documents-and-address-proof', 'gstr-1-vs-gstr-3b'],
  },
];
