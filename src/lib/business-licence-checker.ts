/**
 * Source-backed, offline screening. A result is a starting checklist, never an
 * approval, exemption certificate, or substitute for an authority's decision.
 * Add effective-dated rules here, rather than putting legal logic in the UI.
 */
export type Locale = 'en' | 'hi' | 'kn';
export type Localized = { en: string; hi: string; kn: string };
export type Answers = {
  state: string; city: string; activity: string; entity: string; premises: string;
  turnover: string; employees: string; channels: string[]; special: string[];
};
export type LicenceStatus = 'required' | 'check' | 'recommended' | 'not-triggered';
export type LicenceResult = {
  id: string; title: Localized; status: LicenceStatus; reason: Localized;
  nextStep: Localized; authority: Localized; documents: Localized[];
  sourceIds: string[]; servicePath?: string;
};

const l = (en: string, hi: string, kn: string): Localized => ({ en, hi, kn });
export const RULE_VERSION = '2026-10-28.1';
export const REVIEWED_ON = '2026-10-28';
export const SOURCES: Record<string, { title: string; url: string; reviewedOn: string; effectiveFrom?: string }> = {
  'gst-section22': { title: 'CBIC: CGST Act, section 22 — registration', url: 'https://taxinformation.cbic.gov.in/content-page/explore-act/1000291/1000001', reviewedOn: REVIEWED_ON },
  'gst-thresholds': { title: 'CBIC: registration thresholds and state exceptions', url: 'https://cbic-gst.gov.in/pdf/01062019-GST-An-Update.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2019-04-01' },
  'gst-2026': { title: 'Ministry of Finance: GST registration thresholds, 9 February 2026', url: 'https://sansad.in/getFile/loksabhaquestions/annex/187/AU1484_xFS2m1.pdf?source=pqals', reviewedOn: REVIEWED_ON },
  'gst-marketplace': { title: 'GST Council: conditional enrolment for unregistered ecommerce goods suppliers', url: 'https://gstcouncil.gov.in/sites/default/files/2024-02/october_newsletter.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2023-10-01' },
  'fssai-registration': { title: 'FSSAI: food business registration and licensing', url: 'https://fssai.gov.in/business/registration', reviewedOn: REVIEWED_ON },
  'fssai-act': { title: 'India Code: Food Safety and Standards Act, section 18(3) exclusions', url: 'https://www.indiacode.nic.in/bitstream/123456789/13113/1/fssa2006200634.pdf', reviewedOn: REVIEWED_ON },
  'fssai-2026': { title: 'FoSCoS: kind-of-business eligibility, updated 1 April 2026', url: 'https://foscos.fssai.gov.in/assets/docs/Revised_2ndApril2026KindofBusinessEligibility.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2026-04-01' },
  'fssai-vendors': { title: 'FSSAI: 13 March 2026 reforms and deemed street-vendor registration', url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Press%20Release_FSSAI%20Reforms_130326.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2026-04-01' },
  udyam: { title: 'Ministry of MSME: official free Udyam registration and current classification', url: 'https://www.udyamregistration.gov.in/', reviewedOn: REVIEWED_ON, effectiveFrom: '2025-04-01' },
  'udyam-process': { title: 'Ministry of MSME: Udyam paperless self-declaration process, July 2026', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2284414&lang=1&reg=20', reviewedOn: REVIEWED_ON },
  iec: { title: 'DGFT: Foreign Trade Policy 2023, paragraph 2.05 — IEC', url: 'https://content.dgft.gov.in/Website/dgftprod/61d61bc2-272e-4880-b96c-c8f685a3b244/Foreign%20Trade%20Policy%202023.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2023-04-01' },
  'social-security': { title: 'Ministry of Labour: Code on Social Security, First Schedule', url: 'https://labour.gov.in/sites/default/files/ss_code_as_passed_by_lok_sabha.pdf', reviewedOn: REVIEWED_ON, effectiveFrom: '2025-11-21' },
  'labour-implementation': { title: 'Ministry of Labour: four Labour Codes effective 21 November 2025', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2192463&lang=2&reg=3', reviewedOn: REVIEWED_ON, effectiveFrom: '2025-11-21' },
  'esi-2026': { title: 'Ministry of Labour: Social Security Code FAQs, March 2026', url: 'https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf', reviewedOn: REVIEWED_ON },
  'mca-company': { title: 'MCA: SPICe+ and linked incorporation forms FAQs', url: 'https://www.mca.gov.in/content/dam/mca/pdf/SPICEplus-and-linked-filings-FAQs-V3-20230122.pdf', reviewedOn: REVIEWED_ON },
  'mca-linked': { title: 'MCA: incorporation and mandatory linked registrations', url: 'https://www.mca.gov.in/Ministry/pdf/SpicePlusFAQS_20112020.pdf', reviewedOn: REVIEWED_ON },
  'mca-llp': { title: 'MCA: FiLLiP — LLP incorporation instruction kit', url: 'https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf', reviewedOn: REVIEWED_ON },
  partnership: { title: 'India Code: Indian Partnership Act, registration and effect of non-registration', url: 'https://www.indiacode.nic.in/bitstream/123456789/12849/1/the_indian_partnership_act_1932.pdf', reviewedOn: REVIEWED_ON },
  'ka-shops': { title: 'Government of Karnataka: Shops and Commercial Establishments registration', url: 'https://kodagu.nic.in/en/department-of-labour/', reviewedOn: REVIEWED_ON },
  'ka-pt': { title: 'Karnataka Commercial Taxes Department: professional tax FAQs', url: 'https://ptax.karnataka.gov.in/FAQ', reviewedOn: REVIEWED_ON },
  'trade-example': { title: 'Bengaluru municipal authority: trade licence FAQs (local example)', url: 'https://site.bbmp.gov.in/tradelicensefaq.html', reviewedOn: REVIEWED_ON },
  'legal-metrology': { title: 'Department of Consumer Affairs: Legal Metrology overview', url: 'https://consumeraffairs.gov.in/pages/legal-metrology-overview', reviewedOn: REVIEWED_ON },
  'packaged-rules': { title: 'Department of Consumer Affairs: packaged commodities rules, rule 27', url: 'https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/Book_on_Legal_Metrology_Packaged_Commodities_Rules%2C2011_with_all_amendments_whatsnews.pdf', reviewedOn: REVIEWED_ON },
  pollution: { title: 'Government OCMMS: Water and Air Act consent overview', url: 'https://www.ocmms.nic.in/OCMMS_NEW/index.jsp', reviewedOn: REVIEWED_ON },
  'pollution-2026': { title: 'MoEFCC: amended uniform consent guidelines, January 2026', url: 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2219415&lang=2&reg=48', reviewedOn: REVIEWED_ON },
  'pollution-exemptions': { title: 'MPCB: industry categories and White-category notification', url: 'https://www.mpcb.gov.in/en/consentmgt/revised-industry-categorization', reviewedOn: REVIEWED_ON },
  nsws: { title: 'Government of India NSWS: Know Your Approvals and scope', url: 'https://www.nsws.gov.in/faqs', reviewedOn: REVIEWED_ON },
};

export const STATES: { id: string; name: Localized }[] = [
  { id: 'AN', name: l('Andaman and Nicobar Islands', 'अंडमान और निकोबार द्वीपसमूह', 'ಅಂಡಮಾನ್ ಮತ್ತು ನಿಕೋಬಾರ್ ದ್ವೀಪಗಳು') },
  { id: 'AP', name: l('Andhra Pradesh', 'आंध्र प्रदेश', 'ಆಂಧ್ರ ಪ್ರದೇಶ') },
  { id: 'AR', name: l('Arunachal Pradesh', 'अरुणाचल प्रदेश', 'ಅರುಣಾಚಲ ಪ್ರದೇಶ') },
  { id: 'AS', name: l('Assam', 'असम', 'ಅಸ್ಸಾಂ') },
  { id: 'BR', name: l('Bihar', 'बिहार', 'ಬಿಹಾರ') },
  { id: 'CH', name: l('Chandigarh', 'चंडीगढ़', 'ಚಂಡೀಗಢ') },
  { id: 'CG', name: l('Chhattisgarh', 'छत्तीसगढ़', 'ಛತ್ತೀಸ್‌ಗಢ') },
  { id: 'DN', name: l('Dadra and Nagar Haveli and Daman and Diu', 'दादरा और नगर हवेली और दमन और दीव', 'ದಾದ್ರಾ ಮತ್ತು ನಗರ ಹವೇಲಿ ಹಾಗೂ ದಮನ್ ಮತ್ತು ದಿಯು') },
  { id: 'DL', name: l('Delhi', 'दिल्ली', 'ದೆಹಲಿ') },
  { id: 'GA', name: l('Goa', 'गोवा', 'ಗೋವಾ') },
  { id: 'GJ', name: l('Gujarat', 'गुजरात', 'ಗುಜರಾತ್') },
  { id: 'HR', name: l('Haryana', 'हरियाणा', 'ಹರಿಯಾಣ') },
  { id: 'HP', name: l('Himachal Pradesh', 'हिमाचल प्रदेश', 'ಹಿಮಾಚಲ ಪ್ರದೇಶ') },
  { id: 'JK', name: l('Jammu and Kashmir', 'जम्मू और कश्मीर', 'ಜಮ್ಮು ಮತ್ತು ಕಾಶ್ಮೀರ') },
  { id: 'JH', name: l('Jharkhand', 'झारखंड', 'ಜಾರ್ಖಂಡ್') },
  { id: 'KA', name: l('Karnataka', 'कर्नाटक', 'ಕರ್ನಾಟಕ') },
  { id: 'KL', name: l('Kerala', 'केरल', 'ಕೇರಳ') },
  { id: 'LA', name: l('Ladakh', 'लद्दाख', 'ಲಡಾಖ್') },
  { id: 'LD', name: l('Lakshadweep', 'लक्षद्वीप', 'ಲಕ್ಷದ್ವೀಪ') },
  { id: 'MP', name: l('Madhya Pradesh', 'मध्य प्रदेश', 'ಮಧ್ಯ ಪ್ರದೇಶ') },
  { id: 'MH', name: l('Maharashtra', 'महाराष्ट्र', 'ಮಹಾರಾಷ್ಟ್ರ') },
  { id: 'MN', name: l('Manipur', 'मणिपुर', 'ಮಣಿಪುರ') },
  { id: 'ML', name: l('Meghalaya', 'मेघालय', 'ಮೇಘಾಲಯ') },
  { id: 'MZ', name: l('Mizoram', 'मिजोरम', 'ಮಿಜೋರಾಂ') },
  { id: 'NL', name: l('Nagaland', 'नागालैंड', 'ನಾಗಾಲ್ಯಾಂಡ್') },
  { id: 'OD', name: l('Odisha', 'ओडिशा', 'ಒಡಿಶಾ') },
  { id: 'PY', name: l('Puducherry', 'पुदुच्चेरी', 'ಪುದುಚೇರಿ') },
  { id: 'PB', name: l('Punjab', 'पंजाब', 'ಪಂಜಾಬ್') },
  { id: 'RJ', name: l('Rajasthan', 'राजस्थान', 'ರಾಜಸ್ಥಾನ') },
  { id: 'SK', name: l('Sikkim', 'सिक्किम', 'ಸಿಕ್ಕಿಂ') },
  { id: 'TN', name: l('Tamil Nadu', 'तमिलनाडु', 'ತಮಿಳುನಾಡು') },
  { id: 'TS', name: l('Telangana', 'तेलंगाना', 'ತೆಲಂಗಾಣ') },
  { id: 'TR', name: l('Tripura', 'त्रिपुरा', 'ತ್ರಿಪುರಾ') },
  { id: 'UP', name: l('Uttar Pradesh', 'उत्तर प्रदेश', 'ಉತ್ತರ ಪ್ರದೇಶ') },
  { id: 'UK', name: l('Uttarakhand', 'उत्तराखंड', 'ಉತ್ತರಾಖಂಡ') },
  { id: 'WB', name: l('West Bengal', 'पश्चिम बंगाल', 'ಪಶ್ಚಿಮ ಬಂಗಾಳ') },
];

/** Versioned assumptions, not a representation of complete national coverage. */
export const RULE_CONFIGURATION = {
  version: RULE_VERSION,
  gst: {
    effectiveFrom: '2019-04-01', goodsDefault: 4_000_000, goodsReduced: 2_000_000,
    goodsReducedStates: ['AR', 'MN', 'ML', 'MZ', 'NL', 'PY', 'SK', 'TS', 'TR', 'UK'],
    servicesDefault: 2_000_000, servicesReduced: 1_000_000,
    servicesReducedStates: ['MN', 'MZ', 'NL', 'TR'],
  },
  fssai: { effectiveFrom: '2026-04-01', registrationMax: 15_000_000, stateLicenceMax: 500_000_000 },
  socialSecurity: { effectiveFrom: '2025-11-21', epfEmployees: 20, esiPersons: 10 },
  coverage: { central: 'screening', state: 'review-required', municipal: 'review-required' },
} as const;

const docs = {
  identity: l('Owner / authorised person identity and PAN', 'मालिक / अधिकृत व्यक्ति की पहचान और PAN', 'ಮಾಲೀಕ / ಅಧಿಕೃತ ವ್ಯಕ್ತಿಯ ಗುರುತು ಮತ್ತು PAN'),
  address: l('Business address and right-to-use proof', 'व्यवसाय का पता और परिसर उपयोग का प्रमाण', 'ವ್ಯವಹಾರದ ವಿಳಾಸ ಮತ್ತು ಸ್ಥಳ ಬಳಸುವ ಹಕ್ಕಿನ ದಾಖಲೆ'),
  constitution: l('Business constitution / incorporation details', 'व्यवसाय की संरचना / गठन की जानकारी', 'ವ್ಯವಹಾರದ ಸ್ವರೂಪ / ಸ್ಥಾಪನೆಯ ವಿವರಗಳು'),
  activity: l('Exact business activity and product details', 'व्यवसाय की सटीक गतिविधि और उत्पादों की जानकारी', 'ನಿಖರ ವ್ಯವಹಾರ ಚಟುವಟಿಕೆ ಮತ್ತು ಉತ್ಪನ್ನದ ವಿವರಗಳು'),
  employees: l('Employee, wage and existing coverage records', 'कर्मचारियों, वेतन और मौजूदा कवरेज के रिकॉर्ड', 'ಉದ್ಯೋಗಿಗಳು, ವೇತನ ಮತ್ತು ಈಗಿರುವ ವ್ಯಾಪ್ತಿಯ ದಾಖಲೆಗಳು'),
  premises: l('Premises use, layout and building approvals', 'परिसर के उपयोग, नक्शे और भवन की स्वीकृतियां', 'ಸ್ಥಳದ ಬಳಕೆ, ನಕ್ಷೆ ಮತ್ತು ಕಟ್ಟಡ ಅನುಮತಿಗಳು'),
  turnover: l('All-India turnover under the same PAN', 'एक ही PAN के अंतर्गत पूरे भारत का कारोबार', 'ಒಂದೇ PAN ಅಡಿಯಲ್ಲಿ ಭಾರತದಾದ್ಯಂತದ ವಹಿವಾಟು'),
};

const localAuthority = l('State department / local authority', 'राज्य विभाग / स्थानीय प्राधिकरण', 'ರಾಜ್ಯ ಇಲಾಖೆ / ಸ್ಥಳೀಯ ಪ್ರಾಧಿಕಾರ');
const noSignal = l('Your answers do not identify this activity. This is not an exemption decision.', 'आपके उत्तरों में यह गतिविधि नहीं मिली। यह छूट का निर्णय नहीं है।', 'ನಿಮ್ಮ ಉತ್ತರಗಳಲ್ಲಿ ಈ ಚಟುವಟಿಕೆ ಕಂಡುಬಂದಿಲ್ಲ. ಇದು ವಿನಾಯಿತಿಯ ನಿರ್ಧಾರವಲ್ಲ.');
const reviewChanges = l('Recheck before you add this activity or change your business.', 'यह गतिविधि जोड़ने या व्यवसाय बदलने से पहले दोबारा जांचें।', 'ಈ ಚಟುವಟಿಕೆ ಸೇರಿಸುವ ಅಥವಾ ವ್ಯವಹಾರ ಬದಲಿಸುವ ಮೊದಲು ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ.');

/** Invalid/unknown numbers stay unknown: they must never become zero. */
function amount(value: unknown, integer = false): number | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 24 || !/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER && (!integer || Number.isInteger(n)) ? n : null;
}

function allowed(value: unknown, values: readonly string[]): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && values.includes(item)) : []);
}

