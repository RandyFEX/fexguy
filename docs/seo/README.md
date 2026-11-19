# Live Google SEO documentation system

Step 1 of the FuneralFunds.com SEO process: reliable, repeatable access to
Google's current official SEO documentation. Step 2 (the technical SEO
diagnostic) and Step 3 (corrections) use only what this system retrieves and
verifies.

## Command

```sh
npm run seo:google-docs
```

Every run goes to Google's live sites. It takes about 4 minutes and:

1. **Discovers pages.** It starts at the seeds in
   `scripts/google-seo-docs/config.json` and follows Google's own documentation
   navigation, in-article links and related-document links, plus Google's
   documentation updates page, the Search Central blog index and the Google
   Search Status Dashboard. New pages that Google links from these are found
   automatically, with no URL list to maintain.
2. **Retrieves pages over HTTPS** with curl, which also works behind the cloud
   session's proxy. It checks robots.txt and paces its requests, and it
   handles redirects itself: every hop must pass the source policy.
3. **Verifies each response.** A page needs HTTP 200, the expected content
   type, a complete HTML document and a real article body with a title. Error
   pages, captchas, empty, incomplete, off-site and out-of-scope responses are
   rejected and listed with the reason.
4. **Extracts the main article only.** Navigation, headers, footers and widgets
   are dropped. The article is split into sections and passages, with Google's
   own "Last updated" date.
5. **Writes the runtime cache and a report.** The runtime cache is
   `.cache/google-seo-docs/pages.json` and the report is
   `.cache/google-seo-docs/report.md`. Both are git-ignored and are never a
   documentation archive.
6. **Updates the metadata manifest.** `docs/seo/google-docs-manifest.json`
   holds URLs, titles, Google's last-updated dates, content hashes, topics and
   retrieval times, with no documentation text. Commit it after a run so the
   next run can report new, changed and removed pages.
7. **Checks the required documentation.** It confirms that the internal
   linking, canonicalization, structured data, Core Web Vitals, mobile-first
   indexing and AI features pages were verified. If any is missing, it exits
   with an error.

## Using the verified guidance

```sh
npm run seo:google-docs -- --find "rel canonical"
npm run seo:google-docs -- --find "anchor text" --topic internal-linking-and-anchor-text
```

Each result gives:

- the original URL and the verified final URL;
- the document title;
- the retrieval time and HTTP status;
- Google's last-updated date;
- the section heading;
- the passage;
- a preliminary classification.

When no verified passage matches, the result is **UNSUPPORTED**: there is no
Google-based recommendation without a verified source. `--find` refuses a cache
older than 24 hours, so rerun the command first.

Classifications come from Google's own wording and must be confirmed against
the passage:

- **REQUIRED:** must, required, policy violations.
- **RECOMMENDED:** recommend, should, best practice.
- **ELIGIBILITY:** conditions for a search feature.
- **INFORMATIONAL:** everything else.
- **UNSUPPORTED:** no verified passage.

## Source policy

The system requests only these hosts, each limited to its configured paths:

- developers.google.com, for Search Central: /search/docs, /crawling/docs, the
  updates page, the blog from 2025 on and /search/help.
- support.google.com, for Search Console Help: /webmasters/answer.
- web.dev and developer.chrome.com, for Core Web Vitals and performance pages
  only.
- status.search.google.com, for the Search Status Dashboard ranking history
  and incidents.

Anything else is refused before any request is made. That covers third-party
sites, other Google products and look-alike hosts, and there is no fallback to
another source. The full developers.google.com sitemap set is not used: it is
several hundred megabytes for the whole site. Coverage is therefore what
Google's navigation and links expose, and the report says so.

## When to run it

- Before every technical SEO diagnostic.
- Quarterly, as a documentation refresh.
- After a Google core update. The report lists the latest Search Status
  Dashboard incidents and documentation updates.

## Tests

`npm run test:seo-docs` runs offline tests of the source policy, robots.txt
rules, rejection rules, extraction, classification and change detection.
