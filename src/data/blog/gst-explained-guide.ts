import type { BlogArticle } from './types';

export const gstExplainedGuide: BlogArticle[] = [{
  slug: 'what-is-gst',
  title: 'What is GST? A simple explanation with a Hindi video',
  description: 'Understand GST, GSTIN and input tax credit with Asha’s simple purchase-and-sale example. Watch the Hindi video, then find your GST registration next step.',
  category: 'GST & records',
  serviceCategory: 'gst_registration',
  publishedAt: '2026-10-26',
  image: 'records',
  imageAlt: 'Business owners reviewing purchase and sales records together',
  intro: ['GST stands for Goods and Services Tax. It is an indirect tax on taxable supplies of goods and services. The Hindi video below explains the basic idea through Asha’s purchase and sale.', 'Tax collected from a customer is not extra business income to keep. Eligible input tax credit may reduce output tax, but only when the relevant conditions and utilisation rules are met.'],
  sections: [
    { id: 'gst-basics', heading: 'What does GST mean for a business?', paragraphs: ['A business must first check whether registration is required and which rules apply to its activity. Registration gives the business a GSTIN. The obligation to register, the rate and the applicable returns depend on its facts; this video is not an eligibility decision.'], sourceIds: ['registration'] },
    { id: 'asha-example', heading: 'Asha’s example: purchase tax, sale tax and credit', paragraphs: ['Assume a regular registered business buys stock for ₹600 plus ₹108 GST and sells it for ₹1,000 plus ₹180 GST. If the full ₹108 qualifies as input tax credit and can lawfully be used against the output liability, the simplified balance is ₹72.', 'The 18% rate is only an illustration, not a recommendation for your goods or services. Check the actual classification, rate, tax heads, credit conditions and records. The example leaves out other liabilities, reversals and adjustments.'], sourceIds: ['itc'] },
    { id: 'registration-next-step', heading: 'Need GST registration help?', paragraphs: ['Read our GST registration document guide or open the GST registration service page using the buttons below. RegisterBox can help organise business information, supporting documents and the agreed preparation work.', 'You still need to review the information and complete the required authorisation. Preparing a draft, submitting an application and receiving government approval are different stages.'], sourceIds: ['registration'] },
  ],
  faqs: [
    { question: 'Is the GST in the customer’s bill my profit?', answer: 'No. Tax collected is distinct from the value of your sale. Calculate and discharge the actual liability under the applicable rules.' },
    { question: 'Can I claim every purchase bill as input tax credit?', answer: 'No. Credit is subject to statutory conditions, restrictions, documentation and permitted utilisation. Review the actual purchase and tax records.' },
    { question: 'Is the video available in Hindi?', answer: 'Yes. Play the Hindi explainer on this page. Captions and a readable transcript are included.' },
  ],
  sources: [
    { id: 'registration', title: 'GSTN: registration application manual', url: 'https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm' },
    { id: 'itc', title: 'CBIC: CGST Act, section 16 — eligibility and conditions for input tax credit', url: 'https://taxinformation.cbic.gov.in/content-page/explore-act/1000285/1000001/Section%2016%20%282%29/ACTS' },
  ],
  searchQuestions: ['What is GST?', 'GST kya hai?', 'GST क्या है?', 'How does input tax credit work?', 'GST explained in Hindi'],
  relatedSlugs: ['gst-registration-documents-and-address-proof', 'gstr-1-vs-gstr-3b', 'fast-gst-registration-three-hours'],
}];
