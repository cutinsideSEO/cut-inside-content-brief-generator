---
name: new-page-content-brief
description: >-
  Produces an SEO content brief (not the article) for one NEW informational article (guide, "what
  is", "how to") as a Google Doc a writer can execute without further research: questions first,
  live SERP research (DataForSEO, SurgeOS, Ahrefs via the ahrefs-navigator browser skill),
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

# New page content brief (informational, v0.1)

A brief is the plan a writer follows without opening a SERP. The failure mode is averaging the
SERP: covering what everyone covers, phrased how everyone phrases it. Everything below exists to
prevent that, and to make every number in the brief traceable to a tool call made in this run.

**What this skill produces:** one brief per topic, in the client's language, as a Google Doc built
from `assets/brief-template.md` (or `assets/brief-template-he.md`). **Brief only:** never draft
article copy (several clients' contracts are brief-only; drafting is `blog-article-draft`). The
brief describes the TARGET page only; anything about a current page goes in a companion note.
No Open Items section: decisions are settled with the person at H3 and H4. Aim for 15 pages or fewer.

**Who does what:** Claude does the research and writing with its tools; Ahrefs work happens in a
browser through the `ahrefs-navigator` skill (never the Ahrefs MCP or API); the person decides at
the six checkpoints below.

**What the brief contains** (house format; the templates hold the exact labels):

1. Title line (`<Topic> - Content Brief | <Client>`, Hebrew `<topic> - בריף יצירת תוכן | <client>`), header block (date, market and language, prepared by role, variant) and relevant links.
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

Reasoning lines appear in the full variant only. The brief's own prose follows the same voice rails
and banned-phrase list it gives the writer: a writer copies the brief's wording.

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
| `references/brief-rules.md` | before step 4 (strategy) and again before step 6 (outline) |
| `references/examples.md` | before step 7 (writing the Doc): format examples only, never content to copy |
| `assets/brief-template.md` | at step 7, for an English brief |
| `assets/brief-template-he.md` | at step 7, for a Hebrew brief |
| `scripts/score_competitors.py` | at step 2, after the SERP pulls |
| `references/qa-rubric.md` | before step 8 (self-check) |
| `scripts/check_brief.py` | at step 8, on the finished Markdown |
| `evals/qa-log.md` | never at run time; maintenance only (QA rounds) |

## Step 0: Ask first (one message)

Ask in the user's language, numbered, in one message. Skip what the user already said; never
assume a market from the domain.

1. Which client, and which market: SERP country, SERP language, and the brief's language?
2. What is the topic or main keyword? Do you have a keyword list with volumes, or should I build one from Ahrefs (browser export through ahrefs-navigator, global and local volume)?
3. Is there a target length, or should the competitors' depth decide?
4. Are there pages you want weighted heavily (references, competitors you rate), or a page whose structure the brief should follow?
5. Who will write it: an internal writer, the client, or a freelancer? (Client-facing and freelancer briefs get the concise variant with reasoning trimmed.)
6. Where should the Doc go (the client's content folder, or a link you give me)?

"Check and send new briefs": if briefs from an earlier run exist, read them and start at step 8 for
each; otherwise treat it as a batch request (see Batch mode).

## Step 1: Client context, plan and cost

1. Resolve the client with SurgeOS `list_clients` (id, name or domain). Note the client's domain (for exclusion), deliverable language and market.
2. Read brand context: SurgeOS `get_documents` (tone, brand guidelines, product briefs), `get_seo_knowledge` (agency playbook), and the client's AI Brain on Drive (`00. AI Brain`: principles, decisions-log). Extract: voice and tone, do's and don'ts, banned and preferred terms, known competitors, claims the client cannot support, schema rules, standing checks for this topic family. No brand material at all: ask the user for brand notes.
3. Choose the keyword route from this table:

| Situation | Route |
|---|---|
| User supplies a list with country volumes measured this month | Use it exactly as supplied; add global volume if missing (Ahrefs export) |
| User list is older than the current month, or has no source or date | Re-check volumes live (Ahrefs through ahrefs-navigator if a browser is available; otherwise DataForSEO Google Ads search volume). Old lists have been 5 to 10x wrong |
| User asks Claude to build the list | Ahrefs Keywords Explorer through `ahrefs-navigator`: matching terms, questions, related terms; CSV export with country and global volume |
| Ahrefs browser route blocked (session kicked, no browser) | Stop and ask: re-login, wait, or DataForSEO volume with explicit approval. Never offer the Ahrefs MCP |
| Only the client's GSC queries are available | Not enough on its own: GSC shows the client's demand, not the topic's. Run a demand check on the top keywords from Ahrefs or DataForSEO as well |

4. Read the DataForSEO balance and prices with `appendix/user_data` (free). Never take prices from memory or from this file.
5. Write the plan: keyword route, the representative queries you will pull (at most 15), the pages you will read (at most 10), the tools per step, and the cost arithmetic below.

**Cost guard (show the arithmetic at H1):**

```
Prices read from appendix/user_data at <time>; balance $<balance>
SERP pulls:  <q> queries x 2 pages (depth 20) x $<price per SERP page> = $<a>
Page reads:  <p> pages x $<price per content parse>                  = $<b>
Volumes:     <t> tasks (up to 1,000 keywords each) x $<price per task> = $<c>
Total DataForSEO: $<a+b+c> against a threshold of $1.00
Ahrefs: <n> browser exports, 0 API units (threshold 5,000 units; this skill uses none)
```

For scale only: the agency's connectors guide last showed $0.0006 a SERP page of 10 results in the
standard queue; the live endpoint this skill uses is priced higher and content parsing has its own
price, so always use what `appendix/user_data` returns at run time. At the caps (15 queries, 10 page
reads) a typical brief costs a few cents. Guards: at most 15 SERP pulls (merge spelling variants
into one representative query; low-volume long tails stay in the keyword table without their own
SERP), at most 10 page reads, never re-fetch a SERP or page already pulled in this run.

**Checkpoint H1:** show the plan and the cost arithmetic. The person says go, change or stop.
Spend nothing before this answer.

**Checkpoint H2:** if the estimate is above $1 of DataForSEO (or would use any Ahrefs API units),
or if the run later needs more pulls than the approved plan, stop, show the new arithmetic and the
balance, and wait for approval of the spend.

## Step 2: Research

Before this step, read `references/research-playbook.md`. It has the exact tool names, parameters,
fallbacks, the per-page record and the market codes.

1. **Keyword list.** Build or check it per the route chosen at step 1. Keep every keyword exactly as supplied or exported. Flag brand and navigational terms (they are not topic demand). Record source, country and date.
2. **Query set.** Merge spelling and prefix variants into representative queries, highest volume first, at most 15.
3. **SERP pulls.** One DataForSEO SERP (organic, live advanced, depth 20, the market's location and language) per representative query. From each response keep the top 10 organic results (URL, rank), every People Also Ask question, and the SERP features actually present. Fallbacks and their labels are in the playbook.
4. **Score.** Write `serp_rows.csv` (columns `keyword,volume,url,rank`, one row per top-10 organic result per query) and run:
   `python scripts/score_competitors.py serp_rows.csv --exclude-domain <client domain> --top 10`
   It prints a Markdown table of weighted scores (sum over keywords of volume x max(1, 21 - rank)) and accepts a JSON list instead of CSV; add `--json scores.json` to keep the result, `--priority-url <url>` for each page the user named, `--exclude-keyword <brand term>` for brand queries. Use its output, not your own arithmetic.
5. **Flag, do not outline against:** the client's own URLs (excluded; a client page in the top 10 for the primary query means a refresh, flag it at H3), forums and UGC, Wikipedia, video results. They are intent signals, not competitors.
6. **Read pages.** Priority pages first, then by score, at most 10. Record for each: H1 to H3, word count, and a 90 to 130 word digest in the five-part form. A page that fails to parse is dropped as evidence; never describe a page you did not read.
7. **Top 3 ground truth.** Priority pages first, then the highest scores, until there are 3 real editorial pages read in full.
8. **Cannibalisation and site coverage.** SurgeOS `gsc_query_page` for the primary keyword and `search_gsc_queries` for the topic, plus a `site:` search. Recommending a topic the site already covers is a known miss.
9. **Internal link candidates.** SurgeOS `search_gsc_pages` and `search_gsc_queries` for real, indexable client URLs on related topics.
10. **Log spend.** Sum the `cost` field of every DataForSEO response and count Ahrefs exports as you go.

**When a connector is missing** (say which route you took at H1, and label the data as the playbook says):

| Missing | Do instead |
|---|---|
| DataForSEO | SERPs from Ahrefs SERP overview exports through `ahrefs-navigator` (one per representative query); pages through WebFetch; PAA and features from a web search, marked approximate. Cost: $0, exports counted |
| Ahrefs browser | Ask (re-login, wait, or DataForSEO volume with approval); never the Ahrefs MCP |
| SurgeOS | Ask the user for brand notes; `site:` search for coverage; internal links as placeholders only |
| Both DataForSEO and Ahrefs | Stop at H1 and ask: only a user-supplied list with sourced volumes plus web-search SERPs (labelled approximate) can proceed; otherwise house rule 4 cannot be met |

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
| A client page ranks in the top 10 for the primary query | refresh, not a new page | Stop at H3; recommend `existing-article-content-refresh` unless the person decides otherwise |
| A client page covers the topic but ranks lower | possible cannibalisation | Stop at H3; the person chooses: new page with a distinct angle, or a refresh |

Never proceed silently on a mismatch.

## Step 4: Strategy

Before this step, read `references/brief-rules.md` (sections 1 to 6). Spend the most reasoning on
the editorial angle and, later, the outline skeleton: those decide whether the article is distinctive.

1. **Search intent and SERP:** intent type, preferred format, the SERP features actually observed (per query), source and date of the pulls.
2. **Page goal and target audience**, each with reasoning that cites the top-scoring and priority pages and the keyword clusters they own or miss.
3. **Competitor breakdown:** for every scored competitor, one-sentence description, strengths, weaknesses (written as concrete, reusable gaps); then the differentiation summary, grounded in the rankings (name keyword clusters, volumes and ranks), not in the score alone.
4. **Content gap:** table stakes (in most competitors' headings, or keyword clusters most rank for) and strategic opportunities (in 1 or 2 competitors or absent; high-volume clusters weakly covered), each with heading or keyword evidence, weighed by volume.
5. **Editorial angle:** a 1 to 2 sentence thesis that takes a position, is specific, passes the swap test, fits informational intent (an explanatory thesis) and cites at least one competitor gap or strength. Re-check it against the gap analysis; if the gaps point to a sharper angle, revise now.
6. **Keyword strategy:** every keyword exact, typed Primary / Secondary / Question / Commercial (route, do not target) / Brand (excluded), each with a placement note. The informational head term stays primary even when a transactional term is bigger.

**Checkpoint H3:** show the intent verdict with its evidence, the keyword table, the competitor set
(scored table plus what was flagged or excluded), the page goal, the audience and the editorial
angle with its reasoning and swap test. The person approves or changes the angle (the strategist
approves angle and outline). On a non-informational verdict or a refresh flag, stop here and ask.

## Step 5: Length, FAQ set and snippet plan

1. **Total word count:** the user's target if given; otherwise the average word count of the top 3 and priority pages, rounded to the nearest 50. Write the calculation into the brief's reasoning.
2. **FAQ set:** every keyword phrased as a question first, then PAA questions, then gap-driven questions. Usually 4 to 8.
3. **FAQ allowance:** questions x 80 words by default (60 to 100 a question when the questions are lighter or heavier). Outline budget = total minus FAQ allowance. The app budgets FAQs from whatever is left, which leaves nothing when the outline uses the whole total, so reserve the allowance explicitly.
4. **Snippet plan:** 1 to 3 snippet targets with distinct queries, each with the format Google shows (paragraph, list, table), only where the SERP supports it. None when the SERP shows no opportunity.
5. **SERP-feature blocks:** for each feature actually observed (video, image pack, PAA or "things to know", knowledge panel), the matching block you will place in a section. Never a block for a feature the SERP did not show.

## Step 6: Outline

Before this step, read `references/brief-rules.md` again (section 7, article structure). Build the
outline in three passes, in this order:

1. **Skeleton.** Headings (Hero only with a real hook, H2 > H3 > H4, Conclusion, no FAQ section in the outline), and for every item: section angle (written first, a facet of the editorial angle), guidelines that advance the angle, word count, snippet target where planned, reasoning that links back to a table stake or opportunity. The primary directive: cover every table stake and exploit every strategic opportunity. If a template page was given, follow its heading structure and adapt it to the topic.
2. **Heading check.** Apply heading rules 1 to 6 (claims not labels, at most one "What is X?", no banned patterns or their translations, varied shapes, the mini-title test, Hero is not an introduction). Check every section angle against the swap test.
3. **Enrichment.** Add each item's target keywords (exact strings from the keyword table), covered by (URLs of read competitors that cover it), and 1 to 2 internal-link guidelines where they help. Enrichment never deletes, rewords or weakens a skeleton angle or guideline: it only appends.
4. **Resources.** Where a guideline needs something a writer cannot produce alone (infographic, diagram, video, calculator, custom photography, data visualisation), add it under Resources.
5. **Sums.** Every item has a non-zero word count; H2s get more than their H3s; the outline sum plus the FAQ allowance equals the total.

**Checkpoint H4:** show the outline with section angles, the word budget (per item and the sum),
the FAQ allowance and the snippet targets. The person approves or changes the outline.

## Step 7: Write the Doc

Before this step, read `references/examples.md` for the format (never copy its content). Copy the
blank template, `assets/brief-template.md` (English) or `assets/brief-template-he.md` (Hebrew),
into the working folder as `brief.md`, and fill it. Always start from the blank template, never
from a previous brief: copy-paste leftovers are the most common miss in past briefs.

1. Fill every section in template order, in the brief's language only (headings, labels and FAQ heading included).
2. Write the FAQs (step 5 set): questions as H3, 1 to 3 guideline bullets, the first always the self-contained 40 to 50 word answer instruction. Guidelines, never drafted answers.
3. Write on-page SEO with the title workflow (three candidates: benefit, specificity, curiosity; keep the winner; say why the others lost in full mode). Check the limits and banned patterns in `references/brief-rules.md` section 9.
4. Write CTA strategy, links (real GSC URLs as full absolute URLs; otherwise `[INTERNAL LINK: anchor -> topic]`), E-E-A-T (only what the client can deliver), writer notes, technical notes, and sources and scope.
5. Add the Accuracy and brand guardrails section when the client's brain or brand docs have rules.
6. Apply the variant and YMYL tables below.
7. Make every figure identical wherever it repeats (word counts, volumes, title, H1).

| Who writes | Variant | What changes |
|---|---|---|
| Internal writer | full | Every recommendation keeps its Reasoning line |
| Client or freelancer | concise | Drop every `**Reasoning:**` line, the Reasoning column of the on-page table and the strategy rationale paragraphs; Covered by is optional |
| Both asked for | both, from one run | Build full first, derive concise by deletion only; never let the two disagree |

| Topic type | Add to the brief |
|---|---|
| Health or medical | A review-by-expert note (named role, not a person you invent); a red-flags or "when to get help" element in the outline; a studies and sources list (publisher, date, link) for the writer to verify; claims only from the client's own materials |
| Finance, crypto, tax | A not-advice disclaimer note; no figures (fees, returns, rates) unless the client supplied them; jurisdiction caveats; reviewer in technical notes |
| Legal | Jurisdiction and date-of-law note; primary sources (statute, regulator) as external links; a `<!-- TODO (human): legal review -->` on sensitive lines |

Raise any brand or legal wording risk inside the brief with a safe generic fallback; never hold a
brief waiting on legal. Unsupported product or medical claims become `[CITE: ...]` or a
`<!-- TODO (human): ... -->`.

## Step 8: Self-check

Before this step, read `references/qa-rubric.md`.

1. Run `python scripts/check_brief.py brief.md` (add `--lang he` for a Hebrew brief, `--variant concise` for the concise one). It exits with code 1 on errors. Fix every error and review every warning, then run it again until it is clean.
2. Read for what the script cannot see: Hebrew equivalents of banned title, meta and heading patterns; off-topic words from another brief; claims without a source; an angle that fails the swap test.
3. Score the five rubric criteria 1 to 5 with one line of evidence each. Ship bar: every criterion at 4 or 5. Below 4 on any criterion: fix the brief and score again; never ship below the bar.
4. Confirm every correctness criterion in the rubric holds. One failure blocks delivery.

## Step 9: Deliver

1. **Checkpoint H5:** before anything client-visible (sharing the Doc, placing it in a folder the client can open, updating a content table the client sees), show the finished brief and its self-check. If you are not sure whether the named folder is client-visible, ask. Wait for approval.
2. Create the Doc with Google Drive `create_file`: `title` = the brief's title line, `textContent` = the Markdown, `contentMimeType` = `text/markdown`, `parentId` = the folder the user named, conversion ON (do not set `disableConversionToGoogleType`) so it becomes a Google Doc. Create the concise variant the same way with " (concise)" at the end of the title when both are needed.
3. Verify by reading it back with `read_file_content`: headings present, tables rendered, no `{{`, no em-dash. If the Markdown conversion fails or tables break, create it again from the same content converted to HTML with `contentMimeType` = `text/html`. If Drive is unavailable, hand the user the Markdown file.
4. Never share the Doc, change its permissions or touch a client-visible system before H5.

## Step 10: Final message

**Checkpoint H6:** send this, and wait for send or revise.

```
<Title line>
Doc: <link>   (variant: full | concise | both)
Self-check: intent <n>/5, table stakes <n>/5, opportunities <n>/5, keywords <n>/5, advantage <n>/5
check_brief.py: clean (0 errors, <w> warnings reviewed)
Cost: DataForSEO $<summed cost> (<q> SERP pulls, <p> page reads); Ahrefs <n> browser exports, 0 API units
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
| One SERP pull per spelling variant | Merge variants; cap 15 pulls |
| Client's own page in the competitor set | `--exclude-domain`; a top-10 client page flags a refresh |
| Forums, Wikipedia or video dominate | Intent signal, not competitors to outline against |
| Section budgets leave FAQs nothing | Explicit FAQ allowance; outline + FAQ = total |
| Section angle restates the heading | Swap test on every angle before H4 |
| Banned patterns return in translation | Read for Hebrew equivalents at step 8 |
| Volumes from memory or an old list | Pulled live in this run, with source and date; otherwise "not measured" |
| Invented internal URLs | Real GSC URLs only; otherwise the placeholder |
| Brand terms counted as topic demand | Type them Brand (excluded); no score, no target |
| Topic the site already covers | Site-coverage check before H3 |
| Leftovers from another brief or the template | Blank template every time; check_brief.py flags tokens; read for off-topic words |