export function evaluateBusinessLicences(input: Answers): LicenceResult[] {
  // Ignore unknown enum values. Do not echo untrusted city/activity text into results or URLs.
  const state = typeof input?.state === 'string' ? input.state.toUpperCase() : '';
  const knownState = STATES.some(item => item.id === state);
  const activity = ['food', 'retail', 'services', 'professional', 'ecommerce', 'manufacturing', 'health', 'education', 'other'].includes(input?.activity) ? input.activity : 'other';
  const entity = ['sole', 'partnership', 'llp', 'company', 'undecided'].includes(input?.entity) ? input.entity : 'undecided';
  const premises = ['home', 'commercial', 'industrial', 'mobile', 'undecided'].includes(input?.premises) ? input.premises : 'undecided';
  const turnover = amount(input?.turnover);
  const employees = amount(input?.employees, true);
  const channels = allowed(input?.channels, ['local', 'interstate', 'marketplace', 'export', 'import']);
  const special = allowed(input?.special, ['food', 'packaged', 'weights', 'regulated', 'hazardous']);
  const food = activity === 'food' || special.has('food');
  const goods = ['retail', 'ecommerce', 'manufacturing'].includes(activity);
  const services = ['services', 'professional', 'health', 'education'].includes(activity);
  const goodsThreshold = RULE_CONFIGURATION.gst.goodsReducedStates.some(item => item === state) ? RULE_CONFIGURATION.gst.goodsReduced : RULE_CONFIGURATION.gst.goodsDefault;
  const serviceThreshold = RULE_CONFIGURATION.gst.servicesReducedStates.some(item => item === state) ? RULE_CONFIGURATION.gst.servicesReduced : RULE_CONFIGURATION.gst.servicesDefault;
  const threshold = goods ? goodsThreshold : serviceThreshold;
  const gstComplex = !knownState || activity === 'other' || activity === 'ecommerce' || activity === 'health' || activity === 'education' || channels.has('marketplace') || channels.has('import') || (goods && (channels.has('interstate') || channels.has('export')));
  const thresholdText = threshold === 4_000_000 ? '₹40 lakh' : threshold === 2_000_000 ? '₹20 lakh' : '₹10 lakh';
  const thresholdHi = threshold === 4_000_000 ? '₹40 लाख' : threshold === 2_000_000 ? '₹20 लाख' : '₹10 लाख';
  const thresholdKn = threshold === 4_000_000 ? '₹40 ಲಕ್ಷ' : threshold === 2_000_000 ? '₹20 ಲಕ್ಷ' : '₹10 ಲಕ್ಷ';
  let gstReason: Localized;
  if (!knownState || turnover === null) {
    gstReason = l('Choose a valid state and enter financial-year turnover to screen GST. Unknown turnover cannot establish an exemption.', 'GST जांचने के लिए सही राज्य और वित्त वर्ष का कारोबार भरें। अज्ञात कारोबार के आधार पर छूट तय नहीं की जा सकती।', 'GST ಪರಿಶೀಲಿಸಲು ಸರಿಯಾದ ರಾಜ್ಯ ಮತ್ತು ಹಣಕಾಸು ವರ್ಷದ ವಹಿವಾಟು ನಮೂದಿಸಿ. ತಿಳಿಯದ ವಹಿವಾಟಿನಿಂದ ವಿನಾಯಿತಿ ನಿರ್ಧರಿಸಲಾಗದು.');
  } else if (turnover > threshold) {
    gstReason = l(`Your turnover is above the indicative ${thresholdText} threshold for this profile. Taxable supply, goods-only conditions and exemptions need verification.`, `आपका कारोबार इस प्रोफाइल की संकेतक ${thresholdHi} सीमा से अधिक है। कर योग्य बिक्री, केवल माल की शर्तें और छूट जांचनी होंगी।`, `ಈ ಪ್ರೊಫೈಲ್‌ನ ಸೂಚಕ ${thresholdKn} ಮಿತಿಗಿಂತ ನಿಮ್ಮ ವಹಿವಾಟು ಹೆಚ್ಚಿದೆ. ತೆರಿಗೆಗೆ ಒಳಪಡುವ ಮಾರಾಟ, ಸರಕು ಮಾತ್ರದ ಷರತ್ತುಗಳು ಮತ್ತು ವಿನಾಯಿತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಬೇಕು.`);
  } else if (gstComplex) {
    gstReason = l('Your activity or selling channels need a specific GST check. Low turnover, online selling or exports alone do not settle registration.', 'आपकी गतिविधि या बिक्री के तरीके के लिए विशेष GST जांच चाहिए। कम कारोबार, ऑनलाइन बिक्री या निर्यात से अकेले पंजीकरण तय नहीं होता।', 'ನಿಮ್ಮ ಚಟುವಟಿಕೆ ಅಥವಾ ಮಾರಾಟ ವಿಧಾನಕ್ಕೆ ಪ್ರತ್ಯೇಕ GST ಪರಿಶೀಲನೆ ಬೇಕು. ಕಡಿಮೆ ವಹಿವಾಟು, ಆನ್‌ಲೈನ್ ಮಾರಾಟ ಅಥವಾ ರಫ್ತು ಮಾತ್ರ ನೋಂದಣಿಯನ್ನು ನಿರ್ಧರಿಸುವುದಿಲ್ಲ.');
  } else {
    gstReason = l(`Turnover alone does not cross the indicative ${thresholdText} threshold. This assumes eligible supplies and is not confirmation of exemption.`, `केवल कारोबार के आधार पर संकेतक ${thresholdHi} सीमा पार नहीं होती। यह पात्र बिक्री की धारणा है, छूट की पुष्टि नहीं।`, `ವಹಿವಾಟಿನ ಆಧಾರದಲ್ಲಿ ಮಾತ್ರ ಸೂಚಕ ${thresholdKn} ಮಿತಿ ದಾಟಿಲ್ಲ. ಇದು ಅರ್ಹ ಮಾರಾಟದ ಊಹೆಯಾಗಿದ್ದು, ವಿನಾಯಿತಿಯ ದೃಢೀಕರಣವಲ್ಲ.`);
  }
  const results: LicenceResult[] = [{
    id: 'gst', title: l('GST registration', 'GST पंजीकरण', 'GST ನೋಂದಣಿ'),
    status: turnover === null || gstComplex || turnover > threshold ? 'check' : 'not-triggered',
    reason: gstReason,
    nextStep: l('Verify same-PAN turnover, taxable/exempt supplies and compulsory-registration exceptions. Eligible small marketplace sellers may use conditional enrolment.', 'एक ही PAN का कारोबार, कर योग्य/छूट वाली बिक्री और अनिवार्य पंजीकरण के अपवाद जांचें। पात्र छोटे मार्केटप्लेस विक्रेताओं को शर्तों के साथ नामांकन मिल सकता है।', 'ಒಂದೇ PAN ವಹಿವಾಟು, ತೆರಿಗೆಗೆ ಒಳಪಡುವ/ವಿನಾಯಿತಿ ಮಾರಾಟ ಮತ್ತು ಕಡ್ಡಾಯ ನೋಂದಣಿ ಅಪವಾದಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಅರ್ಹ ಸಣ್ಣ ಮಾರ್ಕೆಟ್‌ಪ್ಲೇಸ್ ಮಾರಾಟಗಾರರಿಗೆ ಷರತ್ತುಬದ್ಧ ದಾಖಲಾತಿ ಸಿಗಬಹುದು.'),
    authority: l('GST department / GST portal', 'GST विभाग / GST पोर्टल', 'GST ಇಲಾಖೆ / GST ಪೋರ್ಟಲ್'),
    documents: [docs.identity, docs.address, docs.constitution, docs.turnover],
    sourceIds: ['gst-section22', 'gst-thresholds', 'gst-2026', 'gst-marketplace'], servicePath: '/services/gst-registration',
  }];

  let fssaiStep = l('Select the exact activity in FoSCoS; turnover is not the only eligibility test.', 'FoSCoS में सटीक गतिविधि चुनें; केवल कारोबार से पात्रता तय नहीं होती।', 'FoSCoS ನಲ್ಲಿ ನಿಖರ ಚಟುವಟಿಕೆ ಆಯ್ಕೆಮಾಡಿ; ವಹಿವಾಟು ಮಾತ್ರ ಅರ್ಹತೆಯ ಮಾನದಂಡವಲ್ಲ.');
  if (food && turnover !== null) {
    fssaiStep = turnover <= RULE_CONFIGURATION.fssai.registrationMax
      ? l('The general turnover band is Registration (up to ₹1.5 crore). Confirm activity-specific criteria, imports and multi-state operations in FoSCoS.', 'सामान्य कारोबार श्रेणी पंजीकरण है (₹1.5 करोड़ तक)। FoSCoS में गतिविधि, आयात और कई राज्यों में संचालन की शर्तें जांचें।', 'ಸಾಮಾನ್ಯ ವಹಿವಾಟು ವರ್ಗ ನೋಂದಣಿ (₹1.5 ಕೋಟಿವರೆಗೆ). FoSCoS ನಲ್ಲಿ ಚಟುವಟಿಕೆ, ಆಮದು ಮತ್ತು ಬಹುರಾಜ್ಯ ಕಾರ್ಯಾಚರಣೆಯ ಷರತ್ತುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.')
      : turnover <= RULE_CONFIGURATION.fssai.stateLicenceMax
        ? l('The general turnover band is State Licence (above ₹1.5 crore to ₹50 crore). Confirm kind-of-business exceptions in FoSCoS.', 'सामान्य कारोबार श्रेणी राज्य लाइसेंस है (₹1.5 करोड़ से अधिक, ₹50 करोड़ तक)। FoSCoS में गतिविधि के अपवाद जांचें।', 'ಸಾಮಾನ್ಯ ವಹಿವಾಟು ವರ್ಗ ರಾಜ್ಯ ಪರವಾನಗಿ (₹1.5 ಕೋಟಿಗಿಂತ ಹೆಚ್ಚು, ₹50 ಕೋಟಿವರೆಗೆ). FoSCoS ನಲ್ಲಿ ಚಟುವಟಿಕೆಯ ಅಪವಾದಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.')
        : l('The general turnover band is Central Licence (above ₹50 crore). Confirm every activity and premises in FoSCoS.', 'सामान्य कारोबार श्रेणी केंद्रीय लाइसेंस है (₹50 करोड़ से अधिक)। FoSCoS में हर गतिविधि और परिसर की जांच करें।', 'ಸಾಮಾನ್ಯ ವಹಿವಾಟು ವರ್ಗ ಕೇಂದ್ರ ಪರವಾನಗಿ (₹50 ಕೋಟಿಗಿಂತ ಹೆಚ್ಚು). FoSCoS ನಲ್ಲಿ ಪ್ರತಿ ಚಟುವಟಿಕೆ ಮತ್ತು ಸ್ಥಳವನ್ನು ಪರಿಶೀಲಿಸಿ.');
  }
  if (food && (channels.has('import') || channels.has('export'))) {
    fssaiStep = l('Food import/export can require a Central Licence irrespective of turnover. Confirm the precise importer / exporter category in FoSCoS.', 'खाद्य आयात/निर्यात में कारोबार की सीमा से अलग केंद्रीय लाइसेंस जरूरी हो सकता है। FoSCoS में सटीक आयातक / निर्यातक श्रेणी जांचें।', 'ಆಹಾರ ಆಮದು/ರಫ್ತಿಗೆ ವಹಿವಾಟಿನ ಮಿತಿಯಿಲ್ಲದೆ ಕೇಂದ್ರ ಪರವಾನಗಿ ಬೇಕಾಗಬಹುದು. FoSCoS ನಲ್ಲಿ ನಿಖರ ಆಮದುದಾರ / ರಫ್ತುದಾರ ವರ್ಗ ದೃಢಪಡಿಸಿ.');
  }
  results.push({
    id: 'fssai', title: l('FSSAI food authorisation', 'FSSAI खाद्य अनुमति', 'FSSAI ಆಹಾರ ಅನುಮತಿ'),
    status: food ? premises === 'mobile' ? 'check' : 'required' : 'not-triggered',
    reason: food
      ? l('Food businesses generally need FSSAI authorisation. Farm-level exclusions and deemed registration for eligible street vendors need checking.', 'खाद्य व्यवसाय को सामान्यतः FSSAI अनुमति चाहिए। खेत-स्तर की छूट और पात्र रेहड़ी विक्रेताओं का स्वतः पंजीकरण जांचना होगा।', 'ಆಹಾರ ವ್ಯವಹಾರಕ್ಕೆ ಸಾಮಾನ್ಯವಾಗಿ FSSAI ಅನುಮತಿ ಬೇಕು. ಕೃಷಿ ಹಂತದ ವಿನಾಯಿತಿ ಮತ್ತು ಅರ್ಹ ಬೀದಿ ವ್ಯಾಪಾರಿಗಳ ಸ್ವಯಂ ನೋಂದಣಿಯನ್ನು ಪರಿಶೀಲಿಸಬೇಕು.')
      : noSignal,
    nextStep: food ? fssaiStep : reviewChanges,
    authority: l('FSSAI / state food safety authority', 'FSSAI / राज्य खाद्य सुरक्षा प्राधिकरण', 'FSSAI / ರಾಜ್ಯ ಆಹಾರ ಸುರಕ್ಷತಾ ಪ್ರಾಧಿಕಾರ'),
    documents: [docs.identity, docs.address, docs.activity],
    sourceIds: ['fssai-registration', 'fssai-act', 'fssai-2026', 'fssai-vendors'], servicePath: '/services/fssai-food-business',
  });

  results.push({
    id: 'udyam', title: l('Udyam / MSME recognition', 'उद्यम / MSME पहचान', 'ಉದ್ಯಮ್ / MSME ಗುರುತಿಸುವಿಕೆ'), status: 'recommended',
    reason: l('Explore MSME recognition if your activity and investment qualify. This checker does not collect investment and cannot confirm eligibility.', 'गतिविधि और निवेश पात्र हों तो MSME पहचान देखें। यह चेकर निवेश नहीं पूछता, इसलिए पात्रता की पुष्टि नहीं करता।', 'ನಿಮ್ಮ ಚಟುವಟಿಕೆ ಮತ್ತು ಹೂಡಿಕೆ ಅರ್ಹವಾದರೆ MSME ಗುರುತಿಸುವಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಈ ಸಾಧನ ಹೂಡಿಕೆ ಕೇಳುವುದಿಲ್ಲ; ಅರ್ಹತೆಯನ್ನು ದೃಢಪಡಿಸುವುದಿಲ್ಲ.'),
    nextStep: l('Use the official Udyam portal. Government registration is free and based on self-declaration; investment and turnover both matter.', 'आधिकारिक उद्यम पोर्टल उपयोग करें। सरकारी पंजीकरण निःशुल्क और स्वघोषणा पर है; निवेश और कारोबार दोनों मायने रखते हैं।', 'ಅಧಿಕೃತ ಉದ್ಯಮ್ ಪೋರ್ಟಲ್ ಬಳಸಿ. ಸರ್ಕಾರಿ ನೋಂದಣಿ ಉಚಿತವಾಗಿದ್ದು ಸ್ವಯಂ ಘೋಷಣೆಯ ಆಧಾರದಲ್ಲಿದೆ; ಹೂಡಿಕೆ ಮತ್ತು ವಹಿವಾಟು ಎರಡೂ ಮುಖ್ಯ.'),
    authority: l('Ministry of MSME', 'MSME मंत्रालय', 'MSME ಸಚಿವಾಲಯ'),
    documents: [l('Aadhaar / PAN details; GSTIN where applicable (no document upload on Udyam)', 'आधार / PAN जानकारी; जहां लागू हो GSTIN (उद्यम पर दस्तावेज अपलोड नहीं)', 'ಆಧಾರ್ / PAN ವಿವರಗಳು; ಅನ್ವಯಿಸಿದಲ್ಲಿ GSTIN (ಉದ್ಯಮ್‌ನಲ್ಲಿ ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಇಲ್ಲ)')],
    sourceIds: ['udyam', 'udyam-process'],
  });

  results.push({
    id: 'shops-establishment', title: l('Shops & Establishments registration', 'दुकान एवं स्थापना पंजीकरण', 'ಅಂಗಡಿ ಮತ್ತು ವಾಣಿಜ್ಯ ಸಂಸ್ಥೆ ನೋಂದಣಿ'), status: 'check',
    reason: l('State labour rules may cover shops, offices and some home businesses. Employee count and premises alone do not establish exemption.', 'राज्य के श्रम नियम दुकानों, कार्यालयों और कुछ घरेलू व्यवसायों पर लागू हो सकते हैं। केवल कर्मचारियों की संख्या या परिसर से छूट तय नहीं होती।', 'ರಾಜ್ಯ ಕಾರ್ಮಿಕ ನಿಯಮಗಳು ಅಂಗಡಿ, ಕಚೇರಿ ಮತ್ತು ಕೆಲವು ಮನೆ ವ್ಯವಹಾರಗಳಿಗೆ ಅನ್ವಯಿಸಬಹುದು. ಉದ್ಯೋಗಿಗಳ ಸಂಖ್ಯೆ ಅಥವಾ ಸ್ಥಳದಿಂದ ಮಾತ್ರ ವಿನಾಯಿತಿ ನಿರ್ಧರಿಸಲಾಗದು.'),
    nextStep: l('Confirm registration or intimation with your state labour department. State-specific exemptions and forms need review.', 'राज्य श्रम विभाग से पंजीकरण या सूचना की जरूरत जांचें। राज्य की छूट और फॉर्म की अलग जांच चाहिए।', 'ರಾಜ್ಯ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯಲ್ಲಿ ನೋಂದಣಿ ಅಥವಾ ಮಾಹಿತಿ ಸಲ್ಲಿಸುವ ಅವಶ್ಯಕತೆಯನ್ನು ದೃಢಪಡಿಸಿ. ರಾಜ್ಯದ ವಿನಾಯಿತಿಗಳು ಮತ್ತು ಫಾರ್ಮ್‌ಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಪರಿಶೀಲಿಸಿ.'),
    authority: l('State labour department', 'राज्य श्रम विभाग', 'ರಾಜ್ಯ ಕಾರ್ಮಿಕ ಇಲಾಖೆ'),
    documents: [docs.identity, docs.address, docs.activity, docs.employees], sourceIds: state === 'KA' ? ['ka-shops', 'nsws'] : ['nsws'],
  });
  results.push({
    id: 'trade-licence', title: l('Municipal trade licence / vending permission', 'नगरपालिका ट्रेड लाइसेंस / वेंडिंग अनुमति', 'ನಗರಸಭೆ ವ್ಯಾಪಾರ ಪರವಾನಗಿ / ಬೀದಿ ವ್ಯಾಪಾರ ಅನುಮತಿ'), status: 'check',
    reason: l('Permission depends on the exact trade, premises and local body. A GST or Udyam certificate does not replace local permission.', 'अनुमति सटीक व्यापार, परिसर और स्थानीय निकाय पर निर्भर है। GST या उद्यम प्रमाणपत्र स्थानीय अनुमति का विकल्प नहीं।', 'ಅನುಮತಿ ನಿಖರ ವ್ಯಾಪಾರ, ಸ್ಥಳ ಮತ್ತು ಸ್ಥಳೀಯ ಸಂಸ್ಥೆಯ ಮೇಲೆ ಅವಲಂಬಿತ. GST ಅಥವಾ ಉದ್ಯಮ್ ಪ್ರಮಾಣಪತ್ರ ಸ್ಥಳೀಯ ಅನುಮತಿಗೆ ಪರ್ಯಾಯವಲ್ಲ.'),
    nextStep: l('Check your municipal corporation, municipality or panchayat; street vendors should check their vending authority.', 'नगर निगम, नगरपालिका या पंचायत से जांचें; रेहड़ी विक्रेता वेंडिंग प्राधिकरण से पूछें।', 'ಮಹಾನಗರ ಪಾಲಿಕೆ, ನಗರಸಭೆ ಅಥವಾ ಪಂಚಾಯಿತಿಯಲ್ಲಿ ಪರಿಶೀಲಿಸಿ; ಬೀದಿ ವ್ಯಾಪಾರಿಗಳು ತಮ್ಮ ವ್ಯಾಪಾರ ಪ್ರಾಧಿಕಾರದಲ್ಲಿ ವಿಚಾರಿಸಿ.'),
    authority: localAuthority, documents: [docs.identity, docs.address, docs.activity], sourceIds: ['nsws', ...(state === 'KA' ? ['trade-example'] : [])],
  });
  results.push({
    id: 'professional-tax', title: l('Professional tax: enrolment / employer registration', 'व्यावसायिक कर: नामांकन / नियोक्ता पंजीकरण', 'ವೃತ್ತಿ ತೆರಿಗೆ: ದಾಖಲಾತಿ / ಉದ್ಯೋಗದಾತ ನೋಂದಣಿ'), status: 'check',
    reason: state === 'KA'
      ? l('Karnataka levies professional tax on specified professions, trades and employment. Enrolment and payroll obligations have different conditions.', 'कर्नाटक में निर्धारित पेशों, व्यापार और रोजगार पर व्यावसायिक कर है। नामांकन और वेतन कटौती की शर्तें अलग हैं।', 'ಕರ್ನಾಟಕದಲ್ಲಿ ನಿರ್ದಿಷ್ಟ ವೃತ್ತಿ, ವ್ಯಾಪಾರ ಮತ್ತು ಉದ್ಯೋಗಕ್ಕೆ ವೃತ್ತಿ ತೆರಿಗೆ ಇದೆ. ದಾಖಲಾತಿ ಮತ್ತು ವೇತನ ಕಡಿತದ ಷರತ್ತುಗಳು ಬೇರೆ.')
      : l('Professional tax is state-specific and is not levied everywhere. This state’s current applicability is not automated here.', 'व्यावसायिक कर राज्य पर निर्भर है और हर जगह नहीं लगता। इस राज्य की मौजूदा लागू शर्तें यहां स्वचालित नहीं हैं।', 'ವೃತ್ತಿ ತೆರಿಗೆ ರಾಜ್ಯಕ್ಕೆ ಸಂಬಂಧಿಸಿದೆ; ಎಲ್ಲೆಡೆ ವಿಧಿಸುವುದಿಲ್ಲ. ಈ ರಾಜ್ಯದ ಪ್ರಸ್ತುತ ಅನ್ವಯಿಸುವಿಕೆ ಇಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪರಿಶೀಲಿಸಿಲ್ಲ.'),
    nextStep: l('Check the state tax schedule, exemptions and employee wages before enrolling or deducting tax. Check existing linked registrations first.', 'नामांकन या कर काटने से पहले राज्य की अनुसूची, छूट और कर्मचारियों का वेतन जांचें। पहले मौजूदा लिंक्ड पंजीकरण देखें।', 'ದಾಖಲಾಗುವ ಅಥವಾ ತೆರಿಗೆ ಕಡಿತಗೊಳಿಸುವ ಮೊದಲು ರಾಜ್ಯದ ಪಟ್ಟಿ, ವಿನಾಯಿತಿ ಮತ್ತು ಉದ್ಯೋಗಿಗಳ ವೇತನ ಪರಿಶೀಲಿಸಿ. ಈಗಾಗಲೇ ಲಿಂಕ್ ಆಗಿರುವ ನೋಂದಣಿಯನ್ನು ಮೊದಲು ಪರಿಶೀಲಿಸಿ.'),
    authority: l('State professional / commercial tax department', 'राज्य व्यावसायिक / वाणिज्यिक कर विभाग', 'ರಾಜ್ಯ ವೃತ್ತಿ / ವಾಣಿಜ್ಯ ತೆರಿಗೆ ಇಲಾಖೆ'),
    documents: [docs.identity, docs.constitution, docs.employees], sourceIds: state === 'KA' ? ['ka-pt', 'mca-linked'] : ['nsws'],
  });

  const foreign = channels.has('import') || channels.has('export');
  results.push({
    id: 'iec', title: l('Importer Exporter Code (IEC)', 'आयातक निर्यातक कोड (IEC)', 'ಆಮದು ರಫ್ತು ಕೋಡ್ (IEC)'),
    status: foreign ? 'check' : 'not-triggered',
    reason: foreign
      ? services
        ? l('Cross-border services do not automatically require IEC. Foreign Trade Policy benefits or specified technology/services can change the requirement.', 'विदेशी सेवाओं के लिए IEC स्वतः जरूरी नहीं। विदेश व्यापार नीति के लाभ या निर्धारित तकनीक/सेवाओं से जरूरत बदल सकती है।', 'ವಿದೇಶಿ ಸೇವೆಗಳಿಗೆ IEC ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬೇಕಾಗುವುದಿಲ್ಲ. ವಿದೇಶ ವ್ಯಾಪಾರ ನೀತಿ ಸೌಲಭ್ಯ ಅಥವಾ ನಿರ್ದಿಷ್ಟ ತಂತ್ರಜ್ಞಾನ/ಸೇವೆಯಿಂದ ಅಗತ್ಯ ಬದಲಾಗಬಹುದು.')
        : l('Commercial import/export of goods generally needs IEC unless a specific exemption applies. Your exact goods and transaction need confirmation.', 'माल के व्यावसायिक आयात/निर्यात में सामान्यतः IEC चाहिए, जब तक विशेष छूट न हो। माल और लेनदेन की पुष्टि जरूरी है।', 'ಸರಕುಗಳ ವಾಣಿಜ್ಯ ಆಮದು/ರಫ್ತಿಗೆ ವಿಶೇಷ ವಿನಾಯಿತಿ ಇಲ್ಲದಿದ್ದರೆ ಸಾಮಾನ್ಯವಾಗಿ IEC ಬೇಕು. ನಿಖರ ಸರಕು ಮತ್ತು ವ್ಯವಹಾರವನ್ನು ದೃಢಪಡಿಸಬೇಕು.')
      : noSignal,
    nextStep: foreign ? l('Check DGFT paragraph 2.05 and applicable exemptions before trading. Goods restrictions and customs requirements need separate checks.', 'व्यापार से पहले DGFT अनुच्छेद 2.05 और लागू छूट जांचें। माल के प्रतिबंध और सीमा शुल्क की अलग जांच करें।', 'ವ್ಯಾಪಾರ ಮಾಡುವ ಮೊದಲು DGFT ಪರಿಚ್ಛೇದ 2.05 ಮತ್ತು ಅನ್ವಯಿಸುವ ವಿನಾಯಿತಿ ಪರಿಶೀಲಿಸಿ. ಸರಕು ನಿರ್ಬಂಧ ಮತ್ತು ಕಸ್ಟಮ್ಸ್ ಅವಶ್ಯಕತೆಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಪರಿಶೀಲಿಸಿ.') : reviewChanges,
    authority: l('DGFT / customs authorities', 'DGFT / सीमा शुल्क प्राधिकरण', 'DGFT / ಕಸ್ಟಮ್ಸ್ ಪ್ರಾಧಿಕಾರ'), documents: [docs.identity, docs.address, docs.constitution], sourceIds: ['iec'],
  });

  const company = entity === 'company';
  const epfThreshold = employees !== null && employees >= RULE_CONFIGURATION.socialSecurity.epfEmployees;
  const companyRegistration = l('A new company incorporated through SPICe+ gets linked EPFO / ESIC registrations. This does not itself establish contribution liability.', 'SPICe+ से बनने वाली नई कंपनी को लिंक्ड EPFO / ESIC पंजीकरण मिलते हैं। इससे अपने आप अंशदान देयता तय नहीं होती।', 'SPICe+ ಮೂಲಕ ಸ್ಥಾಪಿತವಾಗುವ ಹೊಸ ಕಂಪನಿಗೆ EPFO / ESIC ಲಿಂಕ್ ನೋಂದಣಿಗಳು ಸಿಗುತ್ತವೆ. ಇದರಿಂದಲೇ ಕೊಡುಗೆ ಪಾವತಿಯ ಹೊಣೆ ನಿರ್ಧಾರವಾಗುವುದಿಲ್ಲ.');
  results.push({
    id: 'epf', title: l('EPFO registration & employee coverage', 'EPFO पंजीकरण और कर्मचारी कवरेज', 'EPFO ನೋಂದಣಿ ಮತ್ತು ಉದ್ಯೋಗಿ ವ್ಯಾಪ್ತಿ'),
    status: company || epfThreshold ? 'required' : employees === null ? 'check' : 'not-triggered',
    reason: company ? companyRegistration : epfThreshold
      ? l('Your employee count reaches the general 20-employee EPF threshold. Count employees correctly and check existing coverage and applicable schemes.', 'कर्मचारियों की संख्या सामान्य 20-कर्मचारी EPF सीमा तक पहुंचती है। कर्मचारियों की सही गिनती, मौजूदा कवरेज और लागू योजनाएं जांचें।', 'ನಿಮ್ಮ ಉದ್ಯೋಗಿಗಳ ಸಂಖ್ಯೆ ಸಾಮಾನ್ಯ 20-ಉದ್ಯೋಗಿಗಳ EPF ಮಿತಿಗೆ ತಲುಪಿದೆ. ಸರಿಯಾದ ಎಣಿಕೆ, ಈಗಿರುವ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಅನ್ವಯಿಸುವ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.')
      : employees === null
        ? l('Employee count is unknown; EPF coverage cannot be screened.', 'कर्मचारियों की संख्या अज्ञात है; EPF कवरेज नहीं जांचा जा सकता।', 'ಉದ್ಯೋಗಿಗಳ ಸಂಖ್ಯೆ ತಿಳಿದಿಲ್ಲ; EPF ವ್ಯಾಪ್ತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗದು.')
        : l('The current count is below 20. Past coverage, notified categories or voluntary coverage can still create obligations.', 'मौजूदा संख्या 20 से कम है। पिछला कवरेज, अधिसूचित श्रेणियां या स्वैच्छिक कवरेज से दायित्व रह सकता है।', 'ಈಗಿನ ಸಂಖ್ಯೆ 20ಕ್ಕಿಂತ ಕಡಿಮೆ. ಹಿಂದಿನ ವ್ಯಾಪ್ತಿ, ಅಧಿಸೂಚಿತ ವರ್ಗಗಳು ಅಥವಾ ಸ್ವಯಂ ಆಯ್ದ ವ್ಯಾಪ್ತಿಯಿಂದ ಹೊಣೆ ಇರಬಹುದು.'),
    nextStep: l('Check existing EPFO numbers before a new registration. Confirm contractor workers, earlier coverage and employee eligibility with EPFO.', 'नया पंजीकरण करने से पहले मौजूदा EPFO नंबर देखें। ठेका श्रमिक, पिछला कवरेज और कर्मचारियों की पात्रता EPFO से जांचें।', 'ಹೊಸ ನೋಂದಣಿ ಮಾಡುವ ಮೊದಲು ಈಗಿರುವ EPFO ಸಂಖ್ಯೆ ಪರಿಶೀಲಿಸಿ. ಗುತ್ತಿಗೆ ಕಾರ್ಮಿಕರು, ಹಿಂದಿನ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಉದ್ಯೋಗಿಗಳ ಅರ್ಹತೆಯನ್ನು EPFO ಜೊತೆ ದೃಢಪಡಿಸಿ.'),
    authority: l('EPFO / Ministry of Labour', 'EPFO / श्रम मंत्रालय', 'EPFO / ಕಾರ್ಮಿಕ ಸಚಿವಾಲಯ'), documents: [docs.identity, docs.constitution, docs.employees], sourceIds: ['social-security', 'labour-implementation', 'mca-linked'],
  });
  const esiThreshold = employees !== null && employees >= RULE_CONFIGURATION.socialSecurity.esiPersons;
  const hazardous = special.has('hazardous');
  results.push({
    id: 'esi', title: l('ESIC registration & employee coverage', 'ESIC पंजीकरण और कर्मचारी कवरेज', 'ESIC ನೋಂದಣಿ ಮತ್ತು ಉದ್ಯೋಗಿ ವ್ಯಾಪ್ತಿ'),
    status: company ? 'required' : esiThreshold || hazardous || employees === null ? 'check' : 'not-triggered',
    reason: company ? companyRegistration : esiThreshold
      ? l('Your count reaches the general 10-person ESI screening threshold. Wages, establishment type and applicable notifications still need checking.', 'संख्या सामान्य 10-व्यक्ति ESI जांच सीमा तक पहुंचती है। वेतन, स्थापना का प्रकार और लागू अधिसूचनाएं अभी जांचनी हैं।', 'ನಿಮ್ಮ ಸಂಖ್ಯೆ ಸಾಮಾನ್ಯ 10-ವ್ಯಕ್ತಿಗಳ ESI ಪರಿಶೀಲನಾ ಮಿತಿಗೆ ತಲುಪಿದೆ. ವೇತನ, ಸಂಸ್ಥೆಯ ವಿಧ ಮತ್ತು ಅನ್ವಯಿಸುವ ಅಧಿಸೂಚನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಬೇಕು.')
      : hazardous
        ? l('Notified hazardous or life-threatening work may trigger ESI even with one employee. The exact notified activity must be checked.', 'अधिसूचित खतरनाक या जानलेवा काम में एक कर्मचारी पर भी ESI लागू हो सकता है। सटीक अधिसूचित गतिविधि जांचें।', 'ಅಧಿಸೂಚಿತ ಅಪಾಯಕಾರಿ ಅಥವಾ ಪ್ರಾಣಾಪಾಯದ ಕೆಲಸದಲ್ಲಿ ಒಬ್ಬ ಉದ್ಯೋಗಿಯಿದ್ದರೂ ESI ಅನ್ವಯಿಸಬಹುದು. ನಿಖರ ಅಧಿಸೂಚಿತ ಚಟುವಟಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.')
        : employees === null
          ? l('Employee count and wages are needed to check ESI coverage.', 'ESI कवरेज जांचने के लिए कर्मचारियों की संख्या और वेतन चाहिए।', 'ESI ವ್ಯಾಪ್ತಿ ಪರಿಶೀಲಿಸಲು ಉದ್ಯೋಗಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ವೇತನ ಬೇಕು.')
          : l('No general 10-person trigger is found. Earlier coverage or a special notification may still apply.', 'सामान्य 10-व्यक्ति सीमा का संकेत नहीं मिला। पिछला कवरेज या विशेष अधिसूचना फिर भी लागू हो सकती है।', 'ಸಾಮಾನ್ಯ 10-ವ್ಯಕ್ತಿಗಳ ಮಿತಿ ಕಂಡುಬಂದಿಲ್ಲ. ಹಿಂದಿನ ವ್ಯಾಪ್ತಿ ಅಥವಾ ವಿಶೇಷ ಅಧಿಸೂಚನೆ ಅನ್ವಯಿಸಬಹುದು.'),
    nextStep: l('Ask ESIC to confirm coverage and eligible wages; seasonal-factory and notified-activity exceptions need review. Check existing ESIC registration first.', 'ESIC से कवरेज और पात्र वेतन की पुष्टि करें; मौसमी फैक्टरी और अधिसूचित गतिविधि के अपवाद जांचें। पहले मौजूदा ESIC पंजीकरण देखें।', 'ESIC ಯಲ್ಲಿ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಅರ್ಹ ವೇತನ ದೃಢಪಡಿಸಿ; ಋತುಮಾನ ಕಾರ್ಖಾನೆ ಮತ್ತು ಅಧಿಸೂಚಿತ ಚಟುವಟಿಕೆಯ ಅಪವಾದ ಪರಿಶೀಲಿಸಿ. ಈಗಿರುವ ESIC ನೋಂದಣಿಯನ್ನು ಮೊದಲು ಪರಿಶೀಲಿಸಿ.'),
    authority: l('ESIC / Ministry of Labour', 'ESIC / श्रम मंत्रालय', 'ESIC / ಕಾರ್ಮಿಕ ಸಚಿವಾಲಯ'), documents: [docs.identity, docs.constitution, docs.employees], sourceIds: ['social-security', 'labour-implementation', 'esi-2026', 'mca-linked'],
  });

  const measurement = special.has('packaged') || special.has('weights');
  results.push({
    id: 'legal-metrology', title: l('Legal Metrology: packaging / weighing', 'विधिक माप विज्ञान: पैकेजिंग / तौल', 'ಕಾನೂನು ಮಾಪನ: ಪ್ಯಾಕೇಜಿಂಗ್ / ತೂಕ'), status: measurement ? 'check' : 'not-triggered',
    reason: measurement
      ? l('Pre-packed goods or trade weighing can trigger labelling, packer/importer registration or verified instruments. A retailer is not automatically a packer.', 'पैक माल या व्यापार में तौल से लेबल, पैकर/आयातक पंजीकरण या सत्यापित उपकरण की जरूरत हो सकती है। खुदरा विक्रेता स्वतः पैकर नहीं है।', 'ಪೂರ್ವ ಪ್ಯಾಕ್ ಸರಕು ಅಥವಾ ವ್ಯಾಪಾರದ ತೂಕಮಾಪನಕ್ಕೆ ಲೇಬಲ್, ಪ್ಯಾಕರ್/ಆಮದುದಾರ ನೋಂದಣಿ ಅಥವಾ ಪರಿಶೀಲಿತ ಸಾಧನ ಬೇಕಾಗಬಹುದು. ಚಿಲ್ಲರೆ ಮಾರಾಟಗಾರ ಎಂದರೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ಯಾಕರ್ ಅಲ್ಲ.')
      : noSignal,
    nextStep: measurement ? l('Tell the state controller whether you manufacture, pack, import, resell or only use weighing equipment. Verify applicable exemptions and stamping.', 'राज्य नियंत्रक को बताएं कि आप बनाते, पैक करते, आयात, पुनर्विक्रय या केवल तौल उपकरण उपयोग करते हैं। लागू छूट और सत्यापन जांचें।', 'ನೀವು ತಯಾರಿಕೆ, ಪ್ಯಾಕಿಂಗ್, ಆಮದು, ಮರುಮಾರಾಟ ಅಥವಾ ತೂಕ ಸಾಧನ ಬಳಕೆ ಯಾವುದನ್ನು ಮಾಡುತ್ತೀರಿ ಎಂದು ರಾಜ್ಯ ನಿಯಂತ್ರಕರಿಗೆ ತಿಳಿಸಿ. ವಿನಾಯಿತಿ ಮತ್ತು ಮುದ್ರಾಂಕನ ಪರಿಶೀಲಿಸಿ.') : reviewChanges,
    authority: l('State Legal Metrology controller / Department of Consumer Affairs', 'राज्य विधिक माप विज्ञान नियंत्रक / उपभोक्ता मामले विभाग', 'ರಾಜ್ಯ ಕಾನೂನು ಮಾಪನ ನಿಯಂತ್ರಕರು / ಗ್ರಾಹಕ ವ್ಯವಹಾರ ಇಲಾಖೆ'), documents: [docs.identity, docs.address, docs.activity], sourceIds: ['legal-metrology', 'packaged-rules'],
  });
  const pollution = activity === 'manufacturing' || activity === 'health' || hazardous || premises === 'industrial';
  results.push({
    id: 'pollution', title: l('Pollution consent / waste authorisation', 'प्रदूषण सहमति / अपशिष्ट अनुमति', 'ಮಾಲಿನ್ಯ ಸಮ್ಮತಿ / ತ್ಯಾಜ್ಯ ಅನುಮತಿ'), status: pollution ? 'check' : 'not-triggered',
    reason: pollution
      ? l('Your activity may need pollution consent or waste authorisation. Category, process and state rules decide; some low-pollution units have different procedures.', 'आपकी गतिविधि को प्रदूषण सहमति या अपशिष्ट अनुमति चाहिए हो सकती है। श्रेणी, प्रक्रिया और राज्य नियम तय करेंगे; कम प्रदूषण इकाइयों की प्रक्रिया अलग हो सकती है।', 'ನಿಮ್ಮ ಚಟುವಟಿಕೆಗೆ ಮಾಲಿನ್ಯ ಸಮ್ಮತಿ ಅಥವಾ ತ್ಯಾಜ್ಯ ಅನುಮತಿ ಬೇಕಾಗಬಹುದು. ವರ್ಗ, ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ರಾಜ್ಯ ನಿಯಮಗಳು ನಿರ್ಧರಿಸುತ್ತವೆ; ಕಡಿಮೆ ಮಾಲಿನ್ಯ ಘಟಕಗಳ ವಿಧಾನ ಬೇರಿರಬಹುದು.')
      : l('No industrial or hazardous-process signal was selected. Emissions, effluent, food processing and special waste can still need a review.', 'औद्योगिक या खतरनाक प्रक्रिया नहीं चुनी गई। उत्सर्जन, दूषित जल, खाद्य प्रसंस्करण और विशेष कचरे की फिर भी जांच चाहिए हो सकती है।', 'ಕೈಗಾರಿಕಾ ಅಥವಾ ಅಪಾಯಕಾರಿ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ. ಹೊಗೆ, ತ್ಯಾಜ್ಯನೀರು, ಆಹಾರ ಸಂಸ್ಕರಣೆ ಮತ್ತು ವಿಶೇಷ ತ್ಯಾಜ್ಯಕ್ಕೆ ಪರಿಶೀಲನೆ ಬೇಕಾಗಬಹುದು.'),
    nextStep: l('Confirm your exact process, waste and industry category with your SPCB / PCC before establishment or operation. Do not assume a White-category exemption.', 'स्थापना या संचालन से पहले SPCB / PCC से प्रक्रिया, कचरा और उद्योग श्रेणी जांचें। व्हाइट श्रेणी की छूट स्वतः न मानें।', 'ಸ್ಥಾಪನೆ ಅಥವಾ ಕಾರ್ಯಾಚರಣೆಗೆ ಮೊದಲು SPCB / PCC ಯಲ್ಲಿ ಪ್ರಕ್ರಿಯೆ, ತ್ಯಾಜ್ಯ ಮತ್ತು ಉದ್ಯಮ ವರ್ಗ ದೃಢಪಡಿಸಿ. ವೈಟ್ ವರ್ಗದ ವಿನಾಯಿತಿ ಇದೆ ಎಂದು ಊಹಿಸಬೇಡಿ.'),
    authority: l('State Pollution Control Board / Pollution Control Committee', 'राज्य प्रदूषण नियंत्रण बोर्ड / प्रदूषण नियंत्रण समिति', 'ರಾಜ್ಯ ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಮಂಡಳಿ / ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಸಮಿತಿ'), documents: [docs.activity, docs.premises], sourceIds: ['pollution', 'pollution-2026', 'pollution-exemptions'],
  });
  results.push({
    id: 'fire-premises', title: l('Fire, building use & premises permission', 'अग्नि, भवन उपयोग और परिसर अनुमति', 'ಅಗ್ನಿ, ಕಟ್ಟಡ ಬಳಕೆ ಮತ್ತು ಸ್ಥಳ ಅನುಮತಿ'), status: 'check',
    reason: l('Fire approval and permitted building use depend on local rules, occupancy, height, storage and activity. Home-based work is not automatically exempt.', 'अग्नि स्वीकृति और भवन उपयोग स्थानीय नियम, उपयोग, ऊंचाई, भंडारण और गतिविधि पर निर्भर हैं। घर से काम स्वतः छूट नहीं देता।', 'ಅಗ್ನಿ ಅನುಮತಿ ಮತ್ತು ಕಟ್ಟಡ ಬಳಕೆ ಸ್ಥಳೀಯ ನಿಯಮ, ಉಪಯೋಗ, ಎತ್ತರ, ಸಂಗ್ರಹ ಮತ್ತು ಚಟುವಟಿಕೆಯ ಮೇಲೆ ಅವಲಂಬಿತ. ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡಿದರೆ ಸ್ವಯಂ ವಿನಾಯಿತಿ ಇಲ್ಲ.'),
    nextStep: l('Verify building use and any fire NOC with the local planning / fire authority before signing a lease or starting work.', 'किराया समझौता या काम शुरू करने से पहले स्थानीय योजना / अग्निशमन प्राधिकरण से भवन उपयोग और जरूरी अग्नि NOC जांचें।', 'ಬಾಡಿಗೆ ಒಪ್ಪಂದ ಅಥವಾ ಕೆಲಸ ಆರಂಭಿಸುವ ಮೊದಲು ಸ್ಥಳೀಯ ಯೋಜನೆ / ಅಗ್ನಿಶಾಮಕ ಪ್ರಾಧಿಕಾರದಲ್ಲಿ ಕಟ್ಟಡ ಬಳಕೆ ಮತ್ತು ಅಗತ್ಯ ಅಗ್ನಿ NOC ಪರಿಶೀಲಿಸಿ.'),
    authority: localAuthority, documents: [docs.address, docs.premises, docs.activity], sourceIds: ['nsws'],
  });
  results.push({
    id: 'entity-registration', title: l('Business structure / incorporation', 'व्यवसाय की संरचना / गठन', 'ವ್ಯವಹಾರದ ಸ್ವರೂಪ / ಸ್ಥಾಪನೆ'), status: entity === 'company' || entity === 'llp' ? 'required' : 'check',
    reason: entity === 'company' || entity === 'llp'
      ? l('A company or LLP must be incorporated through MCA. If already incorporated, verify the existing certificate rather than applying again.', 'कंपनी या LLP का MCA से गठन जरूरी है। पहले से गठित हो तो दोबारा आवेदन के बजाय मौजूदा प्रमाणपत्र जांचें।', 'ಕಂಪನಿ ಅಥವಾ LLP ಅನ್ನು MCA ಮೂಲಕ ಸ್ಥಾಪಿಸಬೇಕು. ಈಗಾಗಲೇ ಸ್ಥಾಪನೆಯಾಗಿದ್ದರೆ ಮರುಅರ್ಜಿಯ ಬದಲು ಇರುವ ಪ್ರಮಾಣಪತ್ರ ಪರಿಶೀಲಿಸಿ.')
      : l('Your chosen structure determines ownership, liability and registration steps. A sole proprietorship has no separate MCA incorporation.', 'चुनी हुई संरचना से स्वामित्व, देयता और पंजीकरण के चरण तय होते हैं। एकल स्वामित्व का अलग MCA गठन नहीं होता।', 'ಆಯ್ದ ಸ್ವರೂಪವು ಮಾಲೀಕತ್ವ, ಹೊಣೆ ಮತ್ತು ನೋಂದಣಿ ಹಂತಗಳನ್ನು ನಿರ್ಧರಿಸುತ್ತದೆ. ಏಕಮಾಲೀಕತ್ವಕ್ಕೆ ಪ್ರತ್ಯೇಕ MCA ಸ್ಥಾಪನೆ ಇಲ್ಲ.'),
    nextStep: entity === 'partnership'
      ? l('Prepare the partnership deed and check state Registrar of Firms registration and stamp rules; non-registration can limit legal remedies.', 'साझेदारी दस्तावेज तैयार करें और राज्य फर्म रजिस्ट्रार व स्टाम्प नियम जांचें; पंजीकरण न होने से कानूनी उपाय सीमित हो सकते हैं।', 'ಪಾಲುದಾರಿಕೆ ಪತ್ರ ಸಿದ್ಧಪಡಿಸಿ ಮತ್ತು ರಾಜ್ಯ ಫರ್ಮ್ ರಿಜಿಸ್ಟ್ರಾರ್ ನೋಂದಣಿ ಹಾಗೂ ಮುದ್ರಾಂಕ ನಿಯಮ ಪರಿಶೀಲಿಸಿ; ನೋಂದಣಿ ಇಲ್ಲದಿದ್ದರೆ ಕಾನೂನು ಪರಿಹಾರಗಳು ಸೀಮಿತವಾಗಬಹುದು.')
      : l('Confirm the structure and existing registrations. Use MCA for a company / LLP; other permissions remain separate.', 'संरचना और मौजूदा पंजीकरण की पुष्टि करें। कंपनी / LLP के लिए MCA उपयोग करें; बाकी अनुमतियां अलग हैं।', 'ಸ್ವರೂಪ ಮತ್ತು ಈಗಿರುವ ನೋಂದಣಿಗಳನ್ನು ದೃಢಪಡಿಸಿ. ಕಂಪನಿ / LLP ಗಾಗಿ MCA ಬಳಸಿ; ಇತರ ಅನುಮತಿಗಳು ಪ್ರತ್ಯೇಕ.'),
    authority: l('MCA / state Registrar of Firms, as applicable', 'जहां लागू हो MCA / राज्य फर्म रजिस्ट्रार', 'ಅನ್ವಯಿಸುವಂತೆ MCA / ರಾಜ್ಯ ಫರ್ಮ್ ರಿಜಿಸ್ಟ್ರಾರ್'), documents: [docs.identity, docs.address, docs.constitution], sourceIds: ['mca-company', 'mca-llp', 'partnership', 'nsws'],
    ...(entity === 'company' ? { servicePath: '/services/private-limited-company-registration' } : entity === 'llp' ? { servicePath: '/services/llp-registration' } : {}),
  });
  const sector = ['professional', 'health', 'education', 'manufacturing', 'other'].includes(activity) || special.has('regulated') || hazardous;
  results.push({
    id: 'sector-approvals', title: l('Activity-specific approvals', 'गतिविधि के विशेष अनुमोदन', 'ಚಟುವಟಿಕೆಗೆ ವಿಶೇಷ ಅನುಮತಿಗಳು'), status: sector ? 'check' : 'not-triggered',
    reason: sector
      ? l('Your broad activity can include regulated work. Professional practice, health, education, factories and restricted products need detailed screening.', 'आपकी व्यापक गतिविधि में विनियमित काम हो सकता है। पेशेवर कार्य, स्वास्थ्य, शिक्षा, फैक्टरी और प्रतिबंधित उत्पादों की विस्तृत जांच चाहिए।', 'ನಿಮ್ಮ ವ್ಯಾಪಕ ಚಟುವಟಿಕೆಯಲ್ಲಿ ನಿಯಂತ್ರಿತ ಕೆಲಸ ಇರಬಹುದು. ವೃತ್ತಿಪರ ಸೇವೆ, ಆರೋಗ್ಯ, ಶಿಕ್ಷಣ, ಕಾರ್ಖಾನೆ ಮತ್ತು ನಿರ್ಬಂಧಿತ ಉತ್ಪನ್ನಗಳಿಗೆ ವಿವರವಾದ ಪರಿಶೀಲನೆ ಬೇಕು.')
      : noSignal,
    nextStep: sector ? l('Use NSWS Know Your Approvals and the relevant sector regulator with your exact activity. This checker does not decide professional practice eligibility.', 'सटीक गतिविधि के साथ NSWS Know Your Approvals और संबंधित नियामक से जांचें। यह चेकर पेशेवर अभ्यास की पात्रता तय नहीं करता।', 'ನಿಖರ ಚಟುವಟಿಕೆಯೊಂದಿಗೆ NSWS Know Your Approvals ಮತ್ತು ಸಂಬಂಧಿತ ನಿಯಂತ್ರಕರಲ್ಲಿ ಪರಿಶೀಲಿಸಿ. ಈ ಸಾಧನ ವೃತ್ತಿಪರ ಅಭ್ಯಾಸದ ಅರ್ಹತೆ ನಿರ್ಧರಿಸುವುದಿಲ್ಲ.') : reviewChanges,
    authority: l('Relevant sector regulator / state department', 'संबंधित क्षेत्र का नियामक / राज्य विभाग', 'ಸಂಬಂಧಿತ ಕ್ಷೇತ್ರದ ನಿಯಂತ್ರಕರು / ರಾಜ್ಯ ಇಲಾಖೆ'), documents: [docs.activity, docs.constitution, docs.premises], sourceIds: ['nsws'],
  });
  results.push({
    id: 'local-approvals', title: l('Complete your state & city review', 'अपने राज्य और शहर की पूरी जांच करें', 'ನಿಮ್ಮ ರಾಜ್ಯ ಮತ್ತು ನಗರದ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ'), status: 'check',
    reason: l('All 36 states / UTs can be selected, but this is not a complete database of their laws. City-specific bylaws and every sector approval are not automated.', 'सभी 36 राज्य / केंद्रशासित प्रदेश चुने जा सकते हैं, लेकिन यह उनके सभी कानूनों का डेटाबेस नहीं है। शहर के उपनियम और हर क्षेत्र की अनुमति स्वचालित नहीं हैं।', 'ಎಲ್ಲಾ 36 ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಬಹುದು; ಆದರೆ ಇದು ಅವುಗಳ ಎಲ್ಲಾ ಕಾನೂನುಗಳ ಡೇಟಾಬೇಸ್ ಅಲ್ಲ. ನಗರದ ನಿಯಮಗಳು ಮತ್ತು ಪ್ರತಿಯೊಂದು ಕ್ಷೇತ್ರದ ಅನುಮತಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿಲ್ಲ.'),
    nextStep: l('Cross-check the checklist with NSWS and the state / city authority. Existing licences, multiple premises, contractors and changed activities need individual review.', 'NSWS और राज्य / शहर के प्राधिकरण से सूची मिलाएं। मौजूदा लाइसेंस, कई परिसर, ठेकेदार और बदली गतिविधियों की अलग जांच चाहिए।', 'NSWS ಮತ್ತು ರಾಜ್ಯ / ನಗರದ ಪ್ರಾಧಿಕಾರದೊಂದಿಗೆ ಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಇರುವ ಪರವಾನಗಿಗಳು, ಬಹುಸ್ಥಳಗಳು, ಗುತ್ತಿಗೆದಾರರು ಮತ್ತು ಬದಲಾದ ಚಟುವಟಿಕೆಗಳಿಗೆ ಪ್ರತ್ಯೇಕ ಪರಿಶೀಲನೆ ಬೇಕು.'),
    authority: localAuthority, documents: [docs.activity, docs.address], sourceIds: ['nsws'],
  });
  return results;
}
