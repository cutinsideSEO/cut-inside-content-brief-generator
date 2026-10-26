# Research playbook (read before step 2)

Tools, parameters and records for the research step of `new-page-content-brief`. Everything here
serves one rule: every number in the brief comes from a tool call made in this run, with its
source, geo and date. Prices, codes and quotas move; read them at the point of use.

## 1. Tools per step

| Step | Question | First choice | Fallback | Cost |
|---|---|---|---|---|
| Client context | voice, do's and don'ts, banned and preferred terms, known competitors, playbook rules | SurgeOS `list_clients`, `get_documents`, `get_seo_knowledge`; the client's AI Brain on Drive (`00. AI Brain`: principles, decisions-log) | ask the user for brand notes | none |
| Cannibalisation and site coverage | does a client page already rank for or cover this topic? | the client's own position per query from the SERP export; SurgeOS `gsc_query_page`, `search_gsc_queries`, `search_gsc_pages`; the latest site crawl via `get_crawl_pages` / `get_sitemap_urls` with `search` | `site:<client domain> <topic>` web search | none (shared BigQuery budget; site crawl already run) |
| Keyword list | which keywords and volumes the brief targets | SurgeOS `get_search_visibility_keywords` / `get_keyword_rankings` for keywords the client already tracks (check first); then the user's list, or Ahrefs Keywords Explorer through `ahrefs-navigator` (browser export, country and global volume) | DataForSEO Google Ads search volume for a list; GSC queries only for the client's own demand; SERP-export related searches or Google autocomplete for ideas only (no volume) | SurgeOS tracked: free; Ahrefs: browser exports, no API units; DataForSEO: one flat price per task |
| SERP per query | top-10 organic URLs and ranks, PAA, SERP features, AI Overview | SurgeOS SERP export (`run_serp_export` + `get_serp_export`), one export per brief, depth 20 (section 5.1) | 1) DataForSEO MCP SERP Google organic, live advanced, depth 20; 2) Ahrefs SERP overview export through `ahrefs-navigator`; 3) web search as last resort (US engine location, not located) | export: price per keyword at the depth, from the tool; DataForSEO per SERP page of 10 |
| Competitor strength | is a winner strong because of the page or the domain? | Ahrefs SERP overview export (DR, traffic per URL) for a competitive topic | skip; the score stands on volume x rank | browser export |
| Page content | headings, word count, body text | SurgeOS `request_crawl` (one domain per crawl) for word count, title, meta, H1, plus WebFetch for headings and body (section 8.1) | WebFetch alone; DataForSEO on-page content parsing, live, JavaScript rendering on (with approval of its cost) | crawler: no DataForSEO cost; DataForSEO per page |
| Internal links | real client URLs to link to | SurgeOS `search_gsc_pages`, `search_gsc_queries` | `[INTERNAL LINK: anchor -> topic]` placeholders | none |
| Balance and prices | can we afford the plan? | the SERP export's price from the tool's answer or estimate; DataForSEO `appendix/user_data` for balance and fallback prices | none: without a price, ask before spending | free |

SurgeOS full tool names: `mcp__SurgeOS__run_serp_export`, `mcp__SurgeOS__get_serp_export`,
`mcp__SurgeOS__request_crawl`, `mcp__SurgeOS__get_crawls`, `mcp__SurgeOS__get_crawl`,
`mcp__SurgeOS__get_crawl_file`, `mcp__SurgeOS__get_crawl_pages`, `mcp__SurgeOS__get_sitemap_urls`.
DataForSEO MCP (fallback) tool names vary by install: look for the organic live SERP tool (named like
`serp_organic_live_advanced`), the content-parsing tool (named like `on_page_content_parsing`), the
Google Ads volume tool (named like `keywords_data_google_ads_search_volume`) and the user-data tool
(named like `appendix_user_data`). If no DataForSEO connector is present, use the fallbacks and
label the data as below.

### Confidence labels (write them into Sources and scope and next to affected figures)

