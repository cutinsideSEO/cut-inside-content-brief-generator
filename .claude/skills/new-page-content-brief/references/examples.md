# Gold brief excerpts (anonymised)

## What these are and how to use them

These are excerpts of four real past briefs that the skill owner chose as gold. Client names, brands, products, domains, people and competitor names have been removed or replaced with placeholders (`<client>`, `<product>`, `https://www.competitor-a.example/...`). Volumes and word counts are kept or rounded.

Use them to calibrate **specificity, evidence and tone**. Never copy their topics, numbers, claims or phrasing into a new brief. The structure to follow is the template in `assets/`, not these excerpts.

The originals used slightly different labels (for example `Targets`, `Covered By`, `Additional Resources Required`, `Page Goal`, section marks like "§3", or "Cover:" and "Format:" lines). Here they are shown with the labels the skill's template uses (`Keywords`, `Covered by`, `Resources`, `Angle`, `Guidelines`, `Word count`, `Snippet target`). Where an original had no such field (for example Gold B has no per-item word counts, Gold C and D have no per-item angle), the excerpt simply omits it. Your brief must include them.

Two deliberate departures from the originals: (1) in Gold B, C and D the first FAQ guideline (the self-contained 40 to 50 word answer) was added to match the house FAQ rule; the originals lacked it. (2) Excerpt A1's "decision needed" box came from an internal-facing brief. In a brief that goes to a client or a freelancer, settle such decisions with the person at H3 or H4 and keep only the resolved guardrail: no Open Items section ships.

| Gold | Language | Best at |
| --- | --- | --- |
| A | English, most evolved | Editorial angle with swap test, evidence-backed gap analysis, on-page reasoning, claim-style H2s with word counts and snippet target, guardrails |
| B | English, app format | Keyword placement notes, differentiation summary, scenario sections that solve real blockers, FAQ guidelines |
| C | Hebrew | Local (Israeli) angle turned into sections, resources lists, snippet-ready definitions |
| D | Hebrew | Audience-first framing, practical numbered steps, FAQ written from real reader situations |

## Gold A (English): informational comparison, US market

### A1. Accuracy and brand guardrails (flagging a conflict instead of hiding it)

```markdown
## Accuracy and brand guardrails

**DECISION NEEDED FROM STAFF: market availability.** The product brief lists the target country as
not enabled at launch, but this task targets searchers in that country. The draft therefore serves
informational intent and builds brand association, and deliberately avoids any "use <product> here
today" call to action. The product CTA is soft and carries an availability caveat ("check in-app for
availability where you are"). Please confirm the CTA posture before publishing: (a) keep it
education-first with the caveat, or (b) if access is coming, give the timing and the CTA is sharpened.

<!-- TODO (human): confirm availability / CTA -->
```

### A2. Editorial angle with swap test

```markdown
## Strategy and goals

**Editorial angle (state verbatim at the top of the writer's copy):**
Prediction markets don't beat polls by magic. They beat them under specific conditions (real money at
stake, a liquid market, a genuinely uncertain race late in the cycle) and they fail loudly when those
conditions break, as they did in 2016 and on Brexit. So the useful question isn't "which is more
accurate?" but "when should I trust a market price over a poll?". The answer: read a market price as a
live, money-weighted probability and use polls as the sample-based cross-check.

**Swap test:** replace the topic with "email vs SMS" and the thesis collapses, because it is specific
to how these two forecasting instruments actually behave. Passes.

Every section is a facet of this thesis. The angle serves the informational intent (it explains and
takes a position) and gives <product> a non-salesy home: once a reader understands a market price is a
live probability set by traders with money at stake, the natural next question is "where do I watch one
move?", which is where <product> belongs.
```

### A3. Table stakes vs strategic opportunities, each with evidence

```markdown
## Content gap analysis

**Table stakes (every credible page covers these, so the outline must too):**
- A plain-English definition and the 0-to-$1 / probability mechanic (competitors 1, 3, 4).
- The core conceptual difference: polls measure stated intent from a sample, markets measure
  money-weighted belief (competitors 2, 3, 5).
- Some accuracy evidence, ideally the most recent national election (competitors 2, 4, 6).

**Strategic opportunities (winners cover these poorly or not at all, this is our edge):**
1. **Honest failure cases.** The accessible explainers sell markets as simply "better". Only one
   encyclopedia entry notes the misses. Putting the wins and the misses in one place is the biggest
   credibility lever.
2. **The conditional answer.** "Are they more accurate?" is answered "yes" by promo pages and "it
   depends" by academics. Neither states the conditions. We will: late, liquid, genuinely uncertain.
```

### A4. On-page SEO with character counts and rejected-title reasoning

