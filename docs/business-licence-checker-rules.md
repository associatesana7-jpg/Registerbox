# Business licence checker: rule scope and maintenance

Rule set: `2026-10-28.1` · source review: **28 October 2026**.

This is a deterministic, browser-side screening checklist for an India-based business. It identifies likely registrations and questions to resolve. It does not issue approvals, certify exemptions, inspect an existing registration, or promise complete legal coverage. The input form deliberately asks broad, understandable questions; broad answers cannot establish every statutory fact.

The implementation lives in `src/lib/business-licence-checker.ts`. The UI must display the reason, next step, source links, review date and local-review result. Never relabel `not-triggered` as “not required”, “exempt” or “you are compliant”. Suggested documents are items to prepare for the appropriate official workflow, not documents to upload to this checker. Udyam uses official self-declaration without document uploads.

## Coverage

- All 28 states and 8 union territories are selectable in English, Hindi and Kannada. Selecting a location is **not** evidence that every law of that jurisdiction has been implemented.
- Central registrations are screened using versioned facts and fixed official sources. State and municipal registrations remain explicit review tasks; Karnataka has additional official Shops and Establishments and professional-tax sources.
- The checker does not request PAN numbers, Aadhaar, payroll, private documents, passwords or uploads. Numbers are processed locally; blank or invalid numeric input remains unknown.
- It does not infer legal jurisdiction from free-text city names. Multiple places of business, branches, premises in different states, existing registrations, past coverage, contractor headcount, detailed product classifications and application-specific exemptions need a fuller review.
- NSWS already offers the government's national **Know Your Approvals** workflow. Link to it as a completion path; do not market this page as India's first, the only such tool, or a substitute for NSWS. [Official NSWS FAQ](https://www.nsws.gov.in/faqs).

## Status semantics

| Status | Meaning |
| --- | --- |
| `required` | A general registration requirement follows from the supplied facts, subject to the stated qualification. For an existing business, verify its existing certificate before reapplying. |
| `check` | A relevant trigger, missing fact, exception or unimplemented local rule needs confirmation. It is not a demand to purchase a registration. |
| `recommended` | Explore an optional benefit/recognition; eligibility still needs verification. |
| `not-triggered` | These answers did not establish a general trigger. Prior coverage, unasked facts and special notifications can still create obligations. |

## Implemented decisions

| Result | Implemented screening | Deliberately unresolved |
| --- | --- | --- |
| GST | General goods threshold ₹40 lakh; ₹20 lakh in AR, MN, ML, MZ, NL, PY, SK, TS, TR and UK. Services: ₹20 lakh, or ₹10 lakh in MN, MZ, NL, TR. The threshold must be **exceeded**. | Goods-only eligibility, exempt-only supplies, excluded goods, mixed supplies, reverse charge, agents, casual/nonresident persons, precise ecommerce facts and compulsory-registration exceptions. Above-threshold results say `check`, not a definitive taxable-supply finding. |
| GST channels | Interstate goods, foreign goods and marketplaces are review flags. Interstate services alone do not automatically remove the normal turnover screen. Broad ecommerce activity always needs review because online activity can involve goods or services. | Conditional small-seller enrolment versus GSTIN and notified ecommerce services. Do not claim every seller on a marketplace must register. |
| FSSAI | A food signal identifies a general authorisation requirement. General turnover bands effective **1 April 2026**: Registration up to ₹1.5 crore; State Licence above ₹1.5 crore through ₹50 crore; Central Licence above ₹50 crore. | Farm-level exclusions under section 18(3), exact kind of business, special manufacturing, central-government premises, airports, import/export, capacity and multi-state conditions. Food import/export overrides a generic turnover-band suggestion with a Central-Licence review. |
| Street food | Mobile food vendors get `check`, with a deemed-registration qualification. | Whether the vendor is already validly registered under the applicable street-vending framework. |
| Udyam | Recommended exploration of free official MSME recognition. | Investment is not collected; no MSME class or eligibility is promised. Use the current official portal classification, not the pre-April-2025 limits. |
| IEC | Foreign-trade channels cause `check`. Goods and services have distinct explanations. | Exact goods, statutory exemption, restricted items, specified technology/services and Foreign Trade Policy benefits. IEC is not imposed automatically on every freelancer exporting services. |
| EPFO | The general inclusive 20-employee threshold is flagged `required`; below-threshold results retain prior/special coverage qualifications. | Contractor counts, previous headcount/coverage, notified categories, employee eligibility, scheme and contribution computation. |
| ESIC | Ten persons is a **screening** threshold; hazardous work can require review even at one employee. No wage data means no definitive contribution conclusion. | Seasonal factories, notified activities, employee wages, commencement of applicable benefits and previous coverage. |
| New companies | SPICe+ company incorporation and linked EPFO/ESIC registrations are identified even at zero headcount. | Registration/account creation is explicitly separated from contribution liability. Existing numbers must be checked first. |
| Structure | Company/LLP incorporation through MCA is identified. Partnership is a review, with state Registrar of Firms and deed/stamp follow-up. | Choosing a structure for the visitor, declaring a separate central “sole proprietorship licence”, and state amendments. |
| Shops / trade / PT / premises | Always explicit local review tasks. PT says it is not levied everywhere; the selected state's full rules are not claimed to be automated. | Municipal trade schedules, state professional-tax schedules/exemptions, Shops Act exemptions/intimations and fire/building requirements. |
| Legal Metrology | Pre-packed goods or weighing signals lead to review. | Whether the person packs/imports or merely resells; instrument verification versus manufacturer/dealer/repairer licensing; package exemptions. |
| Pollution / waste | Manufacturing, health, industrial premises or hazardous activity lead to review. | Precise process, category, waste streams and the appropriate SPCB/PCC's rules. White-category relief is not automatically granted. Food processing/waste can still need review without these signals. |
| Sector approvals | Health, education, professions, manufacturing, other/unknown activity or regulated/hazardous products lead to review. | Drugs, clinics, professional council enrolment, financial services, education recognition, factory/OSH requirements, BIS, PESO, telecom, transport, import restrictions, environmental approvals and every specialised sector requirement. |

The rules intentionally do not produce national fees, processing promises or filing deadlines. They do not calculate tax or substitute for activity-specific professional advice.

## Official source notes

The code's `SOURCES` registry is the canonical link list and is available to the result UI. URLs come from fixed configuration, never from a visitor's input.

- GST thresholds: [CBIC registration update](https://cbic-gst.gov.in/pdf/01062019-GST-An-Update.pdf), [CGST section 22](https://taxinformation.cbic.gov.in/content-page/explore-act/1000291/1000001), and [Ministry of Finance answer dated 9 February 2026](https://sansad.in/getFile/loksabhaquestions/annex/187/AU1484_xFS2m1.pdf?source=pqals). The 2026 parliamentary answer confirms no further threshold revision had been recommended at that date; the state list comes from the CBIC update.
- Marketplace qualification: [GST Council October 2023 newsletter](https://gstcouncil.gov.in/sites/default/files/2024-02/october_newsletter.pdf), describing conditional enrolment under Notification 34/2023 and associated procedures.
- FSSAI: [official registration overview](https://fssai.gov.in/business/registration), [FoSCoS activity table updated 1 April 2026](https://foscos.fssai.gov.in/assets/docs/Revised_2ndApril2026KindofBusinessEligibility.pdf), and [13 March 2026 reforms](https://www.fssai.gov.in/upload/uploadfiles/files/Press%20Release_FSSAI%20Reforms_130326.pdf). Do not reuse the obsolete ₹12 lakh registration threshold.
- Udyam: [official Ministry of MSME portal](https://www.udyamregistration.gov.in/) and [July 2026 explanation of the free process](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2284414&lang=1&reg=20).
- IEC: [DGFT Foreign Trade Policy 2023, paragraph 2.05](https://content.dgft.gov.in/Website/dgftprod/61d61bc2-272e-4880-b96c-c8f685a3b244/Foreign%20Trade%20Policy%202023.pdf).
- Labour: [Code on Social Security First Schedule](https://labour.gov.in/sites/default/files/ss_code_as_passed_by_lok_sabha.pdf), [official implementation announcement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2192463&lang=2&reg=3), and [Ministry's March 2026 FAQ](https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf). The four Labour Codes became effective on 21 November 2025. The screening does not implement every central/state rule or contribution scheme and does not present the historical EPF/ESI Acts as the whole current framework.
- Companies/LLPs: [MCA SPICe+ FAQs](https://www.mca.gov.in/content/dam/mca/pdf/SPICEplus-and-linked-filings-FAQs-V3-20230122.pdf), [MCA linked-registration FAQs](https://www.mca.gov.in/Ministry/pdf/SpicePlusFAQS_20112020.pdf), [FiLLiP instruction kit](https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf). The linked-registration source is older and is used only for the general incorporation linkage; it does not justify a present-day state tax exemption or contribution decision.
- Partnerships: [India Code, Partnership Act registration / non-registration](https://www.indiacode.nic.in/bitstream/123456789/12849/1/the_indian_partnership_act_1932.pdf). State amendments need separate review.
- Karnataka: [government labour service information](https://kodagu.nic.in/en/department-of-labour/) and [Commercial Taxes professional-tax FAQ](https://ptax.karnataka.gov.in/FAQ). [Bengaluru trade licence FAQ](https://site.bbmp.gov.in/tradelicensefaq.html) is a local example, not a law applied to every city or a guarantee of the present responsible city corporation.
- Measurement: [Consumer Affairs overview](https://consumeraffairs.gov.in/pages/legal-metrology-overview) and [published packaged-commodities rules](https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/Book_on_Legal_Metrology_Packaged_Commodities_Rules%2C2011_with_all_amendments_whatsnews.pdf). Specific amendment, package and state facts remain unresolved.
- Environment: [official OCMMS overview](https://www.ocmms.nic.in/OCMMS_NEW/index.jsp), [January 2026 consent-guideline update](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2219415&lang=2&reg=48), and [MPCB categorisation explanation](https://www.mpcb.gov.in/en/consentmgt/revised-industry-categorization). Maharashtra's procedure is an example, never automatically applied to another state's project.

## Web experience and search discovery

- Public entry point: `/tools/business-licence-checker`; independently prerendered Hindi and Kannada pages at `/hi` and `/kn`. The language control keeps answers in memory; changing the guide URL starts a fresh checklist.
- The English, Hindi and Kannada guides have self-canonicals, reciprocal `hreflang` links and sitemap entries. Headings, explanatory copy, FAQ answers and official sources are emitted in static HTML. Results require user answers and are not fabricated for crawlers.
- Homepage tool cards, the tools directory and the shared footer link directly to the checker. Robots permits public tools. No account or payment is needed.
- The form collects no personal identifiers or uploads, does not persist answers, and never puts answers into URLs or source links. The selected city is displayed as React text; it does not determine a municipal rule.
- RegisterBox service destinations live separately in `src/lib/business-licence-services.ts`. Active GST, FSSAI, Udyam, establishment and relevant company/LLP results link to the verified public service page. Other approvals offer a clearly labelled compliance review rather than an unsupported application offering. Service links open a new tab, without passing answers, so the checklist stays available.
- The wizard has no native form submission; controls stay disabled until hydration. This avoids early-loading or no-JavaScript GET submissions. A no-JavaScript message points to the readable guide and official sources.
- Copy uses the browser clipboard only after the visitor chooses it. Print uses the existing document and scoped print CSS; no uploaded or interpolated HTML is executed.
- Numeric inputs accept English, Devanagari and Kannada digits and valid Indian or western comma grouping. Unknown inputs stay unknown.
- Test command: `npm run test:licences`. Release checks: `npm run lint`, `npx tsc --noEmit`, `npx expo export --platform web`, then `python3 scripts/check-public-seo.py <export-directory>` and `python3 scripts/check-business-licence-seo.py <export-directory>`.
- The visible heading names the tool and country; the description names GST, FSSAI, Udyam/MSME and shop registration. Six business-type answers cover food, retail, freelancing, online selling, company/LLP and manufacturing with official references and related service links. FAQ structured data repeats the same visible questions and answers in each published language.
- Search validation checks emitted HTML, not only client-rendered text. After deployment, assess Google Search Console indexing, query impressions and click-through rate for the actual checker routes. AI citations need separate observations; schema or a successful build is not evidence of AI recommendation.
- Crawlability, indexing and ranking are distinct. These routes support crawling; Google decides indexing, rich results and ranking.

## Changes and scaling

1. Give each proposed rule an ID, jurisdiction, required facts, source, effective-from date, review date and explicit exceptions. Verify primary authority before changing a production conclusion.
2. Add a dated configuration version rather than silently changing historical assumptions. If a source conflicts or a required fact is missing, return `check` and describe the missing fact.
3. Add a regression for each threshold boundary, legal exception and source change. Keep all result text in English/Hindi/Kannada together. A language change must not alter the underlying rule or status.
4. Expand state coverage one verified rule pack at a time. Do not remove the local-review result until that exact jurisdiction and activity have sufficient official coverage. Translate legal labels into accessible language, retaining the official registration name.
5. Add rule freshness checks to the release/review process. This version's static review date must remain visible; it is not a promise that live government websites were consulted for every visitor.
6. Reuse the deterministic engine in other clients. Keep uploads, AI suggestions, lead collection and any future official integrations outside this module and require a separate security/privacy review for those features.

## Validation

Run `node --test scripts/test-business-licence-checker.mjs`. The suite exercises 324 state/activity combinations plus threshold boundaries, unknown/invalid numbers, FSSAI 2026 changes, deemed street-vendor registration, import/export overrides, service IEC distinctions, employment thresholds, new-company linked registrations, local gaps and hostile input. It asserts fixed official source links and complete localized output. Whole-project lint and TypeScript checks are required before release.