| Data came from | Label |
|---|---|
| SurgeOS SERP export with the market's country and language | located SERP, SurgeOS SERP export `<jobId>`, `<country>`, `<language>`, `<device>`, depth 20, `<date>`; SERP features and AI Overview observed |
| SurgeOS crawl of a competitor page | crawled `<crawl id>`, `<date>`: word count, title, meta and H1 from the crawler |
| SurgeOS crawl only (WebFetch refused) | crawl fields only, `<crawl id>`, `<date>`: digest partial (no H2/H3 tree or body read) |
| DataForSEO live SERP with the market's location and language | located SERP, DataForSEO fallback, `<date>` |
| Ahrefs SERP overview export | Ahrefs SERP snapshot, `<country>`, `<date of Ahrefs crawl>` (may lag the live SERP) |
| Ahrefs overview read from screen (no export control) | Ahrefs SERP read from screen, `<date>` |
| Web search | approximate ranks, web search (engine location US; not a located SERP), `<date>`; SERP features not observed |
| Google autocomplete or related searches (free fallback for keyword ideas) | Google autocomplete, `<country>`, `<date>`: ideas only, no volume |
| WebFetch page read | page read without JS rendering; word count approximate |
| GSC through SurgeOS | GSC `<property>`, `<country or all>`, `<start>` to `<end>` (plus the logging-error caveat when the window overlaps it, section 11) |

Web search runs from a US engine location whatever query language you use, so it never meets a
non-US market's located-SERP requirement. For a non-US market, say at H1 that a located SERP is
unavailable and offer the person the option to paste the local top 10 (for example the google.co.il
top 10); label pasted results "user-pasted SERP, `<country>`, `<date>`". Never call mixed-locale
web-search results "US results" or "Israel results".

## 2. Client context (step 1)

1. `list_clients` with the client's name, id or domain. Record domain(s), deliverable language, market.
2. `get_documents` for brand guidelines, tone references, product briefs; `get_seo_knowledge` for playbook rules on content and AI search.
3. Search Drive for the client's `00. AI Brain` folder: read principles and `decisions-log.md` for rulings on briefs (naming bans, schema choice, claims, standing topic checks, CTA rules, branded templates or document naming rules). These feed the Accuracy and brand guardrails section. A file too large to read whole: download it and grep it for the topic terms plus "availability", "launch", "product brief", "do not", "never".
4. Search the client's Drive folder for product briefs on the topic (availability by market, launch status, allowed claims), and for past content briefs on the same topic (read for overlap and cannibalisation; never copy). List every file read in Sources and scope.
5. Note known competitors so you can flag them when they appear in the SERP.

## 3. Keyword list (step 2.1)

### Route 0: keywords the client already tracks (check first, free)
SurgeOS `get_search_visibility_keywords` and `get_keyword_rankings` return volume (and live rank)
for keywords already in the client's Search Visibility tracking. Use them for every brief keyword
they cover; label "SurgeOS Search Visibility, `<country>`, `<date>`". Never add keywords to Search
Visibility tracking for a brief (`add_search_visibility_keywords`: recurring cost, writes into the
client project) unless the person asks. The SERP export returns no volume, so every keyword not
tracked goes through Route A, B or C.

### Route A: the user's list
Use every keyword exactly as written (spelling, prefixes, word order). Check it carries country
volume with a source and month. Missing global volume: add it from an Ahrefs Keywords Explorer
export of the list. Older than the current month: re-check (an old client list has been 5 to 10x
wrong).

### Route B: Ahrefs through `ahrefs-navigator` (browser only)
Invoke the `ahrefs-navigator` skill and ask it for these exports, CSV UTF-8, with the Global
volume column kept:

1. Keywords Explorer, **Matching terms** for the seed, country `<cc>` (terms match; add a volume floor if the result is large).
2. Keywords Explorer, **Questions** (`matchingTermsReport=questions`) for the seed, same country.
3. Keywords Explorer, **Related terms** for the seed, same country.
4. For a competitive topic, the **Keyword overview SERP overview** export for the primary keyword (position, URL, DR, traffic, words). Use it as the strength context and as the SERP fallback.

Rules it enforces and you must not override: no Ahrefs MCP or API call, ever; never the Language
filter (it silently drops Hebrew keywords tagged "Not detected"; the country scopes the market);
state planned exports and row counts before exporting; work from the files, not the screen. Keep
the raw exports beside the brief so numbers can be traced.

