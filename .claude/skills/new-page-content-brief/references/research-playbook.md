# Research playbook (read before step 2)

Tools, parameters and records for the research step of `new-page-content-brief`. Everything here
serves one rule: every number in the brief comes from a tool call made in this run, with its
source, geo and date. Prices, codes and quotas move; read them at the point of use.

## 1. Tools per step

| Step | Question | First choice | Fallback | Cost |
|---|---|---|---|---|
| Client context | voice, do's and don'ts, banned and preferred terms, known competitors, playbook rules | SurgeOS `list_clients`, `get_documents`, `get_seo_knowledge`; the client's AI Brain on Drive (`00. AI Brain`: principles, decisions-log) | ask the user for brand notes | none |
| Cannibalisation and site coverage | does a client page already rank for or cover this topic? | SurgeOS `gsc_query_page`, `search_gsc_queries`, `search_gsc_pages` | `site:<client domain> <topic>` web search | none (shared BigQuery budget) |
| Keyword list | which keywords and volumes the brief targets | the user's list, or Ahrefs Keywords Explorer through `ahrefs-navigator` (browser export, country and global volume) | DataForSEO Google Ads search volume for a list; GSC queries only for the client's own demand | Ahrefs: browser exports, no API units; DataForSEO: one flat price per task |
| SERP per query | top-10 organic URLs and ranks, PAA, SERP features | DataForSEO SERP Google organic, live advanced, depth 20 | Ahrefs SERP overview export through `ahrefs-navigator`; web search as last resort | DataForSEO per SERP page of 10 |
| Competitor strength | is a winner strong because of the page or the domain? | Ahrefs SERP overview export (DR, traffic per URL) for a competitive topic | skip; the score stands on volume x rank | browser export |
| Page content | headings, word count, body text | DataForSEO on-page content parsing, live, JavaScript rendering on | WebFetch of the URL | DataForSEO per page |
| Internal links | real client URLs to link to | SurgeOS `search_gsc_pages`, `search_gsc_queries` | `[INTERNAL LINK: anchor -> topic]` placeholders | none |
| Balance and prices | can we afford the plan? | DataForSEO `appendix/user_data` | none: without it, ask before spending | free |

DataForSEO MCP tool names vary by install: look for the organic live SERP tool (named like
`serp_organic_live_advanced`), the content-parsing tool (named like `on_page_content_parsing`), the
Google Ads volume tool (named like `keywords_data_google_ads_search_volume`) and the user-data tool
(named like `appendix_user_data`). If no DataForSEO connector is present, use the fallbacks and
label the data as below.

### Confidence labels (write them into Sources and scope and next to affected figures)

| Data came from | Label |
|---|---|
| DataForSEO live SERP with the market's location and language | located SERP, `<date>` |
| Ahrefs SERP overview export | Ahrefs SERP snapshot, `<country>`, `<date of Ahrefs crawl>` (may lag the live SERP) |
| Ahrefs overview read from screen (no export control) | Ahrefs SERP read from screen, `<date>` |
| Web search | approximate ranks (web search, not a located SERP), `<date>`; SERP features not observed |
| WebFetch page read | page read without JS rendering; word count approximate |
| GSC through SurgeOS | GSC `<property>`, `<country or all>`, `<start>` to `<end>` |

## 2. Client context (step 1)

1. `list_clients` with the client's name, id or domain. Record domain(s), deliverable language, market.
2. `get_documents` for brand guidelines, tone references, product briefs; `get_seo_knowledge` for playbook rules on content and AI search.
3. Search Drive for the client's `00. AI Brain` folder: read principles and `decisions-log.md` for rulings on briefs (naming bans, schema choice, claims, standing topic checks, CTA rules). These feed the Accuracy and brand guardrails section.
4. Note known competitors so you can flag them when they appear in the SERP.

## 3. Keyword list (step 2.1)

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

## 4. Building the query set (step 2.2)

1. Cluster keywords that a single SERP would answer: singular and plural, spelling variants, word-order variants, and Hebrew prefix variants (ה, ו, ב, ל, מ, ש attached to the same word).
2. Pick the highest-volume member of each cluster as its representative query.
3. Pull SERPs for representatives in volume order, at most 15. Low-volume long tails stay in the keyword table without their own SERP.
4. Always include the primary keyword and the top question keyword.

