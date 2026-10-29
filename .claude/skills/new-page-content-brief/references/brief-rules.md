# Brief rules (read before step 4, again before step 6, and section 17 before step 7b)

The rules for every section of the brief, in the order the method builds them. Most of the wording
comes from the agency's Content Brief Generator prompts; quoted rules are kept close to verbatim
because they are the method. Section numbers are referenced from `SKILL.md`.

## 0. Rules that apply to every section

- **Reason from the rankings, not just the score.** Group each competitor's ranking keywords into themes. Find which themes each competitor dominates (top positions on high-volume terms) and which high-volume terms are weakly covered or absent across competitors: those gaps are the opportunities. Cite specific keywords, volumes and ranks when you justify a recommendation.
- **Priority pages weigh more.** Pages the user named as references or rated competitors get significantly more weight: prioritise their structure, topics and style, and say in the reasoning when one of them shaped a decision.
- **Data integrity.** Base all analysis only on the data pulled in this run, the keywords and the user's context. Do not fabricate statistics, studies or claims. When referencing competitor behaviour, cite the specific URL. Flag uncertain recommendations as suggestions, not facts.
- **Brand alignment.** Every recommendation fits the brand's voice, positioning, audience and content rules. Never recommend what the brand's don't-list or banned terms exclude. Favour preferred terminology. Flag known competitors when they appear.
- **Reasoning is a deliverable.** Every recommendation in the research brief carries a `Reasoning:` line that cites the data behind it (a URL, a keyword with volume and rank, a heading pattern). The writer brief leaves reasoning out and links to the research brief (section 17).
- **Language.** Every heading, label, value and reasoning line is in the brief's language. In a Hebrew brief, only the fixed labels in the template stay English (the `## On Page SEO` section heading, on-page element names, outline level prefixes, snippet formats).
- **The brief's own prose obeys the voice rails and banned-phrase list in section 12.** A writer copies the brief's wording, so a guideline that says "delve into" teaches the article to say it.

## 1. Search intent

Classify from the observed SERP before anything else; everything downstream serves it.

| Type | Means | Typical evidence |
|---|---|---|
| informational | the user wants to learn something | how-to guides, what-is pages, explainers, definitions |
| commercial_investigation | researching before buying | best-X lists, X vs Y buying guides, reviews |
| transactional | wants to buy or do something | product, category, sign-up, download pages |
| navigational | wants a specific site or page | one brand's pages dominate |

Record: **intent type**, **preferred format** (what the top positions reward: how-to guide,
definition page, explainer with a position, listicle, comparison table, tool), **SERP features
observed** (per query, from the pull, never guessed), and the **source and date** of the pulls.

**Stop rule (v0.1):** only informational (including mixed, for its informational slice) proceeds.
Any other verdict stops at H3 with the evidence. A client page in the top 10 for the primary query
or the topic's head term (Search Console average position <= 10 over the last 3 clean full months,
or top 10 in the SERP export) routes to a refresh with `existing-article-content-refresh` and ends
the run at H3, unless the person explicitly asks for a separate page on a named distinct sub-intent
(SKILL.md step 3).

## 2. Page goal and target audience

**Page goal:** "Analyze the competitor data, paying close attention to the pages with the highest
weighted score and any priority pages, as they represent the most successful content. Use each
competitor's rankings to see which keyword clusters and search volumes they own versus miss: this
reveals the audience segments and sub-intents already well served and the ones left underserved.
Deduce their primary goal and target audience. Then define a strategic goal for our content that
either serves the same audience more effectively or targets a valuable, underserved niche (an
underserved keyword cluster) they are missing."

- State the goal in one paragraph with the outcome it serves (education and awareness, problem solving, a supporting role for a commercial page). For a non-revenue page, say so. Never promise traffic you cannot show (house rule 6).
- **Target audience** has three parts (from the house template): who the reader is (a specific description, a persona name if useful), their knowledge level (basic, intermediate, technical), and the tone and style that suits them.
- Reasoning for each cites the top-scoring and priority pages and the clusters they own or miss.

## 3. Editorial angle (the most important decision)

"Commit to a specific editorial angle: a 1 to 2 sentence thesis this article will champion. The
angle is the reason the article exists beyond covering the topic. Without one, the output defaults
to averaging the SERP."

Derive it from three inputs: (1) what top and priority competitors do well (find a sharper or
adjacent frame, do not restate it); (2) what competitors miss, skim or get wrong; (3) the search
intent (the angle serves the intent, it does not fight it).

The angle must:

1. **Take a position.** Not "we'll cover RAID storage options" but "RAID 5 is the wrong default for modern NAS builds, and here is when RAID 6 or ZFS is worth the complexity."
2. **Be specific:** a named framework, a dated claim, a contrarian stance, or a trade-off the reader must make.
3. **Pass the swap test:** swap another topic's keyword into the angle. If it still makes sense, it fails. "This guide covers everything you need to know" works for any topic, so it fails.
4. **Fit the intent:** for informational intent, the angle is an explanatory thesis (it explains and takes a position). (For reference: commercial investigation would be an opinionated recommendation, transactional a concrete pathway.)
5. **Cite a gap:** its reasoning names at least one specific competitor gap or strength that motivated it.

| Weak angle | Why it fails | Strong angle |
|---|---|---|
| "A complete guide to composting." | No position; passes for any topic | "Hot composting is only worth the effort if you can turn the pile weekly; otherwise a cold heap gives you the same soil a season later with none of the work." |
| "We explain what a heat pump is and its benefits." | Topic restated; "benefits" is a banned frame | "A heat pump pays back only where winters stay inside its rated range; below that, the backup heater does the work and the savings disappear." |
| "Remote and office work both have strengths." | Neutral hedging | "Remote teams lose on onboarding speed, not on output, so the decision turns on how many people you hire each year." |