From the exports, keep keywords that match the topic and intent of one informational page. Group
question keywords by theme: questions drive the structure. Flag brand and navigational terms.

### Route C: DataForSEO volume (only with approval when Ahrefs is blocked)
Google Ads search volume, live, one task per up to 1,000 keywords, with the market's
`location_name` and `language_name`. It returns country volume only: write `n/a` in Global volume
and say so.

### GSC queries
`search_gsc_queries` shows the client's own demand and ranking. It is never the only demand source.

### Free fallback: Google autocomplete and related searches
When no keyword tool is available, Google autocomplete suggestions and the related searches at the
foot of a results page can supply keyword ideas: **ideas only, no volume**. Label them "Google
autocomplete, `<country>`, `<date>`" in the keyword table (volume `not measured`) and in Sources
and scope. They never replace a measured primary keyword volume (house rule 4).

## 4. Building the query set (step 2.2)

1. Cluster keywords that a single SERP would answer: singular and plural, spelling variants, word-order variants, and Hebrew prefix variants (ה, ו, ב, ל, מ, ש attached to the same word).
2. Pick the highest-volume member of each cluster as its representative query.
3. Pull SERPs for representatives in volume order, at most 15. Low-volume long tails stay in the keyword table without their own SERP.
4. Always include the primary keyword and the top question keyword.

## 5. SERP pulls (step 2.3)

### 5.1 SurgeOS SERP export (primary)

A queue-based job pulling live Google results for up to 1,000 keywords; two calls.

1. **List first:** `get_serp_export` without `jobId` lists the team's recent exports. A same-day export for the same keywords and market is reused (record its `jobId`, cost $0); never pay twice.
2. **Start:** `run_serp_export`, one export per brief with all representative queries (at most 15):

| Parameter | Value |
|---|---|
| `keywords` (required) | the representative queries, exactly |
| `country` (required) | the market's country (section 13; check the accepted format in the tool's schema) |
| `language` | the SERP language |
| `depth` | 20 (allowed: 10, 20, 30, 50, 100; default 10) |
| `device` | `mobile` unless the user says otherwise (`desktop` or `mobile`) |
| `client` | the brief's client: adds the client's own position for every keyword |
| `waitForAiOverview` | true |

   Cost: about $0.0006 a keyword at depth 10 (owner, 2026-10-26), deeper pages cost more; read the price from the tool's answer or estimate at run time, never from this file. It is charged to the agency's shared DataForSEO budget.
3. **Name it clearly** (for example `brief research: <topic>: <market>`) where the tool allows a name. Every export is visible to the whole team in the SERP Explorer history (app.cutinside.com/serp): internal, not client-visible, so no H5 is needed.
4. **Poll:** `get_serp_export` with the `jobId` until the job is done. Results take a few minutes: never busy-loop; in Claude Code use a short background wait between polls. A job that fails or stays stuck: fall back to 5.2 and re-estimate at H2.
5. **Read per keyword:** organic results, SERP features, People Also Ask, AI Overview text and its sources, related searches, ads, the client's position.

What to keep from the results:

- **Organic top 10** (URL, rank) per query: build `serp_rows.csv` (section 6); volume comes from the keyword list, never from the export.
- **PAA:** every question into the FAQ pool (section 10).
- **SERP features:** recorded per query as OBSERVED, with the date. This replaces the "not observed / answer-first bet" fallback when the export succeeded.
- **AI Overview:** present or absent per query, a one-line gist of what it says, and its cited sources (full URLs). Goes on the AI Overview line in Search intent and SERP; the cited sources are evidence candidates for citable facts (read a source before citing it).
- **Related searches:** keyword ideas only, no volume (label as ideas).
- **Client position:** flags a refresh or cannibalisation at step 3 (section 11).
- **Ads:** a commercial signal for the intent verdict only.
- **`jobId` and cost:** into Sources and scope and the final message.

### 5.2 DataForSEO SERP (fallback)

DataForSEO SERP, Google organic, **live advanced**, one task per representative query, only when
the export is unavailable, failed or stuck. Then Ahrefs SERP overview through `ahrefs-navigator`,
then web search, labelled as in section 1.

