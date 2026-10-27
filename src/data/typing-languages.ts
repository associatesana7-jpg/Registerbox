export type TypingLanguage = {
  id: string;
  name: string;
  nativeName: string;
  /** Sanscript's script identifier. Languages sharing a script remain distinct choices. */
  script: string;
  scriptLabel: string;
  lang: string;
  direction: 'ltr' | 'rtl';
  exampleRoman: string;
  exampleText: string;
  note?: string;
  experimental?: boolean;
};

const devanagariNote = 'Uses Devanagari script. Sound-based typing does not translate meanings or check grammar.';

/** The 22 scheduled Indian languages plus six widely used regional languages. */
export const TYPING_LANGUAGES: readonly TypingLanguage[] = [
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'kannada', scriptLabel: 'Kannada', lang: 'kn', direction: 'ltr', exampleRoman: 'namaskaara', exampleText: 'ನಮಸ್ಕಾರ' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'hi', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते' },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'tamil', scriptLabel: 'Tamil', lang: 'ta', direction: 'ltr', exampleRoman: 'vaNakkam', exampleText: 'வணக்கம்', note: 'Tamil merges some Sanskrit sounds. Use the keyboard to choose the exact letter.' },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'telugu', scriptLabel: 'Telugu', lang: 'te', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'నమస్తే' },
  { id: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'malayalam', scriptLabel: 'Malayalam', lang: 'ml', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'നമസ്തേ', note: 'Use the keyboard for chillu letters and check the spelling before sharing.' },
  { id: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'mr', direction: 'ltr', exampleRoman: 'namaskaar', exampleText: 'नमस्कार' },
  { id: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'bengali', scriptLabel: 'Bengali', lang: 'bn', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'নমস্তে', note: 'Bengali shares some letter mappings, including ba/va. Check the final word.' },
  { id: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'gujarati', scriptLabel: 'Gujarati', lang: 'gu', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'નમસ્તે' },
  { id: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'gurmukhi', scriptLabel: 'Gurmukhi', lang: 'pa-Guru', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'ਨਮਸ੍ਤੇ', note: 'Gurmukhi script. Shahmukhi is not included.' },
  { id: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'oriya', scriptLabel: 'Odia', lang: 'or', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'ନମସ୍ତେ' },
  { id: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'assamese', scriptLabel: 'Assamese', lang: 'as', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'নমস্তে' },
  { id: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'urdu', scriptLabel: 'Urdu', lang: 'ur', direction: 'rtl', exampleRoman: 'salaam', exampleText: 'سلام', experimental: true, note: 'Experimental phonetic Urdu without short-vowel marks. This is a sound-to-letter aid, not an Urdu dictionary; review spelling carefully.' },
  { id: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'sa', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते' },
  { id: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'ne', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते' },
  { id: 'gom', name: 'Konkani', nativeName: 'कोंकणी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'gom-Deva', direction: 'ltr', exampleRoman: 'namaskaar', exampleText: 'नमस्कार', note: 'Devanagari script. Other Konkani scripts are not included in this choice.' },
  { id: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'mai-Deva', direction: 'ltr', exampleRoman: 'namaskaar', exampleText: 'नमस्कार', note: 'Devanagari script. Tirhuta is not included.' },
  { id: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'brx', direction: 'ltr', exampleRoman: 'namaskaar', exampleText: 'नमस्कार', note: devanagariNote },
  { id: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'doi', direction: 'ltr', exampleRoman: 'namaskaar', exampleText: 'नमस्कार', note: 'Devanagari script. Historical Dogra script is not included.' },
  { id: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', script: 'urdu', scriptLabel: 'Perso-Arabic', lang: 'ks-Arab', direction: 'rtl', exampleRoman: 'salaam', exampleText: 'سلام', note: 'Uses Perso-Arabic script with a Kashmiri prediction model. Devanagari is not included in this choice.' },
  { id: 'sd', name: 'Sindhi', nativeName: 'سنڌي', script: 'urdu', scriptLabel: 'Arabic', lang: 'sd-Arab', direction: 'rtl', exampleRoman: 'salaam', exampleText: 'سلام', note: 'Uses Arabic script with a Sindhi prediction model. Devanagari is not included in this choice.' },
  { id: 'mni', name: 'Manipuri', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', script: 'manipuri', scriptLabel: 'Meitei Mayek', lang: 'mni-Mtei', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'ꯅꯃꯁ꯭ꯇꯦ', experimental: true, note: 'Uses Meitei Mayek script with a Manipuri prediction model. Check word-final forms and choose another candidate when needed.' },
  { id: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'ol_chiki', scriptLabel: 'Ol Chiki', lang: 'sat-Olck', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'ᱱᱚᱢᱚᱥᱛᱮ', experimental: true, note: 'Experimental Ol Chiki sound mapping, not a Santali spelling dictionary. Review language-specific sounds before sharing.' },
  { id: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'bho', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते', note: devanagariNote },
  { id: 'hne', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'hne', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते', note: devanagariNote },
  { id: 'bgc', name: 'Haryanvi', nativeName: 'हरियाणवी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'bgc', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते', note: devanagariNote },
  { id: 'mag', name: 'Magahi', nativeName: 'मगही', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'mag', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते', note: devanagariNote },
  { id: 'raj', name: 'Rajasthani', nativeName: 'राजस्थानी', script: 'devanagari', scriptLabel: 'Devanagari', lang: 'raj', direction: 'ltr', exampleRoman: 'namaste', exampleText: 'नमस्ते', note: devanagariNote },
  { id: 'tcy', name: 'Tulu', nativeName: 'ತುಳು', script: 'kannada', scriptLabel: 'Kannada', lang: 'tcy-Knda', direction: 'ltr', exampleRoman: 'namaskaara', exampleText: 'ನಮಸ್ಕಾರ', note: 'Kannada script. Tulu-Tigalari is not included.' },
] as const;

export function getTypingLanguage(id: string): TypingLanguage {
  return TYPING_LANGUAGES.find(language => language.id === id) ?? TYPING_LANGUAGES[0];
}
