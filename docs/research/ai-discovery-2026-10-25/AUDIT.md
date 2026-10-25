# RegisterBox AI discovery and crawlability audit

Read-only public audit, 25 October 2026. No project source, Vercel rules, analytics settings or account configuration changed. No authenticated firewall logs or private analytics records were accessed.

## Finding

**The tested public pages are currently accessible from this test client. A blanket “ChatGPT cannot crawl RegisterBox” diagnosis is not supported by the observed HTTP evidence.** The web retrieval tool did show stale content and inconsistent URL access; that symptom is real, but its cause is not established as a site firewall block.

## Test window and method

- Main HTTP request starts: **2026-10-25 10:09:53.579018–10:09:57.503487 UTC**, equivalent to **15:39:53.579018–15:39:57.503487 IST**. Last request completed about 10:09:57.647 UTC / 15:39:57.647 IST.
- Discovery resources: **10:11:27.165319–10:11:28.624956 UTC / 15:41:27.165319–15:41:28.624956 IST**, recorded at successful response processing.
- Eighteen GETs: apex and www × homepage, FSSAI page, robots.txt × normal Chrome-like, OAI-SearchBot and ChatGPT-User user-agent strings. Exact strings and per-request UTC timestamps are in `results.json`.
- Public responses were fetched from the local test client, not from a verified OpenAI crawler origin. Changing a user-agent string tests responses to that string; it **does not prove the request came from OpenAI** or that all IP addresses/regions receive the same treatment. No attempt was made to forge source IPs or authenticated bot signatures.
- The normal Chrome-like user-agent was also an HTTP client, not a full browser. These tests establish public HTML delivery, not all browser interactions or frontend asset execution.

## Direct-current HTTP evidence

| Resource | www, normal UA | www, OAI UA | www, ChatGPT UA | Apex under all three UAs |
| --- | --- | --- | --- | --- |
| `/` | 200 HTML | 200 HTML | 200 HTML | One 308 redirect to matching www URL, then 200 |
| `/services/fssai-food-business` | 200 HTML | 200 HTML | 200 HTML | One 308 redirect to matching www URL, then 200 |
| `/robots.txt` | 200 text/plain | 200 text/plain | 200 text/plain | One 308 redirect to matching www URL, then 200 |

