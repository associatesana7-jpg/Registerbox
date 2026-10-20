import type { BlogArticle } from './types';

export const businessGuides: BlogArticle[] = [
  {
    slug: 'private-limited-company-registration-documents',
    title: 'Private limited company registration: what founders should decide before filing',
    description: 'A practical company registration guide covering ownership, director and office documents, SPICe+, costs and the work that follows incorporation.',
    category: 'Start a business',
    serviceCategory: 'company',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'To register a private limited company, first settle who owns it, who manages it, what it will do and where its registered office will be. Those decisions shape the incorporation application. Collecting identity documents before agreeing the ownership plan often creates work that has to be done twice.',
      'A company can make sense when founders want share ownership and expect to bring in investors. It also creates an ongoing responsibility to keep company records and complete filings. Here is how to prepare a useful brief before starting the MCA process.',
    ],
    sections: [
      {
        id: 'ownership',
        heading: 'Start with the shareholding conversation',
        paragraphs: [
          'Write down the proposed shareholders, their initial investment and the shares each will receive. Separately record the directors and the decisions they will make. Owning shares and managing daily work are different roles, even when the same people do both.',
          'For example, two founders may agree to split ownership equally while only one initially works full time. Discuss what happens if the other joins later, someone leaves or a new investor comes in. These are agreement questions; an incorporation form cannot resolve a disagreement that the founders have left open.',
        ],
        sourceIds: ['startup-legal'],
      },
      {
        id: 'name-and-activity',
        heading: 'Choose a name that fits the actual activity',
        paragraphs: [
          'Prepare a short description of what the company will sell, who its customers will be and how it will earn money. “Technology business” is less helpful than “software subscriptions for small retailers”. Clear activity information makes it easier to review the proposed objects and the application.',
          'Keep a few name options ready and check for potential brand conflicts. Approval of a company name and registration of a trademark are separate processes. Buying a domain name also does not settle whether the brand can be used safely.',
        ],
        sourceIds: ['mca-incorporation', 'ipindia-process'],
      },
      {
        id: 'documents',
        heading: 'Build one consistent document folder',
        paragraphs: [
          'Collect the current identity and address evidence requested for directors and subscribers, along with the proposed capital and ownership details. For the registered office, identify who owns the premises and whether the company will use it under ownership, rent or another permitted arrangement.',
          'Check spellings, dates and the complete address before documents go into the application. A lease naming a different occupant or an unreadable attachment can prompt a query. Foreign subscribers or documents signed abroad need specific review rather than the same checklist used for every domestic case.',
        ],
        sourceIds: ['mca-incorporation'],
      },
      {
        id: 'filing',
        heading: 'Understand what happens in SPICe+',
        paragraphs: [
          'MCA uses the SPICe+ incorporation process and linked forms for the relevant company applications. The exact set depends on the case. Arrange the required digital signatures and have the completed application reviewed before authorising submission.',
          'Keep the acknowledgement and follow the real status. If MCA requests a correction, respond to the specific point and preserve the revised version. Payment or submission is a stage in the process; the incorporation certificate is the result you need to verify.',
        ],
        sourceIds: ['mca-incorporation'],
      },
      {
        id: 'cost-and-next-steps',
        heading: 'Budget for the first year, not just the application',
        paragraphs: [
          'Ask for a written quote that separates government charges, stamp duty, digital signatures, assistance and taxes. Also ask what is excluded: a resubmission, a foreign-document review or later filings may need a different scope. One advertised price is hard to compare without that detail.',
          'After incorporation, plan banking, accounting, statutory records and applicable tax or operating registrations. A food business, for example, still needs its food-business route assessed. Put the first-year tasks into a calendar so the new company does not become a forgotten certificate.',
        ],
        sourceIds: ['nsws-approvals'],
      },
      {
        id: 'get-ready',
        heading: 'What to bring to a RegisterBox discussion',
        paragraphs: [
          'Bring your activity summary, founder and ownership plan, proposed office arrangement and the questions you have not settled. RegisterBox can organise the information and documents, coordinate preparation and provide a separate assistance quote. Work requiring professional certification or legal judgment needs the appropriate qualified professional.',
          'A useful first outcome is a list of decisions, missing records and next actions. That gives you something concrete to review before you approve a filing or commit to its cost.',
        ],
      },
    ],
    faqs: [
      { question: 'Do I need a private limited company to start any business?', answer: 'No. Compare ownership, personal liability, funding plans and recurring work first. A proprietorship, partnership or LLP may fit a different set of needs.' },
      { question: 'Is company name approval the same as trademark protection?', answer: 'No. Company-name checks and trademark examination serve different purposes. Review the brand separately before investing heavily in packaging or promotion.' },
      { question: 'Can I start every activity as soon as incorporation is complete?', answer: 'Some activities need additional premises, tax, food, labour or sector approvals. Check the operating requirements for the actual business and location.' },
    ],
    sources: [
      { id: 'mca-incorporation', title: 'MCA: SPICe+ incorporation and linked filing FAQs', url: 'https://www.mca.gov.in/Ministry/pdf/SPICe%2Band_linked_filings_FAQs_V3_13%20Jan_2022_updated.pdf' },
      { id: 'startup-legal', title: 'Startup India: legal considerations and founder agreements', url: 'https://www.startupindia.gov.in/content/sih/en/Legal-Considerations-for-a-Startup-.html' },
      { id: 'ipindia-process', title: 'IP India: trademark filing process', url: 'https://ipindia.gov.in/trade-marks-learn-filing-process-step-by-step' },
      { id: 'nsws-approvals', title: 'NSWS: business approval discovery', url: 'https://www.nsws.gov.in/' },
    ],
    searchQuestions: ['What documents are needed for private limited company registration?', 'How do I register a private limited company in Bengaluru?', 'What should co-founders decide before company registration?'],
    relatedSlugs: ['llp-registration-partner-agreement', 'start-business-sole-proprietorship-checklist', 'trademark-registration-name-logo-search'],
  },
  {
    slug: 'llp-registration-partner-agreement',
    title: 'LLP registration: the partner decisions that matter before the forms',
    description: 'Understand LLP registration, partner contributions, profit sharing, the LLP agreement, FiLLiP and the records needed to start with a clear arrangement.',
    category: 'Start a business',
    serviceCategory: 'llp',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'An LLP is a separate business entity organised around its partners and their agreement. Registering one involves more than choosing a name: partners should agree on contributions, profit sharing, decision-making and what happens when somebody leaves.',
      'The most useful preparation is a written account of how you expect the partnership to work. That helps the incorporation information and the LLP agreement tell the same story.',
    ],
    sections: [
      {
        id: 'fit',
        heading: 'Does an LLP fit the way you will work?',
        paragraphs: [
          'Consider an LLP when the business is intended to be run through a partner arrangement. Compare it with a company if you expect share-based investment, employee equity or frequent ownership changes. The right choice depends on the planned business rather than which registration has the shortest form.',
          'Limited liability also needs context. It does not make every personal guarantee, wrongful act or contractual promise disappear. Discuss important risks with a qualified adviser before relying on the structure for protection.',
        ],
        sourceIds: ['it-business-types'],
      },
      {
        id: 'contribution-and-profit',
        heading: 'Separate contribution, profit share and work',
        paragraphs: [
          'A partner might contribute money while another brings equipment, skills or agreed services. Record what each contribution means and how it will be documented. Do not assume equal working hours, contribution amounts and profit shares must all be identical.',
          'For a small design studio, for instance, one partner may handle sales while another delivers client work. Agree how they approve spending, pay themselves and share losses. A rushed agreement can leave these ordinary decisions unclear until a difficult month makes them urgent.',
        ],
        sourceIds: ['llp-fillip', 'llp-form3'],
      },
      {
        id: 'agreement',
        heading: 'Discuss departures before anybody wants to leave',
        paragraphs: [
          'Talk through admission of new partners, retirement, incapacity, disagreement and business closure. Decide who can sign contracts, operate the bank account or commit the LLP to debt. Also agree how partners will access the books and how disputes will be escalated.',
          'These are useful briefing questions for the person drafting the agreement. Avoid copying another firm’s document and changing only the names. A clause suited to a family trading business may be awkward for a consultancy with several working partners.',
        ],
        sourceIds: ['llp-form3'],
      },
      {
        id: 'application-records',
        heading: 'Prepare the incorporation information',
        paragraphs: [
          'Make a record of the proposed name, activity, partners, designated partners, contributions and registered office. Collect the identity, address, consent and digital-signature evidence required for the actual applicants. Check current MCA instructions when a body corporate or an overseas person is involved.',
          'The FiLLiP instruction kit explains the name-reservation and LLP-incorporation form. Read the final filing as a complete account of the proposed LLP: names, office and contribution information should match the supporting records.',
        ],
        sourceIds: ['llp-fillip'],
      },
      {
        id: 'after-incorporation',
        heading: 'Keep agreement filing on the launch checklist',
        paragraphs: [
          'The incorporation certificate and the LLP agreement are separate pieces of the process. MCA’s Form 3 is used for information about the agreement and changes to it. Confirm the applicable execution, stamping and filing requirements as part of the launch plan, rather than leaving them for a later annual review.',
          'Keep the signed agreement, payment evidence and acknowledgement together. Add accounting, tax, annual and event-based work to a calendar with a named owner. An LLP with little activity can still have obligations; a quiet bank account is not a reliable compliance test.',
        ],
        sourceIds: ['llp-form3'],
      },
      {
        id: 'practical-next-step',
        heading: 'Ask for a scope that covers the whole setup',
        paragraphs: [
          'Before accepting a quote, check whether it covers name work, incorporation preparation, partner consents, agreement coordination and post-incorporation filing. Ask which official fees, State stamp charges and professional work are separate.',
          'RegisterBox can help organise partner and office records and coordinate the agreed application work. Bring the unresolved partner decisions as well as the documents. Resolving who may approve spending can be more valuable than submitting an otherwise complete form a day earlier.',
        ],
      },
    ],
    faqs: [
      { question: 'Is an LLP the same as an ordinary partnership?', answer: 'No. An LLP is a separate entity under the LLP framework. Its incorporation and filing requirements differ from an ordinary partnership arrangement.' },
      { question: 'Can partners choose different profit-sharing percentages?', answer: 'The intended contribution and profit arrangement should be clearly agreed and properly recorded. Have the agreement reviewed for the partners and business involved.' },
      { question: 'Is the incorporation certificate enough to finish the setup?', answer: 'No. The agreement, its applicable stamping and filing, banking, books and any activity-specific registrations still need attention.' },
    ],
    sources: [
      { id: 'it-business-types', title: 'Income Tax Department: types of business organisation', url: 'https://www.incometaxindia.gov.in/w/types-of-business-organisation' },
      { id: 'llp-fillip', title: 'MCA: instruction kit for FiLLiP', url: 'https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf' },
      { id: 'llp-form3', title: 'MCA: LLP agreement Form 3 instruction kit', url: 'https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_LLP_Form_No_3.pdf' },
    ],
    searchQuestions: ['How do I register an LLP in India?', 'What should an LLP agreement include?', 'What is the difference between contribution and profit share in an LLP?'],
    relatedSlugs: ['private-limited-company-registration-documents', 'start-business-sole-proprietorship-checklist', 'business-compliance-check-checklist'],
  },
  {
    slug: 'start-business-sole-proprietorship-checklist',
    title: 'How to start a small business: a practical proprietorship checklist',
    description: 'Decide your business structure, map registrations, prepare an address record and set up everyday bookkeeping before your first sale.',
    category: 'Start a business',
    serviceCategory: 'new',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'Starting a small business usually means making several connected decisions, rather than obtaining one certificate called “business registration”. Your ownership, products, location and sales channels determine which registrations and permissions need review.',
      'A sole proprietorship is owned by one person and does not create a separate incorporated entity. It can be a straightforward way to organise a small operation, but the owner remains personally responsible for the business. Begin with the facts below before choosing the structure.',
    ],
    sections: [
      {
        id: 'one-page-brief',
        heading: 'Describe one real business, in one page',
        paragraphs: [
          'Write what you will sell, who will buy it, where the work happens and how customers will pay. Include storage, employees, delivery and any partner who expects ownership. A home bakery, a software consultancy and a neighbourhood clothing shop should not receive the same launch checklist.',
          'Include your first-year plan, not just today’s setup. A business starting with local orders may soon use a marketplace or rent a warehouse. Seeing that plan early helps you avoid selecting an address or arrangement that you immediately need to change.',
        ],
      },
      {
        id: 'choose-structure',
        heading: 'Choose the structure before collecting certificates',
        paragraphs: [
          'For a proprietorship, the person and the business are not separate legal persons. If another founder is putting in money in exchange for ownership, pause and discuss whether a partnership, LLP or company is appropriate. Calling somebody a co-founder does not itself record their rights.',
          'Compare personal risk, how you will share ownership, future funding and recurring work. Avoid choosing a company simply because it sounds larger, or a proprietorship simply because it appears cheaper. A structure should fit the business you intend to run.',
        ],
        sourceIds: ['it-business-types', 'startup-legal'],
      },
      {
        id: 'map-approvals',
        heading: 'Build a registration map around your activity',
        paragraphs: [
          'Use the National Single Window System’s approval-discovery tool as a starting point, then confirm the applicable requirements with the issuing authorities. Its suggestions depend on your inputs and need your own assessment.',
          'The questions should cover tax, premises, local establishment rules and any product-specific permissions. For example, someone selling food needs a food-business review even if orders arrive only through messages. A registration for one purpose does not automatically cover the other parts of the operation.',
        ],
        sourceIds: ['nsws-faq'],
      },
      {
        id: 'udyam',
        heading: 'Understand where Udyam fits',
        paragraphs: [
          'Udyam is the government’s MSME registration system. The official portal states that registration is free, paperless and based on self-declaration. Use the government portal or its listed government facilitation channels; do not mistake a private website for the issuing authority.',
          'MSME status is a different question from incorporation or permission to operate a particular activity. Before applying, read the official eligibility and identity instructions. Keep control of your authentication and verify the certificate through the official system.',
        ],
        sourceIds: ['udyam'],
      },
      {
        id: 'everyday-records',
        heading: 'Make the first transaction easy to explain',
        paragraphs: [
          'Decide how you will keep invoices, supplier bills, payments, cancellations and customer advances. Agree who maintains the records and how often they will be checked. Separate business spending from personal spending so the bank balance is easier to reconcile.',
          'Save the full premises address and the evidence supporting its use. When a portal, bank or customer asks for a document, send the version that matches the actual business. A tidy record at the start is much easier than rebuilding three months of purchases from messages.',
        ],
      },
      {
        id: 'first-week',
        heading: 'Turn the plan into a short launch list',
        paragraphs: [
          'End the planning discussion with decisions, missing documents, required applications and who owns each task. Mark any approval that must be effective before a particular activity begins. Keep a separate list of optional recognitions and commercial tools so they do not obscure a mandatory step.',
          'RegisterBox can help capture your activity and compare the registration routes, then scope the preparation work. A clear starting brief lets you ask useful questions about the sequence, cost and remaining responsibilities before you commit.',
        ],
      },
    ],
    faqs: [
      { question: 'Is there one certificate that creates every sole proprietorship?', answer: 'There is no single MCA incorporation certificate for a proprietorship. Applicable tax, activity and local registrations depend on what the proprietor actually does.' },
      { question: 'Does Udyam registration cost a government fee?', answer: 'The official Udyam portal states that registration is free. Use its official process and government facilitation channels.' },
      { question: 'Can I start a business from home?', answer: 'That depends on the activity, premises terms and applicable local or sector rules. Check the planned use before assuming a residential address is suitable.' },
    ],
    sources: [
      { id: 'it-business-types', title: 'Income Tax Department: business structures and proprietorship', url: 'https://www.incometaxindia.gov.in/w/types-of-business-organisation' },
      { id: 'startup-legal', title: 'Startup India: choosing an entity and founder arrangements', url: 'https://www.startupindia.gov.in/content/sih/en/Legal-Considerations-for-a-Startup-.html' },
      { id: 'nsws-faq', title: 'NSWS: how approval discovery works', url: 'https://www.nsws.gov.in/faqs' },
      { id: 'udyam', title: 'Government of India: official Udyam registration portal', url: 'https://udyamregistration.gov.in/' },
    ],
    searchQuestions: ['How do I start a sole proprietorship in Bengaluru?', 'Which registrations does a small business need?', 'Is Udyam the same as company registration?'],
    relatedSlugs: ['private-limited-company-registration-documents', 'llp-registration-partner-agreement', 'shop-establishment-registration-karnataka'],
  },
  {
    slug: 'shop-establishment-registration-karnataka',
    title: 'Shop and establishment registration in Karnataka: prepare the right details',
    description: 'Understand what to check for a Karnataka shop or office, how to organise establishment records and why GST and other permissions are separate.',
    category: 'Registrations',
    serviceCategory: 'retail',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'Karnataka shop and establishment registration concerns the establishment and its applicable labour-law requirements. It is different from GST registration, a municipal trade permission or the incorporation of the owner’s company.',
      'Before opening a shop, office or service location in Bengaluru, check whether the establishment falls within the current State requirements and whether an exemption applies. Then prepare information that matches the premises and the business actually operating there.',
    ],
    sections: [
      {
        id: 'which-registration',
        heading: 'Work out which question you are trying to answer',
        paragraphs: [
          'Owners often ask for a “shop licence” when they mean several different documents. Establishment registration, permission for a particular trade, tax registration and a food licence answer different questions. List the exact document requested by a bank, landlord or authority before applying.',
          'The Ministry of Labour’s Karnataka integration page lists registration under the Shops and Establishment Act among the State services. Use the official State route and current instructions for the application. Avoid relying on a fee or validity period copied from another State’s guide.',
        ],
        sourceIds: ['labour-karnataka'],
      },
      {
        id: 'facts-to-collect',
        heading: 'Describe the people, place and activity',
        paragraphs: [
          'Prepare the establishment’s name, complete address, activity, owner or entity information, responsible manager, workforce details and planned or actual commencement date. If you operate from several locations, make a separate list of what happens at each one.',
          'A clothing shop with a stockroom is different from an office that only takes orders while goods leave another warehouse. Explain both locations. A short, accurate account of the operation helps determine which records and registrations need attention.',
        ],
      },
      {
        id: 'premises',
        heading: 'Resolve address problems before uploading',
        paragraphs: [
          'Check that the agreement, owner evidence and application describe the same space. Include the floor, unit, street and PIN code consistently. If a document uses an older building number, identify how the address can be supported rather than silently changing the wording.',
          'Also confirm that you have the right to use the premises for the proposed business. A landlord agreeing to rent a room is not the same as every authority accepting the planned use. Resolve a doubtful use before spending on a fit-out or signage.',
        ],
      },
      {
        id: 'application',
        heading: 'Follow the current portal requirements',
        paragraphs: [
          'Use the current application route linked by the Karnataka authorities. Read the requested evidence, fee, process and available status information for your establishment. Keep your business contact details under your control so a query or renewal message reaches the right person.',
          'Before submission, compare the completed form with your source documents. Save the acknowledgement and check the issued record once available. If the name, address or other detail is wrong, ask about the proper correction process instead of carrying the mismatch into later applications.',
        ],
        sourceIds: ['labour-karnataka', 'nsws-faq'],
      },
      {
        id: 'after-opening',
        heading: 'Keep registration and everyday duties together',
        paragraphs: [
          'An establishment certificate should sit beside the operational calendar, not disappear into an email folder. Check the current requirements affecting working conditions, applicable notices, employment records and later changes with the responsible authority or adviser.',
          'Opening a second unit, moving premises or changing the business activity should trigger another review. Set a reminder using the dates and conditions on the actual issued document. Do not assume that a friend’s renewal schedule applies to your certificate.',
        ],
        sourceIds: ['labour-karnataka'],
      },
      {
        id: 'prepare-for-help',
        heading: 'Make an enquiry that can produce a useful answer',
        paragraphs: [
          'Share the location, activity, entity type, employee situation and whether the business has already begun. Add existing registrations and the specific question you need resolved. Karnataka’s Labour Commissioner publishes a jurisdiction directory that can help identify the relevant office. You do not need to send identity documents in a general enquiry.',
          'RegisterBox can organise the establishment information and the documents for a scoped review. Ask for a breakdown of assistance charges and authority charges, and confirm whether amendments, queries or later renewals are included.',
        ],
        sourceIds: ['labour-directory'],
      },
    ],
    faqs: [
      { question: 'Does having GST registration replace shop and establishment registration?', answer: 'No. They address different requirements. Whether establishment registration applies needs a review of the actual establishment and current State rules.' },
      { question: 'Does this apply only to shops with a street-facing counter?', answer: 'Do not decide from the word “shop” alone. Offices and other commercial establishments need an applicability check, including relevant definitions and exemptions.' },
      { question: 'Can I use a Karnataka checklist for a branch in another State?', answer: 'Use it only as a preparation aid. The other State’s authority, forms, fees and requirements need a separate review.' },
    ],
    sources: [
      { id: 'labour-karnataka', title: 'Ministry of Labour: Karnataka approvals and registrations', url: 'https://registration.shramsuvidha.gov.in/Users/stateintegration_acts/karnataka' },
      { id: 'labour-directory', title: 'Karnataka Labour Commissioner: local jurisdiction directory', url: 'https://karmikaspandana.karnataka.gov.in/11/labour-inspector/en' },
      { id: 'nsws-faq', title: 'NSWS: finding approval-specific documents and fees', url: 'https://www.nsws.gov.in/faqs' },
    ],
    searchQuestions: ['How do I register a shop in Karnataka?', 'Is shop and establishment registration different from GST?', 'What details are needed for shop registration in Bengaluru?'],
    relatedSlugs: ['gst-registration-documents-and-address-proof', 'open-new-business-branch-gst', 'business-compliance-check-checklist'],
  },
  {
    slug: 'start-online-ecommerce-business-india',
    title: 'Starting an online business in India: the questions to settle before selling',
    description: 'Plan products, marketplace roles, warehouses, customer policies and registration checks before your online business takes its first order.',
    category: 'Start a business',
    serviceCategory: 'online',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'An online business needs a plan for who sells, where goods or services come from, how customers pay and what happens when an order goes wrong. There is no single registration that answers all of those questions.',
      'A website, marketplace account or social-media page is a sales channel. The business behind it still needs the registrations, product checks and customer information that apply to its actual role. Start with the order journey and work outwards.',
    ],
    sections: [
      {
        id: 'your-role',
        heading: 'Map one order from supplier to customer',
        paragraphs: [
          'Write who owns the stock, who issues the invoice, where dispatch happens and who receives payment. Include returns. Selling your own products through a marketplace is different from running a platform that connects many sellers with buyers.',
          'For example, a Bengaluru seller may advertise from home but keep goods in a fulfilment warehouse elsewhere. Both locations belong in the review. The address shown on the website is not enough to explain the supply chain.',
        ],
      },
      {
        id: 'gst-questions',
        heading: 'Get a GST answer for your actual sales model',
        paragraphs: [
          'Tell the reviewer what you sell, the States involved, the platform’s role and where stock is held. Ask how the current registration rules and any conditions or exemptions apply to those facts. A blanket answer based only on “I sell online” can miss the important distinction.',
          'Keep the legal name, bank details, tax records and marketplace account consistent. The official GST registration manual shows that business activity and the principal and additional places form part of the application. Review later changes before opening a new dispatch location.',
        ],
        sourceIds: ['gst-registration'],
      },
      {
        id: 'product-checks',
        heading: 'Check the product before writing the listing',
        paragraphs: [
          'Describe the product precisely, including who makes it, whether it is imported and how it is packaged. Food, cosmetics, medicines and other regulated products can bring extra requirements. The online channel does not remove those questions.',
          'Prepare a small catalogue record for each product family: supplier, brand, intended use, packaging facts and any relevant certificate. Use official approval-discovery tools to identify the authorities you need to check. Do this before ordering a large batch of labels or paying for advertising.',
        ],
        sourceIds: ['nsws-approvals'],
      },
      {
        id: 'customer-policies',
        heading: 'Write policies around what you can actually deliver',
        paragraphs: [
          'Customers need clear information about the seller, delivery, returns, refunds, applicable warranties and how to raise a problem. The Department of Consumer Affairs publishes the E-Commerce Rules and related amendments. Check the duties for your role rather than copying another store’s policy.',
          'Test an awkward order: the wrong item arrives, delivery fails or the customer wants a cancellation. Who receives the complaint, who decides the response and where is the record kept? A policy is useful only when someone can carry it out.',
        ],
        sourceIds: ['consumer-rules'],
      },
      {
        id: 'records',
        heading: 'Reconcile orders with money and stock',
        paragraphs: [
          'A marketplace settlement may combine several orders, deductions and refunds. Preserve the order detail as well as the net bank receipt. Otherwise a busy sales week can become a difficult accounting exercise at the end of the month.',
          'Keep a simple reference connecting the order, invoice, dispatch, payment and refund. Review cancelled and returned orders regularly. A dashboard showing revenue is helpful, but it is not a substitute for the records explaining what the business supplied and received.',
        ],
      },
      {
        id: 'ready-to-launch',
        heading: 'Use a launch review before taking orders',
        paragraphs: [
          'Check one complete purchase on a phone, including the visible seller details, final price, invoice, delivery message and support route. Make sure the published policy matches the process your team follows. Repeat the review when you add a new product, warehouse or selling channel.',
          'RegisterBox can capture the business model, product and location information and organise the relevant registration work. Website development, payment setup and marketplace support are separate deliverables unless a written proposal includes them.',
        ],
      },
    ],
    faqs: [
      { question: 'Is there one e-commerce licence for every online seller?', answer: 'No single registration covers every online business. Requirements depend on the seller’s role, products, transactions, locations and applicable laws.' },
      { question: 'Can I copy a refund policy from another website?', answer: 'Use your actual operations and applicable consumer requirements to write it. Another seller’s delivery promises, exclusions and complaint process may not fit your business.' },
      { question: 'Does marketplace onboarding mean all approvals are complete?', answer: 'No. A platform’s checks are one part of onboarding. Review the business, product and location requirements independently.' },
    ],
    sources: [
      { id: 'gst-registration', title: 'GSTN: normal taxpayer registration manual', url: 'https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm' },
      { id: 'nsws-approvals', title: 'NSWS: identify approvals for your business activity', url: 'https://www.nsws.gov.in/' },
      { id: 'consumer-rules', title: 'Department of Consumer Affairs: E-Commerce Rules and amendments', url: 'https://consumeraffairs.gov.in/pages/consumer-protection-acts' },
    ],
    searchQuestions: ['What registrations do I need to sell online in India?', 'Do online sellers need GST registration?', 'What policies should an e-commerce website have?'],
    relatedSlugs: ['gst-registration-documents-and-address-proof', 'fssai-home-kitchen-cloud-kitchen', 'trademark-registration-name-logo-search'],
  },
  {
    slug: 'manufacturing-business-approvals-checklist',
    title: 'Manufacturing business approvals: what to check before taking a premises',
    description: 'A clear manufacturing setup checklist covering process details, site suitability, approval stages, technical documents and changes in capacity.',
    category: 'Registrations',
    serviceCategory: 'manufacturing',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'Before starting a manufacturing unit, check whether the site can support the proposed product, process, machinery and workforce. Then map the approvals needed at each project stage. Incorporation or MSME registration alone does not answer whether a unit may be installed or operated.',
      'The expensive mistake is often choosing a building first and asking about approvals later. A short process and premises review can uncover a problem while you still have choices.',
    ],
    sections: [
      {
        id: 'describe-process',
        heading: 'Describe the process, not only the finished product',
        paragraphs: [
          '“We make furniture” leaves important questions open. Will you cut timber, spray paint, assemble purchased parts or only pack finished goods? List the raw materials, machinery, fuel, water use, waste, emissions and production capacity.',
          'Add the number and type of workers, shifts, power load and any storage of hazardous materials. A clear process note helps the relevant authorities or technical professionals assess what applies. It also prevents different applications from describing different versions of the same unit.',
        ],
      },
      {
        id: 'site',
        heading: 'Check site suitability before committing money',
        paragraphs: [
          'Review the intended land and building use, access, utility availability and the practical space needed for the process. Ask whether the proposed activity, capacity and storage can operate at that site under the applicable rules.',
          'For example, an inexpensive unit may become costly if the power connection is unsuitable or the process needs a different layout. Keep questions about the site separate from the attractiveness of the rent. A lease does not itself settle whether a manufacturing activity is permitted there.',
        ],
        sourceIds: ['nsws-approvals'],
      },
      {
        id: 'stages',
        heading: 'Separate establishment from operation',
        paragraphs: [
          'Build an approval list with a column showing the stage at which each approval matters. NSWS distinguishes approvals needed to establish a business from those needed to begin operations. The responsible authority decides each application.',
          'Environmental consent is another area where the stage matters. Check the State pollution-control authority’s current classification, exemptions and consent process for your activity. Do not assume that every unit has identical consent requirements, or that permission to establish automatically covers operation.',
        ],
        sourceIds: ['nsws-faq', 'ocmms'],
      },
      {
        id: 'technical-documents',
        heading: 'Keep one version of the technical facts',
        paragraphs: [
          'Use a controlled set of site plans, process descriptions, equipment lists and capacity figures. If the machinery changes, identify which applications and drawings need review. A number changed in one form but left unchanged elsewhere can cause avoidable questions.',
          'Some submissions require drawings, reports or certifications by appropriately qualified people. Confirm who is preparing them, who signs them and what evidence supports them. Administrative help can organise the package, but it does not replace the required technical judgment.',
        ],
      },
      {
        id: 'udyam-and-cost',
        heading: 'Treat MSME registration and project costs separately',
        paragraphs: [
          'The official Udyam system provides free MSME registration for eligible enterprises. It is not a blanket permission to build, install machinery or manufacture a regulated product. Use the government portal and its government facilitation routes for that registration.',
          'For the wider setup, budget separately for authority fees, technical work, testing, infrastructure and assistance. Ask for a quote that identifies the unit, activity and approval stage covered. “Manufacturing registration” is too broad a description for comparing proposals.',
        ],
        sourceIds: ['udyam'],
      },
      {
        id: 'after-approval',
        heading: 'Read the conditions after an approval arrives',
        paragraphs: [
          'Save the actual approval and note its permitted scope, conditions, validity and reporting duties. Give each continuing requirement an owner. Review changes in capacity, process, materials or location before assuming the old approval still fits.',
          'RegisterBox can help capture the project information, organise an approval matrix and coordinate documents within an agreed scope. Bring a process summary and a site proposal to the first discussion. They are more useful than a request for every possible licence without any production facts.',
        ],
      },
    ],
    faqs: [
      { question: 'Can production start after Udyam registration?', answer: 'Udyam identifies an eligible MSME. It does not replace the site, environmental, product or operating approvals that may apply to the manufacturing unit.' },
      { question: 'Does every manufacturing unit need exactly the same licences?', answer: 'No. The product, process, location, capacity, machinery and workforce affect the review. Check the applicable authorities and current exemptions.' },
      { question: 'Should I buy machinery before checking approvals?', answer: 'First understand the approval sequence and site requirements. Equipment and layout decisions are harder to change after you have paid and installed them.' },
    ],
    sources: [
      { id: 'nsws-approvals', title: 'NSWS: business approvals and approval discovery', url: 'https://www.nsws.gov.in/' },
      { id: 'nsws-faq', title: 'NSWS: pre-establishment and pre-operation approval guidance', url: 'https://www.nsws.gov.in/faqs' },
      { id: 'ocmms', title: 'Government Online Consent Management and Monitoring System', url: 'https://ocmms.nic.in/' },
      { id: 'udyam', title: 'Government of India: official Udyam registration', url: 'https://udyamregistration.gov.in/' },
    ],
    searchQuestions: ['What approvals are needed to start a manufacturing business?', 'Is Udyam enough to start a factory?', 'What should I check before renting a manufacturing unit?'],
    relatedSlugs: ['fssai-home-kitchen-cloud-kitchen', 'business-compliance-check-checklist', 'open-new-business-branch-gst'],
  },
  {
    slug: 'open-new-business-branch-gst',
    title: 'Opening a new business branch: address, GST and local registration checks',
    description: 'Plan a new shop, office or warehouse with clear location evidence, a GST review, local approval checks and a branch record that matches the business.',
    category: 'Grow & comply',
    serviceCategory: 'branch',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'Opening a branch starts with a location and activity review. Record the State, address, people, stock and invoicing arrangements, then check what needs an amendment or a new registration. An existing certificate does not automatically cover every new premises.',
      'The same-State versus another-State question matters particularly for GST. So does the difference between an office, a shop and a warehouse. Describe what will happen at the branch before deciding which forms to use.',
    ],
    sections: [
      {
        id: 'branch-brief',
        heading: 'Write a branch brief before the lease is final',
        paragraphs: [
          'List the location, planned opening date, activities, staff, inventory and who will issue invoices. Explain whether customers will visit, goods will be stored or services will be delivered there. Note whether the premises is permanent, shared or temporary.',
          'A second sales office with no stock presents different facts from a fulfilment warehouse. Capturing the difference early helps the tax, local and premises reviews use the same information. It also helps you identify approvals that could affect the opening date.',
        ],
      },
      {
        id: 'gst-state',
        heading: 'Check the State before adding an address to GST',
        paragraphs: [
          'An additional place of business belongs to the relevant State or Union Territory registration. GSTN’s profile guidance identifies changes to places of business, other than a change in State, as core-amendment matters. Do not treat a location across a State border as a simple address addition.',
          'For another-State activity, obtain a registration analysis based on where supplies are made, where stock is held and the applicable rules. The answer needs the branch facts. Distance alone is not the test: two nearby premises can lie in different States.',
        ],
        sourceIds: ['gst-profile', 'gst-registration'],
      },
      {
        id: 'premises-evidence',
        heading: 'Make the premises evidence easy to follow',
        paragraphs: [
          'Prepare the complete branch address and identify the owner, occupant and basis of use. The GST registration manual describes evidence for owned, rented and consent-based premises. Follow the current requirements for the actual application rather than using a generic letter for every situation.',
          'Compare the documents side by side. If the lease refers to one floor and the application to the whole building, clarify the correct position. Good evidence should explain the space the business will actually use.',
        ],
        sourceIds: ['gst-registration'],
      },
      {
        id: 'other-approvals',
        heading: 'Review permissions linked to the activity',
        paragraphs: [
          'Check establishment, local trade, food and other sector requirements at the new location. A registration held by the head office may have a defined premises or activity scope. Read its coverage before relying on it for the branch.',
          'Use official approval-discovery tools to prepare the questions, then confirm them with the issuing authorities. For a food business adding storage or preparation, describe that activity specifically. Calling the location a “branch” is not enough to determine the route.',
        ],
        sourceIds: ['nsws-faq'],
      },
      {
        id: 'internal-controls',
        heading: 'Connect the branch to books and responsibility',
        paragraphs: [
          'Agree who can sign the lease, approve spending, handle stock and answer an authority query. Use the company’s, LLP’s or proprietor’s appropriate authorisation process. Update the address wherever the actual transaction requires it.',
          'Create a branch reference in your records so sales, purchases and transfers can be followed. Before sending stock or issuing the first invoice, have the accounting and GST treatment reviewed. Moving your own goods is still an event that needs a proper record.',
        ],
      },
      {
        id: 'opening-check',
        heading: 'Keep a branch opening folder',
        paragraphs: [
          'Save authorisations, premises evidence, applications, acknowledgements and issued registrations together. Use a short readiness list showing what has been applied for, what has been approved and what is still unresolved. Add the new location to the renewal and filing calendar.',
          'RegisterBox can help organise the branch impact review and collect consistent location evidence. Bring existing entity and registration details as well as the new premises facts, so the work can focus on what changes rather than rebuilding the whole business profile.',
        ],
      },
    ],
    faqs: [
      { question: 'Can every new branch be added to my current GSTIN?', answer: 'No. An additional-place amendment relates to the State or Union Territory of that registration. Another-State activity needs its own registration analysis.' },
      { question: 'Does a warehouse need a review even without a sales counter?', answer: 'Yes. Storage, dispatch and stock movement are relevant facts. Explain what the premises does rather than deciding only from whether customers visit.' },
      { question: 'Is signing a lease enough to open the branch?', answer: 'The lease establishes a premises arrangement. Relevant tax, local, establishment or sector permissions may still need to be effective for the planned activity.' },
    ],
    sources: [
      { id: 'gst-profile', title: 'GSTN: registration profile and core-amendment fields', url: 'https://tutorial.gst.gov.in/userguide/taxpayersdashboard/My_Account_View_User_Profile.htm' },
      { id: 'gst-registration', title: 'GSTN: State selection and premises evidence for registration', url: 'https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm' },
      { id: 'nsws-faq', title: 'NSWS: identify and verify relevant approvals', url: 'https://www.nsws.gov.in/faqs' },
    ],
    searchQuestions: ['Do I need a new GST registration for another branch?', 'How do I add a new place of business to GST?', 'What should I check before opening a second shop?'],
    relatedSlugs: ['gst-registration-documents-and-address-proof', 'shop-establishment-registration-karnataka', 'business-compliance-check-checklist'],
  },
  {
    slug: 'business-compliance-check-checklist',
    title: 'How to check your business compliance without getting lost in certificates',
    description: 'Review registrations, filings, locations and notices using real evidence, then turn gaps into a practical list of actions and responsible owners.',
    category: 'Grow & comply',
    serviceCategory: 'existing',
    image: 'records',
    imageAlt: 'Illustration of a business owner reviewing invoices with a calculator and laptop',
    intro: [
      'A useful business compliance check compares what the business does today with its registrations, filings and supporting records. A folder full of certificates is only the starting point. The scope, current status and evidence behind each item matter.',
      'Begin with a complete list of entities, locations and activities. Then look for missing registrations, overdue work, incorrect details and unanswered notices. Keep uncertain items visible until someone resolves them.',
    ],
    sections: [
      {
        id: 'define-scope',
        heading: 'Agree what the review covers',
        paragraphs: [
          'Write down the businesses, periods and locations being reviewed. Include dormant entities, storage sites, online channels and recent activity changes. A review of the head office cannot explain an unlisted branch it never knew existed.',
          'Separate an administrative records review from work needing a statutory audit, tax opinion or legal assessment. Ask what the deliverable will show: facts checked, missing evidence, issues raised and actions proposed. A short, defined scope is more useful than a promise to “check everything”.',
        ],
      },
      {
        id: 'inventory',
        heading: 'Create a register of documents and dates',
        paragraphs: [
          'For each registration, note the legal name, identifying number, covered activity, premises, validity where applicable and source of verification. Attach the issued document and any later amendment. Record filings with their period, status and acknowledgement.',
          'Use a separate entry for an unanswered notice or an application still under review. Those are not the same as an issued approval. Put “not yet verified” against a missing record rather than guessing from an old screenshot or a message saying the work was done.',
        ],
      },
      {
        id: 'verify-current-status',
        heading: 'Compare the folder with the current portal record',
        paragraphs: [
          'Use the relevant official authority to check current status. MCA provides company and LLP services; GSTN provides taxpayer and filing information through its available search and account tools. Some details require authorised access, so public search alone may not answer every question.',
          'Check whether names, addresses and activities still match the business. If a certificate and a portal screen disagree, preserve both and investigate. Do not overwrite a document or mark the issue closed merely to make the register look tidy.',
        ],
        sourceIds: ['mca', 'gst-search'],
      },
      {
        id: 'changes',
        heading: 'Look for changes that did not reach the paperwork',
        paragraphs: [
          'Ask what changed since the last review: a new product, warehouse, partner, sales channel, workforce or State. Changes are often where gaps appear, because the original application may have been correct when it was filed.',
          'For example, a business may still describe itself as a local retailer after adding an online channel and outsourced storage. Map the new facts to the applicable authorities. NSWS can help identify approval questions, but its own guidance says the results need an independent assessment.',
        ],
        sourceIds: ['nsws-faq'],
      },
      {
        id: 'prioritise',
        heading: 'Turn findings into decisions and actions',
        paragraphs: [
          'Give each issue a clear description, supporting record, responsible person and next date. Identify urgent authority deadlines first. Then separate matters that need a correction, a new application, professional advice or more evidence.',
          'A useful finding might say: “The branch address is absent from the records reviewed; confirm its activity and registration position.” That is more actionable than “compliance incomplete”. Avoid treating every missing attachment as the same level of problem, but do not label a gap harmless without checking it.',
        ],
      },
      {
        id: 'close-with-evidence',
        heading: 'Close the task only when the result is recorded',
        paragraphs: [
          'Retain the correction, acknowledgement, issued result or professional conclusion that resolves each item. Mark whether the outcome is a submission, an approval or an open query. Set reminders for duties that continue after the immediate fix.',
          'RegisterBox can organise a scoped review of current business information, registration records and open questions. It does not turn an administrative check into a statutory certificate of full compliance. The practical result should be a clearer record and an evidence-backed action list.',
        ],
      },
    ],
    faqs: [
      { question: 'Does a compliance check certify that my business has no issues?', answer: 'No. It can identify evidence and gaps within its stated scope. Statutory certification, audit and professional opinions require the relevant qualified person and process.' },
      { question: 'Can a business with no sales still need a review?', answer: 'Yes. Lack of sales alone does not establish that an entity has no filings, notices or continuing obligations. Review the actual registrations and status.' },
      { question: 'What should I collect first?', answer: 'Begin with the entity and location list, registrations, recent acknowledgements and any notices. Include a note of missing documents instead of waiting for the folder to be perfect.' },
    ],
    sources: [
      { id: 'mca', title: 'MCA: official company and LLP portal', url: 'https://www.mca.gov.in/content/mca/global/en/home.html' },
      { id: 'gst-search', title: 'GSTN: search taxpayer guidance', url: 'https://tutorial.gst.gov.in/userguide/taxpayersdashboard/Search_Taxpayer_manual.htm' },
      { id: 'nsws-faq', title: 'NSWS: limits and use of approval discovery', url: 'https://www.nsws.gov.in/faqs' },
    ],
    searchQuestions: ['How do I check whether my business registrations are up to date?', 'What is included in a business compliance review?', 'How can I organise missing business filings and certificates?'],
    relatedSlugs: ['gstr-1-vs-gstr-3b', 'no-sales-nil-gstr-3b', 'open-new-business-branch-gst'],
  },
  {
    slug: 'trademark-registration-name-logo-search',
    title: 'Trademark registration: check your name, logo and business category first',
    description: 'Learn how a trademark search, applicant choice, goods and services description and application status fit together before you spend on your brand.',
    category: 'Grow & comply',
    serviceCategory: 'trademark',
    image: 'formation',
    imageAlt: 'Illustration of two founders planning at a desk with a storefront model and Bengaluru skyline',
    intro: [
      'Before applying for a trademark, decide who will own the mark, what you want to protect and which goods or services it identifies. Search for possible conflicts and review the result before spending heavily on a brand launch.',
      'A company name, domain name and trademark application are different records. Owning the first two does not mean the trademark will be accepted. A good preparation process makes those differences clear.',
    ],
    sections: [
      {
        id: 'owner',
        heading: 'Name the intended owner clearly',
        paragraphs: [
          'Decide whether the applicant should be an individual or an existing entity. Check the legal name and address against the supporting records. If founders are about to form a company, discuss ownership before choosing an applicant simply because one person has the documents ready.',
          'Write down the commercial arrangement as well: who created the brand, who uses it and whether anyone else claims rights in the logo. Finding an ownership disagreement after packaging is printed makes the problem harder to solve.',
        ],
        sourceIds: ['ipindia-process'],
      },
      {
        id: 'word-or-logo',
        heading: 'Decide what the application will represent',
        paragraphs: [
          'A word mark and a logo describe different ways of representing a brand. Keep the proposed wording and artwork clear and consistent. If your logo is still changing every week, discuss whether the application strategy should wait for the design decision.',
          'For example, a business might use one name on invoices and a shortened name on its signboard. Identify the mark customers will actually see and the goods or services it will identify. Do not assume one application automatically covers every version and future activity.',
        ],
        sourceIds: ['ipindia-process'],
      },
      {
        id: 'search',
        heading: 'Use search to find questions, not an approval promise',
        paragraphs: [
          'IP India offers official trademark search services. Look for similar names and relevant results, not only a perfect spelling match. Keep a record of what was searched and refer potential conflicts for appropriate professional assessment.',
          'A search is useful evidence for a decision, but it does not guarantee the Registry’s outcome or remove other rights. Avoid treating an empty search result as permission to copy a familiar brand with one letter changed. The practical aim is to discover concerns before committing more money.',
        ],
        sourceIds: ['ipindia-services'],
      },
      {
        id: 'classification',
        heading: 'Describe what you sell before choosing classes',
        paragraphs: [
          'Prepare an ordinary-language list of the goods and services offered under the brand. IP India’s process includes selecting the relevant Nice class or classes. Review that description and classification together; choosing a class number without a clear business description can produce a poorly matched filing.',
          'A brand used on packaged snacks raises different questions from a restaurant name, even if the owner sees both as “food”. Ask which planned activities the proposed specification covers and which would need further review.',
        ],
        sourceIds: ['ipindia-process'],
      },
      {
        id: 'evidence-and-fees',
        heading: 'Prepare honest use information and a clear fee scope',
        paragraphs: [
          'If you intend to claim earlier use, gather the records supporting the dates and the mark used. Do not invent a history or use somebody else’s invoices. Ask what evidence and declaration the particular application requires.',
          'Check the current official fee for the applicant category and proposed filing. Keep it separate from search, preparation and representation charges. Ask whether the quote includes only filing or also a response to a later objection; those are different stages of work.',
        ],
        sourceIds: ['ipindia-process'],
      },
      {
        id: 'follow-status',
        heading: 'Follow the application beyond the acknowledgement',
        paragraphs: [
          'Save the application number and check its actual status through the official tracking service. Read examination communications and record response dates. Filing, examination, publication and any proceedings are separate stages; an acknowledgement should not be described as a registration certificate.',
          'RegisterBox can organise applicant information, the proposed mark and documents, then coordinate the agreed application work. Questions about conflicts, objections or legal rights need the appropriate professional review. A useful next step is a brand-and-activity brief with the ownership question already resolved.',
        ],
        sourceIds: ['ipindia-status'],
      },
    ],
    faqs: [
      { question: 'Does registering my company protect its name as a trademark?', answer: 'Company incorporation and trademark registration are separate processes. Review the proposed brand through the trademark search and application route.' },
      { question: 'Does filing a trademark application guarantee registration?', answer: 'No. The application goes through the Registry’s process and may face examination questions or other proceedings. Track the actual status.' },
      { question: 'Should I apply for a brand name or a logo?', answer: 'That depends on the mark you use, its design and the protection strategy. Prepare both the wording and artwork and review the choice before filing.' },
    ],
    sources: [
      { id: 'ipindia-process', title: 'IP India: trademark filing process, documents and classification', url: 'https://ipindia.gov.in/trade-marks-learn-filing-process-step-by-step' },
      { id: 'ipindia-services', title: 'IP India: official e-services and public search links', url: 'https://ipindia.gov.in/pages/e-services' },
      { id: 'ipindia-status', title: 'IP India: trademark application status and register', url: 'https://tmrsearch.ipindia.gov.in/eregister/ereg_top.aspx' },
    ],
    searchQuestions: ['How do I check if a brand name is available in India?', 'Is company registration the same as trademark registration?', 'Should I register a word mark or a logo?'],
    relatedSlugs: ['private-limited-company-registration-documents', 'start-online-ecommerce-business-india', 'start-business-sole-proprietorship-checklist'],
  },
];
