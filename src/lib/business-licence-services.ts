import type { Answers, LicenceResult, Localized } from './business-licence-checker';

const l = (en: string, hi: string, kn: string): Localized => ({ en, hi, kn });
export type ChecklistService = { id: string; path: string; title: Localized; action: Localized; detail: Localized; kind: 'service' | 'review' };

// Commercial destinations are kept separate from legal applicability rules.
// These links describe the public catalogue's scope, never an approval guarantee.
export const CHECKLIST_SERVICES = {
  gst: { id: 'gst', path: '/services/gst-registration', kind: 'service', title: l('GST registration', 'GST पंजीकरण', 'GST ನೋಂದಣಿ'), action: l('Get GST registration help', 'GST पंजीकरण में मदद लें', 'GST ನೋಂದಣಿಗೆ ಸಹಾಯ ಪಡೆಯಿರಿ'), detail: l('See eligibility review, document preparation and application assistance.', 'पात्रता की जाँच, दस्तावेज़ की तैयारी और आवेदन सहायता देखें।', 'ಅರ್ಹತೆಯ ಪರಿಶೀಲನೆ, ದಾಖಲೆ ಸಿದ್ಧತೆ ಮತ್ತು ಅರ್ಜಿ ಸಹಾಯದ ವಿವರ ನೋಡಿ.') },
  fssai: { id: 'fssai', path: '/services/fssai-food-business', kind: 'service', title: l('FSSAI registration & licence', 'FSSAI पंजीकरण और लाइसेंस', 'FSSAI ನೋಂದಣಿ ಮತ್ತು ಪರವಾನಗಿ'), action: l('Get FSSAI help', 'FSSAI में मदद लें', 'FSSAI ಸಹಾಯ ಪಡೆಯಿರಿ'), detail: l('Explore food-business registration and licence assistance for your activity.', 'अपने खाद्य व्यवसाय के लिए पंजीकरण और लाइसेंस सहायता देखें।', 'ನಿಮ್ಮ ಆಹಾರ ಉದ್ಯಮಕ್ಕೆ ನೋಂದಣಿ ಮತ್ತು ಪರವಾನಗಿ ಸಹಾಯವನ್ನು ನೋಡಿ.') },
  udyam: { id: 'udyam', path: '/services/udyam-registration', kind: 'service', title: l('Udyam / MSME assistance', 'उद्यम / MSME सहायता', 'ಉದ್ಯಮ / MSME ಸಹಾಯ'), action: l('View Udyam assistance', 'उद्यम सहायता देखें', 'ಉದ್ಯಮ ಸಹಾಯವನ್ನು ನೋಡಿ'), detail: l('Optional paid assistance. Registration on the official government portal is free.', 'पेशेवर सहायता वैकल्पिक और सशुल्क है। आधिकारिक सरकारी पोर्टल पर पंजीकरण मुफ़्त है।', 'ವೃತ್ತಿಪರ ಸಹಾಯ ಐಚ್ಛಿಕ ಮತ್ತು ಶುಲ್ಕಸಹಿತ. ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೋಂದಣಿ ಉಚಿತ.') },
  shops: { id: 'shops', path: '/services/shop-establishment-registration', kind: 'service', title: l('Shop & establishment registration', 'दुकान एवं प्रतिष्ठान पंजीकरण', 'ಅಂಗಡಿ ಮತ್ತು ವಾಣಿಜ್ಯ ಸಂಸ್ಥೆ ನೋಂದಣಿ'), action: l('Get establishment registration help', 'प्रतिष्ठान पंजीकरण में मदद लें', 'ಸಂಸ್ಥೆಯ ನೋಂದಣಿಗೆ ಸಹಾಯ ಪಡೆಯಿರಿ'), detail: l('See state-specific establishment registration support and document guidance.', 'राज्य के अनुसार प्रतिष्ठान पंजीकरण सहायता और दस्तावेज़ की जानकारी देखें।', 'ರಾಜ್ಯಕ್ಕೆ ಅನುಗುಣವಾದ ಸಂಸ್ಥೆ ನೋಂದಣಿ ಸಹಾಯ ಮತ್ತು ದಾಖಲೆಗಳ ಮಾಹಿತಿ ನೋಡಿ.') },
  company: { id: 'company', path: '/services/private-limited-company-registration', kind: 'service', title: l('Private limited company setup', 'प्राइवेट लिमिटेड कंपनी गठन', 'ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ಕಂಪನಿ ಸ್ಥಾಪನೆ'), action: l('Explore private limited company setup', 'प्राइवेट लिमिटेड कंपनी गठन देखें', 'ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ಕಂಪನಿ ಸ್ಥಾಪನೆ ನೋಡಿ'), detail: l('Explore the private limited route, its scope and a quotation for your setup.', 'प्राइवेट लिमिटेड गठन की प्रक्रिया, सहायता का दायरा और कोटेशन देखें।', 'ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ಸ್ಥಾಪನೆಯ ವಿಧಾನ, ಸಹಾಯದ ವ್ಯಾಪ್ತಿ ಮತ್ತು ದರದ ವಿವರ ನೋಡಿ.') },
  llp: { id: 'llp', path: '/services/llp-registration', kind: 'service', title: l('LLP registration', 'LLP पंजीकरण', 'LLP ನೋಂದಣಿ'), action: l('Explore LLP registration', 'LLP पंजीकरण देखें', 'LLP ನೋಂದಣಿಯನ್ನು ನೋಡಿ'), detail: l('Review partner details, documents and support for setting up an LLP.', 'LLP गठन के लिए साझेदारों की जानकारी, दस्तावेज़ और सहायता देखें।', 'LLP ಸ್ಥಾಪನೆಗೆ ಪಾಲುದಾರರ ವಿವರ, ದಾಖಲೆಗಳು ಮತ್ತು ಸಹಾಯವನ್ನು ನೋಡಿ.') },
  setup: { id: 'setup', path: '/services/start-a-business', kind: 'review', title: l('Business setup guidance', 'व्यवसाय शुरू करने का मार्गदर्शन', 'ಉದ್ಯಮ ಆರಂಭಿಸುವ ಮಾರ್ಗದರ್ಶನ'), action: l('Plan my business setup', 'व्यवसाय शुरू करने की योजना बनाएँ', 'ನನ್ನ ಉದ್ಯಮ ಸ್ಥಾಪನೆಯನ್ನು ಯೋಜಿಸಿ'), detail: l('Discuss the structure and steps that fit your business before applying.', 'आवेदन से पहले अपने व्यवसाय के लिए सही ढाँचे और कदमों पर बात करें।', 'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಉದ್ಯಮಕ್ಕೆ ಹೊಂದುವ ಸ್ವರೂಪ ಮತ್ತು ಹಂತಗಳ ಬಗ್ಗೆ ಚರ್ಚಿಸಿ.') },
  review: { id: 'review', path: '/services/business-compliance-check', kind: 'review', title: l('Business compliance review', 'व्यवसाय अनुपालन की समीक्षा', 'ಉದ್ಯಮ ನಿಯಮಪಾಲನೆಯ ಪರಿಶೀಲನೆ'), action: l('Request a compliance review', 'अनुपालन समीक्षा के लिए आगे बढ़ें', 'ನಿಯಮಪಾಲನೆ ಪರಿಶೀಲನೆಗೆ ಮುಂದುವರಿಸಿ'), detail: l('Review local or specialist approvals with our team. Confirm the scope of any application support.', 'स्थानीय या विशेष अनुमतियों की टीम से समीक्षा कराएँ। आवेदन सहायता का दायरा पहले तय करें।', 'ಸ್ಥಳೀಯ ಅಥವಾ ವಿಶೇಷ ಅನುಮತಿಗಳನ್ನು ನಮ್ಮ ತಂಡದೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ. ಅರ್ಜಿ ಸಹಾಯದ ವ್ಯಾಪ್ತಿಯನ್ನು ಮೊದಲು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.') },
} satisfies Record<string, ChecklistService>;

