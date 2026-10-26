# QA rubric (read before step 8, the self-check)

The self-check a brief must pass before H5. It has four layers, in this order: the script, the
correctness criteria, the five-criterion rubric, and the reading checks the script cannot do. The
same criteria, with Pass / Partial / Fail and one line of evidence, are what the Phase 5 QA uses, so
a brief that passes here should pass there.

## 1. Run the script first

```
python scripts/check_brief.py brief.md [--lang he] [--variant concise]
```

Exit code 1 means errors. Fix every error and review every warning, then run it again until it
reports no errors. Run it on each variant you deliver. What it checks mechanically (so you do not
redo it by hand): section order and headings, the keyword, competitor and on-page tables, character
limits, slug word count, outline labels and non-zero word counts, outline sum + FAQ allowance =
total (1% tolerance), 1 to 3 distinct snippet queries, snippet targets labelled a bet when SERP
features were not observed, the 40/50 first FAQ guideline, forbidden leftovers (`{{`, `}}`,
`<topic>`, `<client>`, `<keyword>`, `[PLACEHOLDER`, `TBD`, `Lorem`), any HTML comment `<!--`
(an error: comments vanish in the Google Doc, so a TODO must be a visible `**TODO (human):**`
line), em-dashes, and English banned title, meta and phrase patterns. If the script is unavailable, do
these checks by hand from section 4 and say so in Sources and scope.

## 2. Correctness criteria (must never fail; one failure blocks delivery)