```markdown
## On-page SEO

| Element | Recommendation | Chars | Reasoning |
| --- | --- | --- | --- |
| Meta title | Prediction Markets vs. Polls: When Markets Win | 46 | Takes a position (markets win conditionally) with the exact-match primary keyword at the front. Rejected: "Prediction Markets vs. Polls: Which Is More Accurate?" (generic, fails the swap test) and "Why Prediction Markets Beat the Polls" (drops the exact keyword and overclaims by hiding the failure cases). |
| Meta description | Prediction markets beat the polls in 2024 but missed Brexit and 2016. Here's exactly when a market price is the sharper signal, and when a poll still wins. | 155 | Leads with the surprising two-sided fact, then promises the decision rule. |
| URL slug | prediction-markets-vs-polls | 27 | Exact-match keyword, three hyphenated content words. |
| H1 | Prediction Markets vs. Polls: When a Market Price Beats a Poll | 62 | Differs from the title: serves the on-page reader with the practical framing. |
| OG title | Prediction Markets vs. Polls: What 2024 Actually Settled | 56 | Social framing: a concrete event, a hint of resolution. |
| OG description | In 2024, market prices tracked the result better than the polling averages, especially in swing states. But markets missed 2016 and Brexit. When to trust which, in plain English. | 178 | Both sides of the evidence, plain-English promise. |
```

### A5. Outline items: claim-style H2s, angle, evidence-anchored guidelines, snippet target

```markdown
**Total word count:** 2,000
**FAQ allowance:** 330

### H2: The short answer: markets usually win late, polls anchor early
- **Angle:** Give the money-weighted, conditional answer in the first two sentences.
- **Guidelines:**
  - Open with a standalone 40 to 55 word answer that a reader or an AI Overview can quote without context.
  - State the verdict in one paragraph: markets tend to be sharper close to the event and in uncertain races, polls are the better early structural baseline, both are probabilities, not prophecies.
- **Keywords:** prediction markets vs polls
- **Word count:** 90
- **Snippet target:** paragraph | prediction markets vs polls

### H2: When markets get it wrong: 2016 and Brexit
- **Angle:** The credibility section the promo pages skip: markets are not oracles.
- **Guidelines:**
  - Cite the two named misses and the mechanism of failure: traders anchored on the current price and treated it as truth.
  - Cover thin or manipulated markets and favourite-longshot bias; close on "a market is only as good as its liquidity and the independence of its traders".
  - Do not soften the misses to protect the product story.
- **Keywords:** prediction markets or polls
- **Word count:** 260

### H2: How to read a market price like a probability
- **Angle:** The practical payoff no academic winner offers: turn a price into a decision.
- **Guidelines:**
  - Show that price equals implied probability (62 cents is about a 62% chance), then give three rules: watch volume and movement not just the level, read a sudden move as news, cross-check against a polling average.
  - Bridge to <product> in two or three sentences, using only claims the product brief supports (no invented experience), then add the availability caveat and a soft CTA.
  - <!-- TODO (human): confirm availability / CTA -->
- **Word count:** 300
```

### A6. Internal links table

```markdown
## Internal and external links

| Anchor | Target | Why |
| --- | --- | --- |
| "how to trade political events" | https://www.example.com/blog/topic/how-to-trade-political-events/ | Direct next step for election-market readers |
| "prediction markets vs. sports betting" | https://www.example.com/blog/topic/markets-vs-sports-betting/ | Sibling comparison, supports FAQ 6 |
| "how market odds work" | https://www.example.com/blog/topic/odds-explained/ | Supports the "read a price" section |
| "<product>" | https://www.example.com/product/ | Product hub, used by the soft CTA |
```

## Gold B (English, app format): how-to guide, software or hardware task

### B1. Keyword table with placement notes

```markdown
## Keyword strategy

| Type | Keyword | Monthly searches (US) | Global volume | Intent / notes |
| --- | --- | --- | --- | --- |
| Primary | how to clone a hard drive to ssd | 600 | n/a | Highest-volume term and the core upgrade intent. Use in the H1, title tag and first sentence of the introduction. |
| Secondary | how to clone ssd | 500 | n/a | Covers the SSD-to-SSD path (for example SATA to NVMe), a key topic in the forum threads. Use in a specific scenario H2. |
| Secondary | how to clone hdd to ssd | 300 | n/a | The acronym tech-savvy searchers use. Use in the prerequisites section to confirm spinning-platter drives are covered. |
| Secondary | how to clone an ssd | 200 | n/a | Natural phrasing for the FAQ and troubleshooting, for example "Can I clone if the target drive is smaller?". |
```

### B2. Differentiation summary (a competitive read that decides the angle)

```markdown
### Differentiation summary
The top-performing results are community discussions rather than branded articles. That tells us users
distrust "best software" lists (they fear affiliate bias) and prioritise peer-validated, free methods.
To win, combine the structural clarity of the editorial sites with the honest, tool-agnostic,
troubleshooting-heavy advice found in the forums.
```

