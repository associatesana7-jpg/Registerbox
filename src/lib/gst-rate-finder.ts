import { GST_GOODS_DATA, GST_HEADING_LABELS } from './gst-rate-data';

export const GST_RATE_REVIEWED_ON = '2026-10-28';
export const GST_RATE_EFFECTIVE_FROM = '2026-05-01';
export const GST_RATE_VERSION = '2026-10-28.1';

export const GST_RATE_SOURCES = {
  'goods-taxable-2025': { title: 'Notification 9/2025–Integrated Tax (Rate), corrected 18 September 2025 — full goods schedules', url: 'https://courier.cbic.gov.in/ECCS/advisory/2025/NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf', effectiveFrom: '2025-09-22' },
  'goods-exempt-2025': { title: 'Notification 10/2025–Central Tax (Rate) — exempt goods and annexures', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010437/ENG/Notifications', effectiveFrom: '2025-09-22' },
  'tobacco-2026': { title: 'Notification 19/2025–Central Tax (Rate) — tobacco and biris', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010534/ENG/Notifications', effectiveFrom: '2026-02-01' },
  'beverages-2026': { title: 'Notification 01/2026–Central Tax (Rate), including corrigendum 6 May 2026 — beverage tariff codes', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010645/ENG/Notifications', effectiveFrom: '2026-05-01' },
  'services-base': { title: 'Notification 11/2017–Central Tax (Rate) — services, read with subsequent amendments', url: 'https://taxinformation.cbic.gov.in/view-pdf/1000997/ENG/Notifications', effectiveFrom: '2017-07-01' },
  'services-exempt-base': { title: 'Notification 12/2017–Central Tax (Rate) — service exemptions, read with subsequent amendments', url: 'https://taxinformation.cbic.gov.in/view-pdf/1000996/ENG/Notifications', effectiveFrom: '2017-07-01' },
  'services-2025': { title: 'Notification 15/2025–Central Tax (Rate) — revised service rates and ITC conditions', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010453/ENG/Notifications', effectiveFrom: '2025-09-22' },
  'services-exempt-2025': { title: 'Notification 16/2025–Central Tax (Rate) — individual life/health insurance exemptions', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010454/ENG/Notifications', effectiveFrom: '2025-09-22' },
  'bricks-standard': { title: 'Notification 14/2025–Central Tax (Rate) — specified bricks and roofing tiles', url: 'https://taxinformation.cbic.gov.in/view-pdf/1010441/ENG/Notifications', effectiveFrom: '2025-09-22' },
  'bricks-concessional': { title: 'Notification 02/2022–Central Tax (Rate) — concessional bricks subject to no ITC', url: 'https://taxinformation.cbic.gov.in/view-pdf/1009260/ENG/Notifications', effectiveFrom: '2022-04-01' },
  'tariff-search-labels': { title: 'DGFT Appendix4RE — tariff heading descriptions used only as search labels (not RoDTEP or GST rates)', url: 'https://content.dgft.gov.in/Website/Appendix%204RE%20RoDTEP.pdf', effectiveFrom: '' },
  'cbic-catalogue': { title: 'CBIC Tax Information Portal — latest binding notifications', url: 'https://taxinformation.cbic.gov.in/', effectiveFrom: '' },
} as const;

export const TOOL_SOURCES: readonly { title: string; url: string }[] = Object.values(GST_RATE_SOURCES);
export type RateSourceId = keyof typeof GST_RATE_SOURCES;
export type GstRateKind = 'goods' | 'services';
export type GstRateEntry = {
  id: string;
  kind: GstRateKind;
  codeText: string;
  description: string;
  rate: number;
  schedule: string;
  serial: string;
  sourceId: RateSourceId;
  pdfPage?: number;
  effectiveFrom: string;
  notes: readonly string[];
};

// These are statutory heading-level entries, not invented six-digit SAC assignments.
// Service coverage is intentionally enumerated; other services require the full notifications.
const service = (id: string, codeText: string, description: string, rate: number, serial: string, sourceId: RateSourceId, notes: readonly string[] = []): GstRateEntry => ({
  id, kind: 'services', codeText, description, rate, schedule: rate === 0 ? 'Exempt service' : 'Service rate', serial, sourceId,
  effectiveFrom: sourceId === 'services-base' || sourceId === 'services-exempt-base' ? '' : GST_RATE_SOURCES[sourceId].effectiveFrom, notes,
});

export const GST_SERVICE_ENTRIES: readonly GstRateEntry[] = [
  service('s-legal-accounting', '9982', 'Legal and accounting services, including accounting, auditing, bookkeeping and tax consultancy. Check the separate legal-services exemption and reverse-charge rules.', 18, '20', 'services-base', ['Advocate/arbitral services have recipient-specific exemptions and may be payable by the recipient under reverse charge. Accounting services do not automatically share those exemptions.']),
  service('s-legal-exempt', '9982, 9991', 'Specified legal services by an individual advocate, firm of advocates, senior advocate or arbitral tribunal to eligible recipients under entry 45. Includes non-business recipients and qualifying small business entities; exact supplier and recipient conditions must be satisfied.', 0, '45', 'services-exempt-base', ['Read entry 45 in full. This is not a blanket exemption for all legal or accounting fees.']),
  service('s-rd', '9981', 'Research and development services, unless a separate exemption applies.', 18, '19', 'services-base'),
  service('s-print-ads', '9983', 'Selling of space for advertisement in print media.', 5, '21(i)', 'services-base', ['Other advertising, creative and agency services are not covered by this print-space entry.']),
  service('s-professional', '9983', 'Other professional, technical and business services other than selling advertisement space in print media and the renewable-energy service entry 38. Includes information technology software development, consultancy, engineering, architectural and other professional services where this heading applies.', 18, '21(ii)', 'services-2025', ['Select the correct service classification. Export/SEZ zero-rating, exemptions and place-of-supply rules are separate questions.']),
  service('s-ebook', '9984', 'Supply consisting only of an e-book: an electronic version of a printed book of tariff item 4901, supplied online and readable on a computer or handheld device.', 5, '22(i)', 'services-base'),
  service('s-telecom', '9984', 'Telecommunications, broadcasting and information supply services other than the qualifying e-book entry.', 18, '22(ii)', 'services-base'),
  service('s-tour', '9985', 'Tour operator services: a qualifying tour bill includes accommodation and transportation, and is for the gross amount charged for the tour.', 5, '23(i)', 'services-base', ['No ITC except qualifying input service in the same line of business. Separate exemptions may apply to qualifying foreign-tourist services.']),
  service('s-support', '9985', 'Support services other than the qualifying tour-operator and specified e-commerce housekeeping entries.', 18, '23(iii)', 'services-base'),
  service('s-hotel-low', '9963', 'Hotel accommodation having value of supply of a unit of accommodation of ₹7,500 or less per unit per day or equivalent.', 5, '7(i)', 'services-2025', ['Input tax credit on goods and services used to supply this service must not be taken. ₹7,500 is included in the lower band.']),
  service('s-hotel-high', '9963', 'Hotel accommodation having value of supply above ₹7,500 per unit per day or equivalent.', 18, '7(vi)', 'services-base', ['Use the value of supply per unit per day, not a historical declared-tariff test.']),
  service('s-restaurant', '9963', 'Restaurant service other than at specified premises.', 5, '7(ii)', 'services-base', ['No ITC on goods and services used in supplying the service. The specified-premises definition and hotel opt-in declarations can change the outcome.']),
  service('s-restaurant-specified', '9963', 'Restaurant service at specified premises.', 18, '7(vi)', 'services-base', ['Whether premises are specified depends on the effective definition and valid declarations. Do not infer the rate from the restaurant bill alone.']),
  service('s-post', '9968', 'Postal services.', 18, '12(i)', 'services-2025', ['Check any specific exemption separately.']),
  service('s-courier', '9968', 'Courier services.', 18, '12(ii)', 'services-2025'),
  service('s-local-delivery', '9968', 'Local delivery services, including supplies through an electronic commerce operator.', 18, '12(iii)', 'services-2025', ['For specified supplies through an electronic commerce operator by a person not liable to register under section 22(1), the operator may be liable under section 9(5).']),
  service('s-other-delivery', '9968', 'Delivery services other than postal, courier and local delivery services.', 18, '12(iv)', 'services-2025'),
  service('s-rail-container-noitc', '9965', 'Transport of goods in containers by rail by any person other than Indian Railways: the no-ITC option.', 5, '9(iv)', 'services-2025', ['No ITC on goods and services used in supplying the service. The alternative entry is 18%.']),
  service('s-rail-container-itc', '9965', 'Transport of goods in containers by rail by any person other than Indian Railways: the standard option.', 18, '9(iv)', 'services-2025', ['Alternative to the conditional 5% no-ITC option.']),
  service('s-multimodal-ground', '9965', 'Multimodal transportation of goods within India using at least two different modes, where no mode is air, by a qualifying multimodal transporter.', 5, '9(vi)(a)', 'services-2025', ['Restricted ITC: only qualifying input transportation services; credit is capped at 5% total GST when an input transporter charges a higher rate. Read both provisos.']),
  service('s-multimodal-air', '9965', 'Multimodal transportation of goods within India using at least two different modes, where at least one mode is air, by a qualifying multimodal transporter.', 18, '9(vi)(b)', 'services-2025'),
  service('s-rent-goods-carriage-noitc', '9966', 'Renting of goods carriage where fuel is included in the consideration: restricted-ITC option.', 5, '10(ia)', 'services-2025', ['ITC only for qualifying same-line input services, capped at the corresponding 5% rate; read the notification. Alternative rate 18%.']),
  service('s-rent-goods-carriage-itc', '9966', 'Renting of goods carriage where fuel is included in the consideration: standard option.', 18, '10(ia)', 'services-2025'),
  service('s-job-diamond', '9988', 'Job work in relation to diamonds falling under Chapter 71.', 1.5, '26(i)', 'services-2025', ['Job work has its statutory meaning: treatment or process on goods belonging to another registered person.']),
  service('s-job-selected', '9988', 'Job work in relation to food/food products Chapters 1–22; Chapter 23 except dog/cat food under 2309; Chapter 30 medicines; Chapter 41 hides/skins/leather (not Chapter 42 leather goods or Chapter 64 footwear); specified printing; textiles Chapters 50–63; Chapter 68/69 bricks attracting 5% GST; Chapter 71 products other than diamonds; handicrafts; umbrellas.', 5, '26(ii)', 'services-2025', ['Read each subclause. The statutory definition of job work requires goods belonging to another registered person.']),
  service('s-job-alcohol', '9988', 'Job work in relation to manufacture of alcoholic liquor for human consumption.', 18, '26(iii)', 'services-2025'),
  service('s-job-other', '9988', 'Job work other than the diamond, selected-goods and alcoholic-liquor entries 26(i), (ii) and (iii).', 18, '26(iv)', 'services-2025'),
  service('s-treatment-printing', '9988', 'Treatment or process on goods belonging to another person: printing newspapers, books including Braille books, journals and periodicals; or Chapters 48/49 goods attracting 5% GST or nil.', 5, '26(v)', 'services-2025'),
  service('s-tailoring', '9988', 'Tailoring services.', 5, '26(vi)', 'services-2025'),
  service('s-treatment-other', '9988', 'Treatment or process on goods belonging to another person, other than the specified printing and tailoring entries.', 18, '26(vii)', 'services-2025'),
  service('s-beauty', '9997, 99972', 'Beauty and physical well-being services falling under Group 99972, including eligible salon, barber, fitness and wellness services.', 5, '35(i)', 'services-2025', ['Mandatory 5% subject to no ITC on goods/services used in supplying the service. Cannot elect the residual 18% service rate instead. Confirm the actual service falls under Group 99972.']),
  service('s-washing-cleaning', '9997', 'Other services under heading 9997, including washing, cleaning, dyeing and miscellaneous services, excluding beauty and physical well-being services under Group 99972.', 18, '35(ii)', 'services-2025'),
  service('s-life-individual', '9971', 'Life insurance supplied by an insurer to an insured who is not a group, including an individual or an individual and family under the contract.', 0, '36C', 'services-exempt-2025', ['Employer–employee and other qualifying group policies are outside this exemption.']),
  service('s-health-individual', '9971', 'Health insurance supplied by an insurer to an insured who is not a group, including an individual or an individual and family under the contract.', 0, '36D', 'services-exempt-2025', ['Health insurance includes the defined sickness, medical/hospital expense, travel and personal-accident cover. Group policies are outside this exemption.']),
  service('s-reinsurance-individual', '9971', 'Reinsurance of the individual life/health insurance services specified in entries 36C or 36D.', 0, '36E', 'services-exempt-2025'),
];

const SPECIAL_BRICKS: readonly GstRateEntry[] = [
  ['6815', 'Fly ash bricks; fly ash aggregates; fly ash blocks'],
  ['6901 00 10', 'Bricks of fossil meals or similar siliceous earths'],
  ['6904 10 00', 'Building bricks'],
  ['6905 10 00', 'Earthen or roofing tiles'],
].flatMap(([codeText, description], index) => ([
  { id: `brick-${index}-standard`, kind: 'goods' as const, codeText, description, rate: 12, schedule: 'Separate notification', serial: String(index + 1), sourceId: 'bricks-standard' as const, effectiveFrom: '2025-09-22', notes: ['Standard rate. The separate conditional 6% no-ITC concession is also shown.'] },
  { id: `brick-${index}-noitc`, kind: 'goods' as const, codeText, description: `${description} — concessional supply subject to the no-ITC conditions in Notification 02/2022.`, rate: 6, schedule: 'Conditional concession', serial: String(index + 1), sourceId: 'bricks-concessional' as const, effectiveFrom: '2022-04-01', notes: ['Credit of input tax on goods or services used exclusively to supply these goods must not be taken; common credit must be reversed under the notification and section 17(2) rules. Sand lime bricks have a separate 5% entry.'] },
]));

export const GST_RATE_ENTRIES: readonly GstRateEntry[] = [
  ...GST_GOODS_DATA.map(([id, codeText, description, rate, schedule, serial, sourceId, pdfPage]) => ({
    id, kind: 'goods' as const, codeText, description, rate, schedule, serial, sourceId: sourceId as RateSourceId, pdfPage,
    effectiveFrom: GST_RATE_SOURCES[sourceId as RateSourceId].effectiveFrom,
    notes: sourceId === 'tobacco-2026'
      ? ['GST rate only. Tobacco/pan-masala may involve RSP-based valuation and separate central-excise/HSNS levies, which this finder does not calculate.']
      : /List 1 appended/.test(description) ? ['The assistive-device List 1 in the source notification is an additional condition; open the full schedule.'] : [],
  })),
  ...SPECIAL_BRICKS,
  ...GST_SERVICE_ENTRIES,
];

export const GST_RATE_COVERAGE = {
  taxableGoods: 1196,
  exemptGoods: 172,
  specialGoods: SPECIAL_BRICKS.length,
  serviceEntries: GST_SERVICE_ENTRIES.length,
  total: GST_RATE_ENTRIES.length,
  reviewedOn: GST_RATE_REVIEWED_ON,
  effectiveFrom: GST_RATE_EFFECTIVE_FROM,
  limitation: 'Covers the six goods schedules of Notification 9/2025 as corrected and amended through 01/2026, all 172 goods exemptions of Notification 10/2025, specified brick concessions, and the enumerated service entries. It is not the entire Customs Tariff or a complete consolidation of every service exemption, concessional notification, compensation cess, RCM, valuation or export rule. No result means not found in this coverage; it does not mean 18%, exempt or invalid.',
} as const;

const normalizeDigits = (text: string) => text.replace(/[०-९೦-೯]/g, char => String(char.charCodeAt(0) - (char >= '೦' ? 0x0ce6 : 0x0966)));
const normalize = (text: string) => normalizeDigits(text).normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Numeric groups in tariff text retain their legally meaningful leading zeroes. */
export function parseTariffCodes(text: string): { included: string[]; excluded: string[] } {
  const parts = text.split(/\b(?:other than|except)\b/i);
  const codes = (part: string) => [...part.matchAll(/(?<!\d)(?:\d{4}(?:\s+\d{2}){0,2}|\d{6}|\d{8}|\d{2})(?!\d)/g)].map(match => match[0].replace(/\s/g, ''));
  return { included: codes(parts[0]), excluded: parts.slice(1).flatMap(codes) };
}

export function parseTariffRanges(text: string): { from: string; to: string; excluded: boolean }[] {
  const marker = text.search(/\b(?:other than|except)\b/i);
  return [...text.matchAll(/(?<!\d)(\d{2}|\d{4}|\d{6}|\d{8})\s*(?:to|[–−-])\s*(\d{2}|\d{4}|\d{6}|\d{8})(?!\d)/gi)]
    .filter(match => match[1].length === match[2].length && Number(match[1]) <= Number(match[2]))
    .map(match => ({ from: match[1], to: match[2], excluded: marker >= 0 && (match.index ?? 0) > marker }));
}

export function getGstHeadingLabel(entry: GstRateEntry): string {
  if (entry.kind !== 'goods') return '';
  return [...new Set(parseTariffCodes(entry.codeText).included.map(code => GST_HEADING_LABELS[code.slice(0, 4)]).filter(Boolean))].join('; ');
}

const index = GST_RATE_ENTRIES.map(entry => ({ entry, codes: parseTariffCodes(entry.codeText), ranges: parseTariffRanges(entry.codeText), words: normalize(`${entry.description} ${entry.codeText} ${getGstHeadingLabel(entry)}`).split(' ') }));
const aliases: Record<string, string> = { mobile: 'telephone', phone: 'telephone', phones: 'telephone', smartphone: 'telephone', smartphones: 'telephone', conditioner: 'conditioning', conditioners: 'conditioning', cellphone: 'telephone', laptop: 'automatic data processing', laptops: 'automatic data processing', toothpaste: 'dentifrice', shampoo: 'hair', tshirt: 'shirt', atta: 'flour', chawal: 'rice', curd: 'curd', paneer: 'paneer', ca: 'accounting', gst: 'tax', lawyer: 'legal', lawyerfees: 'legal', salon: 'beauty', gym: 'fitness', hotel: 'hotel', restaurant: 'restaurant', software: 'software', consulting: 'consultancy' };
const stopWords = new Set(['gst', 'rate', 'rates', 'hsn', 'sac', 'code', 'codes', 'of', 'for', 'on', 'the', 'and', 'a', 'an']);

export type GstRateSearch = { query: string; kind?: GstRateKind | 'all'; rate?: number | 'all'; limit?: number };
export type GstRateSearchResult = { entries: GstRateEntry[]; total: number; isCode: boolean; normalizedQuery: string; error: string | null };

export function searchGstRates({ query, kind = 'all', rate = 'all', limit = 30 }: GstRateSearch): GstRateSearchResult {
  const value = normalizeDigits(query).trim().slice(0, 160);
  const code = value.replace(/[\s.-]/g, '');
  const isCode = /^\d+$/.test(code);
  const invalidCode = isCode && ![2, 4, 6, 8].includes(code.length);
  const normalizedQuery = normalize(value);
  const empty = { entries: [], total: 0, isCode, normalizedQuery, error: null };
  if (invalidCode) return { ...empty, error: 'Enter a 2, 4, 6 or 8 digit HSN, or a 4 or 6 digit SAC. Leading zeroes matter.' };
  if (!value) return empty;
  const words = normalizedQuery.split(' ').filter(word => !stopWords.has(word));
  const expanded = words.map(word => (aliases[word] || word).split(' '));
  if (!isCode && !expanded.length) return { ...empty, error: 'Add an item or service name, such as rice, mobile phone, accounting or hotel accommodation.' };
  const hits: { entry: GstRateEntry; score: number }[] = [];
  for (const item of index) {
    if (kind !== 'all' && item.entry.kind !== kind) continue;
    if (rate !== 'all' && item.entry.rate !== rate) continue;
    let score = 0;
    if (isCode) {
      const withinRange = (range: { from: string; to: string }) => code.length >= range.from.length && Number(code.slice(0, range.from.length)) >= Number(range.from) && Number(code.slice(0, range.from.length)) <= Number(range.to);
      if (item.codes.excluded.some(excluded => code.startsWith(excluded)) || item.ranges.some(range => range.excluded && withinRange(range))) continue;
      const matches = item.codes.included.filter(included => code.startsWith(included) || included.startsWith(code));
      const ranges = item.ranges.filter(range => !range.excluded && withinRange(range));
      if (!matches.length && !ranges.length) continue;
      score = Math.max(...matches.map(match => match === code ? 100 : code.startsWith(match) ? 75 + match.length : 55), ...ranges.map(range => 75 + range.from.length));
    } else {
      const stem = (word: string) => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word;
      const matches = (word: string) => item.words.some(candidate => stem(candidate) === stem(word));
      if (!expanded.every(group => group.every(matches) || words.some(word => group.join(' ') === aliases[word] && matches(word)))) continue;
      score = 10 + words.filter(word => matches(word)).length * 5;
      if (normalize(item.entry.description).includes(normalizedQuery)) score += 15;
    }
    // A residual entry does not establish an unknown item's classification.
    if (item.entry.id === 'II-639') continue;
    hits.push({ entry: item.entry, score });
  }
  hits.sort((a, b) => b.score - a.score || a.entry.codeText.localeCompare(b.entry.codeText) || a.entry.rate - b.entry.rate || a.entry.id.localeCompare(b.entry.id));
  return { entries: hits.slice(0, Math.max(1, Math.min(200, Math.trunc(limit) || 30))).map(hit => hit.entry), total: hits.length, isCode, normalizedQuery, error: null };
}

export function gstRateSplit(rate: number): { cgst: number; sgstOrUtgst: number; igst: number } {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new RangeError('GST rate must be between 0 and 100.');
  return { cgst: rate / 2, sgstOrUtgst: rate / 2, igst: rate };
}