| # | Criterion | How to check |
|---|---|---|
| C1 | No leftover text from another brief or the template (wrong topic words, sample rows, another client's FAQ) | Read the whole brief for words that do not belong to this topic and client |
| C2 | No primary keyword with zero or unmeasured volume without saying so | Keyword table note on the primary |
| C3 | The top-3 list has 3 real pages, each read in this run | Compare with the page-read record |
| C4 | Headings in the brief's language only (no English FAQ heading in a Hebrew brief) | Every `##` and FAQ heading |
| C5 | Figures identical wherever they repeat (total words, FAQ allowance, volumes, title, H1, slug) | Brief at a glance vs body |
| C6 | Every volume and rank is from a tool call in this run, with source and geo | Source line under the keyword table; Sources and scope |
| C7 | Every competitor URL is real and was read (a crawl-only read counts only with its digest labelled partial) | Page-read record and crawl ids |
| C8 | No invented internal URL | Every internal URL appears in the GSC data; else the placeholder |
| C9 | Keywords appear exactly as supplied or exported | Diff the table against the list |
| C10 | The intent verdict matches the observed SERP | The SERP record and the verdict table in SKILL.md step 3 |
| C11 | No GSC impressions, CTR or position quoted from a window that overlaps the GSC impressions logging error (2025-05-13 to 2026-04-27) without the caveat; SurgeOS `dataNotes` / `compareNote` respected | Every GSC figure's window in the brief and in Sources and scope |
| C12 | Every human TODO is a visible `**TODO (human):**` line, and the Doc's TODO count equals brief.md's | check_brief.py (no `<!--`); read-back count at step 9 |

Also never fail: no client name, URL or number from a different client; no em-dash; full absolute
URLs in the links section.

## 3. The rubric (from the app's brief validator)

Score each criterion 1 to 5 with one line of evidence. **Ship bar: every criterion at 4 or 5.**
Below 4 on any criterion: fix the brief, re-run the script, score again. Never ship below the bar,
and never round up.

**Against inflated self-scores:** table stakes is 5 only if every table stake has its own outline
item (not only a passing mention in another section's guideline). Before scoring, list each table
stake beside the outline item that carries it; any stake named only in passing caps the score at 4.

| Criterion | The question | A 3 looks like | A 5 looks like |
|---|---|---|---|
| 1. Search intent alignment | Does the structure match the classified intent? Does the format match what is ranking? | Intent stated, but the outline follows a generic guide shape; format chosen by habit | Format named from the top 10 (with URLs); answer-first opening; outline shape mirrors what ranks and the SERP features observed each have a block |
| 2. Table stakes coverage | Are ALL table-stakes topics from the gap analysis in the outline? | Most are covered; one is folded into an unrelated section or missing | Every table stake maps to a named outline item; each cites the competitors that make it table stakes |
| 3. Strategic opportunities | Does the outline exploit the opportunities? Is differentiation clear? | Opportunities listed but appear only as a guideline line each | Every opportunity has a home; at least two are whole sections; the editorial angle passes the swap test and runs through the section angles |
| 4. Keyword integration | Primary in H1, title, slug, OG title and key headings? Secondaries distributed? | Primary in title and H1, but secondaries piled into one section or stacked in the title | Primary exact-match once per element near the front; every keyword has a placement note that the outline honours; question keywords are FAQs; commercial terms route to the right page |
| 5. Competitive advantage | Would this brief produce content better than the top competitors? Why? | Covers what the top 3 cover, slightly longer | You can say in one sentence why it beats the top 3, and the outline shows it (a worked example, a decision rule, honest failure cases, a local angle, an original asset) |

Also note, as the validator does: the improvements you made (section, issue, fix) and the brief's
strengths. They go in your working notes, not the brief.

## 4. Format checklist

- [ ] Title line in the house form: `<Topic> - Content Brief | <Client>` or `<topic> - בריף יצירת תוכן | <client>`.
- [ ] Header block: date, market and language, prepared by (role), variant; relevant links.
- [ ] Every section present in template order (guardrails only when the client has rules).
- [ ] Every keyword supplied is in the keyword table, typed, with a placement note; a source-and-date line under the table.
- [ ] Competitor table with at least 3 rows; differentiation summary grounded in rankings.
- [ ] Table stakes and opportunities, each with evidence.
- [ ] On-page table with all six rows and a Chars column; limits: meta title <= 60, meta description <= 155, OG title <= 60, OG description <= 200, slug 3 to 5 hyphenated words.
- [ ] Every outline item has a non-empty Angle, Guidelines, Keywords and a non-zero Word count.
- [ ] Outline sum + FAQ allowance = total word count.
- [ ] 1 to 3 snippet targets with distinct queries, or none if the SERP shows no opportunity.
- [ ] FAQs: questions as H3, 1 to 3 guideline bullets, first one the 40 to 50 word answer instruction; no drafted answers.
- [ ] Internal links are full absolute URLs from GSC, or the placeholder.
- [ ] E-E-A-T lists only what the client can deliver.
- [ ] Sources and scope: SERP date, market, tools, the SERP export `jobId` and crawl ids, client files read, GSC window, cost, exports, what was not measured, and the Fact and source bank table.
- [ ] Search intent and SERP: SERP features marked observed when the export succeeded, and an AI Overview line per query (present or absent, gist, cited sources).
- [ ] Concise variant: no Reasoning lines, no Reasoning column; nothing else differs from full.
- [ ] No Open Items section; nothing about the current page (that goes in a companion note); 15 pages or fewer.

## 5. Reading checks the script cannot do

- **Hebrew banned patterns:** equivalents of "Ultimate/Complete Guide", "Everything you need to know", "for beginners", "Benefits of", "Pros and cons", "learn/discover/explore" titles, "In this guide we'll explore" metas, and the AI-tell phrases.
- **Swap test** on the editorial angle, every section angle and the meta title.
- **Headings are claims, not labels;** at most one "What is X?"; no 5 parallel "How to" H2s; shapes vary.
- **Guidelines advance the angle** and name concrete things (a table's columns, an example, a number with `[CITE]`), not "explain clearly".
- **Claims:** every product, medical, legal or financial claim is supported by the client's materials or a source URL read in this run (listed in the Fact and source bank), or marked `[CITE: ...]` / `**TODO (human):** ...`. More than a handful of `[CITE]` markers means the research was skipped: search before shipping.
- **Snippet bets:** when SERP features were not observed (Ahrefs or web-search fallback), each snippet target says it is an answer-first bet (at most 2); when the SERP export succeeded, features are observed and no bet label is used.
- **Cannibalisation override:** when a new page was chosen over an existing client page, the primary keyword is the distinct sub-intent, not the existing page's head term.
- **Meta hook matches the intent** of the query.
- **Brand rules:** banned terms absent, preferred terms used, guardrails honoured.
- **Standing recommendation changed?** Then the brief says so (house rule 5).

## 6. Recurring misses in past briefs (check each one)

1. A page goal copied from another brief.
2. Leftover topic words from a template or a previous brief (another topic's terms in the body, another subject's FAQ).
3. A primary keyword with volume 0 left in the table without a word.
4. A "top 3" list with only 2 pages.
5. An English heading (often the FAQ heading) in a Hebrew brief.
6. Placeholders left in (template tokens, sample rows from the template).
7. Figures that disagree between two places in the brief.
8. Product facts the client never supplied (hallucinated specs, fees, availability).
9. The same H2 repeated.
10. A meta description hook that does not match the query's intent.
11. A subtopic the client's log says every brief in this family must cover, missing.
12. FAQ answers drafted instead of guidelines.
13. An Open Items section, or questions left for the writer that should have been settled at H3 or H4.
14. Statements about the current live page inside the brief.
15. Numbers without their base, source and date; "only X does Y" claims that were not checked.

## 7. House rules (verbatim)

1. No em-dash in anything client-visible, ever. Use a comma, a colon or a new sentence.
2. Full absolute URLs in recommendation and dev-task documents.
3. "Key Events", never "Conversions" for GA4.
4. Every number carries its source, geo scope and date range, and comes from a tool call, never from memory. Name what you did not measure.
5. State the standing recommendation you are changing.
6. Do not sell an outcome you cannot show.
7. The deliverable is in the client's language; the skill's own instructions stay in English.

## 8. What to do with each failure

| Failure | Fix |
|---|---|
| Script error | Fix in `brief.md`, re-run until no errors |
| Script warning | Read it; fix, or keep it with a reason you can state at H5 |
| Correctness criterion | Fix before anything else; if it needs data (a missing read, a missing volume), get it within the approved budget or ask (H2); never paper over it |
| Rubric criterion below 4 | Go back to the step that owns it: intent (step 3), gaps and angle (step 4), outline (step 6), keywords (step 4 then 6); re-score |
| Outline change after H4 | Show the change to the person before H5 |
| Hebrew pattern or AI-tell found by reading | Rewrite the line; re-run the script |
| Claim without support | Search for a source first; else `[CITE: ...]` or `**TODO (human):** ...`, or cut it |
| HTML comment in the brief | Convert it to a visible `**TODO (human):** ...` line; re-run the script |
| Mismatch between full and concise | Rebuild concise from full by deletion only |

## 9. Agency content-brief criteria (Phase 5 scorecard, for reference)

| # | Criterion |
|---|---|
| B1 | Target and secondary queries come from the client's Search Console or a keyword source, with volume, geo and date |
| B2 | A live SERP for the target query was pulled with the right location and language (google.co.il and Hebrew for Israeli clients) |
| B3 | Intent and the 3 Cs (content type, format, angle) are recorded with the top-10 evidence |
| B4 | One H1; each H2/H3 maps to a query, a People Also Ask item or a subtopic |
| B5 | Internal link targets are full URLs that are indexable |
| B6 | A word count, if given, is a range justified by the SERP (the brief states the total, its derivation and the writer's 0.85 to 1.15 range) |
| B9 | The brief names what the page adds beyond the current top results |
| B10 | E-E-A-T inputs are requested (author, first-hand material, reviewer for YMYL topics) |
| B12 | Hebrew keywords come from Hebrew query data; prefix variants are grouped, not stuffed |

QA tags a Partial or Fail with one reason: `wrong-facts`, `missed-a-step`, `wrong-tool-or-source`,
`out-of-scope`, `risky`, `format`, `cost`.