### B3. Outline items that solve real blockers

```markdown
### H2: Step 2: How to clone a hard drive to SSD (step-by-step)
- **Guidelines:**
  - Use a numbered list, one action per step, to target the featured snippet.
  - Keep the steps tool-agnostic but use the terms of one popular free imaging tool as the baseline ("Select Source", "Select Destination").
  - Include the partitions that matter (system reserved and EFI) in the copy step.
  - Add one Pro Tip: tick the TRIM option if the software offers it.
- **Keywords:** how to clone a hard drive to ssd, how to clone hard drive to ssd
- **Covered by:** https://www.competitor-a.example/clone-guide, https://www.competitor-b.example/how-to/clone-drive
- **Snippet target:** list | how to clone a hard drive to ssd

### H3: Scenario A: Cloning a larger HDD to a smaller SSD
- **Guidelines:**
  - Address the most common upgrade path (a 1 TB hard drive to a 500 GB SSD) and explain that it works if the used data fits on the SSD.
  - Detail shrinking the main partition, automatically in the software or manually in Disk Management, before cloning.
  - Warn: never exclude the System Reserved or Recovery partitions, only shrink the main data partition.
- **Keywords:** how to clone hdd to ssd
- **Covered by:** https://www.competitor-c.example/forum/clone-hdd-to-ssd, https://www.competitor-d.example/t/clone-to-smaller-ssd

### H3: Scenario B: Laptop single-slot workaround (disk image method)
- **Guidelines:**
  - Target laptops with one M.2 slot and no USB enclosure.
  - Outline the intermediary workflow in order: image the current drive to an external drive, create rescue media on a USB stick, swap the drives, boot from the USB stick and restore the image.
  - Call this out as the differentiator: most guides ignore this hardware limit.
- **Keywords:** how to clone ssd
- **Covered by:** https://www.competitor-e.example/q/clone-m2-single-slot
```

### B4. FAQ items with guidelines

```markdown
### Can I clone a larger HDD to a smaller SSD?
- **Guidelines:**
  - Open with a 40 to 50 word standalone answer: a conditional yes, only if the used data on the source is smaller than the SSD's total capacity.
  - Mention shrinking partitions or software with intelligent cloning that skips empty space.
  - Reference the common forum scenario (a 1 TB drive holding 200 GB of data going to a 500 GB SSD).
```

## Gold C (Hebrew): crypto education guide for the Israeli market

### C1. Differentiation summary (two competitor groups, one gap to own)

```markdown
## ניתוח מתחרים

### Differentiation summary
המתחרים המובילים מתחלקים לשתי קבוצות: אתרי חדשות סמכותיים המספקים עדכונים מיידיים אך דלים בתוכן לימודי, ואתרים בינלאומיים המספקים מדריכים מקיפים אך סובלים מתרגום מכונה או מחוסר התאמה לקהל הישראלי. ההזדמנות של <client> היא ליצור את "המדריך הישראלי המלא": שילוב של המבנה הלימודי של מתחרה אחד (הגדרות + אסטרטגיות) עם העומק האנליטי של מתחרה אחר, אך בעברית טבעית ונגישה, מותאמת למשקיע המקומי.
```

### C2. Outline items: snippet-ready definition, resources, local angle

```markdown
### H3: ההגדרה הטכנית: מתי ירידה הופכת לשוק דובי?
- **הנחיות:**
  - התחל במשפט ישיר שמתאים ל-Featured Snippet: "שוק דובי בקריפטו מוגדר כירידה של 20% ומעלה מהשיא האחרון לאורך תקופה של חודשיים לפחות".
  - הסבר את ההבדל בין ההגדרה בשוק ההון המסורתי (20%) לבין הקריפטו, שם הירידות לעיתים חדות יותר (40% עד 80%), כפי שמצוין אצל מתחרה בינלאומי.
- **יעד סניפט:** paragraph | שוק דובי בקריפטו

### H3: מדד הפחד והתאוותנות (Fear & Greed Index)
- **הנחיות:**
  - הסבר כיצד המדד פועל (מ-0 ל-100) ומה המשמעות של "פחד קיצוני".
  - ציין שמשקיעים מנוסים משתמשים במדד כאינדיקטור הפוך: "קנה כשאחרים מפחדים".
  - הבא דוגמה מספרית אחת ממקור מצוטט (ציון נמוך במיוחד שדווח באתר חדשות פיננסי).
- **משאבים נדרשים:**
  - ויז'ואל של שעון מדד הפחד והתאוותנות

### H3: הזדמנות לקיזוז הפסדים מול רשות המיסים
- **הנחיות:**
  - הסבר את המושג "מגן מס": מימוש הפסדים בשוק הדובי כדי לקזז אותם מול רווחים עתידיים או רווחים בשוק ההון.
  - הצג זאת כדרך חכמה להפוך ירידה בערך לחיסכון במס.
  - הוסף דיסקליימר שמומלץ להתייעץ עם רואה חשבון או יועץ מס.
```

