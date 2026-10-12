# RegisterBox search and referral plan

## Launch checks

Canonical host: https://www.registerbox.in (already enforced by the live HTTP/apex redirects and HSTS).
Deploy the exported site, then check /robots.txt, /sitemap.xml, all /services URLs and /images/registerbox-og.jpg return 200. Public pages must expose exactly one H1, one canonical, title and description in the initial HTML. Account, auth and admin screens stay noindex. Robots allows crawling so Google can read those noindex instructions; authentication remains the actual privacy boundary.

The real Google Search Console HTML verification token is in the homepage metadata. Verify only with the intended owner account, ANA ASSOCIATES (associatesana7@gmail.com), after deployment. Submit https://www.registerbox.in/sitemap.xml, inspect the homepage and two service pages, and check the selected canonical. Do not claim ownership is verified until the console reports success.

## First 30 days

- Confirm the business name, address and telephone with the owner, then audit the existing Google Business Profile and Bing Places listing for consistent contact details and the canonical website URL. Do not create duplicate listings.
- Build a list of 15 genuine local relationships: Bengaluru coworking spaces, startup communities, accountants, business associations and software partners that already know RegisterBox. Record the contact, existing relationship, relevant resource page and proposed helpful contribution.
- Publish two useful, reviewed resources: a document-organization checklist for first-time founders and a guide to tracking application drafts versus submission acknowledgements. Include author/reviewer, review date and authoritative references. Link them from relevant service pages.
- Invite existing partners to cite a useful resource where it genuinely helps their audience. Earn editorial links; do not require reciprocal links or exact-match anchor text.

## Days 31–60

- Offer one practical workshop through a real partner. A partner event page can link to the workshop information and relevant resource.
- With explicit client consent, prepare one anonymized case study explaining the workflow and measurable outcome without sharing private records or implying guaranteed approval.
- Find unlinked RegisterBox mentions and ask the publisher to add the canonical URL where appropriate.
- Pitch a specific, useful contribution to a relevant local publication. No mass outreach or purchased ranking links.

## Days 61–90

- Review Search Console queries, indexed pages, referral traffic and enquiry conversions. Improve pages receiving impressions but few qualified enquiries.
- Update resources from real customer questions and expand only where there is useful distinct content.
- Track earned referring domains, relevant referral visits, enquiries and conversions. Rankings are an observation, not a guaranteed deliverable.

## Outreach draft (not sent)

Hi [name],
We work with businesses preparing registrations and organizing their documents. We put together [resource] to help [specific audience/problem]. If it would help readers of your [specific page], you're welcome to reference it: [canonical URL]. Happy to clarify the workflow or contribute a practical example.

## Quality rules

No link farms, automated directory blasts, paid dofollow links, fake reviews or guaranteed rankings. Mark paid sponsorship links rel="sponsored". Review service and regulatory content before publishing it.

## Performance measurement

Run mobile Lighthouse against the deployed homepage, contact page and a service page. Record the median of three runs under the same conditions, including LCP, CLS and TBT. INP needs real interactions and field data; do not equate TBT with INP. Monitor the 75th percentile field metrics in Search Console/CrUX over 28 days: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. Static export, fixed image dimensions, smaller assets, deferred below-fold images and system fonts reduce avoidable work, but do not establish a field pass without measurement.

Sources: https://developers.google.com/search/docs/essentials/spam-policies ; https://web.dev/articles/vitals ; https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
