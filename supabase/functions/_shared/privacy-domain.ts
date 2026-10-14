export const PRIVACY_NOTICE_VERSION = 'registerbox-privacy-2026-10-14-v1';
export const PRIVACY_PURPOSES = ['ai_assistance', 'ai_bill_extraction'] as const;
export type PrivacyPurpose = typeof PRIVACY_PURPOSES[number];
export const PRIVACY_RIGHTS = ['access', 'correction', 'grievance', 'nomination', 'withdrawal', 'guardian_review'] as const;
export type PrivacyRight = typeof PRIVACY_RIGHTS[number];
export const privacyPurposeNotices = {
  ai_assistance: {
    en: 'Optional AI assistance: send your question or business goal, after identifier redaction, and limited workflow context to Groq to generate a draft explanation or classify your goal. Redaction is not guaranteed to remove every identifier. Do not include passwords, OTPs or government ID numbers. RegisterBox stores your saved goal, generated drafts and operation history. You can use deterministic/manual services without this optional permission. Withdraw in Privacy Centre to block new AI requests; previously sent data and retained records require a separate erasure review.',
    hi: 'वैकल्पिक AI सहायता: पहचान संख्या हटाने के प्रयास के बाद आपका प्रश्न या व्यवसाय का लक्ष्य और सीमित कार्यप्रवाह जानकारी Groq को मसौदा उत्तर या वर्गीकरण के लिए भेजी जाती है। सभी पहचान विवरण हटने की गारंटी नहीं है। पासवर्ड, OTP या सरकारी पहचान संख्या न लिखें। RegisterBox सहेजा गया लक्ष्य, मसौदे और कार्यवाही का रिकॉर्ड रखता है। इस अनुमति के बिना मैनुअल सेवाएँ उपलब्ध हैं। गोपनीयता केन्द्र में अनुमति वापस लेने पर नए AI अनुरोध रुकते हैं; पहले भेजे गए डेटा को मिटाने के लिए अलग समीक्षा आवश्यक है।',
  },
  ai_bill_extraction: {
    en: 'Optional bill-image AI: send the complete bill image to Groq to extract a purchase-book draft. The image can contain names, addresses, GSTINs, invoice numbers and financial amounts; these are not redacted from the image. Upload only bills you are authorised to share. RegisterBox stores the original image, extracted draft and your approved book entry. Manual purchase entry remains available. Withdraw in Privacy Centre to block new AI extraction; this does not erase an existing image, book entry or provider copy.',
    hi: 'वैकल्पिक बिल-चित्र AI: खरीद-बही का मसौदा बनाने के लिए पूरा बिल चित्र Groq को भेजा जाता है। चित्र में नाम, पता, GSTIN, बिल संख्या और वित्तीय राशि हो सकती है; चित्र से इन्हें हटाया नहीं जाता। केवल अधिकृत बिल साझा करें। RegisterBox मूल चित्र, निकाले गए मसौदे और स्वीकृत बही प्रविष्टि रखता है। मैनुअल खरीद प्रविष्टि उपलब्ध रहती है। गोपनीयता केन्द्र में अनुमति वापस लेने पर नया AI निष्कर्षण रुकता है; पुराने चित्र, बही प्रविष्टि या प्रदाता की प्रति स्वतः नहीं मिटती।',
  },
} as const;
export function privacyConsentDecision(row: { allowed?: boolean; notice_version?: string } | null | undefined) {
  return row?.allowed === true && row.notice_version === PRIVACY_NOTICE_VERSION;
}
export function validatePrivacyDetails(value: unknown, required: boolean) {
  if (typeof value !== 'string' || value.length > 1500 || (required && !value.trim())) throw Error('Describe the request in up to 1,500 characters.');
  if (/\b\d{12}\b|\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/i.test(value)) throw Error('Do not include full Aadhaar, PAN or GSTIN numbers in a general privacy request. Use record references or masked identifiers.');
  return value.trim();
}
