# Brief rules (read before step 4, and again before step 6)

The rules for every section of the brief, in the order the method builds them. Most of the wording
comes from the agency's Content Brief Generator prompts; quoted rules are kept close to verbatim
because they are the method. Section numbers are referenced from `SKILL.md`.

## 0. Rules that apply to every section

- **Reason from the rankings, not just the score.** Group each competitor's ranking keywords into themes. Find which themes each competitor dominates (top positions on high-volume terms) and which high-volume terms are weakly covered or absent across competitors: those gaps are the opportunities. Cite specific keywords, volumes and ranks when you justify a recommendation.
- **Priority pages weigh more.** Pages the user named as references or rated competitors get significantly more weight: prioritise their structure, topics and style, and say in the reasoning when one of them shaped a decision.
- **Data integrity.** Base all analysis only on the data pulled in this run, the keywords and the user's context. Do not fabricate statistics, studies or claims. When referencing competitor behaviour, cite the specific URL. Flag uncertain recommendations as suggestions, not facts.
- **Brand alignment.** Every recommendation fits the brand's voice, positioning, audience and content rules. Never recommend what the brand's don't-list or banned terms exclude. Favour preferred terminology. Flag known competitors when they appear.
- **Reasoning is a deliverable.** Every recommendation in the full variant carries a `Reasoning:` line that cites the data behind it (a URL, a keyword with volume and rank, a heading pattern). The concise variant deletes those lines and nothing else.
- **Language.** Every heading, label, value and reasoning line is in the brief's language. In a Hebrew brief, only the fixed labels in the template stay English (on-page element names, outline level prefixes, snippet formats).
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
Any other verdict, or a client page already ranking top 10, stops at H3 with the evidence.

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
- **Weaknesses:** specific gaps, written as concrete, reusable content gaps ("no worked example with real numbers", "ignores the local tax rule"), and the high-volume terms where it ranks weakly or not at all. Writers use these as a differentiation directive: close these gaps explicitly, without complaining about competitors in the article.

In the brief: the differentiation summary (with reasoning), the competitor table (URL, weighted
score, word count, what it is, strengths, weaknesses; at least 3 rows), the top 3 read in full, and
one line naming what was excluded or flagged (the client's own URLs, forums, Wikipedia, video).

## 5. Keyword strategy

1. Analyse the list against the competitor data (top-scoring and priority pages) and the page goal.
2. **Primary:** one or more keywords that best represent the core intent. Pick the single strongest one for the on-page elements.
3. **Every other keyword is categorised:** Secondary, Question, Commercial (route, do not target), or Brand (excluded). Nothing is dropped.
4. **A note on every keyword:** its strategic value and where it goes ("H1 and opening paragraph", "H2 of section 3", "FAQ 2", "anchor text to the commercial page").
5. **Rationale** (full variant): why these primaries, how the secondaries support them.

Constraints:

- "Use the exact keywords provided. Do not add, change, or remove any keywords from the list." Exported lists are trimmed only for topic fit, and the trim is stated.
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
3. **Summary** (full variant): how the gaps shape the outline.

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
| "Add some statistics." | "Cite the regulator's current threshold [CITE: regulator page, current year]; do not use a figure without a source." |

**Reasoning** (full variant): why the item is included, linked back to the gap analysis ("Covers
the table stake X", "Exploits the opportunity to discuss Y in more depth than competitors").

### 7.5 Word-count allocation

- **Total:** the user's target if set; otherwise "a competitive word count based on the average of the top and priority competitors" (their measured word counts), rounded to the nearest 50. Say how it was derived.
- **FAQ allowance:** reserve it explicitly, questions x 80 words by default (60 to 100 a question). Outline sum + FAQ allowance = total (the check tolerates 1%).
- **Every item has a non-zero word count.** H2 sections get more than their H3s. Give more to complex guidelines and to snippet-target sections; give demand-weighted space to subtopics with their own volume.
- The writer's range per section is the target x 0.85 to x 1.15; state it once in Writer notes. Padding to a number is worse than a sharper, shorter section.

### 7.6 Featured snippet targeting

"Based on the search intent and the SERP features present, identify featured snippet opportunities."

- Mark **1 to 3 sections (not more)** with a snippet target: format plus the query it answers.
- Each target has a **distinct query**: never point two sections at the same query.
- Choose the sections most likely to win: those that directly answer a specific question.
- Format = what Google shows for that query: **paragraph** for definitions (a direct 40 to 60 word answer in the first 1 to 2 sentences), **list** for steps or items (5 to 8 clear items), **table** for comparisons (a real table with headers).
- Only where there is a genuine opportunity. "A single strong target beats three weak ones." For informational queries at least one target is usually warranted. With no featured snippet and no clear answer query in the SERP, an AI Overview or answer-first target is still reasonable for the main question; say which.
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
- **Covered by:** URLs of read competitors that have a section on this item (checked against their headings and text).
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
8. Reasoning (full variant): how the set was chosen, naming the question keywords included.

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
per element (full variant): (a) which primary keyword and where it sits, (b) why the phrasing
passes the specificity test, (c) any banned pattern considered and rejected.

## 10. Conclusion, CTA and links

- **Primary CTA:** the one action the page exists to drive, matched to an informational reader (a related guide, a tool, a soft product mention the client's materials support). **Secondary CTA:** the lighter alternative. **Placement:** where each appears (after section N, end of page, inline).
- Do not sell an outcome the page cannot deliver; a soft CTA with an availability or eligibility caveat beats a hard one that overclaims.
- **Internal links:** a table of anchor, full absolute URL, placement and why; real URLs from GSC only. Commercial "route, do not target" keywords become anchors to the commercial page.
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

**Conventions:** `[CITE: source to add]` wherever a fact needs a source the writer must find;
`[INTERNAL LINK: anchor -> topic]` where a link is needed but no real URL exists; `<!-- TODO
(human): ... -->` for a decision or verification a person must make. No invented statistics,
quotes or citations. Every number in the article carries its base and source.

## 13. YMYL extras (health, finance, legal)

- **Health:** a review-by-expert note (role, not an invented name); a red-flags or "when to get help" element in the outline (for example a "when to see a doctor" list); a studies and sources list (publisher, date, link) for the writer to verify; a repeated per-condition structure where the topic has several conditions (what it is, symptoms, first steps); claims only from the client's own materials; a fact-check line in technical notes.
- **Finance, crypto, tax:** a not-financial-advice or not-tax-advice note; no fees, returns or rates unless the client supplied them; jurisdiction caveats; the local angle (the market's tax or regulator rules) is often the strategic opportunity.
- **Legal:** jurisdiction and the date of the law; primary sources (statute, regulator) as external links; institution point of view where the client is an institution with positions; `<!-- TODO (human): legal review -->` on sensitive lines.
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
the keyword source and date, the DataForSEO cost summed from the `cost` fields, the number of
Ahrefs exports (and 0 API units), checkpoint waivers if any (batch), and what was not measured
(for example: keyword difficulty, backlinks, AI Overview citations, GA4 Key Events).