| Parameter | Value |
|---|---|
| `keyword` | the representative query, exactly |
| `location_name` (or `location_code`) | the market's country (table in section 13) |
| `language_name` (or `language_code`) | the SERP language; Hebrew is `iw` |
| `depth` | 20 |
| `device` | mobile, as for the export, unless the user says otherwise |

From each response record:

- **Organic results:** items with `type` = `organic`, the first 10, with `url` and `rank_absolute` (the app scores on `rank_absolute`).
- **People Also Ask:** every `people_also_ask` item's question title.
- **SERP features present:** the item types actually returned, for example `featured_snippet`, `people_also_ask`, `video`, `images`, `knowledge_graph`, `ai_overview`, `related_searches`, `discussions_and_forums`, `top_stories`. Record them per query with the date. Never add a feature that was not returned.
- **Related searches:** keep them as FAQ and gap candidates.
- **The `cost` field:** add it to the run total.
- **AI Overview:** if an `ai_overview` item is returned, record its gist and sources as in 5.1.

Pause between calls if the connector rate-limits; retry a failed call up to 3 times; never pull the
same query twice in one run.

## 6. Scoring (step 2.4)

The app's formula, unchanged:

```
rank_weight(rank) = max(1, 21 - rank)     rank 1 = 20 ... rank 20 or worse = 1
for each pulled query, for each URL in its organic top 10:
    score[url] += volume(query) x rank_weight(rank)
    rankings[url].append((query, rank, volume))
take the top 10 URLs by score
```

A page that ranks for many high-volume queries at high positions wins. A query with no measured
volume counts as volume 0: it adds a ranking record but no score. Brand (excluded) queries are not
scored.

Build `serp_rows.csv` with exactly these columns, one row per top-10 organic result per pulled query:

```
keyword,volume,url,rank
<representative query>,<its country volume>,https://www.example.com/page,3
```

`volume` is the representative query's own measured country volume (not a cluster sum). Then run:

```
python scripts/score_competitors.py serp_rows.csv --exclude-domain <client domain> --top 10
```

**No measured volumes** (web-search or autocomplete route): pass `--rank-only`. Every row is then
weighted as volume 1 (score = sum of max(1, 21 - rank)) and the output header says "rank-only
score, volumes not measured". The script switches to rank-only by itself, with a printed notice,
when every volume in the file is 0 or missing. Write the same label next to the competitor table in
the brief.

It also accepts a JSON list of objects with the same four keys, prints a Markdown table (URL,
weighted score, the queries it ranks for with rank and volume), and with `--json scores.json`
writes the result for later steps. Useful extra flags: `--priority-url <url>` (repeatable) for the
pages the user named, so they are always shown and marked; `--exclude-keyword <term>` (repeatable)
to drop brand queries from scoring; `--flag-domain <domain>` (repeatable) to mark extra UGC, video
or encyclopedia domains as intent signals. Client domains listed with `--exclude-domain` are
reported separately, which is how you spot a client page in the top 10. Paste its table into the working notes; use its numbers in the
brief's competitor table.

## 7. Exclusions and flags (step 2.5)

| Result | Treatment |
|---|---|
| The client's own domain | Excluded with `--exclude-domain`. If a client URL ranks top 10 for the primary query, flag a refresh at H3 |
| Forums and UGC (Reddit, Quora, community forums, social groups) | Keep in the scored table marked "intent signal"; not in the outline-against set; replace with the next editorial page |
| Wikipedia, dictionaries | Same: intent signal (definition-led SERP) |
| Video platforms | Same: intent signal; supports a video block if a video feature is present |
| Marketplaces, product and category pages | Intent signal for a commercial or transactional verdict |
| A known competitor from the brand context | Keep and mark "known competitor" |
| Duplicate URLs (tracking parameters, trailing slash) | Merge before scoring |

When four or more of the top 10 for the primary query are forums, UGC, Wikipedia or video, say so
in Search intent and SERP: the editorial field is weak, which is an opportunity.

## 8. Reading pages (step 2.6)

At most 10 pages, priority pages first, then by score.

### 8.1 SurgeOS crawler for competitor pages (primary)

`request_crawl` accepts URLs outside the client's domain, but ONE DOMAIN PER CRAWL: a list mixing
domains is rejected. One request per competitor domain (usually one URL each):