### C3. FAQ items

```markdown
### מה ההבדל בין "תיקון בשוק" לבין "שוק דובי"?
- **הנחיות:**
  - פתח בתשובה עצמאית של 40 עד 50 מילים: תיקון הוא ירידה קצרת טווח של עד 10% עד 20% בתוך מגמת עלייה כללית, שוק דובי הוא ירידה של מעל 20% לאורך זמן ושינוי במגמה הראשית.
  - הסבר שתיקונים הם חלק בריא וטבעי משוק שורי, בעוד ששוק דובי משקף שינוי בסנטימנט המאקרו-כלכלי.
```

## Gold D (Hebrew): practical guide for an academic institution

### D1. Differentiation summary (audience-first)

```markdown
## ניתוח מתחרים

### Differentiation summary
המתחרים המובילים מייצרים בידול על ידי שילוב של "עזרה ראשונה רגשית" (הכרה בחוסר הוודאות ובקושי הנפשי) יחד עם כלים אקטיביים לניהול קריירה: הסבות מקצועיות, קורסים מקוונים ואימוץ טכנולוגיות חדשות. בניגוד לדפים טכניים או משפטיים יבשים, המנצחים מציגים גישה פרואקטיבית שמדריכה את המועמד כיצד להפוך את המשבר להזדמנות לצמיחה מקצועית.
```

### D2. Outline items: numbered steps and a section with resources

```markdown
### H2: 5 צעדים פרקטיים לחיפוש עבודה אפקטיבי בזמן מלחמה
- **הנחיות:**
  - נסח רשימה ממוספרת ומדויקת.
  - הצעדים: 1. עדכון קורות חיים במיקוד למיומנויות רכות. 2. שימוש ב-AI לסינון משרות. 3. בניית נטוורקינג דיגיטלי. 4. הכנה לראיונות עבודה מרחוק. 5. לימוד עצמי של מיומנויות חדשות.
  - הוסף "טיפ זהב" לכל צעד כדי להעלות את הערך המוסף.
- **יעד סניפט:** list | חיפוש עבודה בזמן מלחמה

#### H3: מינוף כלי בינה מלאכותית (AI) בחיפוש העבודה
- **הנחיות:**
  - הצג דוגמאות לשימוש בעוזר AI לכתיבת מכתבי פנייה.
  - הסבר איך להשתמש ב-AI כדי לבצע סימולציות של ראיונות עבודה.
  - הדגש כי הכרת כלי AI היא כבר לא מיומנות רשות אלא דרישת סף מודרנית.
- **משאבים נדרשים:**
  - צילומי מסך או סרטון הדגמה קצר של שימוש ב-AI לחיפוש עבודה ולסימולציות ראיון
```

### D3. FAQ items written from real reader situations

```markdown
### הוציאו אותי לחל"ת בעקבות המצב, האם כדאי לי לחפש עבודה חלופית?
- **הנחיות:**
  - פתח בתשובה עצמאית של 40 עד 50 מילים שמסבירה בקצרה את המשמעות הכלכלית של חל"ת.
  - המלץ לנצל את זמן החל"ת לשדרוג כישורים ולמידת מיומנויות חדשות.
  - הצע לשקול עבודות זמניות לשמירה על רצף תעסוקתי, במקביל לבירור הזכויות החוקיות מול מקור מוסמך.
```

## What made these gold

- **One position, tested.** The best brief states a thesis a competitor could not swap onto another topic (the swap test), and every section serves it.
- **Evidence behind every gap.** Table stakes and opportunities name what the ranking pages do or skip, so the writer knows what to match and what to beat.
- **Claim-style or reader-question headings.** H2s say something ("markets usually win late, polls anchor early") or ask the reader's own question, instead of using labels such as "Overview".
- **Imperative, concrete guidelines.** Each bullet is an instruction a writer can execute: a number to cite, a format (numbered list, table, symptom/solution), a warning to include, a forbidden shortcut.
- **Honesty built in.** Failure cases, caveats, availability notes and legal disclaimers are planned in the brief, not left to the writer.
- **Products appear late and softly.** The client or product enters through a genuine reader need, in two or three sentences, with only claims the product facts support.
- **Local and situational detail.** Tax rules, reserve duty, laptop slot limits: real constraints of the audience become sections competitors lack.
- **Everything is traceable.** Keywords have placement notes, on-page elements have counts and reasons, resources (tables, visuals, calculators) are listed so design work is requested up front, and FAQ answers are written to be quoted standalone.
