import type { BlogArticle } from './types';

export const gstr3bProcessGuide: BlogArticle[] = [{
  slug: 'gstr-3b-filing-process-online',
  title: 'GSTR-3B filing online: a practical RegisterBox guide for regular and nil returns',
  description: 'Follow the GSTR-3B preparation process in RegisterBox, check nil-return eligibility, understand OTP authorisation and know what proves a return is filed.',
  publishedAt: '2026-10-21',
  category: 'GST & records',
  serviceCategory: 'gst',
  image: 'gstr3b-process',
  imageAlt: 'Illustration of a business owner and bookkeeper checking invoices and a tax summary together before authorisation',
  appActions: [
    { label: 'Prepare GSTR-3B in RegisterBox', destination: '/gst-returns?form=gstr-3b' },
    { label: 'Choose a period for nil filing', destination: '/gst' },
  ],
  officialApplication: { label: 'Open the official GST portal', url: 'https://services.gst.gov.in/services/login' },
  howToSection: 'registerbox-steps',
  availabilityNote: 'RegisterBox supports guided, OTP-authorised filing of eligible NIL GSTR-3B returns. Regular GSTR-3B preparation and review are available; successful live regular filing has not yet been independently verified. Live actions depend on your workspace being enabled. Neither route is an unattended one-click filing service.',
  intro: [
    'You should not have to guess which return period you are working on or whether a saved draft has actually been filed. RegisterBox brings the selected business, return preparation, review and filing status into a guided workspace. For an eligible nil GSTR-3B, the dedicated flow avoids entering a full set of zero-value tables and takes you towards the signatory’s filing OTP.',
    'There is still a difference between a shorter process and filing without checks. You must confirm the facts, authorise the correct return and complete the required verification. A click that saves a draft is not a government acknowledgement. This guide explains the practical journey, the available shortcuts and the points where you should stop for help.',
  ],
  sections: [
    { id: 'before-you-start', heading: 'Start with the right business and return period', paragraphs: [
      'Keep your sales and purchase records, adjustment notes and previous acknowledgements together. Decide who is responsible for checking the figures and who is authorised to file. A business with no sales can still have purchases, reverse-charge tax or other matters to report, so do not choose nil simply because the sales total is zero.',
      'Check the business’s filing frequency and the due date shown for its period on the official portal. An extension or a quarterly filing arrangement can change the answer; this guide does not turn a general calendar date into a personal deadline. Choose a completed period, and check whether the return or an earlier prerequisite has already been filed.',
    ], sourceIds: ['gst-faq'] },
    { id: 'registerbox-steps', heading: 'How to prepare GSTR-3B on the RegisterBox website', paragraphs: [
      'Use “Prepare GSTR-3B in RegisterBox” above. Sign in with your account email. If you have not selected a business, the GST workspace is the next step: choose or connect the correct GST account using its supported OTP connection. Check the GSTIN before continuing. Account sign-in and GST connection are separate checks.',
      'Choose GSTR-3B and the period. For a regular return, work through the guided table-wise editor or the supported accountant import. Enter reviewed business figures, not guessed totals. The screen separates preparation, checking saved data, payment or offset review, final review and authorisation, so you can see which stage is still unfinished.',
      'Save your private draft and use the available comparison tools deliberately. A draft-to-portal match only describes the fields that were compared. It does not certify all invoices, every ITC condition or the completeness of your books. Where the figures do not agree, resolve the difference before proceeding.',
      'For a regular return, review the available ledgers and proposed credit/cash allocation before authorising any offset. The banking or challan-payment step uses the official GST route; RegisterBox does not claim to collect your banking payment. Recheck the resulting balances before returning to the review stage.',
    ] },
    { id: 'nil-workflow', heading: 'The shorter nil-return route: what you actually click', paragraphs: [
      'Use “Choose a period for nil filing” to open the GST workspace, select the completed period and choose the nil GSTR-3B option. Read each eligibility statement against your complete records. The app also checks filing history and blocks an open period, a conflicting saved regular return or a known already-filed return.',
      'Select the authorised signatory and approve the declaration and OTP request. The “Send OTP” action moves the supported preparation steps forward where they are available. If GST is still processing a request, check its status; do not repeatedly create new requests.',
      'Enter the GST filing code, approve the exact nil declaration and use “Verify OTP & file nil return”. This final action is intentionally separate from requesting the OTP. Keep the acknowledgement and confirm the filed status. If a request times out or its result is unclear, refresh and check the official outcome before retrying.',
    ], sourceIds: ['gst-nil'] },
    { id: 'nil-or-zero', heading: 'No sales, zero tax and a nil return are different things', paragraphs: [
      'A quiet month still needs a careful check. Purchases, exempt activity, ITC adjustments, reverse charge, interest or late fees can make a nil declaration unsuitable. The portal can also disable its nil option when relevant information or entries are present. Review the official nil guidance rather than forcing a zero-filled return through a shortcut.',
      'For example, a shop may make no sales but receive stock or a service bill. That owner should review the purchase and credit position rather than tick every nil statement. Missing GSTR-2B data is not proof that no purchases occurred. Ask your accountant when the records and portal position are inconsistent.',
    ], sourceIds: ['gst-faq', 'gst-nil'] },
    { id: 'compare-portal', heading: 'RegisterBox or the GST portal: which is easier?', paragraphs: [
      'The official portal remains the direct self-service route. Its manual takes you through the return dashboard, relevant tables, preview, payment and filing. RegisterBox offers a different working layout: one business and period, saved preparation, clear next-step controls and a focused nil journey. You do not need to navigate every regular-return table when the nil conditions genuinely apply.',
      'That is a workflow difference, not a promise that tax rules disappear or that RegisterBox is always faster. The portal also supports previews, auto-population and nil filing. Choose the route you understand, retain control of authorisation and use the official records to resolve status questions. No measured speed or universal “one-click” claim is being made here.',
    ], sourceIds: ['gst-manual'] },
    { id: 'review-credit', heading: 'Check credit and mismatches before the final action', paragraphs: [
      'Use GSTR-2B alongside your purchase records, not instead of them. Check mismatches, duplicates, reversals and reverse-charge items with the person reviewing the return. A supplier entry and a claim you are entitled to make are not automatically the same thing.',
      'The GST portal’s liability and ITC comparison reports can help investigate differences between related returns and statements. RegisterBox’s supported comparisons should be read for their stated scope. A green comparison result is useful evidence about that check, not a substitute for a tax review.',
    ], sourceIds: ['gst-2b', 'gst-comparison'] },
    { id: 'filing-proof', heading: 'Know when the job is finished—and when to ask for help', paragraphs: [
      'Do not treat a draft, payment receipt, sent OTP or spinning button as proof of filing. Keep the return period, acknowledgement and final filed status together. If figures change after approval, review them again. The app is designed to stop duplicate writes and to keep an uncertain result separate from success.',
      'Call RegisterBox if you cannot connect GST, the period is blocked, records differ, or a regular-return action is unavailable. We can discuss the preparation and review needed for your case. Do not send passwords or filing OTPs in an email or general support message. Use only the designated verification screen for an operation you have approved.',
    ], sourceIds: ['gst-manual'] },
  ],
  faqs: [
    { question: 'Can RegisterBox file a nil GSTR-3B for me with one click?', answer: 'The dedicated nil flow reduces manual preparation, but still requires eligibility confirmation, signatory selection, OTP authorisation, a final filing action and GST acknowledgement. It is not filing without your approval.' },
    { question: 'Can I prepare a regular GSTR-3B in RegisterBox?', answer: 'Yes, the workspace includes guided preparation, supported imports, comparison and reviewed payment/set-off controls. Successful live regular filing has not yet been independently verified; do not assume every live action is enabled or every special case is supported.' },
    { question: 'Why does the filing button say it is unavailable?', answer: 'Read the reason next to it. The period, connection, prior filing, review, signatory, payment or release checks may not be complete. Do not bypass the warning or create duplicate drafts to force filing.' },
    { question: 'Does paying GST mean my GSTR-3B is filed?', answer: 'No. Check the return’s filed status and acknowledgement after the required authorisation. A payment step and filing are separate stages.' },
  ],
  sources: [
    { id: 'gst-faq', title: 'GST portal: GSTR-3B FAQs and nil-return conditions', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm' },
    { id: 'gst-manual', title: 'GST portal: creation, saving, payment and filing of GSTR-3B', url: 'https://tutorial.gst.gov.in/userguide/returns/Create_and_Submit_GSTR3B.htm' },
    { id: 'gst-nil', title: 'GST portal: online nil GSTR-3B filing and authorisation', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B_-_File_Nil_Return.htm' },
    { id: 'gst-2b', title: 'GST portal: GSTR-2B FAQs and reconciliation with books', url: 'https://tutorial.gst.gov.in/userguide/returns/FAQ_gstr2b.htm' },
    { id: 'gst-comparison', title: 'GST portal: liability and ITC comparison reports', url: 'https://tutorial.gst.gov.in/userguide/inputtaxcredit/Manual_comparison_of_liability_declared_and_ITC_claimed.htm' },
  ],
  searchQuestions: ['How do I file GSTR-3B online?', 'How can I file nil GSTR-3B in RegisterBox?', 'Can I file GSTR-3B when there are no sales?', 'Why is my GST filing button disabled?'],
  relatedSlugs: ['no-sales-nil-gstr-3b', 'gstr-1-vs-gstr-3b', 'gst-registration-documents-and-address-proof'],
}];
