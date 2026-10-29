---
name: new-page-content-brief
description: >-
  Produces an SEO content brief (not the article) for one NEW informational article (guide, "what
  is", "how to") as two linked Google Docs from one research pass: a gold-length writer brief a
  writer can execute without further research, and the full research brief behind it: questions first,
  live SERP research (SurgeOS SERP export and crawler, DataForSEO, Ahrefs via ahrefs-navigator),
  competitor scoring, intent verdict, editorial angle, gaps, a nested outline with section angles,
  word budgets and snippet targets, FAQs, on-page SEO, E-E-A-T, a self-check, and human checkpoints.
  Use for "brief for X", "content brief", "article outline", "make briefs (n/27)", "create 3
  briefs", "check and send new briefs", "בריף", "בריף תוכן", "בריף לכתבה", "יצירת N בריפים"; a
  numbered batch is one brief per topic. Not for: commercial or transactional pages (it stops and
  says so), refreshing a page that already ranks (existing-article-content-refresh), writing the
  article (blog-article-draft), or a SurgeOS agent task end to end (agent-content-briefs).
---
<!-- PROVENANCE: where this skill came from, so a future reader can judge it. -->
> **Provenance.** Written 2026-10-20 for the agency, from: the Content Brief Generator app's brief
> pipeline (its server prompts for the 7 brief steps, its competitor scoring and digests, its
> validator and its export layout), the owner's Brief Template (EN/HE), and a review of 9 past
> informational briefs across 7 clients and their decisions-logs (anonymised). Wording reused from
> our own agent-content-briefs skill where it was good. Approved by the skill owner (contract,
> 2026-10-20). QA pending (Phase 5).
> 2026-10-26: SurgeOS SERP export and any-URL crawler added as the primary research route (round-1 QA ran without them).
> 2026-10-26: QA round 2 fixes (crawler cap, override primary, keyword sourcing without a volume tool, length vs required items, export price, AI Overview answer blocks, one pre-H1 message, transliteration merging, medical and finance compliance TODO, verified competitor weaknesses, Covered by read pages only, indexed sitemap URLs, Hebrew On Page SEO label, branded template at H4).
> 2026-10-28: owner verdict: outputs split into a gold-length writer brief (human) and the full research brief (internal and machine writing); concise variant removed.
> 2026-10-28: QA round 3 fixes (RTL HTML delivery, market-language primary, angle-bracket guard, Hebrew compliance line, collapsed do-not-target rows).
> 2026-10-29: owner: do-not-target lines explain why and link; a client page in the top 10 for the head term routes to a refresh unless a separate page on a named sub-intent is requested.

# New page content brief (informational, v0.1)

A brief is the plan a writer follows without opening a SERP. The failure mode is averaging the
SERP: covering what everyone covers, phrased how everyone phrases it. Everything below exists to
prevent that, and to make every number in the brief traceable to a tool call made in this run.

**What this skill produces:** per topic, in the client's language, two linked Google Docs from one
research pass:

- **Writer brief** (the main deliverable, what goes to a client or freelancer; gold-brief length,
  readable in five minutes): `assets/writer-brief-template.md` (Hebrew `-he`). Distilled from the
  research brief at step 7b.
- **Research brief** (internal: the agency record, the strategist's review copy, and the input for
  machine writing with `blog-article-draft`; never sent to the client unless the person asks):
  `assets/brief-template.md` (Hebrew `-he`), every section with its reasoning and evidence.

**Brief only:** never draft article copy (several clients' contracts are brief-only; drafting is
`blog-article-draft`). Both briefs describe the TARGET page only; anything about a current page goes
in a companion note. No Open Items section: decisions are settled with the person at H3 and H4. The
research brief stays at 15 pages or fewer; the writer brief keeps to the step 7b length budget.

**Who does what:** Claude does the research and writing with its tools (SurgeOS SERP export and
crawler first; DataForSEO MCP and Ahrefs as fallbacks); Ahrefs work happens in a browser through
the `ahrefs-navigator` skill (never the Ahrefs MCP or API); the person decides at the six
checkpoints below.

**What the research brief contains** (house format; the templates hold the exact labels):

1. Title line (the writer title plus ` | research`; writer title `<Topic> - Content Brief | <Client>`, Hebrew `<topic> - בריף יצירת תוכן | <client>`, unless the client's brain sets a document naming rule: step 7), header block (date, market and language, prepared by role, "Research brief" with a link to the writer brief) and relevant links.
2. Brief at a glance: intent and format, editorial angle, word count, primary keyword, title and H1.
3. Accuracy and brand guardrails (only when the client has rules).
4. Strategy and goals: page goal, target audience, editorial angle.
5. Search intent and SERP: verdict, format, features observed, source and date.
6. Keyword strategy: the typed keyword table with country and global volume, a source line, the rationale.
7. Competitive analysis: differentiation summary, scored competitor table, top 3 read in full.
8. Content gap analysis: table stakes and strategic opportunities with evidence.
9. On-page SEO table: meta title, meta description, URL slug, H1, OG title, OG description.
10. Article structure: total and FAQ allowance; nested outline with angle, guidelines, keywords, word count, covered by, snippet target, resources.
11. FAQs, Conclusion and CTA, internal and external links, E-E-A-T signals, writer notes, technical notes, sources and scope.

**What the writer brief contains:** header (title, date, market, link to the research brief);
Strategy summary (about 150 words: intent and format, what wins the SERP, our angle, the 3 gaps we
exploit, guardrails); keyword table (Type, Keyword, Monthly searches, Placement) with one source
line; on-page table (Element, Recommendation, Chars); the full outline, each item with heading,
one-line angle, 2 to 4 imperative guidelines, word count, and a snippet target or resource only
where present; FAQs (one-line guideline each); internal links (anchor, URL); writer notes (tone, top
do's and don'ts, E-E-A-T and YMYL items, every TODO); CTA. No competitor table, gap evidence,
reasoning, SERP detail or source bank: those stay in the research brief, linked.

Reasoning lines appear in the research brief only. Both briefs' prose follows the voice rails and
banned-phrase list the brief gives the writer: a writer copies the brief's wording.

## House rules (verbatim, apply to everything you write)

1. No em-dash in anything client-visible, ever. Use a comma, a colon or a new sentence.
2. Full absolute URLs in recommendation and dev-task documents.
3. "Key Events", never "Conversions" for GA4.
4. Every number carries its source, geo scope and date range, and comes from a tool call, never from memory. Name what you did not measure.
5. State the standing recommendation you are changing.
6. Do not sell an outcome you cannot show.
7. The deliverable is in the client's language; the skill's own instructions stay in English.

## Files in this folder

| Path | Read or run when |
|---|---|
| `references/research-playbook.md` | before step 2 (research): tools, parameters, scoring, digests, market codes, cost |
| `references/brief-rules.md` | before step 4 (strategy), again before step 6 (outline), and section 17 before step 7b (writer brief) |
| `references/examples.md` | before step 7 (writing the Doc): format examples only, never content to copy. QA cases must be held out of examples.md: never test the skill on a topic whose gold is excerpted there |
| `assets/brief-template.md` | at step 7, the research brief (English) |
| `assets/brief-template-he.md` | at step 7, the research brief (Hebrew) |
| `assets/writer-brief-template.md` | at step 7b, the writer brief (English) |
| `assets/writer-brief-template-he.md` | at step 7b, the writer brief (Hebrew) |
| `scripts/score_competitors.py` | at step 2, after the SERP pulls |
| `references/qa-rubric.md` | before step 8 (self-check) |
| `scripts/check_brief.py` | at step 8, on both briefs (`--type research`, `--type writer --pair`) |
| `scripts/md_to_html.py` | at step 9: Markdown to HTML for the Doc upload (always for Hebrew, `--lang he`; upload its output unchanged), and `--verify` (text diff, font, RTL, word count) on every Doc's HTML export |
| `evals/qa-log.md` | never at run time; maintenance only (QA rounds) |

## Step 0: Ask first (one message)

Ask in the user's language, numbered, in one message. Skip what the user already said; never
assume a market from the domain.

1. Which client, and which market: SERP country, SERP language, and the brief's language?
2. What is the topic or main keyword? Do you have a keyword list with volumes, or should I build one from Ahrefs (browser export through ahrefs-navigator, global and local volume)?
3. Is there a target length, or should the competitors' depth decide?
4. Are there pages you want weighted heavily (references, competitors you rate), or a page whose structure the brief should follow?
5. Who will write it: an internal writer, the client, a freelancer, or a machine (`blog-article-draft`)? (Every run makes both a writer brief and a research brief; the answer sets the writer brief's tone and assumed knowledge, and whether the research brief is shared with the writer.)
6. Where should the Doc go (the client's content folder, or a link you give me)?

"Check and send new briefs": if briefs from an earlier run exist, read them and start at step 8 for
each; otherwise treat it as a batch request (see Batch mode).

## Step 1: Client context, plan and cost

1. Resolve the client with SurgeOS `list_clients` (id, name or domain). Note the client's domain (for exclusion), deliverable language and market.
2. Read brand context: SurgeOS `get_documents` (tone, brand guidelines, product briefs), `get_seo_knowledge` (agency playbook), and the client's AI Brain on Drive (`00. AI Brain`: principles, decisions-log). Extract: voice and tone, do's and don'ts, banned and preferred terms, known competitors, claims the client cannot support, schema rules, standing checks for this topic family. No brand material at all: ask the user for brand notes.
   - **A file too large to read whole** (a long decisions-log, for example): download it and grep it for the topic terms plus "availability", "launch", "product brief", "do not", "never". Never skip it unread.
   - **Product briefs:** search the client's Drive folder for product briefs on the topic (availability by market, launch status, claims). Read past content briefs on the same topic for overlap and cannibalisation; never copy from them.
   - List every file you read (and what you grepped) in Sources and scope.
3. Choose the keyword route from this table:

| Situation | Route |
|---|---|
| Keywords the client already tracks in SurgeOS | Check first, free: `get_search_visibility_keywords` / `get_keyword_rankings` give volume and live rank. Never add keywords to Search Visibility tracking for a brief (recurring cost, writes into the client project) unless the person asks |
| User supplies a list with country volumes measured this month | Use it exactly as supplied; add global volume if missing (Ahrefs export) |
| User list is older than the current month, or has no source or date | Re-check volumes live (Ahrefs through ahrefs-navigator if a browser is available; otherwise DataForSEO Google Ads search volume). Old lists have been 5 to 10x wrong |
| User asks Claude to build the list | Ahrefs Keywords Explorer through `ahrefs-navigator`: matching terms, questions, related terms; CSV export with country and global volume |
| Ahrefs browser route blocked (session kicked, no browser) | Stop and ask: re-login, wait, or DataForSEO volume with explicit approval. Never offer the Ahrefs MCP |
| Only the client's GSC queries are available | Not enough on its own: GSC shows the client's demand, not the topic's. Run a demand check on the top keywords from Ahrefs or DataForSEO as well |
| No volume tool at all (no Ahrefs browser, no DataForSEO) | Say so once, in the pre-H1 message. Candidate keywords come only from: user strings, client GSC queries (last 3 full months), SurgeOS tracked keywords, and the PAA questions and related searches the export returns. Model-proposed seed queries may go into the export (at most 5, labelled "seed") but enter the keyword table only if the export or GSC shows them. Every volume "not measured" |

   The SERP export does NOT return search volume: volumes always come from this table.
4. List recent SERP exports with SurgeOS `get_serp_export` (no `jobId`, free). A same-day export for the same keywords and market is reused, never paid for twice. **Price per keyword** = cost / keywords of the most recent export in that list with the same depth, device and `waitForAiOverview`; if none exists, use the tool's documented schedule and say "estimate, no same-config export". Never multiply by an assumed factor (a depth-20 guess missed by 31%). When a DataForSEO fallback line is in the plan (or the connector is present), read the balance and prices with `appendix/user_data` (free): the export draws on the same agency DataForSEO budget. Never take prices from memory or from this file.
5. Read the crawler's remaining daily budget: the office crawler has a shared daily write cap (20 crawl writes a day on 2026-10-26, for the whole agency). Read it from `get_crawls` or the last refusal message.
6. Write the plan: keyword route, the representative queries for the one SERP export (at most 15), device (mobile unless the user says otherwise), the pages you will read (at most 10, WebFetch first) and the crawls (at most 3 competitor domains, step 2.6), the tools per step, and the cost arithmetic below.
7. **One message before H1.** Between Step 0 and H1 send at most one message, combining: past briefs found, the list's age and the re-check route (when no re-check tool exists, say so; do not ask whether to re-check), missing connectors and the proposed fallback, and the offer to add observed keywords. H1 itself may be that message.

**Cost guard (show the arithmetic at H1):**

```
SERP export: <q> queries x $<price per keyword at depth 20, from the tool> = $<a>
             (or: reusing same-day export <jobId>, $0)
Crawls:      <k> of <remaining> daily crawl writes left (shared agency cap; at most 3 per brief; no DataForSEO cost)
Fallbacks (only lines actually used; prices from appendix/user_data at <time>, balance $<balance>):
  DataForSEO SERPs:  <q2> queries x 2 pages (depth 20) x $<price per SERP page> = $<b>
  Page reads:        <p> pages x $<price per content parse>                   = $<c>
  Volumes:           <t> tasks (up to 1,000 keywords each) x $<price per task>  = $<d>
Total: $<a+b+c+d> against a threshold of $1.00
Ahrefs: <n> browser exports, 0 API units (threshold 5,000 units; this skill uses none)
```

For scale only (owner, 2026-10-26): the SERP export costs about $0.0006 a keyword at depth 10;
the price always comes from a same-config recent export or the tool (step 1.4), never from this file.
At the caps (15 queries, 10 page reads) a typical brief costs a few cents. Guards: one SERP export
per brief, at most 15 queries in it (merge spelling variants into one representative query;
low-volume long tails stay in the keyword table without their own SERP), at most 10 page reads,
never re-fetch a SERP or page already pulled in this run.

**Checkpoint H1:** show the plan and the cost arithmetic. The person says go, change or stop.
Spend nothing before this answer.

**Checkpoint H2:** if the estimate is above $1 (SERP export plus any DataForSEO fallback; or would use any Ahrefs API units),
or if the run later needs more pulls than the approved plan, stop, show the new arithmetic and the
balance, and wait for approval of the spend.

## Step 2: Research

Before this step, read `references/research-playbook.md`. It has the exact tool names, parameters,
fallbacks, the per-page record and the market codes.

1. **Keyword list.** Build or check it per the route chosen at step 1 (SurgeOS tracked keywords first, free). Keep every keyword exactly as supplied or exported. Flag brand and navigational terms (they are not topic demand). Record source, country and date. With no volume tool, keyword rows come only from the sources in the step 1.3 row; a seed query the export did not confirm stays out of the table.
2. **Query set.** Merge spelling, prefix and word-order variants, transliterations and the English and local names of the same term into representative queries, highest volume first, at most 15. Keep genuinely different intents separate.
3. **SERP pulls.** One SurgeOS SERP export per brief: `run_serp_export` with every representative query, `depth` 20, the market's `country` and `language`, `device` mobile unless the user says otherwise, `client` = the brief's client, `waitForAiOverview` true (or the reused same-day export). Poll `get_serp_export` with the `jobId` until done: a few minutes, a short background wait between polls, never a busy loop. Name it clearly: every export is visible to the whole team in the SERP Explorer history (internal, not client-visible, so no H5). Per query keep: the organic top 10 (URL, rank), every PAA question (FAQ pool), the SERP features present (observed), AI Overview presence, gist and cited sources, related searches (keyword ideas only, no volume) and the client's own position (step 2.8). Fallbacks and labels: playbook sections 1 and 5.
4. **Score.** Write `serp_rows.csv` (columns `keyword,volume,url,rank`, one row per organic top-10 result per query, from the export; volume from the keyword list, since the export has none) and run:
   `python scripts/score_competitors.py serp_rows.csv --exclude-domain <client domain> --top 10`
   It prints a Markdown table of weighted scores (sum over keywords of volume x max(1, 21 - rank)) and accepts a JSON list instead of CSV; add `--json scores.json` to keep the result, `--priority-url <url>` for each page the user named, `--exclude-keyword <brand term>` for brand queries. Use its output, not your own arithmetic. With no measured volumes, pass `--rank-only` (every row weighted as volume 1); the script switches to it on its own, with a notice, when every volume is 0 or missing. Label such scores "rank-only score, volumes not measured" in the brief.
5. **Flag, do not outline against:** the client's own URLs (excluded; a client page in the top 10 for the primary query or the topic's head term means a refresh, step 3), forums and UGC, Wikipedia, video results. They are intent signals, not competitors.
6. **Read pages.** Priority pages first, then by score, at most 10. **WebFetch first** for every page (H2/H3 tree and body for the digest). Crawl with SurgeOS `request_crawl` only the pages WebFetch cannot read, or the top 3 when a reliable word count is needed for the length (step 5.1): **at most 3 competitor domains per brief**, one domain per crawl (a mixed list is rejected), mode `list`, priority 7 (playbook section 8.1). The crawler's daily write cap is shared by the whole agency: two briefs once used 18 of 20. Cap reached: WebFetch only, word counts labelled approximate. Record for each: H1 to H3, word count, and a 90 to 130 word digest in the five-part form. WebFetch refused but the crawl succeeded: use the crawl's fields and mark the digest partial. A page with neither is dropped as evidence; never describe a page you did not read or invent its content.
7. **Top 3 ground truth.** Priority pages first, then the highest scores, until there are 3 real editorial pages read in full. Each must be on the topic (not an adjacent asset class, product or subject) and in the brief's market language, unless none exists. When you prefer a lower-scored page, say why in the brief.
8. **Cannibalisation and site coverage.** The client's own position per query from the SERP export; SurgeOS `gsc_query_page` for the primary keyword and `search_gsc_queries` for the topic; the latest site crawl searched for topic pages (`get_crawl_pages` / `get_sitemap_urls` with `search`, free); a `site:` search. Recommending a topic the site already covers is a known miss.
9. **Internal link candidates.** SurgeOS `search_gsc_pages` and `search_gsc_queries` for real, indexable client URLs on related topics. A URL outside the default GSC view (a support host, for example) is allowed only from SurgeOS `get_sitemap_urls` with indexed status, labelled "sitemap, indexed" in the links table.
   - **GSC window rule (steps 2.8 and 2.9):** default to the last 3 full months. Never quote impressions, CTR or position from a window that overlaps the GSC impressions logging error (2025-05-13 to 2026-04-27) without the caveat "spans the GSC impressions logging error 2025-05-13 to 2026-04-27"; prefer windows starting 2026-04-28 or later. Always read and respect the `dataNotes` / `compareNote` SurgeOS returns.
10. **Log spend.** Record the SERP export `jobId` and its cost (from the tool), every crawl id, the `cost` field of every DataForSEO fallback response, and the Ahrefs export count, as you go.

**When a connector is missing** (say which route you took at H1, and label the data as the playbook says):

| Missing | Do instead |
|---|---|
| SurgeOS SERP export (unavailable, failed or stuck) | DataForSEO MCP SERP (live advanced, depth 20); then Ahrefs SERP overview exports through `ahrefs-navigator`; then web search, labelled approximate. Re-estimate cost at H2 |
| SurgeOS crawler (queue blocked, `possiblyBlocked`, failed) | WebFetch for the page; DataForSEO content parsing when WebFetch is refused, with approval of its cost |
| SERP export and DataForSEO both | SERPs from Ahrefs SERP overview exports through `ahrefs-navigator` (one per representative query); pages through WebFetch; PAA and features from a web search, marked approximate. Cost: $0, exports counted |
| Ahrefs browser | Ask (re-login, wait, or DataForSEO volume with approval); never the Ahrefs MCP |
| SurgeOS (whole connector) | Ask the user for brand notes; `site:` search for coverage; internal links as placeholders only; SERP and crawl fallbacks as in the first two rows |
| SERP export, DataForSEO and Ahrefs all | Stop at H1 and ask: only a user-supplied list with sourced volumes plus web-search SERPs (labelled approximate) can proceed; otherwise house rule 4 cannot be met |

Web search is not a located SERP (its engine location is the US). For a non-US market, say at H1 that a located SERP is unavailable and offer the person the option to paste the local top 10 (for example from google.co.il). Labels: `references/research-playbook.md` section 1.

## Step 3: Intent verdict

Classify from the SERP you observed, not from the keyword. This is the stop rule of v0.1.

| What the top 10 shows | Verdict | Action |
|---|---|---|
| Mostly explainers, guides, how-tos, definitions | informational | Proceed |
| Mostly informational, a minority of product or category pages | informational, mixed | Proceed for the informational slice; say at H3 which slice the client can win; commercial terms become "route, do not target" rows |
| Mostly best-X lists, reviews, X vs Y buying guides | commercial investigation | Stop at H3 and ask. v0.1 does not brief this page type |
| Mostly product, category, sign-up or landing pages | transactional | Stop at H3 and ask |
| One brand's pages dominate | navigational | Stop at H3 and ask |
| Forums, UGC, Wikipedia or video dominate | informational with weak editorial competition | Proceed; say so; outline against the editorial pages that do rank |
| A client page ranks in the top 10 for the primary query or the topic's head term (Search Console average position <= 10 over the last 3 clean full months, or top 10 in the SERP export) | refresh, not a new page | Stop at H3; recommend a refresh of that page with `existing-article-content-refresh` and end the run. Do not offer a new page |
| A client page covers the topic but ranks only lower (position 11 to 30) | possible cannibalisation | Stop at H3; the person chooses: new page with a distinct angle, or a refresh |

"Clean" months are full months outside the GSC impressions logging error (step 2.9). In the
top-10 row the run continues only when the person explicitly asks for a separate page on a named
distinct sub-intent ("I want a separate page for X"); a general "go ahead" or "make the brief
anyway" is not that request: restate the refresh recommendation and ask which sub-intent they mean.

**Cannibalisation override.** It runs only after that explicit request (top-10 row) or when the person chooses a new page with a distinct angle (11 to 30 row). Re-choose the primary keyword for the distinct sub-intent, in the market's language, so the new page does not target the existing page's head term. Keep every user string exactly; retype the existing page's terms as Secondary or "Existing page (do not target)" as needed (the writer brief states them as the plain-language do-not-target paragraph, brief-rules section 17.6), link to the existing page, and show the before and after at H3.

- Apply it only to the terms the existing client page actually ranks or gets impressions for (export position, or GSC `gsc_query_page` query x page, last 3 full months). Other user strings keep their type.
- The new primary names the distinct sub-intent ("X vs Y", "how to do X with Y", a narrower question), never a synonym, abbreviation expansion, translation or transliteration of the existing page's head term.
- The new primary is in the market's search language as people there type it (Hebrew script, or a mixed Latin and Hebrew form seen in the user list or client GSC, such as "dca" plus a Hebrew word). A PAA or related search in another language may enter the table as a Question row at most, never as the primary.
- If no user string expresses the sub-intent, use an observed market-language query (PAA, related search, client GSC query) as primary and say so at H3. If no market-language observed string fits, say so at H3 and offer to pull up to 3 market-language phrasings of the sub-intent with `run_serp_export`; keep the one whose located SERP returns market-language pages on that sub-intent, typed Primary and labelled "seed, SERP observed, volume not measured" (or proceed without a measured primary and say so).
- If the new primary was not a query in the export, pull its SERP before H3 approval (a one-query export; H2 only if it exceeds the approved spend) and re-check the verdict, the top 3 and the snippet plan against it.

Never proceed silently on a mismatch.

## Step 4: Strategy

Before this step, read `references/brief-rules.md` (sections 1 to 6). Spend the most reasoning on
the editorial angle and, later, the outline skeleton: those decide whether the article is distinctive.

1. **Search intent and SERP:** intent type, preferred format, the SERP features actually observed (per query), the AI Overview line (present or not, gist, cited sources), source (export `jobId`) and date of the pulls.
2. **Page goal and target audience**, each with reasoning that cites the top-scoring and priority pages and the keyword clusters they own or miss.
3. **Competitor breakdown:** for every scored competitor, one-sentence description, strengths, weaknesses (written as concrete, reusable gaps; check every "it lacks X" claim against the page text you read before writing it); then the differentiation summary, grounded in the rankings (name keyword clusters, volumes and ranks), not in the score alone.
4. **Content gap:** table stakes (in most competitors' headings, or keyword clusters most rank for) and strategic opportunities (in 1 or 2 competitors or absent; high-volume clusters weakly covered), each with heading or keyword evidence, weighed by volume.
5. **Editorial angle:** a 1 to 2 sentence thesis that takes a position, is specific, passes the swap test, fits informational intent (an explanatory thesis) and cites at least one competitor gap or strength. Re-check it against the gap analysis; if the gaps point to a sharper angle, revise now.
6. **Keyword strategy:** every keyword exact, typed Primary / Secondary / Question / Commercial (route, do not target) / Brand (excluded) / Existing page (do not target), each with a placement note. The informational head term stays primary even when a transactional term is bigger. "Exact" means the strings are unchanged, not that the user's term must stay primary (see the cannibalisation override in step 3). The primary is always in the market's search language (step 3); `check_brief.py` warns on a Hebrew brief whose primary has no Hebrew letter.

**Checkpoint H3:** show the intent verdict with its evidence, the keyword table, the competitor set
(scored table plus what was flagged or excluded), the page goal, the audience and the editorial
angle with its reasoning and swap test. The person approves or changes the angle (the strategist
approves angle and outline). On a non-informational verdict, stop here and ask. On a refresh
verdict (a client page in the top 10 for the primary query or the head term), show that page's URL
with its Search Console average position and window (or export rank), recommend a refresh with
`existing-article-content-refresh`, and end the run here: offer no new page. Continue only if the
person explicitly asks for a separate page on a named distinct sub-intent; then run the
cannibalisation override (step 3) and show its keyword table at H3.

## Step 5: Length, FAQ set and snippet plan

1. **Total word count:** the user's target if given; otherwise the average word count of the top 3 and priority pages, rounded to the nearest 50. Write the calculation into the brief's reasoning. When the user sets a total, divide the outline budget by the table stakes plus the opportunities planned as sections. Below about 120 words an item, say so at H4 with two options: raise the total (propose one), or name which stake or opportunity moves to an FAQ or a link. Never drop a table stake silently.
2. **FAQ set:** every keyword phrased as a question first, then PAA questions (from the export), then gap-driven questions. Usually 4 to 8.
3. **FAQ allowance:** questions x 80 words by default (60 to 100 a question when the questions are lighter or heavier). Outline budget = total minus FAQ allowance. The app budgets FAQs from whatever is left, which leaves nothing when the outline uses the whole total, so reserve the allowance explicitly.
4. **Snippet plan:** distinct queries, each with the format Google shows (paragraph, list, table), and every query one pulled in the export (in the keyword table). Never a target on a query that was not pulled.
   - Featured snippet observed: target it (1 to 3), no label.
   - No featured snippet but an AI Overview observed: at most 2, written `Snippet target: <format> | <query> (AI Overview answer block; no featured snippet observed)`.
   - Neither observed on a located SERP: none.
   - SERP features not observed (Ahrefs or web-search fallback): at most 2, written `Snippet target: <format> | <query> (answer-first bet; SERP features not observed)`.
5. **SERP-feature blocks:** for each feature actually observed (video, image pack, PAA or "things to know", knowledge panel), the matching block you will place in a section. Never a block for a feature the SERP did not show.

## Step 6: Outline

Before this step, read `references/brief-rules.md` again (section 7, article structure). Checklist
(the essentials, so the run never depends on memory of that file):

- H2 > H3 > H4, three levels at most; Hero only with a real hook; no FAQ section in the outline.
- Every H2 states a claim or answer, passes the mini-title test; at most one "What is X?".
- No "Benefits of", "Pros and Cons", "101", "for Beginners", five parallel "How to" H2s, or their translations.
- Every item: Angle (a facet of the editorial angle, passes the swap test), Guidelines, Keywords, non-zero Word count; Reasoning in full.
- Every table stake has its own outline item; every opportunity has a home, at least two in depth.
- Outline sum + FAQ allowance = total; H2s get more than their H3s; 1 to 3 snippet targets, distinct queries.

Build the outline in these passes, in this order:

1. **Skeleton.** Headings (Hero only with a real hook, H2 > H3 > H4, Conclusion, no FAQ section in the outline), and for every item: section angle (written first, a facet of the editorial angle), guidelines that advance the angle, word count, snippet target where planned, reasoning that links back to a table stake or opportunity. The primary directive: cover every table stake and exploit every strategic opportunity. If a template page was given, follow its heading structure and adapt it to the topic.
2. **Heading check.** Apply heading rules 1 to 6 (claims not labels, at most one "What is X?", no banned patterns or their translations, varied shapes, the mini-title test, Hero is not an introduction). Check every section angle against the swap test.
3. **Enrichment.** Add each item's target keywords (exact strings from the keyword table), covered by (URLs of read competitors that cover it), and 1 to 2 internal-link guidelines where they help. Enrichment never deletes, rewords or weakens a skeleton angle or guideline: it only appends.
4. **Resources.** Where a guideline needs something a writer cannot produce alone (infographic, diagram, video, calculator, custom photography, data visualisation), add it under Resources.
5. **Sums.** Every item has a non-zero word count; H2s get more than their H3s; the outline sum plus the FAQ allowance equals the total.

**Checkpoint H4:** show the outline with section angles, the word budget (per item and the sum),
the FAQ allowance, the snippet targets with their labels, every table stake beside its outline
item, any length that cannot hold the required items (step 5.1), and the client's branded template
or naming rule (name it, or say none). After a cannibalisation override, also list the existing
client page's H2s beside the new outline and mark each overlap: an overlapping section becomes a
link to that page or a clearly different facet. The person approves or changes the outline. If any
heading changes after H4, show the diff (old and new heading) before H5.

## Step 7: Write the research brief

Before this step, read `references/examples.md` for the format (never copy its content). Copy the
blank template, `assets/brief-template.md` (English) or `assets/brief-template-he.md` (Hebrew),
into the working folder as `research-brief.md`, and fill it. Always start from the blank template, never
from a previous brief: copy-paste leftovers are the most common miss in past briefs. If the
client's brain names a branded template or a naming rule for documents, keep the skill's section
order and labels but apply the client's header, branding and file naming (title line included);
note the choice at H4.

1. Fill every section in template order, in the brief's language only (headings, labels and FAQ heading included). Placeholders inside guidelines use [square brackets], never angle brackets: the Doc conversion drops angle-bracket text, and `check_brief.py` errors on it.
2. Write the FAQs (step 5 set): questions as H3, 1 to 3 guideline bullets, the first always the self-contained 40 to 50 word answer instruction. Guidelines, never drafted answers.
3. Write on-page SEO with the title workflow (three candidates: benefit, specificity, curiosity; keep the winner; say in the Reasoning column why the others lost). Check the limits and banned patterns in `references/brief-rules.md` section 9.
4. Write CTA strategy, links (real GSC URLs, or indexed sitemap URLs labelled as such, as full absolute URLs; otherwise `[INTERNAL LINK: anchor -> topic]`), E-E-A-T (only what the client can deliver), writer notes, technical notes, and sources and scope.
5. Add the Accuracy and brand guardrails section when the client's brain or brand docs have rules.
   - **Sources, not placeholders:** for every claim a guideline requires (a figure, a study, a date, a rule), use the AI Overview's cited sources from the export as evidence when they support it (read them first), otherwise run one free web search within the run, and put the source URL in the brief and in the Fact and source bank (Sources and scope). Use `[CITE: ...]` only when nothing reliable is found; count them for H6.
   - Before H5, run one web search per remaining `[CITE]` and read the best result; keep the `[CITE]` only with that search noted in the Fact and source bank. A source verified only through a search result (the page itself refused) is labelled "checked by search, page not read".
6. Apply the YMYL table below.
7. Make every figure identical wherever it repeats (word counts, volumes, title, H1).
8. Run `python scripts/check_brief.py research-brief.md --type research` (step 8.1) before step 7b: the writer brief is distilled from a clean research brief.

| Topic type | Add to the brief |
|---|---|
| Health or medical | A review-by-expert note (named role, not a person you invent); a red-flags or "when to get help" element in the outline; a studies and sources list (publisher, date, link) for the writer to verify; claims only from the client's own materials; a `**TODO (human):** legal or compliance review of service promotion and CTA wording` line in Accuracy and brand guardrails (Hebrew: `**TODO (human):** בדיקה משפטית או רגולטורית של קידום השירות ושל נוסח ה-CTA`) |
| Finance, crypto, tax | A not-advice disclaimer note; no figures (fees, returns, rates) unless the client supplied them; jurisdiction caveats; reviewer in technical notes; a `**TODO (human):** legal or compliance review of product promotion and CTA wording` line in Accuracy and brand guardrails (Hebrew: `**TODO (human):** בדיקה משפטית או רגולטורית של קידום המוצר ושל נוסח ה-CTA`) |
| Legal | Jurisdiction and date-of-law note; primary sources (statute, regulator) as external links; a `**TODO (human):** legal review` on sensitive lines |

Use the compliance line in the brief's language. Raise any brand or legal wording risk inside the
brief with a safe generic fallback; never hold a
brief waiting on legal. Unsupported product or medical claims become `[CITE: ...]` or a
visible `**TODO (human):** ...` line. Never use HTML comments: they vanish in the Google Doc.

## Step 7b: Distil the writer brief

Before this step, read `references/brief-rules.md` section 17. Copy the blank
`assets/writer-brief-template.md` (Hebrew `assets/writer-brief-template-he.md`) as
`writer-brief.md` and fill it FROM `research-brief.md`, by deletion and compression only.

- **No new content.** No claim, number, source, heading or keyword that is not in the research brief. Compress wording; never change what it says.
- **Identical figures and strings.** Keyword strings and volumes, total word count and FAQ allowance, every on-page value, every outline heading with its prefix and word count, every FAQ question, and every snippet target line (label included) are copied character for character.
- **Nothing lost.** Every table stake and strategic opportunity stays visible in the outline, as an item or a guideline; every `**TODO (human):**` line survives (those from dropped sections go to Writer notes); `[CITE]` and `[INTERNAL LINK]` markers stay with the text that carries them.
- **What moves out:** competitor table, gap evidence, Reasoning and Covered by lines, keyword bullets, SERP detail, Fact and source bank, Sources and scope, technical notes. The header links to the research brief instead.
- **Do-not-target paragraphs:** "Existing page (do not target)" and "Brand (excluded)" rows become plain-language paragraphs under the writer's keyword table, one per existing client page and one for brand terms, each starting with the bold label `**Do not target:**` (Hebrew `**לא לטרגט:**`): what (the strings, copied exactly and quoted), why ("<client> already ranks for these with <full URL> (Search Console average position <n>, <date range>)", or "brand terms, not topic demand") and what to do ("This article answers a different question: <the new sub-intent>. Do not repeat that page's content; link to it once with the anchor "<anchor>"."). Exact English and Hebrew wording: brief-rules section 17.6. The research brief keeps the full rows. `--pair` accepts a string quoted in those paragraphs and warns on a paragraph missing a part.
- **Who writes (step 0, question 5):** sets the writer brief's tone and assumed knowledge (a freelancer new to the client gets the brand rules spelled out; an internal writer gets less). An internal strategist may also get the research brief; a machine writer (`blog-article-draft`) takes the research brief as its input.
- **Length:** the budget in section 17 (soft target 2,000 words or 85 per outline item plus FAQ question, whichever is higher; hard ceiling 1.5 times that). Over it: compress guidelines and notes, never drop an item.

Checklist before step 8: summary at most about 150 words; each angle one line; 2 to 4 imperative
guidelines per item; at most 5 do's and 5 don'ts; one-line FAQ guidelines that keep the 40 to 50
word answer rule; internal links as anchor and full URL.

## Step 8: Self-check

Before this step, read `references/qa-rubric.md`.

1. Run `python scripts/check_brief.py research-brief.md --type research`, then `python scripts/check_brief.py writer-brief.md --type writer --pair research-brief.md` (add `--lang he` for Hebrew). The pair run errors when a keyword, volume, total, on-page value, outline heading, word count or FAQ question differs between the two, and warns when a table stake or opportunity lost its match or a TODO was dropped. Exit code 1 means errors. Fix every error and review every warning, then run both again until clean. The "Markers" and "Words" lines give the TODO, [CITE] and word counts for step 9 and H6.
2. Read for what the script cannot see: Hebrew equivalents of banned title, meta and heading patterns; off-topic words from another brief; claims without a source; an angle that fails the swap test; in the writer brief, a compressed line that changed a claim, and whether a writer can act on it in five minutes.
3. Score the five rubric criteria 1 to 5 on the research brief, and the writer-brief checks in `references/qa-rubric.md` section 3a, with one line of evidence each. Ship bar: every criterion at 4 or 5. Below 4 on any criterion: fix the brief and score again; never ship below the bar.
4. Confirm every correctness criterion in the rubric holds. One failure blocks delivery.

## Step 9: Deliver

1. **Checkpoint H5** (it applies to the writer brief, the client-visible one): before anything client-visible (sharing a Doc, placing it in a folder the client can open, updating a content table the client sees), show the finished writer brief, both self-checks and both word counts. Always state the H5 decision in one line before `create_file`: "folder X is not client-visible, creating both there", or ask whether it is. The research brief is internal: if the named folder is client-visible, ask where it goes. Wait for approval.
   Before `create_file`, convert any remaining `<!-- ... -->` comment to a visible `**TODO (human):** X` line in both files, re-run both checks, and count the TODOs in each file.
2. Create both Docs with Google Drive `create_file` in the named folder, `parentId` = the folder, conversion ON (do not set `disableConversionToGoogleType`). First the research brief (`title` = writer title + " | research"), then the writer brief (`title` = the writer title line) with its "Research brief" header line set to the research Doc's link. The research brief's "Writer brief" line names the writer Doc by title and folder; replace it with the link when the connector can update the Doc.
   - **Hebrew (RTL) briefs always upload as HTML, never Markdown** (Markdown import loses right-to-left): `python scripts/md_to_html.py writer-brief.md writer-brief.html --lang he`, then `textContent` = the HTML, `contentMimeType` = `text/html`. Same for the research brief.
   - **English** may upload the Markdown (`contentMimeType` = `text/markdown`) or the converter's HTML.
   - **A client brand document rule** in the brain (font, direction, logo) goes through the converter: `--font "<font>"`, `--rtl`, `--logo <PNG or JPG https URL>` (SVG does not import: then a visible TODO line). Name the rule at H4.
   - **Pass the converter output exactly.** `textContent` is the file's content as written: never edit converter output by hand, never shorten its styles, drop attributes, or retype, re-encode or summarise its text. To change anything, fix the Markdown and convert again. The output is already compact (one style block, about 1.25 x the Markdown). Hand-shortened font styles made Docs drop the font, and a retyped 6,000-word brief came back with one Hebrew letter changed.
   - **Payload too large for one call:** the research and writer briefs always go in separate calls. If one HTML file is still too large to pass whole, split that brief's Markdown at a `##` heading near the middle into two files, convert each, and create two Docs titled "<title> | research (part 1/2)" and "(part 2/2)", each naming the other in its first line. Never trim markup or text to fit.
3. **Verify every Doc after upload, always** (each part of a split brief against its own Markdown file): export it with Drive `download_file_content` (`exportMimeType` = `text/html`), save the decoded export unchanged, and run `python scripts/md_to_html.py writer-brief.md --verify export.html --lang he --font "<font>"` (`--lang en` for English; `--font` only when a brand rule set one). It fails on: a word count more than 3% off; no RTL markers (Hebrew); the requested font on no text block; and any word that differs in a normalised text diff of the Markdown's visible text against the Doc's, printing the first 20 differences with context and the kind (heading, cell, keyword, number, url, prose). It tolerates only whitespace, invisible marks, quote and dash variants and edge punctuation (listed in the script header). Also check with `read_file_content`: tables rendered, no `{{`, no em-dash, the writer brief's link to the research brief opens, and each Doc's "TODO (human)" count equals its Markdown file's.
4. **A failed verify:** never patch the Doc by hand. Fix the cause (convert again from the Markdown, pass the file exactly), create a corrected Doc with the same title in the same folder and verify it; then rename the failed Doc with `update_file` to "SUPERSEDED (verify failed) <title>" (never trash or delete it unless the person asks), point the writer brief's research link at the corrected Doc, and report both links and the failing verify line at H6. If Drive is unavailable, hand the user both Markdown files (and the HTML for Hebrew).
5. Never share a Doc, change its permissions or touch a client-visible system before H5. Never share the research brief with the client unless the person asks.

## Step 10: Final message

**Checkpoint H6:** send this, and wait for send or revise.

```
<Title line>
Writer brief: <link>   (<w1> words; budget soft <s>, hard <h>)
Research brief: <link> (<w2> words; internal, input for blog-article-draft)
Self-check: intent <n>/5, table stakes <n>/5, opportunities <n>/5, keywords <n>/5, advantage <n>/5; writer brief checks pass
check_brief.py: research clean, writer + pair clean (0 errors, <w> warnings reviewed)
Doc verify (md_to_html.py --verify): writer PASS, research PASS (or: SUPERSEDED <link>, corrected <link>)
Open markers: <t> TODO (human), <c> [CITE]; <n> claims sourced in the Fact and source bank
Cost: SERP export <jobId> $<cost> (<q> queries, depth 20; or reused, $0); <k> crawls (<ids>); DataForSEO fallback $<summed cost> (<q2> SERPs, <p> page reads, or none); Ahrefs <n> browser exports, 0 API units
Not measured: <for example: keyword difficulty, backlinks of ranking pages, the client's GA4 Key Events>
Decisions made at H3/H4: <one line each>
```

## Batch mode

A numbered batch ("make briefs 3/27", "create 3 briefs", "יצירת 5 בריפים") runs this skill once per
topic, one brief per topic, never one brief covering several topics.

1. Ask the step 0 questions once for the batch; ask per topic only what differs.
2. At H1, show the plan and the cost arithmetic for the whole batch (sum of every brief's pulls and reads against the $1 threshold; the 15-pull and 10-read caps apply per brief). H2 applies to the batch total.
3. H3 and H4 fire per brief unless the owner waives them in writing for this batch; record the waiver in each brief's Sources and scope. H5 and H6 cover the batch, with one line per brief.
4. Check topic overlap across the batch before pulling: two topics that share a primary query are one brief or a cannibalisation risk. Read existing briefs before deciding a merge.
5. For a large batch, offer to ship the first five, reassess with the person, then continue.

## Known traps (quick reference)

| Trap | What to do |
|---|---|
| Commercial SERP briefed as informational | Intent verdict from the observed SERP; stop at H3 |
| One SERP pull per spelling variant | Merge variants; one export per brief, cap 15 queries |
| Paying twice for the same SERP | List recent exports first; reuse a same-day export for the same keywords and market |
| Crawl list mixing competitor domains | One `request_crawl` per domain; a mixed list is rejected |
| Brief keywords added to Search Visibility | Never, unless the person asks (recurring cost, writes into the client project) |
| Client's own page in the competitor set | `--exclude-domain`; a top-10 client page flags a refresh |
| New page offered while a client page is top 10 for the head term | Refresh verdict: recommend `existing-article-content-refresh` and end at H3; a new page only on an explicit request for a separate page on a named sub-intent |
| Forums, Wikipedia or video dominate | Intent signal, not competitors to outline against |
| Section budgets leave FAQs nothing | Explicit FAQ allowance; outline + FAQ = total |
| Section angle restates the heading | Swap test on every angle before H4 |
| Banned patterns return in translation | Read for Hebrew equivalents at step 8 |
| Volumes from memory or an old list | Pulled live in this run, with source and date; otherwise "not measured" |
| Invented internal URLs | Real GSC URLs only; otherwise the placeholder |
| Brand terms counted as topic demand | Type them Brand (excluded); no score, no target |
| Topic the site already covers | Site-coverage check before H3 |
| Leftovers from another brief or the template | Blank template every time; check_brief.py flags tokens; read for off-topic words |
| TODOs hidden in HTML comments | Visible `**TODO (human):**` lines; check_brief.py errors on `<!--` |
| GSC numbers across the 2025-05-13 to 2026-04-27 logging error | Last 3 full months; caveat or a later window; read `dataNotes` |
| New page keeps the existing page's head term | Cannibalisation override: re-choose the primary at H3 |
| Override primary is a synonym or translation of the old head term | The new primary names the sub-intent; override only terms the client page ranks for |
| Crawl cap exhausted by one brief | WebFetch first; at most 3 crawled domains; show remaining crawl writes at H1 |
| Model-chosen keywords presented as observed | Seeds may query the export; keyword table only from user, GSC, tracked, PAA or related searches |
| Length target too short for the table stakes | Say so at H4 with a proposed total; never drop a stake silently |
| Snippet target on an unpulled query | Only pulled queries; AI Overview answer block label when no featured snippet |
| Writer brief loses a table stake or opportunity in compression | Every stake and opportunity stays an item or a guideline; `--pair` warns on a lost match |
| Numbers or strings drift between the two briefs | Copy keywords, volumes, totals, on-page values, headings, word counts and FAQs verbatim; `--pair` errors on any difference |
| Writer brief as long as the research brief | Distil to the section 17 budget; reasoning and evidence stay in the research brief, linked |
| Hebrew Doc renders left to right | RTL briefs upload as HTML from `md_to_html.py --lang he`; `--verify` the HTML export |
| Doc differs from the converter output (styles shortened, a letter retyped, `$...-$` text swallowed) | Pass the file content exactly; too large: split into part 1/2 Docs, never trim; `--verify` diffs every word and checks the font; on a fail create a corrected Doc and rename the failed one "SUPERSEDED (verify failed) ..." |
| Angle-bracket text vanishes in the Doc | [square brackets] for placeholders; `check_brief.py` errors on `<word>`; compare word counts at read-back |
| Override primary in another language, or never pulled | Primary in the market's search language; pull its SERP before H3 approval |
| Writer keyword table full of do-not-target rows | `**Do not target:**` paragraphs under the writer table; rows stay in the research brief |
| Cryptic do-not-target line (strings and an anchor, no reason) | One plain-language paragraph per existing page: strings, why (URL, Search Console position, window), what to do (the different question, link once with the anchor); brief-rules 17.6 |