## 5. SERP pulls (step 2.3)

DataForSEO SERP, Google organic, **live advanced**, one task per representative query:

| Parameter | Value |
|---|---|
| `keyword` | the representative query, exactly |
| `location_name` (or `location_code`) | the market's country (table in section 13) |
| `language_name` (or `language_code`) | the SERP language; Hebrew is `iw` |
| `depth` | 20 |
| `device` | desktop (default) unless the client's audience is mobile-first and the user asks |

From each response record:

- **Organic results:** items with `type` = `organic`, the first 10, with `url` and `rank_absolute` (the app scores on `rank_absolute`).
- **People Also Ask:** every `people_also_ask` item's question title.
- **SERP features present:** the item types actually returned, for example `featured_snippet`, `people_also_ask`, `video`, `images`, `knowledge_graph`, `ai_overview`, `related_searches`, `discussions_and_forums`, `top_stories`. Record them per query with the date. Never add a feature that was not returned.
- **Related searches:** keep them as FAQ and gap candidates.
- **The `cost` field:** add it to the run total.

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

DataForSEO on-page **content parsing, live**, with JavaScript rendering on (`enable_javascript:
true`), at most 10 pages, priority pages first, then by score. Fallback: WebFetch (label it).

Per-page record (keep it in the working notes; the brief uses it for the competitor table, gaps,
covered by, and the top 3):

| Field | How |
|---|---|
| URL, weighted score, queries it ranks for | from the score table |
| H1, H2s, H3s | from the parsed headings |
| Word count | whitespace-split count of the main content text (not nav, footer, comments) |
| Content type and domain type | guide, listicle, definition, tool, forum; brand, publisher, affiliate, UGC, institution |
| Digest | 90 to 130 words, below |
| Read status | read, read without JS, failed (dropped) |

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

Priority pages get significantly more weight in every later step; mention them in reasoning when
they shaped a decision.

## 10. PAA, related searches and questions

Collect every PAA question from every pull, de-duplicate (case and punctuation), drop questions
off the page's intent, and keep the language of the brief. Add related searches and the question
keywords from the keyword list. This pool feeds the FAQ set (step 5) and PAA-style in-body blocks.

## 11. Cannibalisation and site coverage (step 2.8)

1. `gsc_query_page` for the primary keyword on the client's property, a closed window of the last 3 full months: which client URL gets impressions, at what position.
2. `search_gsc_queries` with the topic's stem (contains or regex): queries the client already ranks for nearby.
3. `search_gsc_pages` for URLs containing the topic's slug words.
4. `site:<client domain> <topic>` web search for pages GSC may miss (new or unindexed).

| Finding | Action |
|---|---|
| No client page on the topic | New page; continue |
| A client page in the top 10 for the primary query | Refresh, not a new page: flag at H3 |
| A client page covers the topic, ranks below 10 | Cannibalisation risk: the person decides at H3 |
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

Codes change rarely but do change: confirm them against DataForSEO's locations and languages lists
(free) or the Ahrefs country selector before the first pull of a new market. Hebrew uses `iw`, not
`he`, in DataForSEO. An Israeli client with an English-language market is a separate market row:
ask, never assume.

## 14. Cost arithmetic and guards

1. Read balance and prices with `appendix/user_data` before H1.
2. Estimate: SERP pulls = queries x 2 pages (depth 20) x price per SERP page; page reads = pages x price per content parse; volumes = tasks (one per up to 1,000 keywords) x price per task.
3. Caps per brief: 15 SERP pulls, 10 page reads, no re-fetches.
4. Threshold: $1 of DataForSEO or 5,000 Ahrefs API units per run (the skill uses no API units). Above it, H2.
5. Track: sum every response's `cost` field; count Ahrefs exports. Report both in Sources and scope and in the final message, beside the estimate.
6. Last seen in the agency's connectors guide, for scale only: $0.0006 a SERP page of 10 results in the standard queue (live costs more). Never quote it as a price; use the numbers `appendix/user_data` returns.
