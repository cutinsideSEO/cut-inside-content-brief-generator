# {{Topic}} - Content Brief | {{Client}} | research

{{! TEMPLATE NOTES, delete this block. Every double-brace token is a value to fill, and every double-brace token that starts with an exclamation mark is guidance to delete. scripts/check_brief.py fails the brief while any double brace remains. Copy this blank file for every brief; never start from an old brief. Labels in bold, table headers and outline prefixes are machine-checked: keep them exactly. RESEARCH BRIEF: this is the internal record (strategist review, agency record, and the input for machine writing with blog-article-draft); it keeps every **Reasoning:** line, the Reasoning column of the on-page table and the rationale paragraphs. Its title is the writer brief's title plus " | research". The writer brief (assets/writer-brief-template.md) is distilled from this file, by deletion and compression only, after this file passes check_brief.py --type research. Write in the brief's language; no em-dashes. Placeholders inside guidelines use [square brackets], never angle brackets (the Doc conversion drops angle-bracket text; check_brief.py errors on it). MARKERS: a person's decision or check is a visible line `**TODO (human):** what to decide`, never an HTML comment (comments vanish in the Google Doc, and check_brief.py fails on any comment opener); `[CITE: ...]` only when a search in the run found no source; `[INTERNAL LINK: anchor -> topic]` when no real URL exists. If the client's brain names a branded template or naming rule, keep this section order and these labels but apply the client's header, branding and file naming. }}

- **Date:** {{YYYY-MM-DD}}
- **Market:** {{SERP country}}, {{SERP language}}
- **Brief language:** {{language}}
- **Prepared by:** {{role, for example SEO content strategist, Cut Inside}}
- **Document:** Research brief (internal: full research, evidence and reasoning; not sent to the client unless the person asks)
- **Writer brief:** {{link to the writer brief Doc, or its title and folder}}

**Relevant links**

- Target URL: {{https://www.example.com/blog/topic-slug/ (new) or "to be decided by the client"}}
- Priority competitors: {{full URLs the user named, or "none named"}}
- Template page: {{full URL whose structure the brief follows, or "none"}}

## Brief at a glance

- **Intent and preferred format:** {{informational; explanatory guide with a clear position}}
- **Editorial angle:** {{the thesis, one or two sentences, identical to Strategy and goals}}
- **Target word count:** {{2,000}} ({{1,600}} outline + {{400}} FAQ)
- **Primary keyword:** {{keyword}} ({{volume}}/mo, {{country}}, {{source and month}})
- **Meta title:** {{winning title}}
- **H1:** {{H1}}

## Accuracy and brand guardrails

{{! Only when the client's AI Brain, decisions-log or brand docs have rules; otherwise delete this whole section. Short bullets. Health or medical topic: add the line **TODO (human):** legal or compliance review of service promotion and CTA wording. Finance, crypto or tax topic: **TODO (human):** legal or compliance review of product promotion and CTA wording. }}

- **Naming:** {{required names and naming bans}}
- **Claims we cannot make:** {{claim, and the safe alternative}}
- **Product facts allowed:** {{only from the client's materials}}
- **Schema:** {{Article; FAQPage not used on this site}}
- **Legal sensitivities:** {{line, with a generic fallback}}
- **Standing checks for this topic family:** {{subtopic every brief in this family must cover}}

## Strategy and goals

### Page goal

{{One paragraph: what the page is for and the outcome it serves; say so if it is not a revenue page.}}

- **Reasoning:** {{cites top-scoring and priority URLs and the keyword clusters they own or miss}}

### Target audience

- **Who:** {{specific reader description}}
- **Knowledge level:** {{basic | intermediate | technical}}
- **Tone and style:** {{from the brand context}}
- **Reasoning:** {{why this audience, with evidence}}

### Editorial angle

**{{The thesis, verbatim, one or two sentences.}}**

- **Swap test:** {{replace the topic with another; say why the thesis collapses}}
- **Reasoning:** {{the competitor gap or strength that motivated it, with URLs}}

## Search intent and SERP

- **Intent type:** {{informational}}
- **Preferred format:** {{what the top positions reward, with two or three example URLs}}
- **SERP features observed:** {{per query: featured snippet, People Also Ask, video, image pack, AI Overview, ads; or "none present" (located SERP); or "not observed (Ahrefs or web-search fallback, not a located SERP)"}}
- **AI Overview:** {{per query: present or absent; one-line gist of what it says; cited sources as full URLs; or "not observed (fallback route)"}}
- **What ranks:** {{one or two lines: content types and domain types in the top 10; forums, Wikipedia or video noted as an intent signal}}
- **Source:** {{SurgeOS SERP export [jobId], country, language, device, depth 20, pulled YYYY-MM-DD; N queries (or the fallback used, with its label)}}
- **Reasoning:** {{why this verdict}}

## Keyword strategy

| Type | Keyword | Monthly searches ({{country}}) | Global volume | Intent / notes |
|---|---|---|---|---|
| Primary | {{keyword}} | {{1,300}} | {{4,400}} | {{Meta title, H1, slug, OG title; opening sentence}} |
| Secondary | {{keyword}} | {{320}} | {{900}} | {{H2 of section 2}} |
| Question | {{question keyword}} | {{90}} | {{n/a}} | {{FAQ 1; also the snippet query of section 1}} |
| Commercial (route, do not target) | {{keyword}} | {{2,900}} | {{12,000}} | {{anchor to https://www.example.com/category/ in section 4}} |
| Brand (excluded) | {{brand keyword}} | {{480}} | {{n/a}} | {{brand demand, not topic demand; not targeted}} |

Source: {{tool and report}}, {{country}} and global volume, pulled {{YYYY-MM-DD}}.

- **Reasoning:** {{why these primaries; how the secondaries support them; any zero-volume primary explained}}

## Competitive analysis

### Differentiation summary

{{What the winners do that the others do not, naming keyword clusters with volumes and ranks.}}

- **Reasoning:** {{evidence}}

### Competitor table

| # | URL | Weighted score | Word count | What it is | Strengths | Weaknesses |
|---|---|---|---|---|---|---|
| 1 | {{https://www.example.com/page-1}} | {{26,400}} | {{1,850}} | {{one sentence: content and angle}} | {{specific strengths; clusters it owns}} | {{concrete gaps; terms it misses}} |
| 2 | {{https://www.example.org/page-2}} | {{18,100}} | {{1,200}} | {{...}} | {{...}} | {{...}} |
| 3 | {{https://www.example.net/page-3}} | {{9,700}} | {{2,400}} | {{...}} | {{...}} | {{...}} |

Weighted score = sum over pulled queries of volume x max(1, 21 - rank) (`scripts/score_competitors.py`).

{{! No measured volumes: replace the line above with "Rank-only score, volumes not measured: sum over pulled queries of max(1, 21 - rank)." }}

### Top 3 read in full

1. {{https://www.example.com/page-1}}
2. {{https://www.example.org/page-2}}
3. {{https://www.example.net/page-3}}

**Excluded or flagged:** {{client URLs excluded; forums, Wikipedia, video kept as intent signals, with URLs}}

## Content gap analysis

### Table stakes

- **{{Topic}}:** {{evidence: which competitors' headings, which keywords}}
- **{{Topic}}:** {{evidence}}

### Strategic opportunities

1. **{{Opportunity}}:** {{evidence: in 1 or 2 competitors or absent; the volume it carries; why it differentiates}}
2. **{{Opportunity}}:** {{evidence}}

- **Reasoning:** {{how the gaps shape the outline}}

## On-page SEO

| Element | Recommendation | Chars | Reasoning |
|---|---|---|---|
| Meta title | {{winning title}} | {{48}} | {{winner (A, B or C) and why the other two lost; primary keyword position}} |
| Meta description | {{one concrete promise, active voice}} | {{152}} | {{what the reader will know after clicking}} |
| URL slug | {{primary-keyword-slug}} | {{27}} | {{3 to 5 words, no filler}} |
| H1 | {{H1, may differ from the title}} | {{58}} | {{why it serves the on-page reader}} |
| OG title | {{curiosity-led variant}} | {{55}} | {{the hook}} |
| OG description | {{specific claim or number}} | {{180}} | {{why it earns the click}} |

## Article structure

**Total word count:** {{2,000}}
**FAQ allowance:** {{400}}

- **Reasoning:** {{how the total was derived (user target or average of the top 3 and priority pages: show it); FAQ allowance = questions x 80}}

### Hero: {{the hook line, only if the opening makes a real hook; otherwise delete this item}}

- **Angle:** {{one sentence: the hook and the position it opens on}}
- **Guidelines:**
  - {{open with the answer to the main question in the first sentence; primary keyword in the first two sentences}}
  - {{what the hook is and how to make it}}
- **Keywords:** {{primary keyword}}
- **Word count:** {{120}}
- **Reasoning:** {{the hook it makes, not "introduce the topic"}}

### H2: {{heading that states a claim or answer}}

- **Angle:** {{one sentence, a facet of the editorial angle, not a restatement of the heading}}
- **Guidelines:**
  - {{specific instruction that advances the angle, tied to a gap}}
  - {{format element: table with named columns, diagram, numbered steps}}
  - {{[INTERNAL LINK: anchor -> topic] or a real URL with its anchor}}
- **Keywords:** {{exact keywords from the table}}
- **Word count:** {{400}}
- **Covered by:** {{https://www.example.com/page-1, https://www.example.org/page-2}}
- **Snippet target:** paragraph | {{the query this section answers}}
- **Resources:** {{original diagram of the process}}
- **Reasoning:** {{covers table stake X / exploits opportunity Y}}

#### H3: {{sub-heading, question form works well}}

- **Angle:** {{...}}
- **Guidelines:**
  - {{...}}
- **Keywords:** {{...}}
- **Word count:** {{200}}
- **Covered by:** {{...}}
- **Reasoning:** {{...}}

##### H4: {{only under an H3, only when needed}}

- **Angle:** {{...}}
- **Guidelines:**
  - {{...}}
- **Keywords:** {{...}}
- **Word count:** {{100}}
- **Reasoning:** {{...}}

### H2: {{next claim heading}}

- **Angle:** {{...}}
- **Guidelines:**
  - {{...}}
- **Keywords:** {{...}}
- **Word count:** {{580}}
- **Snippet target:** list | {{a different query}}
- **Reasoning:** {{...}}

### Conclusion: {{heading that lands the angle}}

- **Angle:** {{the decision rule or takeaway the article lands on}}
- **Guidelines:**
  - {{restate the position in one line, then the CTA from Conclusion and CTA}}
- **Keywords:** {{...}}
- **Word count:** {{200}}
- **Reasoning:** {{...}}

{{! Check: every Word count above plus the FAQ allowance equals the Total word count. At most 3 Snippet target lines, each with a different query. Every query must be one pulled in the export (in the keyword table). If SERP features were not observed (Ahrefs or web-search fallback), at most 2, each written as: paragraph | [query] (answer-first bet; SERP features not observed). If the export shows no featured snippet but an AI Overview, at most 2, each written as: paragraph | [query] (AI Overview answer block; no featured snippet observed). }}

## Frequently Asked Questions

- **Reasoning:** {{how the set was chosen: question keywords first, then PAA, then gaps}}

### {{Question 1, a question keyword verbatim}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer that directly answers the question, then expand on {{X}} and {{Y}}.
  - {{one more instruction, optional}}

### {{Question 2, from People Also Ask}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer that directly answers the question, then expand on {{X}}.

### {{Question 3, from the gap analysis or a point of confusion}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer that directly answers the question, then expand on {{X}}.

## Conclusion and CTA

- **Primary CTA:** {{action and target, full URL}}
- **Secondary CTA:** {{lighter alternative}}
- **Placement:** {{after section N; end of page}}

## Internal and external links

| Anchor | URL | Placement | Why |
|---|---|---|---|
| {{anchor text}} | {{https://www.example.com/blog/related-guide/}} | {{section 2}} | {{next step for this reader; source: GSC, or "sitemap, indexed"}} |
| {{anchor text}} | [INTERNAL LINK: {{anchor}} -> {{topic}}] | {{section 4}} | {{no real URL in the GSC data yet}} |

**External (authoritative, non-competitor):**

- {{https://www.example.gov/source}}: {{what it supports}}

## E-E-A-T signals

- **Experience:** {{first-hand material the client can supply}}
- **Expertise:** {{author or reviewer role and credentials}}
- **Authority:** {{sources to cite, with publisher}}
- **Trust:** {{last-updated date, disclosures, methodology, reviewer line}}

## Writer notes

- **Tone and voice:** {{from the brand context; a short quoted sample of the client's own copy if available}}
- **Voice rails:** lead with the answer; take the position the section angle sets; be specific, not exhaustive; vary rhythm; keywords by idea, not repetition. Each section may run 0.85 to 1.15 of its word count.
- **Do:** {{...}}
- **Don't:** {{...}}
- **Banned terms:** {{client's banned terms}}; no AI-tell phrases ("delve into", "unlock", "seamless", "in today's fast-paced world", "it's worth noting", "in conclusion", "everything you need to know").
- **Visual guidelines:** {{hero image, infographic, video, alt text for every image}}
- **Conventions:** `[CITE: ...]` where no source was found in research and one must be added; `[INTERNAL LINK: anchor -> topic]` where a link has no real URL yet; a bold `TODO (human):` line for a person's decision.
- **YMYL:** {{for health, finance or legal topics: reviewer note, red flags or when-to-get-help element, studies and sources list; otherwise delete this line}}

## Technical notes

- **Schema:** {{Article}}
- **Breadcrumbs:** {{visual and schema}}
- **Author and reviewer:** {{author bio; reviewer role for YMYL}}
- **Last updated:** {{visible date}}
- **Images:** WebP, under 100 KB, descriptive alt text
- **Table of contents:** {{jump links under the intro}}

## Sources and scope

- **SERP:** {{SurgeOS SERP export [jobId] (new or reused), country, language, device, depth 20, YYYY-MM-DD, N queries; or the fallback used, with its label}}
- **Keywords:** {{source, country and global, YYYY-MM-DD}}
- **Pages read:** {{N pages: SurgeOS crawl ids [id], [id] (word count, title, meta, H1) plus WebFetch for headings and body; crawl-only partial digests: N; failed reads dropped: N}}
- **Client data:** {{SurgeOS GSC property, window YYYY-MM-DD to YYYY-MM-DD (last 3 full months; add "spans the GSC impressions logging error 2025-05-13 to 2026-04-27" if it overlaps)}}
- **Client files read:** {{AI Brain files, product briefs, past briefs on the topic; for a file too large to read whole, the terms grepped}}
- **Cost:** SERP export ${{0.00}} ({{jobId}}, from the tool; $0 if reused); {{N}} crawls; DataForSEO fallback ${{0.00}} (summed cost fields, or none); Ahrefs {{N}} browser exports, 0 API units
- **Not measured:** {{for example keyword difficulty, backlinks, citations in AI assistants other than Google's AI Overview}}

**Fact and source bank**

| Claim | Source URL | Date | Used in section |
|---|---|---|---|
| {{a figure, study or rule a guideline asks the writer to use}} | {{https://www.example.gov/source (read in this run)}} | {{YYYY-MM-DD}} | {{H2 2}} |
| {{claim with no reliable source found}} | {{not found: [CITE] left in the guideline}} | {{n/a}} | {{FAQ 3}} |
