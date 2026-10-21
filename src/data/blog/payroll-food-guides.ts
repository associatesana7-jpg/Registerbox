import type { BlogArticle } from './types';

export const payrollFoodGuides: BlogArticle[] = [
  {
    slug: 'professional-tax-registration-for-employers-karnataka',
    title: 'Professional tax registration for employers in Karnataka: where to start',
    description: 'Understand Karnataka employer professional tax registration, business enrolment, payroll checks and the records to prepare before paying or filing.',
    category: 'Grow & comply',
    serviceCategory: 'existing',
    enquiryOnly: true,
    image: 'records',
    imageAlt: 'Business owner reviewing payroll records and registration documents at a desk',
    intro: [
      'An employer in Karnataka should check two separate professional tax questions: the duty to deduct and pay tax for eligible employees, and any enrolment liability of the business or professional itself. One certificate or payment should not be assumed to settle both. Start with where people work, the employer identity and the applicable Karnataka schedule.',
      'This guide is for a founder preparing the first payroll, a business opening a Bengaluru branch or an owner taking over compliance from someone else. It explains the decisions and records to organise before using the government portal. The official sources below were checked on 20 October 2026.',
    ],
    sections: [
      {
        id: 'registration-and-enrolment',
        heading: 'Understand the difference between registration and enrolment',
        paragraphs: [
          'Karnataka provides an employer registration route and a separate enrolment route. The department describes the employer’s role as deducting and paying employee professional tax; its enrolment portal covers the person’s or business’s own scheduled liability. You may see RC and EC on these systems. Search results often use PTRC and PTEC, but labels and procedures should be checked against the relevant state portal.',
          'Make two lines in your compliance tracker: “employee deductions” and “business enrolment”. Put the relevant certificate, person responsible and payment reference against each. If an adviser says the tax is already handled, ask which line they mean and request the evidence. This avoids discovering later that everyone was referring to a different obligation.',
        ],
        sourceIds: ['ka-general', 'ka-employer'],
      },
      {
        id: 'work-location',
        heading: 'Start with the place where employees work',
        paragraphs: [
          'The employer FAQ explains that professional tax is a state tax paid where employees work, even when another state’s head office pays their salaries. A company’s registered-office address is therefore not enough to decide the treatment of every employee. Record each work location and flag remote, transferred or multi-state arrangements for review.',
          'For example, a business may have a Mumbai finance team processing salaries for a Bengaluru office. Keep the payroll process and the location assessment connected, so the payment does not go to a state simply because its bank team operates there. If someone changes work location, revisit the assessment rather than copying last month’s deduction.',
        ],
        sourceIds: ['ka-employer'],
      },
      {
        id: 'payroll-and-exemptions',
        heading: 'Check the salary band and exemptions for the relevant month',
        paragraphs: [
          'Karnataka’s published schedule places monthly salary or wages of ₹25,000 and above in the employee tax band. The employer portal also carries a special February deduction notice reflecting the 2025 amendment. Read the current schedule, notifications and exemption conditions before configuring payroll; an old table showing an identical amount every month can be misleading.',
          'Do not decide eligibility from take-home pay alone. Keep a record of the pay figure assessed and the reason for any exemption, with supporting evidence where relevant. The department’s FAQ lists examples of exempt categories but directs readers to the notifications for detail. Ask the payroll reviewer to record the exact basis used for a particular employee.',
        ],
        sourceIds: ['ka-schedule', 'ka-employer', 'ka-general'],
      },
      {
        id: 'prepare-details',
        heading: 'Prepare one consistent set of business and payroll details',
        paragraphs: [
          'Before entering the form, compare the legal name, PAN or TAN, business address and authorised contact with the original records. Look for an existing registration before requesting another one. The employer FAQ describes a PAN/TAN route with mobile verification. Use contact details that the business can continue to access when staff or advisers change.',
          'A useful preparation sheet also records the start of employment, employee work locations and any past payments. If the business is taking over older payroll records, identify missing months explicitly. Label a missing return “not yet verified” instead of treating a blank folder as proof that nothing was due.',
        ],
        bullets: [
          'Legal identity, address and existing certificate references.',
          'Employee list, work locations and monthly payroll review.',
          'Documented exemptions and unresolved questions.',
          'Past returns, payment receipts and reconciliation notes.',
        ],
        sourceIds: ['ka-employer'],
      },
      {
        id: 'payment-and-follow-up',
        heading: 'Match payroll, payment and the filed record',
        paragraphs: [
          'Use a monthly reconciliation showing the payroll deduction total, the amount paid and the return or statement for the same period. Open the downloaded record and check the employer and month. If a payment screen closes unexpectedly, verify the existing transaction before making a second payment. Keep unresolved differences on a follow-up list with an owner.',
          'RegisterBox can discuss your Karnataka professional tax requirements and confirm the scope of available assistance. Use the enquiry and call options on this page for a scope check before paying for a service. For a business with employees in several states, bring a state-by-state list so the discussion addresses the actual payroll arrangement.',
        ],
      },
    ],
    faqs: [
      { question: 'Does one employee make professional tax relevant?', answer: 'The Karnataka employer FAQ says an employer with even one employee can have deduction and payment duties. Assess that employee’s pay and any applicable exemption; do not use the EPF headcount threshold for professional tax.' },
      { question: 'Is professional tax the same across India?', answer: 'No. Check the state where the employee works and that state’s current law, schedule, exemptions and procedures.' },
      { question: 'Does a business enrolment certificate cover employee deductions?', answer: 'Do not assume so. Review the employer registration and the business’s own enrolment separately, then retain evidence for each applicable responsibility.' },
      { question: 'Can RegisterBox file this automatically from this article?', answer: 'This article offers an enquiry and scope-check route. Discuss your state, existing records and required work with the team before relying on a filing service.' },
    ],
    sources: [
      { id: 'ka-employer', title: 'Karnataka Commercial Taxes: employer professional tax FAQ', url: 'https://ptax.karnataka.gov.in/ptemployer/FAQ' },
      { id: 'ka-general', title: 'Karnataka Commercial Taxes: enrolment and professional tax FAQ', url: 'https://ptax.karnataka.gov.in/FAQ' },
      { id: 'ka-schedule', title: 'Karnataka Commercial Taxes: published professional tax schedule', url: 'https://ptax.karnataka.gov.in/documents/pt%20amendment%20bill.pdf' },
    ],
    searchQuestions: ['How do employers register for professional tax in Karnataka?', 'What is the difference between professional tax registration and enrolment?', 'Does a Bengaluru branch need professional tax registration?', 'Is professional tax required for one employee?'],
    relatedSlugs: ['esi-epf-registration-for-startups', 'business-compliance-check-checklist'],
  },
  {
    slug: 'esi-epf-registration-for-startups',
    title: 'ESI and EPF registration for a startup: a practical employer checklist',
    description: 'Check startup ESI and EPF coverage, current labour-code changes, existing registrations, employee records and the next steps after employer registration.',
    category: 'Grow & comply',
    serviceCategory: 'existing',
    enquiryOnly: true,
    image: 'records',
    imageAlt: 'Founder checking employee records and payroll preparation on a laptop',
    intro: [
      'A startup should assess ESI and EPF before its first payroll and again as its workforce changes. The answer depends on establishment coverage, the people engaged, wages, existing membership and current scheme rules. Startup recognition or a small revenue figure does not by itself answer these employment questions.',
      'There have been material changes during 2025 and 2026. This guide separates a coverage review from form submission and ongoing payroll work. Sources were checked on 20 October 2026; use the current official employer guidance when applying them to a particular employee or payroll period.',
    ],
    sections: [
      {
        id: 'coverage-review',
        heading: 'Review the establishment and the workforce first',
        paragraphs: [
          'The Code on Social Security’s First Schedule sets the EPF starting point at establishments with twenty or more employees. For ESI it specifies ten or more persons, with exceptions and special provisions, including notified hazardous occupations. These are starting points for a coverage assessment, not a complete employee-by-employee decision. Voluntary coverage and previously covered establishments also require review.',
          'Prepare a workforce list that explains the actual arrangement: direct employees, people supplied through contractors, branches and work locations. Include joining dates and previous registration or membership details. Do not omit a person simply because a spreadsheet calls them a consultant or temporary worker; ask the reviewer to assess the facts of the engagement.',
        ],
        sourceIds: ['social-security-code', 'esic-notice'],
      },
      {
        id: 'current-2026-position',
        heading: 'Use the current rules rather than an old salary-limit chart',
        paragraphs: [
          'The Ministry confirmed that the Code on Social Security took effect on 21 November 2025. In September 2026, the Government announced an EPFO mandatory-coverage wage ceiling of ₹25,000 from 17 September 2026; the EPFO employer portal now flags guidance on that revision. Check the applicable scheme and implementation instructions, including the employee’s existing membership, before changing a deduction.',
          'For ESI, the Ministry’s March 2026 FAQ stated that the ₹21,000 monthly wage limit continued at that time and that the Code’s wage definition applied from 21 November 2025. A later notification can change the position. Record the source and effective date used for your payroll review instead of copying a figure from an undated online article.',
        ],
        sourceIds: ['code-implementation', 'epfo-ceiling', 'epfo-employer', 'labour-faq'],
      },
      {
        id: 'check-existing-codes',
        heading: 'Look for existing employer and employee records',
        paragraphs: [
          'Before opening a fresh application, search the company’s incorporation pack, previous adviser handover and official employer accounts for allotted codes. Keep a note of whether a code exists, whether the details are correct and what has actually been completed. An unfamiliar login is an access problem to resolve, not a reason to assume that the business was never registered.',
          'For each worker, collect the relevant existing UAN or ESI insurance reference where applicable, and check names against reliable identity records. Ask the person to resolve missing or inconsistent details through the official process. Reusing verified membership information is a different task from deciding whether that employee must be included in the current period.',
        ],
      },
      {
        id: 'registration-pack',
        heading: 'Build the registration pack before opening the form',
        paragraphs: [
          'The EPFO employer portal links to common EPFO and ESIC registration through Shram Suvidha. Start from an official portal and follow its current instructions for your establishment. Prepare a short reference sheet so the business identity, address, activity, authorised person and start dates are consistent wherever they appear.',
          'Treat the checklist below as a preparation aid, not a replacement for the form’s current document list. Keep readable original records and avoid circulating full identity documents through informal groups. Identify who can approve the application and remain available for official verification when needed.',
        ],
        bullets: [
          'Business constitution, legal identity, address and existing employer references.',
          'Authorised-person details and business-controlled contact channels.',
          'Workforce list, joining dates, wage components and membership information.',
          'Coverage review, unresolved issues and responsibility for monthly work.',
        ],
        sourceIds: ['epfo-employer', 'shram-manual'],
      },
      {
        id: 'after-registration',
        heading: 'Plan the monthly work at the same time',
        paragraphs: [
          'Assign someone to reconcile employee records, payroll calculations, the submitted contribution statement and payment evidence for each period. Build a joiner-and-leaver process and review wage or location changes before the next payroll. When an exception needs advice, retain the answer and its effective date with the calculation rather than leaving it in a personal chat.',
          'For example, a team can cross a coverage threshold while hiring for a new branch. A monthly headcount review can reveal the issue before the next salary run. It should trigger an assessment of when coverage began and what needs to be done, rather than an assumption that the date of eventual registration sets every obligation.',
          'Use RegisterBox’s enquiry or call option to discuss your workforce and confirm what assistance is available. Bring existing codes and the coverage questions first. Any proposed service should state whether it includes only registration preparation or also employee enrolment, past-period review and recurring payroll compliance.',
        ],
      },
    ],
    faqs: [
      { question: 'Does startup recognition exempt us from EPF and ESI?', answer: 'Do not treat recognition as a general exemption. Assess the establishment and employees against the applicable coverage provisions and any specific exemption that actually applies.' },
      { question: 'Can I still use the ₹15,000 EPF wage limit from an old guide?', answer: 'The Government announced a revision to ₹25,000 effective 17 September 2026, and the employer portal flags related guidance. Check the current scheme instructions and existing membership before applying a limit to a worker.' },
      { question: 'Does receiving an employer code complete payroll compliance?', answer: 'No. You still need an accurate employee assessment, applicable enrolments, period calculations, contributions and retained evidence. Check what your provider’s scope includes.' },
      { question: 'Is there a direct ESI or EPF filing form in this article?', answer: 'The RegisterBox action here is an enquiry and scope check. Official registration links are included in the sources; confirm the route and required assistance for your establishment.' },
    ],
    sources: [
      { id: 'social-security-code', title: 'Ministry of Labour: Code on Social Security, First Schedule', url: 'https://www.labour.gov.in/static/uploads/2025/07/b0620548445580767b5c0d18c95c26f7.pdf' },
      { id: 'code-implementation', title: 'Ministry of Labour: Code implementation circular, 29 January 2026', url: 'https://www.labour.gov.in/static/uploads/2026/03/d70bb9f7e87ec48bd64fde40329f9c09.pdf' },
      { id: 'epfo-ceiling', title: 'Ministry of Labour / PIB: EPFO wage ceiling announcement, 16 September 2026', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=1&reg=3' },
      { id: 'epfo-employer', title: 'EPFO: official employer portal and common registration link', url: 'https://unifiedportal-emp.epfindia.gov.in/epfo/' },
      { id: 'labour-faq', title: 'Ministry of Labour: March 2026 labour-code FAQs', url: 'https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf' },
      { id: 'esic-notice', title: 'ESIC: establishment coverage under the Social Security Code', url: 'https://esic.gov.in/attachments/publicationfile/Public_Notice_on_registration_under_ESIC_1766043488.pdf' },
      { id: 'shram-manual', title: 'Shram Suvidha: official EPFO and ESIC registration manuals', url: 'https://registration.shramsuvidha.gov.in/users/user_manual' },
    ],
    searchQuestions: ['When does a startup need ESI and EPF registration?', 'What is the EPF wage ceiling in October 2026?', 'What documents should an employer prepare for ESI and EPF?', 'Does an employer code mean PF and ESI compliance is complete?'],
    relatedSlugs: ['esic-registration-online-for-employers', 'professional-tax-registration-for-employers-karnataka', 'business-compliance-check-checklist'],
  },
  {
    slug: 'fssai-licence-cost-government-fees',
    title: 'FSSAI licence cost in 2026: government fees and what changes the bill',
    description: 'Understand current FSSAI government fee examples, the April 2026 turnover changes, perpetual validity and how to compare a food-registration service quote.',
    category: 'Registrations',
    serviceCategory: 'food',
    image: 'food',
    imageAlt: 'Food business owner preparing registration documents beside a kitchen and packaged food',
    intro: [
      'FSSAI cost has two parts when you use a service provider: the applicable government fee and the provider’s fee for the agreed work. The government amount depends on the actual kind of food business and licence or registration route. Get that classification right before comparing package prices.',
      'From April 2026, important turnover and validity changes make many older price guides unreliable. This guide explains the current official fee examples and a practical way to review a quote. Sources were checked on 20 October 2026; confirm the selection and amount shown by FoSCoS before payment.',
    ],
    sections: [
      {
        id: 'government-fee-examples',
        heading: 'What are the government fees?',
        paragraphs: [
          'FoSCoS’s revised eligibility sheet, updated on 1 April 2026, lists annual fee examples of ₹100 for ordinary registration, ₹5,000 for many State licence categories and ₹7,500 for many Central licence categories. These are not universal prices. For instance, the sheet lists a fee waiver for eligible hawkers and different entries for some government-premises and railway activities.',
          'Use the exact row for your business rather than choosing the lowest amount in a general price table. Save the eligibility result or record the category assessed. If a quotation simply says “FSSAI fee”, ask whether that line is the government amount, the professional charge or a combined total.',
        ],
        sourceIds: ['foscos-fees'],
      },
      {
        id: 'april-2026-thresholds',
        heading: 'Check the April 2026 thresholds and activity exceptions',
        paragraphs: [
          'FSSAI’s March 2026 FAQ gives the revised turnover bands effective for new applications from 1 April 2026: registration up to ₹1.5 crore, State licence above ₹1.5 crore and up to ₹50 crore, and Central licence above ₹50 crore. Existing businesses have a migration process. Apply these bands together with the current activity-specific eligibility sheet.',
          'Activity still matters. The sheet has special Central-licence entries without a turnover restriction, including importers and certain specialised food manufacturing categories. Describe what you actually do: prepare meals, manufacture, repack, trade, import or run an e-commerce activity. A small turnover alone does not settle every case.',
        ],
        sourceIds: ['fssai-2026-faq', 'foscos-fees'],
      },
      {
        id: 'perpetual-validity',
        heading: 'Perpetual validity does not mean there are no ongoing fees',
        paragraphs: [
          'The 2026 FAQ explains that perpetual validity continues unless a licence or registration is suspended, cancelled or surrendered. It also allows fees for multiple years to be paid together. Licences and registrations issued on or after 1 April 2026 have perpetual validity. Ongoing hygiene, safety and other applicable requirements remain.',
          'Ask for a clear fee-period explanation when budgeting. A claim such as “lifetime licence” can leave you unsure whether the quoted payment covers one annual fee period, several periods or only assistance with the application. Keep the government receipt and the service invoice separately so a future team member can understand what was paid.',
        ],
        sourceIds: ['fssai-2026-faq'],
      },
      {
        id: 'compare-the-whole-quote',
        heading: 'Compare the work included in a service quote',
        paragraphs: [
          'A useful quote identifies the applicant, premises, proposed category and exact work. It should explain the professional charge, applicable tax on that charge and any excluded costs. Ask how a clarification or change of scope will be handled. This makes it possible to compare two offers that otherwise both promise “complete registration”.',
          'For example, a home-food business might need help describing its activities and organising evidence, while a manufacturer may need a wider review of product and premises requirements. The difference in work should be visible in the scope. Treat an unexplained low headline price as a question to resolve before payment, rather than proof that the cases are equivalent.',
        ],
        bullets: [
          'Which kind of business and premises does the quote cover?',
          'What is the government fee, and what period does it cover?',
          'What professional work and follow-up are included?',
          'What extra work would require another approval and fee?',
        ],
      },
      {
        id: 'prepare-before-paying',
        heading: 'Prepare the facts before selecting a package',
        paragraphs: [
          'Write a short description of the food operation, products, premises and selling channels. Keep the turnover basis, business identity and address evidence ready. If an activity is changing, explain the intended operation rather than submitting details for a model you no longer use. Mark uncertain items for review instead of guessing at a category.',
          'Before payment, check the applicant name, address, selected activity and displayed amount together. Keep a copy of the application and payment record, then follow the official status and any request for information. An application receipt proves a step was taken; review the issued certificate and its details when the authority completes the process.',
          'RegisterBox’s food-business page provides the direct application-preparation route and a call option for discussing your case. Bring your activity summary first so the team can confirm the proposed scope. The authority determines registration or licensing; the service discussion should explain the work and charges without promising an approval date.',
        ],
      },
    ],
    faqs: [
      { question: 'Is the FSSAI government fee always ₹100?', answer: 'No. ₹100 is an annual ordinary-registration example in the current fee sheet. The amount depends on the selected activity and registration or licence category; some entries have waivers or other fees.' },
      { question: 'Does every food business below ₹1.5 crore get registration?', answer: 'The turnover band must be read with the official kind-of-business eligibility. Some activities have specific licence requirements regardless of turnover.' },
      { question: 'Does perpetual validity mean I pay once and never again?', answer: 'Do not assume that. FSSAI’s FAQ discusses annual fees and paying several years together even under perpetual validity. Confirm the fee period and ongoing requirements for your case.' },
      { question: 'Should the professional fee be included in the government receipt?', answer: 'Ask for a breakdown. Keep the official government payment evidence and the provider’s invoice so both charges and their scope are clear.' },
    ],
    sources: [
      { id: 'foscos-fees', title: 'FoSCoS: revised kind-of-business eligibility and annual fee sheet, April 2026', url: 'https://foscos.fssai.gov.in/officer/assets/docs/Revised_2ndApril2026KindofBusinessEligibility.pdf' },
      { id: 'fssai-2026-faq', title: 'FSSAI: 27 March 2026 FAQs on revised thresholds, fees and perpetual validity', url: 'https://www.fssai.gov.in/upload/advisories/2026/03/69c6a23234827order_27032026.pdf' },
      { id: 'foscos', title: 'FoSCoS: official FSSAI application and eligibility portal', url: 'https://foscos.fssai.gov.in/' },
    ],
    searchQuestions: ['How much does an FSSAI licence cost in 2026?', 'Is FSSAI registration ₹100 per year?', 'What changed in FSSAI licensing from April 2026?', 'Does perpetual FSSAI validity remove annual fees?'],
    relatedSlugs: ['fssai-home-kitchen-cloud-kitchen', 'start-business-sole-proprietorship-checklist'],
  },
];