- Each resource returned the **same SHA-256 body** across all six host/user-agent combinations. Homepage: 99,552 bytes; FSSAI: 86,470 bytes; robots: 254 bytes. This rules out user-agent-dependent content differences in this sample, not every possible access policy.
- No 403 or 429 response, `x-vercel-mitigated` challenge header, or known challenge-body marker appeared. Responses identified the server as Vercel. Private Vercel dashboard configuration was not inspected, so this is not a claim that every protection setting is off.
- Homepage and FSSAI HTML contain `index,follow,max-image-preview:large`, correct www canonicals and substantial page text before JavaScript execution. No `X-Robots-Tag` header was observed on those public responses.
- Live robots permits `/` for `*` and explicitly for `OAI-SearchBot`, with a www sitemap URL. [Live robots](https://www.registerbox.in/robots.txt).
- Sitemap: 200, `application/xml`,120 URLs, all under www, including FSSAI. `llms.txt`: 200 text/plain. Service feed: 200 JSON, FSSAI price 1999. These are available discovery surfaces, not guarantees of indexing or citation. [Sitemap](https://www.registerbox.in/sitemap.xml), [guide for AI systems](https://www.registerbox.in/llms.txt), [public feed](https://www.registerbox.in/service-feed.json).

## Web retrieval evidence differs from live origin evidence

The web tool retrieved the [www homepage](https://www.registerbox.in/) and identified its source as crawled today. For the [www FSSAI page](https://www.registerbox.in/services/fssai-food-business), it returned a four-day-old cached version advertising ₹3,999. Direct current HTTP and the public feed show ₹1,999, and the current HTML title is “FSSAI Registration Bengaluru | ₹1,999 incl. Govt Fee | RegisterBox.” That is positive evidence of stale retrieved content.

The same tool reported that apex, robots, sitemap and llms URLs were inaccessible, even though direct HTTP succeeded for those tested URLs. Its generic “not accessible” messages do not supply a reliable origin HTTP status or matched firewall rule. A fresh query-string retrieval also failed in that tool; it did not identify a cause. Detailed outcomes are in `web-tool-observations.json`.

**Supported:** this tool's retrieval/cache path is inconsistent with current direct public responses. **Not established:** that Vercel blocks genuine OpenAI IPs, that robots denies OpenAI, that the site is generally down, or that any specific OpenAI search index has refreshed the latest deployment. Regional/identity-specific rules and transient errors remain hypotheses until logs show them.

## What the official documentation says

OpenAI distinguishes `OAI-SearchBot` for search discovery, `ChatGPT-User` for certain user-triggered visits, and `GPTBot` for training. These controls are independent. OpenAI recommends allowing OAI-SearchBot in robots and permitting its published IP ranges; robots updates may take about 24 hours to be reflected. ChatGPT-User is not the automatic search crawler. [Official OpenAI crawler documentation and published IP-list links](https://developers.openai.com/api/docs/bots).

Vercel's Bot Protection can challenge non-browser clients while excluding verified bots. Its separate AI Bots ruleset can log or deny AI traffic, so “Google works” does not establish every AI agent is allowed. Verification can use IP ranges, reverse DNS or signed requests; user-agent alone is spoofable. No dashboard setting was inferred from these general capabilities. [Vercel Bot Management](https://vercel.com/docs/bot-management), [Vercel tuning guidance](https://vercel.com/kb/guide/how-to-utilize-vercels-bot-management-features).

Vercel's Firewall Traffic view supports examining rule/action, client IP, user agent, path, ASN and related signals. It is the appropriate place to establish a specific deny/challenge rather than guessing from a web-tool error. [Firewall Observability](https://vercel.com/docs/vercel-firewall/firewall-observability).

## The screenshot does not diagnose crawling or content quality

The supplied screenshot reports **58 visitors and 45% bounce** for its selected range. Those numbers alone do not show a crawl block, prove that bounce is “high,” or identify failed leads. Visitors and sessions are different denominators, so multiplying 58 by 45% does not reliably produce a bounce count. No search impressions, search volume, rankings or conversion rate were supplied or invented.

Vercel defines bounce as **single-page sessions / total sessions**. Custom events do not change that rate. Therefore a visitor can read an answer, call, open WhatsApp, or submit an external enquiry and still be a one-page session. That is an interpretation of the metric, not evidence that these 58 visitors actually converted. Vercel also describes filtering bot traffic from Web Analytics using user-agent signals; an analytics referral panel is not an authenticated crawler log. [Vercel analytics definition](https://vercel.com/docs/analytics).

User-reported Google referrals indicate a different acquisition channel from OpenAI retrieval. They do not establish the request identity, response status or indexing freshness of an OpenAI agent.

## Specific next steps

1. **Retain the currently working discovery setup.** Use the canonical www URLs for direct sharing and internal links. Keep valid robots/sitemap delivery, current public prices and substantial HTML. There is no observed reason to change robots to fix these tests.
2. **Verify real requests in logs.** Reproduce one failed user-requested URL visit at a recorded UTC time. In Vercel Firewall → Traffic/Events, filter that host/path/time and inspect status, action and matched rule. For claimed OAI-SearchBot/ChatGPT-User requests, compare the actual source IP with the appropriate current published list linked from OpenAI's documentation; inspect verified-bot information where provided. Preserve only the relevant evidence. A user-agent match alone is insufficient. If no matching request appears, consider retrieval cache/network/tool failure rather than asserting a Vercel block.
3. **If a real public-page block is confirmed, adjust that precise rule.** Allow the needed verified search/user agent or current verified IP/signature criteria for the relevant public routes, then repeat the same log-backed test. Review AI Bots deny rules and custom WAF rules. Do not broadly disable the firewall or trust every request declaring an OpenAI user-agent.
4. **Treat answer-led content as a separate editorial improvement.** The homepage hero is currently a broad promise; the FSSAI page already has substantial SSR text and 12 details elements. Add useful question headings, short visible answers, concrete eligibility/fee boundaries and original, evidence-backed judgments. Label illustrative examples honestly. Explain why RegisterBox recommends a step for a particular business. Such changes can make answers easier to understand and extract; they do not resolve a 403 or guarantee ChatGPT mentions.
5. **Segment genuine engagement.** Review landing page × referrer × device × date range, separating content/service pages from account/workspace screens and test/staff activity where identifiable. Measure actual application starts, submitted cases and paid orders; measure call/WhatsApp outbound clicks as enquiry intent, not completed sales. Check event coverage before comparing periods. Keep single-page bounce as a navigation metric and report qualified enquiries/conversions separately. Use privacy-safe events without PAN, Aadhaar, OTPs or customer documents.

## Artifact index

- `results.json`: 18 request records, exact UAs, timestamps, redirect chains, selected public headers, body hashes and baseline references.
- `homepage.html`, `fssai.html`, `robots.txt`: normal-UA public response bodies; equivalent body hashes under the other tests are recorded.
- `discovery-results.json`, `sitemap.xml`, `llms.txt`, `service-feed.json`: discovery-resource baseline and response metadata.
- `web-tool-observations.json`: cached/stale/tool-error outcomes, explicitly separated from origin statuses.

This is a point-in-time public audit from one client location. It does not substitute for verified crawler logs or account-level Vercel configuration review.
