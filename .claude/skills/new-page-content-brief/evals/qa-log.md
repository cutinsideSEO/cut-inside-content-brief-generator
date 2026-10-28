# QA log: new-page-content-brief

Maintenance only; never read at run time. One entry per QA round (Phase 5 of the skill-builder process).
Client names stay out of this file: cases are described by role and market, and the gold deliverable
paths live in the skill's work folder, not here.

## Plan (Phase 5, not yet run)

| Case | Description | Gold deliverable | Edge? |
|---|---|---|---|
| 1 | English informational comparison, US market, keyword list supplied | Gold A (see the work folder) | no |
| 2 | English how-to, US market, competitors mostly forums | Gold B | no |
| 3 | Hebrew explainer, Israel market, finance topic (YMYL) | Gold C | no |
| 4 | Hebrew, Israel market, Ahrefs route, no DataForSEO connector | Gold D | yes |

For each case: run in a fresh session with the skill installed; record tools called, what it asked,
where it stopped (H1 to H6), cost; score the five rubric criteria and the correctness criteria;
the owner compares the output and the gold blind (A/B, random order); baseline run without the skill
for at least one case.

**Hold-out rule:** QA cases must be held out of examples.md: never test the skill on a topic whose
gold is excerpted in examples.md. Round 1 broke this rule (all four golds were excerpted in
`references/examples.md`), so its vs-gold comparison and blind A/B are not clean; round 2 uses
other past briefs as cases and keeps the examples.md golds out of the case set.

Ship bar: no Fail on a correctness criterion in any case; the owner would send at least 2 of 3 with
light edits; within the cost estimate; every checkpoint fired where the contract says.

## Rounds

| Date | Case | Rubric (5 criteria) | Correctness | Owner verdict | What changed |
|---|---|---|---|---|---|
| 2026-10-22 | R1-1 EN, US, informational comparison (full) | 4/4/5/5/4 | 0 Fail; Partials from environment (no located SERP, list not re-checked); H5 silent | pending (blind pack) | see round-1 fixes below |
| 2026-10-22 | R1-2 EN, US, how-to, forum-heavy SERP (concise) | 4/4/5/4/4 | 0 Fail; correct refresh stop at H3 (client page ranks for 4 of 5 keywords) | pending | |
| 2026-10-22 | R1-3 HE, Israel, finance explainer (full) | 4/4/5/3/4 | 0 Fail; Partial: GSC window crossed the logging error; kept the existing page's head term as primary after a cannibalisation override | pending | |
| 2026-10-22 | R1-4 edge HE, Israel, no DataForSEO and no browser (concise) | 4/4/4/4/4 | 0 Fail; clean stop before H1, then labelled fallback; Partial: GSC window | pending | |
| 2026-10-22 | R1-baseline (case 1 without the skill) | 4/5/5/4/4 | 3 Fail (relative links, drafted answers, unflagged legal claims); no checkpoints | n/a | skill earns its place on method and safety; baseline had a better source bank |

**Round 1 conditions:** run by Claude in a cloud session with no DataForSEO connector and no browser (all cases used the documented fallback: supplied or unmeasured volumes, web-search SERPs labelled approximate). Cost guard, H2, located SERPs, SERP features and the Ahrefs export route were NOT exercised. The vs-gold comparison is weakened by the hold-out breach above. Verdict: not ready to ship; round 2 with connectors required.

**Round-1 fixes (2026-10-22):** visible `**TODO (human):**` markers (HTML comments were dropped by the Doc conversion) and a check that errors on `<!--`; GSC data-break window rule; re-choose the primary after a cannibalisation override; snippet targets labelled as bets when features were not observed; fallback geo labels; a fact and source bank instead of many `[CITE]` markers; reading large brain files by grep and product briefs; top-3 on-topic and in-language rule; H5 always stated; a step-6 checklist and a heading diff after H4; autocomplete documented as ideas only; client branded template and naming rules honoured; `score_competitors.py --rank-only` with auto-switch on zero volumes; a cap on table-stakes self-scores; examples annotated `[not to imitate]` where gold lines break the rules.