(Illustrations of shape, not content to reuse; numbers in a real angle must come from the research.)

Write the swap test result next to the angle in the brief: "Swap test: replace <topic> with
<other topic>, the thesis collapses. Passes."

## 4. Competitor breakdown and differentiation summary

**Differentiation summary:** "Explain the key strategic differences between the top-performing
content (high score, priority) and the lower-performing content. What do the winners do that the
others don't? Ground this in the rankings data: name the keyword clusters (and their volumes) that
the winners dominate and the lower performers miss. Do not rely on the weighted score alone."

**Per competitor** (every scored page you read):

- **What it is:** "a single, concise sentence summarizing the page's content and angle."
- **Strengths:** specific things to learn from ("a comparison table of the three account types", "opens with a 45-word definition"), and which high-value keyword clusters and positions it owns.
- **Weaknesses:** specific gaps, written as concrete, reusable content gaps ("no worked example with real numbers", "ignores the local tax rule"), and the high-volume terms where it ranks weakly or not at all. Verify every "it lacks X" or "it does not mention X" against the page text read in this run before writing it (a QA check found a page credited with omitting a step it listed); a page read only partially gets no absence claims. Writers use these as a differentiation directive: close these gaps explicitly, without complaining about competitors in the article.

In the brief: the differentiation summary (with reasoning), the competitor table (URL, weighted
score, word count, what it is, strengths, weaknesses; at least 3 rows), the top 3 read in full, and
one line naming what was excluded or flagged (the client's own URLs, forums, Wikipedia, video).

## 5. Keyword strategy

1. Analyse the list against the competitor data (top-scoring and priority pages) and the page goal.
2. **Primary:** one or more keywords that best represent the core intent. Pick the single strongest one for the on-page elements.
3. **Every other keyword is categorised:** Secondary, Question, Commercial (route, do not target), Brand (excluded), or Existing page (do not target). Nothing is dropped.
4. **A note on every keyword:** its strategic value and where it goes ("H1 and opening paragraph", "H2 of section 3", "FAQ 2", "anchor text to the commercial page").
5. **Rationale** (research brief): why these primaries, how the secondaries support them.

Constraints:

- "Use the exact keywords provided. Do not add, change, or remove any keywords from the list." Exported lists are trimmed only for topic fit, and the trim is stated. "Exact" means the strings stay unchanged; it does not mean the user's term must stay primary.
- **Cannibalisation override.** It runs only in two cases (SKILL.md step 3): a client page ranks only lower (position 11 to 30) for the topic and the person chooses a new page with a distinct angle; or a client page ranks in the top 10 for the primary query or the head term (which routes to a refresh by default) and the person explicitly asks for a separate page on a named distinct sub-intent ("I want a separate page for X"). Never offer the override yourself in the top-10 case. When it runs, re-choose the primary keyword for the distinct sub-intent, so the new page does not target the existing page's head term. Keep every user string exactly; retype the old head term as Secondary or "Existing page (do not target)" (its note names the existing URL, its Search Console average position and date range or its SERP export position and date, the different question the new page answers, and the anchor to link to it once; the writer brief turns these rows into the plain-language paragraph of section 17.6). Show the change (old primary, new primary, why) at H3. Apply it only to the terms the existing client page actually ranks or gets impressions for (export position or GSC, last 3 full months); other user strings keep their type. The new primary names the distinct sub-intent ("X vs Y", "how to do X with Y"), never a synonym, abbreviation expansion, translation or transliteration of the existing head term. If no user string expresses the sub-intent, use an observed query (PAA, related search, client GSC query) as primary and say so at H3. If the new primary was not a query in the export, its SERP is pulled before H3 approval (SKILL.md step 3).
- **The primary is in the market's search language,** as people in that market type it: Hebrew script for an Israeli Hebrew brief, or a mixed Latin and Hebrew form actually seen in the user list or the client's GSC. A PAA question or related search in another language (an English PAA on a transliterated query, for example) may enter the table as a Question row at most, never as the primary: it cannot appear verbatim in a Hebrew title, H1 or OG title, and nobody can track its rank. If no market-language observed string expresses the sub-intent, offer at H3 to pull up to 3 market-language phrasings and keep the one whose located SERP returns market-language pages on that sub-intent ("seed, SERP observed, volume not measured"). `scripts/check_brief.py` warns when a Hebrew brief's primary has no Hebrew letter.
- **The informational head term stays primary.** An informational page chasing a bigger transactional head term loses to retail and cannibalises the commercial page. Commercial terms become "Commercial (route, do not target)" rows whose note says which page they route to (an internal link), and they do not shape the outline.
- **Brand and navigational terms** (a brand name, a product name, a site name) are typed "Brand (excluded)": brand demand is not topic demand. They are excluded from scoring and targeting.
- **Zero or unmeasured volume on the primary keyword** must be said in the note ("0 in <country>, <month>; chosen because ..."), never left silent.
- **Demand-weighted sections:** subtopics with their own search volume get their own sections and larger budgets.
- Below the table, one line: source, country, global, date ("Source: Ahrefs Keywords Explorer export, Israel and global volume, pulled 2026-10-20").

## 6. Content gap analysis

"This output will be the primary directive for the article structure."

How to read the data:

- **Headings as a coverage map:** compare H2s and H3s across competitors. A topic in the headings of most competitors is a table stake (the SERP expects it). A topic in only 1 or 2 competitors, or absent yet relevant to the intent, is a strategic opportunity.
- **Rankings as a demand map:** which high-volume keyword clusters are well covered (table stakes) versus weakly covered or missed across the SERP (opportunities). Weigh opportunities by search volume: a missed high-volume cluster beats a missed long-tail term.

Write:

1. **Table stakes:** topics consistently covered by the top-ranking and priority competitors; the non-negotiable topics. Each: the topic plus evidence (which competitors' headings, which keywords).
2. **Strategic opportunities:** topics, angles or formats competitors cover poorly, superficially or not at all. Each: the opportunity plus its heading or keyword evidence and why it differentiates. Typical sources: honest failure cases, a conditional answer where others give a slogan, a local angle (law, tax, currency, institutions of the market), a worked example with real numbers, a practical "how to use this" payoff, a format nobody offers (table, calculator, decision rule), freshness.
3. **Summary** (research brief): how the gaps shape the outline.

Every table stake must appear in the outline; every opportunity must be exploited, and at least two
visibly in depth.

## 7. Article structure

### 7.1 Primary directive

"Create an outline that covers all table stakes and exploits all strategic opportunities identified
in the content gap analysis. Create a natural, flowing structure that will be valuable to the
reader." The outline must be heavily influenced by the highest-scoring and priority pages and by
every earlier step. If the user gave a template page, use its heading structure as the foundation,
adapt it to the topic, and preserve the overall structure as much as possible.

### 7.2 Shape

- **Nested:** H2 for main sections, H3 for sub-sections, H4 at most under an H3. Three levels, no more.
- **Hero** only when the opening makes a real hook. Its reasoning states the hook, not "introduce the topic". No hook: omit the Hero and let the reader start at the first H2.
- **Conclusion** where it earns its place, carrying the CTA.
- **No FAQ section in the outline:** FAQs are their own brief section with their own budget.
- Questions drive the structure: grouped question keywords and PAA themes often become H2s; question-style H3s work well.

### 7.3 Heading quality rules (verbatim: "these determine whether the article reads as distinctive or SERP-average")

1. **Each H2 should preview a specific claim or answer, not a bare topic.** Prefer "Why RAID 5 fails above 4TB drives" over "RAID 5 Considerations". Prefer "Book flights 43 days out, not 60" over "When to Book". If a heading reads as a topic label alone (for example "Pricing", "Implementation"), rewrite it with a specific verb or claim.
2. **No more than ONE "What is X?" heading per article,** and only when a definition is genuinely the reader's first question per the search intent. Using headings to signal "here's a definition" three times kills flow.
3. **Do NOT use these heading patterns unless the SERP specifically rewards them** (and do not produce equivalents of them in the brief's language): "Benefits of [X]" / "Advantages of [X]" / "Pros and Cons of [X]" (a sharper angle almost always exists); five or more parallel "How to [X]" H2s in a row (break rhythm, merge steps, or reframe); "[X] 101" / "[X]: The Basics" / "[X] for Beginners" (generic).
4. **Vary heading shape.** Mix declarative, interrogative and imperative forms. Avoid identical parallel construction across 4 or more consecutive H2s.
5. **Heading-as-mini-title test:** each H2 should stand alone as a tweet or subhead. If it can only be understood in the context of the H1, it is too generic: rewrite it.
6. **The Hero section is NOT an introduction.** If you use a Hero, its reasoning must state what hook the opening makes, not "introduce the topic". Without a real hook, omit it.

**Hebrew equivalents warning:** the patterns in rule 3 and the banned title patterns in section 9
come back in translation, for example "יתרונות של X", "יתרונות וחסרונות", "המדריך המלא ל...", "כל מה
שצריך לדעת על...", "X למתחילים". The script checks English patterns only; read Hebrew headings
yourself.

### 7.4 Section angle and guidelines (every item, nested ones included)

**Section angle** (write it first): "ONE sentence stating the specific claim, stance, or framework
this section stakes out. NOT a restatement of the heading or topic: the position the writer should
write toward. It MUST be a facet of the overall editorial angle."

- Good: "RAID 5 fails silently during rebuilds above 4TB; we recommend avoiding it for modern drives."
- Bad (topic restatement): "This section covers RAID 5 considerations." / "RAID 5 basics and how they work."
- For a definition or bare-facts section the angle can be "Define X and immediately qualify when it does and does not apply", but it must still commit to a frame.

**Guidelines:** "a list of specific, actionable instructions for the writer that ADVANCE the angle
(not just cover the topic). Tie each guideline to the content gap analysis, competitor insights, or
search intent where relevant. Proactively recommend strategic content formats where appropriate
(for example 'Include a comparison table of X vs Y', 'Add a diagram of this process', 'End with a
CTA to our product page')."

| Weak guideline | Strong guideline |
|---|---|
| "Explain the topic clearly." | "Open with the 45-word answer, then a table comparing the two methods (columns: time per week, months to usable result, cost, best for)." |
| "Mention the benefits." | "Name the one condition under which the method loses money, with a worked example; no competitor in the top 3 shows a losing case." |
| "Add some statistics." | "Cite the regulator's current threshold from https://www.regulator.example/thresholds (read in this run, dated); do not use a figure without a source." |

**Placeholders** inside a guideline (a sample line the writer completes) use [square brackets]:
"payable in [asset] on [network] to [address]". Never angle brackets: the Google Doc conversion
silently drops angle-bracket text, and `scripts/check_brief.py` errors on it.

**How-to and software topics:** name every OS or software version with its support status checked
in this run (for example "Windows 10 support ended 2025-10-14"), so a guide does not teach steps
for a version the reader should not be running without saying so.

**Reasoning** (research brief): why the item is included, linked back to the gap analysis ("Covers
the table stake X", "Exploits the opportunity to discuss Y in more depth than competitors").

### 7.5 Word-count allocation

- **Total:** the user's target if set; otherwise "a competitive word count based on the average of the top and priority competitors" (their measured word counts), rounded to the nearest 50. Say how it was derived.
- **FAQ allowance:** reserve it explicitly, questions x 80 words by default (60 to 100 a question). Outline sum + FAQ allowance = total (the check tolerates 1%).
- **Every item has a non-zero word count.** H2 sections get more than their H3s. Give more to complex guidelines and to snippet-target sections; give demand-weighted space to subtopics with their own volume.
- The writer's range per section is the target x 0.85 to x 1.15; state it once in Writer notes. Padding to a number is worse than a sharper, shorter section.
- **A user total too small for the required items:** divide the outline budget by the table stakes plus the opportunities planned as sections. Below about 120 words an item, say so at H4 with two options: raise the total (propose a number), or name which stake or opportunity moves to an FAQ or a link. Never drop a table stake silently.

### 7.6 Featured snippet targeting

"Based on the search intent and the SERP features present, identify featured snippet opportunities."

- Mark **1 to 3 sections (not more)** with a snippet target: format plus the query it answers.
- Each target has a **distinct query**: never point two sections at the same query.
- Choose the sections most likely to win: those that directly answer a specific question.
- Format = what Google shows for that query: **paragraph** for definitions (a direct 40 to 60 word answer in the first 1 to 2 sentences), **list** for steps or items (5 to 8 clear items), **table** for comparisons (a real table with headers).
- Only where there is a genuine opportunity. "A single strong target beats three weak ones." For informational queries at least one target is usually warranted.
- **Only pulled queries:** every target query is one pulled in the export (in the keyword table). Never a target on a query that was not pulled.
- **No featured snippet observed, AI Overview observed:** at most 2 targets, each labelled `Snippet target: <format> | <query> (AI Overview answer block; no featured snippet observed)`. In a Hebrew brief: `(בלוק תשובה ל-AI Overview; לא נצפה featured snippet)`. Neither a featured snippet nor an AI Overview observed on a located SERP: no targets.
- **SERP features not observed** (web-search fallback, no located SERP): label each target a bet, at most 2: `Snippet target: <format> | <query> (answer-first bet; SERP features not observed)`. In a Hebrew brief: `(הימור answer-first; רכיבי SERP לא נצפו)`.
- No opportunity anywhere: no snippet targets.

### 7.7 Match the observed SERP features

The features recorded at step 2 tell you what content types Google already surfaces: give it a
block to pull from for each one, written into the relevant section's angle and guidelines. Never
invent a feature the SERP did not show.

| Feature observed | Block in the outline |
|---|---|
| Video results, video carousel | A section whose guidelines call for an embedded video with a short on-page transcript or summary; the video goes under Resources |
| Image pack | An original diagram, annotated screenshot or other image-optimised visual with descriptive alt text, not stock |
| People Also Ask, "things to know" | A scannable in-body Q&A or key-facts block with short, self-contained answers to that section's sub-questions (distinct from the FAQ section) |
| Knowledge panel, definition-led features | One early section leads with a tight, standalone definition or key-facts summary before expanding |
| AI Overview | An answer-first block: the question answered completely in 40 to 55 words, units and bounds stated, before the detail |

"Fold these into the existing outline naturally: they should advance the editorial angle, not
bolt on as generic add-ons."

### 7.8 Enrichment (after the skeleton is approved internally)

- **Keywords:** the exact keyword strings (from the keyword table) this item helps target.
- **Covered by:** URLs of read competitors that have a section on this item (checked against their headings and text). Only pages read in this run; an unread ranking page goes in Search intent and SERP, not in Covered by.
- **Internal links:** where it strengthens the article, append 1 to 2 guidelines proposing a contextual internal link: a real client URL from the GSC data, or `[INTERNAL LINK: anchor -> topic]`. Only links that genuinely help the reader; do not force one into every section.
- **Never overwrite strategy:** preserve every section angle exactly and every existing guideline. Append only; never delete, reword or replace.

### 7.9 Resources

Read every guideline. Where one calls for something "a content writer cannot produce alone", add a
concise item under Resources: infographic, custom illustration or diagram, video, interactive tool,
calculator, custom photography, data visualisation, downloadable checklist. Example: guideline
"Include an infographic comparing X and Y" gives resource "Infographic comparing X and Y". None
needed: omit the line. Note when design work is outside the client's scope with the agency.

## 8. FAQs

1. **Question keywords first:** every keyword phrased as a question MUST be an FAQ.
2. **Then PAA questions** from the pulls (proven questions users ask), then questions from the gap analysis and points of confusion. Usually 4 to 8 in total.
3. **Guidelines, not answers:** for each question, 1 to 3 bullets on how to answer it. Do not write the answer.
4. **The first guideline is always snippet-shaped:** "Open with a self-contained 40 to 50 word answer that directly answers the question on its own, then expand on X and Y." Name X and Y.
5. Questions are H3s under the FAQ heading: "Frequently Asked Questions" in English, "שאלות ותשובות" in Hebrew. Never the English heading in a Hebrew brief.
6. No question duplicates an outline heading's job; an FAQ adds an answer the body does not give in that form.
7. Brand questions only when the client's materials support the answer.
8. Reasoning (research brief): how the set was chosen, naming the question keywords included.

## 9. On-page SEO

**Philosophy (verbatim):** "The job is NOT to stuff keywords. Modern Google rewards specific,
differentiated, click-worthy SEO elements that match user intent, not dense ones. A boring title
with three keywords loses to a specific title with one keyword every time."

**Core rules:**

1. **Primary keyword, exact match once per element:** the single strongest primary keyword appears in the meta title, H1, OG title and URL slug, once each, as close to the front as reads naturally. Do not cram several primaries into one element.
2. **Secondary keywords, semantic coverage, not stuffing:** never stack secondaries into the title or H1; they live in H2s and body copy.
3. **Specificity test:** swap the primary keyword for an unrelated topic's keyword. If the title still makes sense, it is too generic: rewrite it so a specific angle, number, framework or claim makes it compelling.

**Banned title patterns** (and their translations):

- "The Ultimate Guide to [X]"
- "The Complete Guide to [X]" / "A Complete Guide to [X]"
- "The Definitive Guide to [X]"
- "Everything You Need to Know About [X]"
- "[X] 101" / "[X]: A Beginner's Guide" / "[X] for Beginners"
- "[X]: A Step-by-Step Guide"
- "The Best [X] of [YEAR]" unless the article is genuinely a current-year ranked list
- Any title ending with the current year as filler (the year belongs only when freshness is the click reason)
- Any title whose main verb is "learn", "discover" or "explore"

**Banned meta description patterns** (and their translations):

- "Learn everything about [X] in our comprehensive guide..."
- "Discover the best [X] with our expert tips..."
- "In this guide, we'll explore..."
- Any meta that does not tell the reader the specific thing they will know after clicking.
- A hook that does not match the intent (a money-saving pitch on a specification question was rejected by a client).

**Title workflow:** for the meta title and OG title, draft three candidates: **A** benefit or
outcome-led (what the reader walks away with), **B** specificity-led (a named mechanism, number or
framework), **C** curiosity or tension-led (a question, contradiction or unexpected claim). Pick the
one that passes the specificity test, has the primary keyword near the front, fits the limit, and
matches the intent. In the reasoning, name the winner and say in one sentence why the other two
were weaker.

| Element | Limit and rule |
|---|---|
| Meta title | <= 60 characters; primary keyword near the front; passes the specificity test; no brand suffix unless the client's rules ask for one (several clients' templates add it, and two decisions-logs rejected it) |
| Meta description | <= 155 characters (house limit; the app allowed 160); one concrete promise the reader walks away with; active voice |
| URL slug | 3 to 5 words, hyphenated, lowercase, primary keyword included (transliterated or English for a Hebrew brief, per the client's URL convention), no filler words ("the", "a", "your") |
| H1 | The main on-page heading; may differ from the meta title ("the H1 serves on-page readers, the title serves SERP scanners"); contains the primary keyword once |
| OG title | <= 60 characters; may be more curiosity-led ("social scanners need a hook") |
| OG description | <= 200 characters; room for a specific claim or number |

The table has a Chars column: count characters of the final text and write the number. Reasoning
per element (research brief): (a) which primary keyword and where it sits, (b) why the phrasing
passes the specificity test, (c) any banned pattern considered and rejected.

## 10. Conclusion, CTA and links

- **Primary CTA:** the one action the page exists to drive, matched to an informational reader (a related guide, a tool, a soft product mention the client's materials support). **Secondary CTA:** the lighter alternative. **Placement:** where each appears (after section N, end of page, inline).
- Do not sell an outcome the page cannot deliver; a soft CTA with an availability or eligibility caveat beats a hard one that overclaims.
- **Internal links:** a table of anchor, full absolute URL, placement and why; real URLs from GSC, or from SurgeOS `get_sitemap_urls` with indexed status for hosts outside the default GSC view, labelled "sitemap, indexed". Commercial "route, do not target" keywords become anchors to the commercial page.
- **External links:** authoritative, non-competitor sources (regulators, standards bodies, peer-reviewed studies, official documentation), with what each supports. Never a competitor.

## 11. E-E-A-T signals

Four lists of specific, actionable recommendations, **only what the client can genuinely deliver**
(invented experience is worse than none):

- **Experience:** how the content shows first-hand experience (original screenshots, the client's own data, case studies, real tests).
- **Expertise:** what the author or reviewer should demonstrate (credentials, role, specialised knowledge).
- **Authority:** which authoritative sources to cite (official documentation, research papers, statistics with publisher and date).
- **Trust:** trust signals (last-updated date, methodology transparency, disclosures, fact-checking, reviewer line).

The writer weaves these in only where they fit a section; never all of them everywhere.

## 12. Writer notes

**Tone and voice:** from the client's brand context (tone descriptors, writing style, technical
level). When a sample of the client's real body copy exists, quote a short excerpt (about 600
characters) with the instruction "write in a voice matching this sample: mirror its tone, sentence
rhythm and vocabulary; do not copy its content."

**Voice rails for informational intent** (state them for the writer):

1. Lead with the answer in the first sentence: do not set up, do not preview.
2. Be explanatory but not neutral: have a position about the right way to do this, and stand by it.
3. Clarity beats coverage: if a topic is tangential to the answer, trim it.
4. A definition only deserves a sentence; spend the section on what the definition implies for the reader.
5. Be specific, not exhaustive: a named example, a real number, a dated reference beats a summary.
6. Vary rhythm: mix one-sentence paragraphs with longer ones.
7. Keywords by idea coverage, not repetition: the exact phrase once where natural, variants elsewhere, never the same phrase in adjacent sentences.

**Do's and don'ts:** from the brand context and decisions-log, plus the topic's specifics.

**Banned terms:** the client's banned list, plus these AI fingerprints (and their equivalents in the
brief's language), which the brief's own guidelines must not use either: "delve into", "dive
deep", "let's dive in", "let's explore", "let's take a look"; "leverage" (verb), "unlock",
"harness", "navigate the complexities of", "unlock the power of"; "seamless", "seamlessly",
"robust", "cutting-edge", "state-of-the-art", "game-changer", "next-level", "revolutionary"; "in
today's fast-paced world", "in the ever-evolving landscape of", "in this digital age"; "whether
you're a [X] or a [Y]" as an opener; "look no further", "you've come to the right place"; "at its
core", "at the end of the day", "it's worth noting that", "it's important to note", "it goes without
saying"; "in conclusion", "to wrap things up", "to sum up"; "this comprehensive guide", "this
definitive guide", "everything you need to know". Banned openers: "In this section/article we'll...",
"Here's what you need to know...", "Imagine that...", "Picture this...", and a question immediately
followed by its own answer ("What is X? X is...") outside a designated definition section.

**Visual guidelines:** hero image (authentic over stock), infographics, video, charts, a
downloadable asset if useful, alt text for every image.

**Conventions:** placeholders in [square brackets], never angle brackets (the Doc conversion drops
them); `[INTERNAL LINK: anchor -> topic]` where a link is needed but no real URL exists;
a visible `**TODO (human):** ...` line (bold label, on its own line or at the end of a bullet) for
a decision or verification a person must make. Never an HTML comment (`<!-- -->`): comments vanish
when the Markdown becomes a Google Doc, and the reviewer never sees them. No invented statistics,
quotes or citations. Every number in the article carries its base and source.

**Sources before placeholders.** For every claim a guideline requires (a figure, a named study, a
date, a rule or threshold), run one free web search within the run and put the source URL in the
guideline and in the Fact and source bank (section 16). Use `[CITE: what is needed]` only when no
reliable source is found in the run, and report the number of `[CITE]` markers in the H6 message.
A brief with a dozen `[CITE]` markers has moved the research to the writer.

## 13. YMYL extras (health, finance, legal)

- **Health:** a review-by-expert note (role, not an invented name); a red-flags or "when to get help" element in the outline (for example a "when to see a doctor" list); a studies and sources list (publisher, date, link) for the writer to verify; a repeated per-condition structure where the topic has several conditions (what it is, symptoms, first steps); claims only from the client's own materials; a fact-check line in technical notes; a `**TODO (human):** legal or compliance review of service promotion and CTA wording` line in Accuracy and brand guardrails (medical-service promotion is regulated; no unsupported superlatives). Hebrew brief: `**TODO (human):** בדיקה משפטית או רגולטורית של קידום השירות ושל נוסח ה-CTA`.
- **Finance, crypto, tax:** a not-financial-advice or not-tax-advice note; no fees, returns or rates unless the client supplied them; jurisdiction caveats; a `**TODO (human):** legal or compliance review of product promotion and CTA wording` line in Accuracy and brand guardrails (Hebrew brief: `**TODO (human):** בדיקה משפטית או רגולטורית של קידום המוצר ושל נוסח ה-CTA`); the local angle (the market's tax or regulator rules) is often the strategic opportunity.
- **Language of the compliance line:** use the line in the brief's language (the bold `TODO (human):` label stays English so the marker count works; the text after it is Hebrew in a Hebrew brief).
- **Legal:** jurisdiction and the date of the law; primary sources (statute, regulator) as external links, read in this run; institution point of view where the client is an institution with positions; `**TODO (human):** legal review` on sensitive lines.
- Raise a brand-name or legal wording risk inside the brief with a generic fallback (a device class instead of a third-party brand, for example). Never hold the brief waiting on legal.

## 14. Technical notes (defaults)

- **Schema:** Article by default. FAQPage only where the client allows it; some clients rule it out, and the choice goes in the guardrails so it is not re-argued. HowTo or VideoObject only when the page has that content.
- **Breadcrumbs:** visual and as schema.
- **Author and reviewer:** author bio; reviewer for YMYL topics.
- **Last updated:** a visible date.
- **Images:** WebP, under 100 KB, descriptive alt text.
- **Table of contents:** jump links under the intro for articles over about 1,500 words.

## 15. Accuracy and brand guardrails (only when the client has rules)

Fed from the client's AI Brain, decisions-log, product briefs and brand docs. List, as short
bullets: naming bans and required names; claims the client cannot support (and the safe
alternative); product facts the writer may use (a whitelist) and hard prohibitions (for example
fee figures, availability claims); the schema choice; legal sensitivities; standing checks for this
topic family (a subtopic or spec tier the client's log says every brief on this family must cover).
Products are the client's call: give product-block guidelines, not product picks. If a standing
recommendation in the log is being changed, say so here (house rule 5).

## 16. Sources and scope

The SERP pull date, market (country, language), tools used per step with their confidence label,
the keyword source and date, the client files read (and what was grepped in files too large to
read whole), the GSC window (with the logging-error caveat when it applies), the DataForSEO cost
summed from the `cost` fields, the number of Ahrefs exports (and 0 API units), checkpoint waivers
if any (batch), and what was not measured (for example: keyword difficulty, backlinks, AI Overview
citations, GA4 Key Events).

**Fact and source bank:** a table of every factual claim the guidelines ask the writer to use,
with columns `Claim | Source URL | Date | Used in section`. Every row has a URL found and read in
this run; a claim with no source found stays a `[CITE: ...]` in its guideline and is listed here
with "not found" as its source. Before H5, each remaining `[CITE]` gets one web search with the
best result read; a source confirmed only through search results (the page refused the read) is
labelled "checked by search, page not read".

## 17. Writer brief distillation (step 7b)

The owner's verdict (2026-10-28, round-2 blind A/B): the skill's briefs are very good but far too
long for a human; keep that version for research and machine writing, and give the writer a short
brief with exactly what they need, as the gold briefs do. So every run ends with two Docs: the
research brief (sections 1 to 16, unchanged) and the writer brief, distilled from it. The research
brief is always built and checked first; the writer brief adds nothing to it.

### 17.1 Length budget (measured on the gold briefs)

| Set | Briefs | Median | Range |
|---|---|---|---|
| Gold briefs (brief part only, draft tabs excluded; counted from the Drive read-back, so about +/-10%) | 8 (4 EN, 4 HE) | about 1,900 words | about 1,000 to 2,400; one app export with a reasoning line under every item is about 3,900 |
| The skill's round-1 briefs (whitespace tokens) | 4 (2 EN, 2 HE) | about 5,700 words | 3,850 to 7,000 |

- **Items** = outline items (Hero, H2, H3, H4, Conclusion) + FAQ questions.
- **Soft target** = the higher of 2,000 words and 85 words x items (near the gold median; most gold briefs run about 65 to 105 words an item). Above it: a warning; compress.
- **Hard ceiling** = 1.5 x the soft target (3,000 at the base, between the gold maximum without reasoning lines and the one with them). Above it: an error.
- **Words** = whitespace tokens that contain a letter or digit, over the whole Doc (tables included). `scripts/check_brief.py --type writer` measures and enforces it.
- A shorter writer brief is fine; never drop an outline item, FAQ or table stake to reach the number.
- Rough split for a 14-item brief at 2,000 words: header and summary 200; keyword and on-page tables 250; outline about 80 an item; FAQs 30 to 40 each; links, notes and CTA 250.

### 17.2 What the writer brief keeps, section by section

| Research brief section | Writer brief |
|---|---|
| Header, relevant links | Title (without " \| research"), date, market, a "Research brief" line with the research Doc's link. Relevant links: only the target URL if the writer needs it, inside the summary or CTA |
| Brief at a glance, Search intent and SERP, Strategy and goals, Content gap analysis, Accuracy and brand guardrails | One **Strategy summary** of at most about 150 words: intent and format; what wins the SERP (no URLs, scores or ranks); our angle in 1 to 2 sentences; the 3 strongest gaps we exploit; the key guardrails |
| Keyword strategy | Primary, Secondary, Question and Commercial rows as in the research brief: same strings and volumes; columns Type, Keyword, Monthly searches, Placement (the placement half of the note). "Existing page (do not target)" and "Brand (excluded)" rows become plain-language `**Do not target:**` paragraphs under the table (Hebrew `**לא לטרגט:**`), one per existing client page plus one for brand terms, in the wording of section 17.6; every string copied exactly and quoted (`--pair` accepts it there). Then one source line. Global volume, the rationale and the full do-not-target rows stay in the research brief |
| Competitive analysis | Nothing (linked) |
| On-page SEO | Same six values and Chars; no Reasoning column |
| Article structure | Same total and FAQ allowance; every item, same prefix, heading and word count; a one-line angle; 2 to 4 imperative guidelines; Snippet target (verbatim, label included) and Resources only where present. No Keywords, Covered by or Reasoning lines |
| Frequently Asked Questions | Same questions as H3; one guideline line each, still opening with the 40 to 50 word answer rule; no Reasoning |
| Conclusion and CTA | Same CTAs and placement (moved to the end of the writer brief) |
| Internal and external links | Internal links as Anchor and URL; external sources stay inline in the guidelines that use them |
| E-E-A-T signals, Writer notes, Technical notes | Writer notes: tone (one or two lines), at most 5 do's and 5 don'ts, one short E-E-A-T and YMYL list (author or reviewer, first-hand material, disclaimers, red flags), the conventions line. Every TODO (human) from a dropped section moves here |
| Sources and scope, Fact and source bank | Nothing (linked); the source URLs a guideline needs stay inline in that guideline |

### 17.3 How to compress

1. **Delete first, then shorten.** Remove evidence, competitor names and URLs, scores, ranks and "because" clauses; keep the instruction and its specifics.
2. **The angle keeps its claim.** One line: the position, without its justification. Never soften or sharpen it.
3. **Guidelines stay imperative and concrete.** Merge two bullets that serve one action; keep every number, named source, table column list, `[CITE: ...]`, link and `**TODO (human):**` in the bullet that carries it.
4. **Copy, never retype,** every keyword, volume, total, on-page value, heading, word count, FAQ question and snippet line (`--pair` errors on any difference).
5. **Every table stake and strategic opportunity stays visible,** as an outline item or inside a guideline, in words a reader can match to the research brief (`--pair` warns when one lost its match).
6. **No new claims,** no new sources, no rounding. If a line cannot be shortened without changing what it says, keep it.

### 17.4 Example (research form, then writer form)

Research brief:

```
### H2: A heat pump pays back only inside its rated range
- **Angle:** A heat pump's savings depend on the share of winter hours it runs inside its rated
  range; below that range the backup heater carries the load and the payback period stretches
  past the equipment's life, which none of the top 3 pages quantifies.
- **Guidelines:**
  - Open with the answer: payback depends on hours inside the rated range, not on the average
    winter temperature. Competitor 2 uses the average temperature, which hides cold snaps.
  - Add a table with columns Climate, Hours below rated range, Backup share, Payback years,
    using the regulator's degree-day data (https://www.regulator.example/degree-days, read in
    this run); no competitor shows payback by climate.
  - Explain the backup heater in two sentences, because readers in the forum results confuse it
    with a fault.
  - Link "how to size a heat pump" to https://www.client.example/blog/heat-pump-sizing/.
- **Keywords:** heat pump payback, heat pump cold climate
- **Word count:** 300
- **Covered by:** https://www.example.com/heat-pump-guide, https://www.example.org/savings
- **Snippet target:** table | heat pump payback (AI Overview answer block; no featured snippet observed)
- **Reasoning:** exploits opportunity 2 (payback by climate, absent in the top 3) and covers the
  table stake "running costs".
```

Writer brief:

```
### H2: A heat pump pays back only inside its rated range
- **Angle:** Savings depend on the hours a heat pump runs inside its rated range; below it, the
  backup heater carries the load and payback stretches past the equipment's life.
- **Guidelines:**
  - Open with the answer: payback depends on hours inside the rated range, not the average winter
    temperature.
  - Add a table (Climate, Hours below rated range, Backup share, Payback years) from
    https://www.regulator.example/degree-days.
  - Explain the backup heater in two sentences; link "how to size a heat pump" to
    https://www.client.example/blog/heat-pump-sizing/.
- **Word count:** 300
- **Snippet target:** table | heat pump payback (AI Overview answer block; no featured snippet observed)
```

FAQ, research form "Open with a self-contained 40 to 50 word answer that directly answers the
question, then expand on the backup heater and on why the average temperature misleads." plus a
reasoning line; writer form "Open with a self-contained 40 to 50 word answer, then cover the backup
heater and why the average temperature misleads."

(Illustrations of shape only; the topic, URLs and numbers are invented and must never be reused.)

### 17.5 Only in the research brief

Competitor table, differentiation summary and top 3; gap evidence; every Reasoning line and column;
Covered by; keyword bullets per item; global volume and keyword rationale; SERP features and AI
Overview detail; page goal and audience reasoning; swap test; technical notes; Sources and scope and
the Fact and source bank. The research brief is the input for machine writing
(`blog-article-draft`) and the record a strategist reviews; it is shared with a client only when
the person asks.

### 17.6 Do not target paragraphs (plain language)

The owner could not read a line like `**Do not target:** "x", "y"; anchor "z" to [URL].` in QA
(2026-10-29): it says what but not why or what to do. So the writer brief gives one short paragraph
per existing client page (and one for brand terms), in the brief's language, built only from the
research brief's rows (no new numbers). Each says:

- **What:** the exact strings, each quoted and copied character for character, as a comma-separated list right after the label (`--pair` matches these list members only: neither the quoted anchor nor a string quoted again inside the reason counts).
- **Why:** the client page that already ranks, as a full URL, with its Search Console average position for these strings and the date range (the last 3 clean full months); when GSC has no row for it, its SERP export position and the export date. Strings with different positions: give the range ("8.4 to 9.8"). For brand terms: "brand terms, not topic demand".
- **What to do:** the different question this article answers (the new sub-intent), not to repeat that page's content, and one link to it with the anchor.

English, existing client page:

```
**Do not target:** "<string>", "<string>". <client> already ranks for these with <full URL> (Search Console average position <n>, <YYYY-MM-DD> to <YYYY-MM-DD>). This article answers a different question: <the new sub-intent>. Do not repeat that page's content; link to it once with the anchor "<anchor>".
```

When GSC has no row for the page, the bracket reads `(position <n> in the SERP export of <YYYY-MM-DD>)`.

English, brand terms:

```
**Do not target:** "<string>", "<string>". These are brand terms, not topic demand: do not use them as keywords or in headings.
```

Hebrew, existing client page:

```
**לא לטרגט:** "<מחרוזת>", "<מחרוזת>". האתר של <לקוח> כבר מדורג על המונחים האלה עם <כתובת מלאה> (מיקום ממוצע ב-Search Console <n>, <YYYY-MM-DD> עד <YYYY-MM-DD>). המאמר הזה עונה על שאלה אחרת: <תת-הכוונה החדשה>. לא לחזור על התוכן של העמוד ההוא; לקשר אליו פעם אחת עם העוגן "<עוגן>".
```

When GSC has no row for the page, the bracket reads `(מיקום <n> בייצוא ה-SERP מ-<YYYY-MM-DD>)`.

Hebrew, brand terms:

```
**לא לטרגט:** "<מחרוזת>", "<מחרוזת>". אלה מונחי מותג, לא ביקוש לנושא: לא להשתמש בהם כמילות מפתח או בכותרות.
```

The angle-bracket slots above are for this file only: in the brief they hold real values (the
client's name, the full URL, the numbers, the sub-intent and the anchor). Keep the bold label
exactly (`**Do not target:**` / `**לא לטרגט:**`) at the start of each paragraph: `check_brief.py`
finds the paragraphs by it, reads wrapped lines up to the next blank line, and warns when one lacks
the strings, the URL, the position, the different question or the link-once instruction.

Example (writer brief, English; invented): `**Do not target:** "what is a heat pump", "heat pump
meaning". <client> already ranks for these with https://www.example.com/what-is-a-heat-pump/
(Search Console average position 6.2, 2026-07-01 to 2026-09-30). This article answers a different
question: whether a heat pump pays back in a cold climate. Do not repeat that page's content; link
to it once with the anchor "what a heat pump is".`
