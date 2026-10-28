# {{Topic}} - Content Brief | {{Client}}

{{! TEMPLATE NOTES, delete this block. The WRITER BRIEF: the human-facing deliverable that goes to the client or the freelancer. Build it only after the research brief (assets/brief-template.md) is finished and checked, and DISTIL it from that file by deletion and compression only: no new claims, no new numbers, no new headings. Every keyword string, volume, word count, title, meta description, slug, H1, OG field, outline heading and FAQ question is copied character for character from the research brief. Every table stake and strategic opportunity must stay visible in the outline (as an item or a guideline). Length budget: references/brief-rules.md section 17 (soft target 2,000 words, or 85 words per outline item plus FAQ question when that is higher; hard ceiling 1.5 times the soft target). Not here (they live in the research brief, linked below): competitor table, gap evidence, Reasoning lines, Covered by lines, SERP detail, Fact and source bank, Sources and scope. Keep every **TODO (human):** line, [CITE: ...] and [INTERNAL LINK: ...] marker that the kept text carries. Labels in bold, table headers and outline prefixes are machine-checked (scripts/check_brief.py --type writer): keep them exactly. No em-dashes. Every double-brace token is a value to fill; check_brief.py fails the brief while any double brace remains. }}

- **Date:** {{YYYY-MM-DD}}
- **Market:** {{SERP country}}, {{SERP language}}
- **Research brief:** {{link to the research brief Doc: competitor analysis, evidence, reasoning and sources}}

## Strategy summary

{{! At most about 150 words for the five bullets together. Compress from the research brief's Brief at a glance, Search intent and SERP, Editorial angle, Content gap analysis and Accuracy and brand guardrails. }}

- **Intent and format:** {{informational; the format the top results reward, in one line}}
- **What wins the SERP:** {{one or two lines: what the winners do, no URLs or scores}}
- **Our angle:** {{the editorial angle, one or two sentences, compressed from the research brief without changing its claim}}
- **Gaps we exploit:** {{1. ...; 2. ...; 3. ... (the three strongest strategic opportunities)}}
- **Guardrails:** {{the key brand, legal and claims rules in one or two lines}}

## Keyword strategy

| Type | Keyword | Monthly searches ({{country}}) | Placement |
|---|---|---|---|
| Primary | {{keyword}} | {{1,300}} | {{Meta title, H1, slug, OG title; opening sentence}} |
| Secondary | {{keyword}} | {{320}} | {{H2 of section 2}} |
| Question | {{question keyword}} | {{90}} | {{FAQ 1}} |

Source: {{tool}}, {{country}}, {{YYYY-MM-DD}}.

## On-page SEO

| Element | Recommendation | Chars |
|---|---|---|
| Meta title | {{winning title}} | {{48}} |
| Meta description | {{meta description}} | {{152}} |
| URL slug | {{primary-keyword-slug}} | {{27}} |
| H1 | {{H1}} | {{58}} |
| OG title | {{OG title}} | {{55}} |
| OG description | {{OG description}} | {{180}} |

## Article structure

**Total word count:** {{2,000}}
**FAQ allowance:** {{400}}

{{! Every outline item from the research brief, same prefix, same heading, same Word count. Per item: a one-line Angle, 2 to 4 imperative Guidelines, the Word count, and only where the research brief has them a Snippet target (copied verbatim, label included) and Resources. No Keywords, Covered by or Reasoning lines. }}

### H2: {{heading, identical to the research brief}}

- **Angle:** {{one line}}
- **Guidelines:**
  - {{imperative instruction}}
  - {{imperative instruction}}
- **Word count:** {{400}}
- **Snippet target:** {{copied verbatim from the research brief, or delete this line}}
- **Resources:** {{copied from the research brief, or delete this line}}

#### H3: {{heading, identical to the research brief}}

- **Angle:** {{one line}}
- **Guidelines:**
  - {{imperative instruction}}
  - {{imperative instruction}}
- **Word count:** {{200}}

### Conclusion: {{heading, identical to the research brief}}

- **Angle:** {{one line}}
- **Guidelines:**
  - {{restate the position in one line, then the CTA below}}
  - {{imperative instruction}}
- **Word count:** {{200}}

## Frequently Asked Questions

### {{Question 1, identical to the research brief}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer, then cover {{X}}.

### {{Question 2}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer, then cover {{X}}.

### {{Question 3}}

- **Guidelines:**
  - Open with a self-contained 40 to 50 word answer, then cover {{X}}.

## Internal links

| Anchor | URL |
|---|---|
| {{anchor text}} | {{https://www.example.com/blog/related-guide/}} |
| {{anchor text}} | [INTERNAL LINK: {{anchor}} -> {{topic}}] |

## Writer notes

- **Tone:** {{one or two lines from the brand context}}
- **Do:**
  - {{at most 5}}
- **Don't:**
  - {{at most 5}}
- **E-E-A-T and YMYL:**
  - {{author or reviewer, first-hand material, disclaimers, red flags; one short list; delete what does not apply}}
- **Conventions:** `[CITE: ...]` means a source must be added; `[INTERNAL LINK: anchor -> topic]` means no URL yet; a bold `TODO (human):` line is a decision for a person. Each section may run 0.85 to 1.15 of its word count.

## Conclusion and CTA

- **Primary CTA:** {{action and target, full URL}}
- **Secondary CTA:** {{lighter alternative}}
- **Placement:** {{after section N; end of page}}
