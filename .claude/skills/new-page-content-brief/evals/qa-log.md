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
