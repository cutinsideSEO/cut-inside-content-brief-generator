# {{נושא}} - בריף יצירת תוכן | {{לקוח}}

{{! TEMPLATE NOTES (English, for the strategist), delete this block. The Hebrew WRITER BRIEF: the human-facing deliverable for the client or the freelancer. Build it only after the research brief (assets/brief-template-he.md) is finished and checked, and DISTIL it from that file by deletion and compression only: no new claims, numbers or headings. Every keyword string, volume, word count, title, meta description, slug, H1, OG field, outline heading and FAQ question is copied character for character from the research brief. Every table stake and strategic opportunity stays visible in the outline (as an item or a guideline). Length budget: references/brief-rules.md section 17. Not here (they live in the research brief, linked below): competitor table, gap evidence, נימוק lines, מכוסה אצל lines, SERP detail, the fact and source bank, sources and scope. Keep every **TODO (human):** line and [CITE: ...] / [INTERNAL LINK: ...] marker that the kept text carries. Keyword table: ראשית, משנית, שאלה and מסחרית rows only; עמוד קיים (לא לטרגט) and מותג (מוחרג) rows collapse into the one **לא לטרגט:** line under the table. The YMYL compliance TODO is in Hebrew (references/brief-rules.md section 13). Placeholders inside guidelines use [square brackets], never angle brackets. Upload as HTML from scripts/md_to_html.py --lang he, never Markdown. Fixed English labels kept on purpose, as in the research template: `## On Page SEO`, the on-page element names, the outline prefixes (Hero, H2, H3, H4, Conclusion), the snippet formats. Read headings and titles for Hebrew equivalents of banned patterns. No em-dashes. check_brief.py --type writer --lang he fails the brief while any double brace remains. }}

- **תאריך:** {{YYYY-MM-DD}}
- **שוק:** {{מדינת ה-SERP}}, {{שפת ה-SERP}}
- **בריף מחקר:** {{קישור למסמך בריף המחקר: ניתוח מתחרים, ראיות, נימוקים ומקורות}}

## סיכום אסטרטגי

{{! At most about 150 words for the five bullets together, compressed from the research brief. }}

- **כוונה ופורמט:** {{אינפורמטיבית; הפורמט שהתוצאות המובילות מתגמלות, בשורה אחת}}
- **מה מנצח ב-SERP:** {{שורה או שתיים: מה המובילים עושים, בלי כתובות וציונים}}
- **הזווית שלנו:** {{זווית העריכה, משפט או שניים, מקוצרת מבריף המחקר בלי לשנות את הטענה}}
- **הפערים שאנחנו מנצלים:** {{1. ...; 2. ...; 3. ... (שלוש ההזדמנויות האסטרטגיות החזקות)}}
- **גבולות:** {{כללי המותג, המשפט והטענות העיקריים, בשורה או שתיים}}

## אסטרטגיית מילות מפתח

| סוג | מילת מפתח | חיפושים חודשיים ({{מדינה}}) | מיקום |
|---|---|---|---|
| ראשית | {{מילת מפתח}} | {{1,300}} | {{Meta title, H1, slug, OG title; משפט הפתיחה}} |
| משנית | {{מילת מפתח}} | {{320}} | {{H2 של סעיף 2}} |
| שאלה | {{מילת מפתח בצורת שאלה}} | {{90}} | {{שאלה 1}} |

**לא לטרגט:** {{"מחרוזת", "מחרוזת" (שורות עמוד קיים ומותג מבריף המחקר, מועתקות במדויק ובמירכאות); עוגן "טקסט" אל https://www.example.com/existing-page/; או למחוק את השורה}}

מקור: {{כלי}}, {{מדינה}}, {{YYYY-MM-DD}}.

## On Page SEO

| רכיב | המלצה | תווים |
|---|---|---|
| Meta title | {{הכותרת שנבחרה}} | {{48}} |
| Meta description | {{תיאור המטא}} | {{150}} |
| URL slug | {{primary-keyword-slug}} | {{27}} |
| H1 | {{H1}} | {{52}} |
| OG title | {{OG title}} | {{50}} |
| OG description | {{OG description}} | {{170}} |

## מבנה המאמר

**סה"כ מילים:** {{2,000}}
**הקצאה לשאלות ותשובות:** {{400}}

{{! Every outline item from the research brief, same prefix, same heading, same מספר מילים. Per item: a one-line זווית, 2 to 4 imperative הנחיות, מספר מילים, and only where the research brief has them יעד סניפט (verbatim, label included) and משאבים נדרשים. No מילות מפתח, מכוסה אצל or נימוק lines. }}

### H2: {{כותרת, זהה לבריף המחקר}}

- **זווית:** {{שורה אחת}}
- **הנחיות:**
  - {{הנחיה בלשון ציווי}}
  - {{הנחיה בלשון ציווי}}
- **מספר מילים:** {{400}}
- **יעד סניפט:** {{מועתק מבריף המחקר מילה במילה, או למחוק את השורה}}
- **משאבים נדרשים:** {{מועתק מבריף המחקר, או למחוק את השורה}}

#### H3: {{כותרת, זהה לבריף המחקר}}

- **זווית:** {{שורה אחת}}
- **הנחיות:**
  - {{הנחיה בלשון ציווי}}
  - {{הנחיה בלשון ציווי}}
- **מספר מילים:** {{200}}

### Conclusion: {{כותרת, זהה לבריף המחקר}}

- **זווית:** {{שורה אחת}}
- **הנחיות:**
  - {{לחזור על העמדה בשורה אחת, ואז ה-CTA שבהמשך}}
  - {{הנחיה בלשון ציווי}}
- **מספר מילים:** {{200}}

## שאלות ותשובות

### {{שאלה 1, זהה לבריף המחקר}}

- **הנחיות:**
  - לפתוח בתשובה עצמאית של 40 עד 50 מילים, ואז לכסות את {{X}}.

### {{שאלה 2}}

- **הנחיות:**
  - לפתוח בתשובה עצמאית של 40 עד 50 מילים, ואז לכסות את {{X}}.

### {{שאלה 3}}

- **הנחיות:**
  - לפתוח בתשובה עצמאית של 40 עד 50 מילים, ואז לכסות את {{X}}.

## קישורים פנימיים

| עוגן | כתובת |
|---|---|
| {{טקסט עוגן}} | {{https://www.example.com/blog/related-guide/}} |
| {{טקסט עוגן}} | [INTERNAL LINK: {{anchor}} -> {{topic}}] |

## הנחיות לכותב

- **טון וקול:** {{שורה או שתיים מתוך הקשר המותג}}
- **מה לעשות:**
  - {{עד 5}}
- **ממה להימנע:**
  - {{עד 5}}
- **E-E-A-T ו-YMYL:**
  - {{כותב או בודק, חומר ממקור ראשון, הבהרות, סימני אזהרה; רשימה קצרה אחת; למחוק מה שלא רלוונטי}}
- **מוסכמות:** `[CITE: ...]` פירושו שצריך להוסיף מקור; `[INTERNAL LINK: anchor -> topic]` פירושו שאין עדיין כתובת; שורה מודגשת `TODO (human):` היא החלטה של אדם. כל סעיף יכול לנוע בין 0.85 ל-1.15 ממספר המילים שלו.

## סיכום וקריאה לפעולה

- **CTA ראשי:** {{הפעולה והיעד, כתובת מלאה}}
- **CTA משני:** {{חלופה קלה יותר}}
- **מיקום בעמוד:** {{אחרי סעיף N; סוף העמוד}}
