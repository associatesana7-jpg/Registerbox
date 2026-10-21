import type { BlogArticle } from './types';

export const directorEmployerGuides: BlogArticle[] = [
  {
    slug: 'dir-3-kyc-filing-online-process',
    title: 'DIR-3 KYC filing online: what changed in 2026 and how to prepare',
    description: 'Understand the revised director KYC cycle, checking your DIN record, preparing a change filing and keeping proof, with official MCA sources and a clear help route.',
    category: 'Grow & comply',
    serviceCategory: 'existing',
    enquiryOnly: true,
    publishedAt: '2026-10-21',
    howToSection: 'online-process',
    officialApplication: { label: 'Open the official MCA portal', url: 'https://www.mca.gov.in/' },
    image: 'dir3-kyc',
    imageAlt: 'Editorial illustration of a director checking a personal KYC record and contact details beside a secure laptop',
    intro: [
      'Looking for the DIR-3 KYC filing online process? Start by checking whether you need a routine KYC confirmation, a contact or address update, or help with a deactivated DIN. These are different situations. A director who is already compliant should not submit another form simply because an old article says KYC is due every September.',
      'This guide was checked against official sources on 21 October 2026. RegisterBox offers a compliance enquiry and scope discussion here; it does not currently provide a dedicated DIR-3 KYC filing tool. The actual form and official confirmation belong to the MCA process.',
    ],
    sections: [
      {
        id: '2026-kyc-change',
        heading: 'First, stop using the old annual-KYC calendar',
        paragraphs: [
          'MCA announced that its amendment, effective from 31 March 2026, replaces annual director KYC with an intimation once in three years. Its 1 January 2026 release says directors who had already completed KYC are next due by 30 June 2028. Do not turn that transition statement into a deadline for every newly allotted or previously non-compliant DIN.',
          'The revised form covers KYC, contact and residential-address changes, and DIN reactivation. MCA also explains that director digital-signature verification and professional certification are required when updating mobile, email or residential address. An old checklist demanding the same signing steps for every case can therefore be misleading.',
        ],
        sourceIds: ['mca-2026-release', 'mca-2025-amendment'],
      },
      {
        id: 'identify-your-case',
        heading: 'Work out what you are actually trying to change',
        paragraphs: [
          'Make a short note with your DIN, the last completed KYC reference and the problem you need to solve. Is the record unchanged? Have you lost access to an old email? Did the residential address change? Is a saved draft being mistaken for a completed filing? A clear problem statement helps the person reviewing the case choose the right next action.',
          'For example, a founder moving home should tell the reviewer the date of the move and what address currently appears on record. Someone who cannot receive messages should identify which contact is inaccessible. These are preparation examples, not a finding that any particular form is due. Check the current rules and the live service before deciding what to file.',
        ],
        bullets: [
          'Record the DIN and the last successful KYC acknowledgement.',
          'Describe the changed detail or the exact DIN-status problem.',
          'Note when the change occurred and what evidence is available.',
          'Separate confirmed facts from questions still awaiting review.',
        ],
        sourceIds: ['mca-2025-amendment'],
      },
      {
        id: 'prepare-access',
        heading: 'Prepare access and records before starting the online form',
        paragraphs: [
          'Open the official MCA website directly rather than following an unsolicited payment message. Check that you can access the appropriate MCA account and the director’s own contact channels. Do not put a staff member’s temporary email into a preparation sheet just because that person is handling today’s paperwork.',
          'Keep the old acknowledgement beside the proposed new details. Compare spellings, address lines and contact information carefully. If the chosen filing requires signing or certification, coordinate that work before starting a time-sensitive submission. Keep passwords, OTPs and digital-signature PINs private; a request for assistance does not require sending these secrets in a message.',
        ],
        sourceIds: ['mca-portal', 'mca-2026-release'],
      },
      {
        id: 'online-process',
        heading: 'A practical sequence for the current MCA process',
        paragraphs: [
          'Sign in through MCA and open the current director KYC service. Read the available filing purposes and choose the one matching your case. Review the DIN record and the information the form brings forward before adding or confirming anything. If a field is locked or the expected purpose is unavailable, stop and check the instructions instead of selecting a different purpose merely to continue.',
          'Complete the verification, supporting evidence and signing steps that the live form requires for that purpose. Review the declaration before submission. Where a payment is shown, confirm the reason and amount against the current official fee instructions; do not use an old “late fee from 1 October” statement as a calculation.',
          'Keep the reference and downloaded acknowledgement, then check the resulting status. A screenshot of a filled form is useful working evidence, but it is not the same as a successful official filing. If the session fails after payment, investigate that transaction before making a duplicate payment.',
        ],
        sourceIds: ['mca-portal', 'mca-2025-amendment'],
      },
      {
        id: 'fix-problems',
        heading: 'When the record or portal does not match expectations',
        paragraphs: [
          'Write down the exact error, the page, the attempted action and its time. Keep a redacted screenshot that excludes OTPs, passwords and unnecessary identity information. Check whether the issue is an account-access problem, inconsistent particulars, an unfinished transaction or an actual filing eligibility question. Repeating the same submission rarely answers that distinction.',
          'For a new DIN, old non-filing or a disputed next due date, obtain a case-specific check rather than borrowing a colleague’s calendar. Give the reviewer the allotment and filing history. Ask for the action, applicable date and official basis in writing so the business has a usable record of the conclusion.',
        ],
      },
      {
        id: 'registerbox-help',
        heading: 'Get a scope check through RegisterBox',
        paragraphs: [
          'Use the enquiry or call button on this page to discuss the issue with RegisterBox. Explain that it concerns director KYC and mention whether the problem is a changed detail, an inaccessible contact or DIN status. Ask the team to confirm the available assistance, any professional certification and the fee before authorising work.',
          'The enquiry does not file DIR-3 KYC, change the DIN record or guarantee reactivation. Once the official process is complete, keep its acknowledgement with your company records and assign someone to check future personal-detail changes. That small handover makes the next review much easier.',
        ],
      },
    ],
    faqs: [
      { question: 'Is DIR-3 KYC still an annual September filing?', answer: 'MCA announced a three-year KYC cycle effective from 31 March 2026. Check the revised rule and your DIN history rather than following the old annual calendar.' },
      { question: 'Does every director have the same next KYC date?', answer: 'Do not assume that. MCA’s 30 June 2028 transition statement concerns directors who had completed KYC. A new or previously non-compliant DIN needs its own review.' },
      { question: 'Can RegisterBox submit DIR-3 KYC directly from this page?', answer: 'No. The buttons provide an enquiry and scope discussion, not a dedicated filing flow. Official filing takes place through MCA with the required verification.' },
      { question: 'Should I send my OTP or digital-signature PIN for help?', answer: 'No. Keep those secrets private. Share a clear description and, where needed, redacted evidence through an agreed secure support process.' },
    ],
    sources: [
      { id: 'mca-2026-release', title: 'Ministry of Corporate Affairs: revised three-year director KYC framework, 1 January 2026', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2210552&lang=1&reg=3' },
      { id: 'mca-2025-amendment', title: 'MCA: Companies (Appointment and Qualification of Directors) Amendment Rules, 2025; G.S.R. 943(E)', url: 'https://www.mca.gov.in/bin/dms/getdocument?mds=Vk%252FT5sIBKBare6St1b%252FznQ%253D%253D&type=open' },
      { id: 'mca-portal', title: 'Ministry of Corporate Affairs: official portal, current filing services and help', url: 'https://www.mca.gov.in/' },
    ],
    searchQuestions: ['How do I file DIR-3 KYC online in 2026?', 'Is director KYC required every year?', 'When is the next DIR-3 KYC due?', 'Can I get help with a deactivated DIN?'],
    relatedSlugs: ['business-compliance-check-checklist', 'private-limited-company-registration-documents', 'llp-vs-private-limited-company-startup'],
  },
  {
    slug: 'esic-registration-online-for-employers',
    title: 'ESIC registration online for employers: a practical preparation guide',
    description: 'Prepare employer and employee records for ESIC registration, understand the current coverage review and official portal routes, and plan the payroll work that follows.',
    category: 'Grow & comply',
    serviceCategory: 'existing',
    enquiryOnly: true,
    publishedAt: '2026-10-21',
    howToSection: 'official-route',
    officialApplication: { label: 'View official ESIC registration routes', url: 'https://portal.esic.gov.in/ESICInsurance1/ESICInsurancePortal/ESICSignup.aspx' },
    image: 'esic-employer',
    imageAlt: 'Editorial illustration of an employer organising employee records beside a healthcare protection symbol',
    intro: [
      'ESIC registration online starts with a coverage check, not with choosing a certificate package. Work out which establishment is being registered, when coverage began and which employees need to be included. The employer record and the employee records must then connect to an ongoing payroll process.',
      'This guide uses official sources checked on 21 October 2026. Labour-code changes mean older articles can describe a previous legal position or portal screen. RegisterBox can receive a compliance enquiry and discuss the work you need; this page is not a dedicated ESIC registration or contribution-filing tool.',
    ],
    sections: [
      {
        id: 'coverage-first',
        heading: 'Check coverage under the current framework',
        paragraphs: [
          'The Ministry says the Labour Codes took effect on 21 November 2025. The Social Security Code’s ESI starting point is establishments with ten or more persons, subject to its provisions and exceptions. Notified hazardous or life-threatening occupations can bring even a one-employee establishment within coverage; voluntary coverage also exists below the normal threshold.',
          'Establishment headcount is not the same question as an individual employee’s insurability. Section 2(26), second proviso, includes employees above the notified wage ceiling when counting for establishment coverage under Chapters III and IV. Check the current employee wage rules separately. Do not rely on an old chart saying every shop in a particular state is outside ESI until it reaches twenty staff.',
        ],
        sourceIds: ['labour-codes-commencement', 'social-security-code'],
      },
      {
        id: 'workforce-details',
        heading: 'Build one reliable workforce list',
        paragraphs: [
          'Prepare a dated list of the people working in the business, where they work, their joining dates and how they are engaged. Show people supplied through a contractor separately so the reviewer can examine the arrangement. Add the payroll components rather than a single take-home figure. Names such as “temporary” or “consultant” should trigger a facts check, not automatic exclusion.',
          'For example, a workshop owner may count only the people on the main salary sheet while a separate supervisor pays additional workers. A useful review starts by explaining both arrangements. Keep uncertain entries marked for review and record the conclusion. This is more reliable than changing the spreadsheet to match a preferred headcount.',
        ],
        sourceIds: ['social-security-code'],
      },
      {
        id: 'business-records',
        heading: 'Prepare the establishment details before creating another account',
        paragraphs: [
          'Check whether the business already has an ESIC employer code, a previous registration record or a registration obtained through incorporation. Search the business’s own records before starting a duplicate. Compare the legal identity and premises details with the documents the organisation actually uses, and decide who will maintain the account after registration.',
          'A preparation folder should identify the activity, locations, responsible employer and contact person. Use contact channels that the business controls; the registration should remain accessible when an employee or adviser leaves.',
        ],
        bullets: [
          'Existing ESIC code, registration references and previous correspondence, if any.',
          'Legal name, constitution, activity and establishment addresses.',
          'Principal-employer and authorised-contact details.',
          'Dated workforce and wage records, with unresolved questions flagged.',
        ],
        sourceIds: ['esic-employer-manual', 'esic-signup'],
      },
      {
        id: 'official-route',
        heading: 'Choose the official route that fits the establishment',
        paragraphs: [
          'The ESIC signup page currently asks whether the establishment falls in specified labour-contractor, manpower-supplier or security-agency categories. It directs other applicants to the common ESIC/EPFO registration link. Follow that routing prompt rather than ticking a contractor category merely to unlock the form.',
          'The same official page requests company name, principal-employer name, state, region and contact information. Account signup is only the beginning: complete the relevant establishment registration and review the resulting employer record. Check the current form’s evidence and declaration requirements before submitting. If the route is unclear, ask the relevant ESIC office or helpdesk with the business facts in hand.',
          'Save the official reference and registration result. Open the downloaded record and check the establishment identity and address. If an account or code already exists, resolve access or correction questions instead of assuming a second registration is the quickest answer.',
        ],
        sourceIds: ['esic-signup', 'esic-employer-manual'],
      },
      {
        id: 'employees-and-payroll',
        heading: 'Employer registration is not the end of the job',
        paragraphs: [
          'Eligible employees also need to be correctly connected to the employer’s record. Check for an existing insurance number before treating a person as a first-time entrant. Use the current employee-registration instructions and arrange any identity verification through the official process. Do not collect a folder of identity copies or send OTPs in ordinary messages simply because someone is helping with registration.',
          'Agree who will maintain joiners, leavers, wage information, contributions and receipts. Reconcile payroll with the relevant official record each period. When an employee asks how to access a benefit, the business should be able to identify the registration and contribution history instead of searching through an old consultant’s inbox.',
          'ESIC’s employer manual is useful for understanding the preparation workflow, but it is not a substitute for current law or updated screens. The 2025 regional public notice below is also historical: its SPREE closing date is not an open October 2026 concession. Do not assume a past registration window removes an existing liability.',
        ],
        sourceIds: ['esic-employer-manual', 'esic-2025-notice'],
      },
      {
        id: 'get-scope-check',
        heading: 'Bring the right questions to RegisterBox',
        paragraphs: [
          'Use this page’s enquiry or call button to discuss establishment coverage, an existing code, missing employee records or the scope of ongoing support. Bring the workforce summary, locations and known registration history first. The team can confirm what assistance is available and what needs specialist review before you authorise paid work.',
          'Ask for a clear handover: what was submitted, the official references, what remains unresolved and who handles the next payroll period. A RegisterBox enquiry is not an ESIC acknowledgement, and registration alone does not confirm that every employee record or contribution is correct. Keep those outcomes separate in your compliance tracker.',
        ],
      },
    ],
    faqs: [
      { question: 'Does ESIC registration depend only on employees earning below a wage ceiling?', answer: 'No. Assess establishment coverage and individual employee insurability separately. The Code includes employees above the notified wage ceiling in the establishment-coverage count.' },
      { question: 'Should every employer use the ESIC signup form directly?', answer: 'Follow its live routing prompt. The page directs applicants outside the specified contractor and manpower categories to common ESIC/EPFO registration.' },
      { question: 'Can I assume a small headcount means no ESI duty?', answer: 'No. Check the current Code, any notified hazardous occupation, voluntary coverage and any prior coverage. A headcount shortcut is not a complete assessment.' },
      { question: 'Can RegisterBox register my establishment automatically from this guide?', answer: 'No. The RegisterBox buttons provide an enquiry and scope check. Official employer registration and employee verification use the applicable government process.' },
    ],
    sources: [
      { id: 'social-security-code', title: 'Ministry of Labour: Code on Social Security, 2020; section 2(26), second proviso, and First Schedule', url: 'https://www.labour.gov.in/static/uploads/2025/07/b0620548445580767b5c0d18c95c26f7.pdf' },
      { id: 'labour-codes-commencement', title: 'Ministry of Labour: Labour Code commencement and ESI coverage changes, 18 December 2025', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2206144&lang=1&reg=3' },
      { id: 'esic-signup', title: 'ESIC: employer signup and routing to common ESIC/EPFO registration', url: 'https://portal.esic.gov.in/ESICInsurance1/ESICInsurancePortal/ESICSignup.aspx' },
      { id: 'esic-employer-manual', title: 'ESIC: employer registration user manual; preparation and workflow reference', url: 'https://www.esic.in/App_Themes/User_Manual/Employer_Registration.pdf' },
      { id: 'esic-2025-notice', title: 'ESIC Tirunelveli: regional registration notice after Labour Code commencement; historical 2025 SPREE dates', url: 'https://esic.gov.in/attachments/publicationfile/Public_Notice_on_registration_under_ESIC_1766043488.pdf' },
    ],
    searchQuestions: ['How do employers complete ESIC registration online?', 'Which ESIC registration portal should an employer use?', 'What details should I prepare for ESIC registration?', 'Is employer registration the same as employee ESI registration?'],
    relatedSlugs: ['esi-epf-registration-for-startups', 'professional-tax-registration-for-employers-karnataka', 'business-compliance-check-checklist'],
  },
];