| Parameter | Value |
|---|---|
| `mode` | `list` |
| `urls` | the competitor URL(s) on that one domain |
| `client` | the brief's client |
| `maxUrls` | the number of URLs in the list |
| `priority` | 7 |
| `title` | `brief research: <topic>: <domain>` |
| `renderJavaScript` | only if the page needs it (slower; waits for crawler memory) |

It is queued on the shared office crawler, one crawl at a time: check `get_crawls` for the queue
(a 1-URL crawl took about 35 s on 2026-10-26). Read the result with `get_crawl` (`status`,
`possiblyBlocked`) and `get_crawl_file` with `export` = `internal_all`, the crawl's `jobId`, and
`columns`: Address, Status Code, Indexability, Title 1, Meta Description 1, H1-1, H2-1, H2-2, Word
Count, Language, Canonical Link Element 1.

This gives a reliable Word Count (used for the length target, SKILL.md step 5.1) and the title,
meta and H1. It does NOT give the full H2/H3 tree or the body text, so the digest still needs the
page text: WebFetch the URL for headings and body. If WebFetch is refused (403) but the crawl
succeeded, use the crawl's fields and label the digest partial; never invent content. Record
every crawl id for Sources and scope.

**The client's own site** (coverage check, section 11): the latest site crawl already holds the
client's pages; `get_crawl_pages` or `get_sitemap_urls` with `search` finds topic pages at no extra
cost. Do not queue a new client crawl for a brief.

### 8.2 Fallbacks

WebFetch alone (label it); DataForSEO on-page **content parsing, live**, with JavaScript rendering
on (`enable_javascript: true`), when WebFetch is refused and the crawl failed, with approval of
its cost.

Per-page record (keep it in the working notes; the brief uses it for the competitor table, gaps,
covered by, and the top 3):

| Field | How |
|---|---|
| URL, weighted score, queries it ranks for | from the score table |
| H1, H2s, H3s | from the parsed headings |
| Word count | the crawl's Word Count; otherwise a whitespace-split count of the main content text (not nav, footer, comments) |
| Content type and domain type | guide, listicle, definition, tool, forum; brand, publisher, affiliate, UGC, institution |
| Digest | 90 to 130 words, below |
| Read status | read (crawl + WebFetch), crawl only (digest partial), read without JS, failed (dropped); crawl id |