## Round 2 (2026-10-26)

| Date | Case | Rubric (5 criteria) | Correctness | Owner verdict | What changed |
|---|---|---|---|---|---|
| 2026-10-26 | R2-1 HE, Israel, finance explainer (full) | 4/4/5/3/5 | 0 Fail; Partials: override primary was a synonym of the existing head term, snippet target on an unpulled query, variants not merged | pending (blind pack) | see round-2 fixes below |
| 2026-10-26 | R2-2 EN, US, crypto how-to (concise) | 4/3/5/4/5 | 0 Fail; Partials: a table stake missing, short user length not raised; cost estimate 31% high (small base) | pending | |
| 2026-10-26 | R2-3 HE, Israel, medical (full) | 4/5/5/3/5 | 0 Fail; Partials: override applied to a term the client page does not rank for, no compliance TODO, one competitor weakness wrong, one unread Covered-by URL | pending | |
| 2026-10-26 | R2-4 edge EN, US, keyword list built from scratch, no volume tool (full) | 5/4/5/4/5 | 0 Fail; Partials: keyword set model-chosen, 15 pulls, 2 sitemap-sourced internal URLs, branded-template note missed at H4 | n/a | |
| 2026-10-26 | R2-baseline (R2-2 without the skill) | 4/4/4/3/4 | 1 Fail (word-count figures disagree); spent before any approval | pending (blind pair) | skill earns its place on method, safety and correctness |

**Round 2 conditions:** SurgeOS SERP export and crawler available; no DataForSEO MCP; no Ahrefs browser. All 4 skill runs: 0 correctness Fails, every checkpoint fired in order, no spend or page read before H1. Cost per brief under $0.03. The shared crawler daily cap was hit mid-round (two cases used WebFetch only). Owner blind verdict pending. Not ready to ship: rerun R2-1 to R2-3 after the fixes, with R2-4 as the passing control and a fresh crawl budget.

**Round-2 fixes (2026-10-26):** crawler daily cap (WebFetch first, at most 3 crawled domains per brief, remaining crawl writes shown at H1); cannibalisation override only on terms the client page ranks for, new primary names the sub-intent (never a synonym, expansion, translation or transliteration); keyword sourcing without a volume tool (user, GSC, tracked, PAA and related searches only; seeds labelled and kept out unless observed); rubric caps (keywords at 3 on a weak override or unpulled snippet query, table stakes at 3 when a stake has no outline item); length vs required items raised at H4; export price from a same-config recent export; AI Overview answer-block snippet label, pulled queries only, and check_brief.py warnings for both; one consolidated message before H1; transliteration and same-term merging; legal or compliance TODO for medical and finance briefs; competitor weakness claims verified against the page read; Covered by lists read pages only; indexed sitemap URLs allowed and labelled; `## On Page SEO` allowed as a fixed label in Hebrew briefs; branded template or naming rule stated at H4. Not skill changes (QA harness): keep the baseline runner off the runner kit's checkpoint sections, physically move the skill folder for the baseline, stagger runs or pre-check the crawl budget.

**Owner verdict, round-2 blind A/B (2026-10-28):** the briefs are very good but ultra long; keep that version for research and machine writing, and add a concise brief a human writer can read, as the gold briefs do. **Change:** every run now produces two linked Docs, a writer brief (distilled from the research brief by deletion and compression only; `assets/writer-brief-template*.md`, SKILL.md step 7b, brief-rules section 17) and the research brief (the former full output); the concise variant is gone. Length budget measured on the 8 gold briefs (median about 1,900 words, range about 1,000 to 2,400, one reasoning-heavy app export about 3,900) against the skill's round-1 briefs (median about 5,700, range 3,850 to 7,000): soft target max(2,000, 85 x items), hard ceiling 1.5 x soft. `check_brief.py` gained `--type research|writer` (`--variant` kept as a deprecated alias) and `--pair`. Test: round-1 case 1 distilled to a 1,998-word writer brief from a 6,196-word research brief, both modes and `--pair` clean. The next blind A/B compares the writer brief with the gold.