export function serviceForLicence(result: LicenceResult, answers: Answers): ChecklistService | undefined {
  if (result.status === 'not-triggered') return undefined;
  switch (result.id) {
    case 'gst': return CHECKLIST_SERVICES.gst;
    case 'fssai': return CHECKLIST_SERVICES.fssai;
    case 'udyam': return CHECKLIST_SERVICES.udyam;
    case 'shops-establishment': return CHECKLIST_SERVICES.shops;
    case 'entity-registration': return answers.entity === 'company' ? CHECKLIST_SERVICES.company : answers.entity === 'llp' ? CHECKLIST_SERVICES.llp : CHECKLIST_SERVICES.setup;
    default: return CHECKLIST_SERVICES.review;
  }
}

export function matchingChecklistServices(results: LicenceResult[], answers: Answers): ChecklistService[] {
  const matched = results.map(result => serviceForLicence(result, answers)).filter((service): service is ChecklistService => !!service && service.kind === 'service');
  return [...new Map(matched.map(service => [service.path, service])).values()];
}

export const SERVICE_COPY = {
  ourServices: l('Our services', 'हमारी सेवाएँ', 'ನಮ್ಮ ಸೇವೆಗಳು'),
  knowAlready: l('Already know what you need?', 'पहले से पता है कि क्या चाहिए?', 'ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ಈಗಾಗಲೇ ತಿಳಿದಿದೆಯೇ?'),
  browseIntro: l('Explore RegisterBox registration and compliance services.', 'RegisterBox की पंजीकरण और अनुपालन सेवाएँ देखें।', 'RegisterBox ನೋಂದಣಿ ಮತ್ತು ನಿಯಮಪಾಲನೆ ಸೇವೆಗಳನ್ನು ನೋಡಿ.'),
  browse: l('View all services', 'सभी सेवाएँ देखें', 'ಎಲ್ಲ ಸೇವೆಗಳನ್ನು ನೋಡಿ'),
  heading: l('Turn your checklist into the next step.', 'अपनी चेकलिस्ट से अगला कदम उठाएँ।', 'ನಿಮ್ಮ ಪಟ್ಟಿಯಿಂದ ಮುಂದಿನ ಹಂತಕ್ಕೆ ಸಾಗಿರಿ.'),
  intro: l('RegisterBox services that match the registrations in your checklist.', 'आपकी सूची के पंजीकरणों से जुड़ी RegisterBox सेवाएँ।', 'ನಿಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿರುವ ನೋಂದಣಿಗಳಿಗೆ ಹೊಂದುವ RegisterBox ಸೇವೆಗಳು.'),
  optional: l('The checker is free. Professional assistance is optional and charged separately. Review scope and fees on the service page.', 'चेकर मुफ़्त है। पेशेवर सहायता वैकल्पिक है और उसका शुल्क अलग है। सेवा पेज पर दायरा और शुल्क देखें।', 'ಪರಿಶೀಲನಾ ಸಾಧನ ಉಚಿತ. ವೃತ್ತಿಪರ ಸಹಾಯ ಐಚ್ಛಿಕ ಮತ್ತು ಪ್ರತ್ಯೇಕ ಶುಲ್ಕವಿದೆ. ಸೇವೆಯ ಪುಟದಲ್ಲಿ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಶುಲ್ಕ ನೋಡಿ.'),
  newTab: l('Service pages open in a new tab, keeping your checklist here.', 'सेवा पेज नए टैब में खुलेंगे। आपकी चेकलिस्ट यहाँ बनी रहेगी।', 'ಸೇವೆಯ ಪುಟಗಳು ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತವೆ. ನಿಮ್ಮ ಪಟ್ಟಿ ಇಲ್ಲಿಯೇ ಉಳಿಯುತ್ತದೆ.'),
  newTabShort: l('opens in a new tab', 'नए टैब में खुलेगा', 'ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ'),
  helpLabel: l('Optional RegisterBox assistance', 'वैकल्पिक RegisterBox सहायता', 'ಐಚ್ಛಿಕ RegisterBox ಸಹಾಯ'),
  reviewLabel: l('Need help checking this?', 'इसे जाँचने में मदद चाहिए?', 'ಇದನ್ನು ಪರಿಶೀಲಿಸಲು ಸಹಾಯ ಬೇಕೇ?'),
};