**Digest form** (the app's own instruction): "In 90-130 words, summarize this competitor page for
an SEO strategist. Cover, in order: (1) what it covers (scope/subtopics), (2) its angle or point of
view, (3) its notable strengths, (4) gaps, weaknesses, or thin spots, (5) any concrete facts,
stats, or examples worth beating. Be specific and concrete. Do not invent details that are not
present." No preamble, no headings.

A page that returns no meaningful text (word count 0, a block page, a login wall) is dropped as
evidence. Read the next page by score if the budget allows. Never describe a page you did not read.

## 9. Top 3 ground truth (step 2.7)

1. All priority ("starred") pages the user named first.
2. Then the highest weighted scores, skipping intent-signal results, until there are 3.
3. Read these three in full (body text, not only headings): they set the table stakes, the competitive word count and the bar to beat.
4. Fewer than 3 readable editorial pages: read further down the score table. If it still falls short, say so at H3; never list a page you did not read.

Ground-truth pages must be on the topic (not an adjacent asset class, product or subject) and in
the brief's market language, unless none exists. When you prefer a lower-scored page to a
higher-scored one, say why in the brief (for example "the #2 page is about a different coin's
crash, so #5 is read instead").

Priority pages get significantly more weight in every later step; mention them in reasoning when
they shaped a decision.

## 10. PAA, related searches and questions

Collect every PAA question from the SERP export (or every fallback pull), de-duplicate (case and punctuation), drop questions
off the page's intent, and keep the language of the brief. Add related searches and the question
keywords from the keyword list. This pool feeds the FAQ set (step 5) and PAA-style in-body blocks.
AI Overview cited sources are evidence candidates for citable facts in the Fact and source bank;
read each one before citing it.

## 11. Cannibalisation and site coverage (step 2.8)

**GSC data-break rule (applies here and to section 12).** Default window: the last 3 full months.
Google's Search Console impressions logging error runs from 2025-05-13 to 2026-04-27. Never quote
impressions, CTR or position from a window that overlaps it without the caveat "spans the GSC
impressions logging error 2025-05-13 to 2026-04-27"; prefer windows starting 2026-04-28 or later.
Clicks are less affected but carry the same caveat when compared across the break. Always read and
respect the `dataNotes`, `compareNote` and `rangeNote` that SurgeOS returns with a result: when one
says two periods are not comparable, do not compare them.

1. The client's own position per query from the SERP export (`client` set): a top-10 position for the primary query flags a refresh; a lower one, cannibalisation risk.
2. `gsc_query_page` for the primary keyword on the client's property, a closed window of the last 3 full months: which client URL gets impressions, at what position.
3. `search_gsc_queries` with the topic's stem (contains or regex): queries the client already ranks for nearby.
4. `search_gsc_pages` for URLs containing the topic's slug words.
5. The latest site crawl: `get_crawl_pages` or `get_sitemap_urls` with `search` = the topic's slug words (free, no new crawl).
6. `site:<client domain> <topic>` web search for pages GSC may miss (new or unindexed).

| Finding | Action |
|---|---|
| No client page on the topic | New page; continue |
| A client page in the top 10 for the primary query | Refresh, not a new page: flag at H3 |
| A client page covers the topic, ranks below 10 | Cannibalisation risk: the person decides at H3. If they choose a new page, re-choose the primary for the distinct sub-intent (SKILL.md step 3) |
| Client pages on adjacent topics | Internal link candidates (section 12) |

## 12. Internal link candidates (step 2.9)

From `search_gsc_pages` and `search_gsc_queries`: client URLs with impressions on related queries,
sibling articles in the same cluster, and the commercial page that "route, do not target" keywords
should link to. Write them as full absolute URLs with a suggested anchor and placement. Use only
URLs seen in the data (indexable, receiving impressions). A link the article needs but the data
does not show becomes `[INTERNAL LINK: anchor -> topic]`.

## 13. Market codes (verify at run time)

| Market | DataForSEO `location_name` / `location_code` | DataForSEO `language_name` / `language_code` | Ahrefs country | Google |
|---|---|---|---|---|
| Israel, Hebrew | Israel / 2376 | Hebrew / `iw` | `il` | google.co.il |
| United States, English | United States / 2840 | English / `en` | `us` | google.com |
| United Kingdom, English | United Kingdom / 2826 | English / `en` | `gb` | google.co.uk |

The SurgeOS SERP export takes `country` and `language`: confirm the accepted values in the tool's
schema at first use for a market. Codes change rarely but do change: confirm them against DataForSEO's locations and languages lists
(free) or the Ahrefs country selector before the first pull of a new market. Hebrew uses `iw`, not
`he`, in DataForSEO. An Israeli client with an English-language market is a separate market row:
ask, never assume.

## 14. Cost arithmetic and guards

1. Before H1: list recent SERP exports (reuse a same-day match); read the export's price per keyword at depth 20 from the tool's answer or estimate; read balance and fallback prices with `appendix/user_data` when a DataForSEO line is planned (the export draws on the same budget).
2. Estimate: SERP export = queries x price per keyword at the chosen depth (from the tool; $0 when reused); crawls = count only (office crawler, no DataForSEO cost); and only for fallback lines actually used: DataForSEO SERPs = queries x 2 pages (depth 20) x price per SERP page; page reads = pages x price per content parse; volumes = tasks (one per up to 1,000 keywords) x price per task. SurgeOS tracked-keyword volumes are free.
3. Caps per brief: one SERP export of at most 15 queries, 10 page reads, no re-fetches.
4. Threshold: $1 (SERP export plus DataForSEO fallbacks) or 5,000 Ahrefs API units per run (the skill uses no API units). Above it, H2.
5. Track: the export `jobId` and its cost from the tool; every crawl id; the `cost` field of every DataForSEO response; the Ahrefs export count. Report them in Sources and scope and in the final message, beside the estimate.
6. For scale only: about $0.0006 a keyword at depth 10 on the SERP export (owner, 2026-10-26); deeper pages cost more. Never quote it as a price; use what the tool and `appendix/user_data` return.
