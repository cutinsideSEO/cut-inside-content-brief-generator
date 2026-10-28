#!/usr/bin/env python3
"""Mechanical checks on a finished content brief written in Markdown.

Standard library only, Python 3.9+, works on Windows and Linux. Run it before
the brief is converted to a Google Doc.

Every run produces two linked briefs: the RESEARCH brief (internal, the full
research with reasoning; assets/brief-template*.md) and the WRITER brief (the
human-facing, gold-length brief distilled from it; assets/writer-brief-template*.md).

Usage
    python check_brief.py brief.md                         # research brief
    python check_brief.py writer.md --type writer          # writer brief
    python check_brief.py writer.md --type writer --pair brief.md
    python check_brief.py brief.md --lang he --json

Options
    --type research|writer  Which brief this is (default research). research
                          expects a Reasoning bullet on every outline item;
                          writer applies the writer-brief section set, the length
                          budget and warns on Reasoning / Covered by lines.
    --variant full|concise  DEPRECATED alias kept for old commands: full maps to
                          --type research, concise to --type writer (a notice
                          is printed on stderr). The concise variant no longer
                          exists; the writer brief replaced it.
    --pair OTHER.md       The counterpart brief of the same run (the research
                          brief when --type writer, the writer brief when
                          --type research). Adds the pair checks below.
    --lang en|he          Brief language. Auto-detected when omitted (Hebrew
                          characters in the H1 title means he). Both the English
                          and the Hebrew labels of the format spec are accepted
                          in either mode; the language only drives the
                          language-consistency check.
    --json                Print the result as JSON instead of text.

Checks (ERROR fails the brief, WARNING is advice)
    1  em-dash U+2014 (error), en-dash U+2013 (warning)
    2  forbidden leftovers: {{ }} <topic> <client> <keyword> [PLACEHOLDER TBD Lorem
       (allowed: [INTERNAL LINK: ...], [CITE: ...], **TODO (human):** ...)
       and any HTML comment '<!--' (error: comments do not survive the Google
       Doc conversion, so a TODO must be a visible **TODO (human):** line);
       any other angle-bracket token such as <network> or <br> outside inline
       code and fill tokens (error: the Google Doc conversion drops it; write
       placeholders in [square brackets]; autolinks <https://...> are allowed)
    3  required sections and order: research = the 15 research sections
       (Accuracy and brand guardrails is optional); writer = Strategy summary,
       Keyword strategy, On-page SEO, Article structure, FAQs, Internal links,
       Writer notes, Conclusion and CTA (a research-only section in a writer
       brief is a warning)
    4  On-page table: required rows, character limits, slug rules, Chars column
    5  Keyword table: Primary keyword present, in title / H1 / OG title / slug, volume;
       in a Hebrew brief, a Primary with no Hebrew letter (warning: the primary
       must be in the market's search language; a foreign-language PAA may only
       be a Question row)
    6  banned title, meta description and AI-cliche phrases
    7  Article structure: totals, per-item bullets, word count sum, snippet targets;
       when the Search intent section says SERP features were not observed
       ("not observed" / "לא נצפו"), every snippet line must say it is a bet
       ("bet" / "הימור") and there should be at most 2 (warnings); when it says
       no featured snippet was observed ("no featured snippet" / "לא נצפה featured
       snippet"), every snippet line must say it is an AI Overview answer block
       ("AI Overview answer block" / "בלוק תשובה ל-AI Overview"), at most 2
       (warnings); every snippet query should be a keyword in the keyword table,
       i.e. a query that was pulled (warning)
    8  FAQs: Guidelines bullet, the 40 to 50 word answer rule, no drafted answers
    9  Competitor table: at least 3 rows, absolute http(s) URLs
    10 language consistency of section headings
    11 internal links must be absolute URLs (writer: every Internal links URL
       cell is an absolute URL or an [INTERNAL LINK: ...] placeholder, error)
    12 writer only: length budget (words = whitespace tokens containing a
       letter or digit; items = outline items + FAQ questions; soft target =
       max(2,000, 85 x items), WARNING above it; hard ceiling = 1.5 x soft
       target, ERROR above it; budget from the gold briefs, see
       references/brief-rules.md section 17); Strategy summary over about 150
       words, an Angle over 40 words, more than 4 Guidelines bullets, more
       than 5 Do or Don't bullets, Reasoning or Covered by lines, a Reasoning
       column, a missing research-brief link line (warnings)
    13 --pair: ERROR when a keyword string or its volume, the Total word count
       or FAQ allowance, an on-page value (meta title, meta description, slug,
       H1, OG title, OG description), an outline heading or its Word count, or
       an FAQ question differs between the two briefs (an "Existing page (do
       not target)" or "Brand (excluded)" row of the research brief may instead
       appear in the writer brief's one-line '**Do not target:**' summary under
       the keyword table, HE '**לא לטרגט:**', string copied exactly); WARNING when the title
       lines do not follow "<writer title> | research", a snippet target line
       differs, the writer brief has fewer TODO (human) lines, or a research
       table stake or strategic opportunity has under 50% token overlap with
       the writer outline (worded as "lost in distillation" when the research
       outline matched it better, otherwise "confirm by reading")

Output: ERRORS, then WARNINGS, a marker count line (TODO (human), [CITE],
[INTERNAL LINK], outside inline code; compare the TODO count with the Doc at
read-back and report the CITE count at H6), the word count (and the writer
budget), then a one-line summary.
Exit code: 1 if any error, 0 otherwise, 2 if the file cannot be read.
"""

import argparse
import json
import re
import sys

EM_DASH = chr(0x2014)  # em-dash, built from its code point
EN_DASH = chr(0x2013)  # en-dash
HEBREW_RE = re.compile(r"[֐-׿]")

# (id, required, English heading, Hebrew heading)
SECTIONS = [
    ("glance", True, "Brief at a glance", "הבריף במבט אחד"),
    ("guardrails", False, "Accuracy and brand guardrails", "דגשי דיוק ומותג"),
    ("strategy", True, "Strategy and goals", "אסטרטגיה ומטרות"),
    ("intent", True, "Search intent and SERP", "כוונת חיפוש ו-SERP"),
    ("keywords", True, "Keyword strategy", "אסטרטגיית מילות מפתח"),
    ("competitive", True, "Competitive analysis", "ניתוח מתחרים"),
    ("gap", True, "Content gap analysis", "ניתוח פערי תוכן"),
    ("onpage", True, "On-page SEO", "On Page SEO"),
    ("structure", True, "Article structure", "מבנה המאמר"),
    ("faq", True, "Frequently Asked Questions", "שאלות ותשובות"),
    ("conclusion", True, "Conclusion and CTA", "סיכום וקריאה לפעולה"),
    ("links", True, "Internal and external links", "קישורים פנימיים וחיצוניים"),
    ("eeat", True, "E-E-A-T signals", "אותות E-E-A-T"),
    ("writer", True, "Writer notes", "הנחיות לכותב"),
    ("technical", True, "Technical notes", "הערות טכניות"),
    ("sources", True, "Sources and scope", "מקורות והיקף"),
]


def norm_key(text):
    """Heading key: lowercase, punctuation and spaces removed (Unicode aware)."""
    return re.sub(r"[\W_]+", "", text.lower())


# the writer brief (distilled from the research brief)
WRITER_SECTIONS = [
    ("summary", True, "Strategy summary", "סיכום אסטרטגי"),
    ("keywords", True, "Keyword strategy", "אסטרטגיית מילות מפתח"),
    ("onpage", True, "On-page SEO", "On Page SEO"),
    ("structure", True, "Article structure", "מבנה המאמר"),
    ("faq", True, "Frequently Asked Questions", "שאלות ותשובות"),
    ("ilinks", True, "Internal links", "קישורים פנימיים"),
    ("writer", True, "Writer notes", "הנחיות לכותב"),
    ("conclusion", True, "Conclusion and CTA", "סיכום וקריאה לפעולה"),
]
WRITER_IDS = {s[0] for s in WRITER_SECTIONS}
RESEARCH_ONLY = [s for s in SECTIONS if s[0] not in WRITER_IDS]


def section_maps(sections):
    by_key = {}
    for _sid, _req, _en, _he in sections:
        by_key[norm_key(_en)] = _sid
        by_key[norm_key(_he)] = _sid
    return (by_key, {s[0]: i for i, s in enumerate(sections)},
            {s[0]: s[2] for s in sections}, {s[0]: s[3] for s in sections})


# writer budget, measured on the gold briefs (references/brief-rules.md section 17)
WRITER_SOFT_MIN = 2000
WRITER_WORDS_PER_ITEM = 85
WRITER_HARD_FACTOR = 1.5
SUMMARY_MAX_WORDS = 165   # "at most about 150"
ANGLE_MAX_WORDS = 40
DO_DONT_MAX = 5
STAKE_MATCH_MIN = 0.5

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*$")
ITEM_RE = re.compile(r"^#{3,5} (Hero|H2|H3|H4|Conclusion):\s*(.*?)\s*$")
BULLET_RE = re.compile(r"^[-*+]\s+\*\*(.+?)\*\*\s*(.*)$")
NESTED_RE = re.compile(r"^\s+[-*+]\s+(\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")

LABELS = {
    "word count": "words", "מספר מילים": "words",
    "angle": "angle", "זווית": "angle",
    "guidelines": "guidelines", "הנחיות": "guidelines",
    "keywords": "keywords", "מילות מפתח": "keywords",
    "covered by": "covered", "מכוסה אצל": "covered",
    "snippet target": "snippet", "יעד סניפט": "snippet",
    "resources": "resources", "משאבים נדרשים": "resources",
    "reasoning": "reasoning", "נימוק": "reasoning",
}

TOTAL_RE = re.compile(r"\*\*\s*(?:Total word count|סה.{0,3}כ\s+מילים)\s*:?\s*\*\*\s*:?\s*(\d[\d,]*)", re.I)
FAQ_ALLOW_RE = re.compile(r"\*\*\s*(?:FAQ allowance|הקצאה לשאלות ותשובות)\s*:?\s*\*\*\s*:?\s*(\d[\d,]*)", re.I)

FORBIDDEN = [
    ("{{", re.compile(r"\{\{")),
    ("}}", re.compile(r"\}\}")),
    ("<topic>", re.compile(r"<topic>", re.I)),
    ("<client>", re.compile(r"<client>", re.I)),
    ("<keyword>", re.compile(r"<keyword>", re.I)),
    ("[PLACEHOLDER", re.compile(r"\[PLACEHOLDER", re.I)),
    ("TBD", re.compile(r"\bTBD\b")),
    ("Lorem", re.compile(r"Lorem", re.I)),
]
ALLOWED_PLACEHOLDERS = [
    re.compile(r"\[INTERNAL LINK:[^\]]*\]"),
    re.compile(r"\[CITE:[^\]]*\]"),
    re.compile(r"\*\*TODO \(human\):\*\*"),
]
TODO_RE = re.compile(r"\*\*TODO \(human\):\*\*")
CITE_RE = re.compile(r"\[CITE:")
INTERNAL_LINK_RE = re.compile(r"\[INTERNAL LINK:")
HTML_COMMENT_RE = re.compile(r"<!--")
ANGLE_RE = re.compile(r"<([A-Za-z][^<>\n]{0,80})>")
AUTOLINK_RE = re.compile(r"^(?:https?|mailto|ftp):", re.I)
DNT_RE = re.compile(r"^\s*(?:[-*+]\s+)?\*\*\s*(?:Do not target|לא לטרגט)\s*:?\s*\*\*\s*:?\s*(.*)$", re.I)
COLLAPSIBLE_TYPES = ("existing page", "brand", "עמוד קיים", "מותג")
NOT_OBSERVED_RE = re.compile(r"not observed|לא נצפו", re.I)
BET_RE = re.compile(r"\bbets?\b|הימור", re.I)
NO_FS_RE = re.compile(r"no featured snippet|לא נצפה featured snippet|אין featured snippet", re.I)
AIO_BLOCK_RE = re.compile(r"AI Overview answer block|בלוק תשובה ל-?AI Overview", re.I)
TRAILING_PAREN_RE = re.compile(r"\s*\([^()]*\)\s*$")
FILL_TOKEN_RE = re.compile(r"\{\{.*?\}\}")
CODE_SPAN_RE = re.compile(r"`[^`]*`")
WORD_TOKEN_RE = re.compile(r"\S+")
RESEARCH_LINK_RE = re.compile(r"^[-*+]\s+\*\*\s*(?:Research brief|בריף מחקר)\s*:?\s*\*\*", re.I)
DO_LABELS = ("do", "מה לעשות")
DONT_LABELS = ("don't", "dont", "ממה להימנע")
STAKES_HEAD_RE = re.compile(r"table stakes|נושאי חובה", re.I)
OPPS_HEAD_RE = re.compile(r"strategic opportunities|הזדמנויות אסטרטגיות", re.I)
STAKE_ITEM_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+\*\*(.+?)\*\*")
STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "are", "its", "it's", "how",
    "what", "why", "when", "which", "who", "not", "but", "you", "your", "our", "their", "they",
    "them", "than", "then", "each", "both", "only", "also", "more", "most", "any", "all", "one",
    "two", "per", "via", "about", "over", "under", "between", "including", "include", "use",
    "של", "את", "על", "עם", "או", "גם", "כל", "לא", "זה", "זו", "מה", "איך", "למה", "בין",
}

TITLE_BANNED = [
    ("ultimate guide", r"ultimate guide"),
    ("complete guide", r"complete guide"),
    ("definitive guide", r"definitive guide"),
    ("everything you need to know", r"everything you need to know"),
    ("101", r"\b101\b"),
    ("beginner's guide", r"beginner'?s guide"),
    ("for beginners", r"for beginners"),
    ("step-by-step guide", r"step[- ]by[- ]step guide"),
    ("title starting with learn/discover/explore", r"^\s*(?:learn|discover|explore)\b"),
    ("learn/discover/explore after a colon", r":\s*(?:learn|discover|explore)\b"),
]
TITLE_BANNED = [(n, re.compile(p, re.I)) for n, p in TITLE_BANNED]
DESC_BANNED = [
    ("learn everything about", r"learn everything about"),
    ("discover the best", r"discover the best"),
    ("in this guide, we'll explore", r"in this guide,? we'll explore"),
    ("comprehensive guide", r"comprehensive guide"),
]
DESC_BANNED = [(n, re.compile(p, re.I)) for n, p in DESC_BANNED]

CLICHE_PHRASES = [
    "delve into", "dive deep", "let's dive in", "let's explore", "leverage",
    "unlock the power", "harness the power", "navigate the complexities",
    "seamless", "seamlessly", "robust", "cutting-edge", "game-changer",
    "revolutionary", "in today's fast-paced world", "ever-evolving landscape",
    "look no further", "at its core", "at the end of the day", "it's worth noting",
    "in conclusion", "to sum up", "this comprehensive guide", "everything you need to know",
]
CLICHE_OVERRIDES = {
    "delve into": r"\bdelv(?:e|es|ed|ing) into\b",
    "dive deep": r"\b(?:dive[sd]?|diving) deep\b",
    "leverage": r"\bleverag(?:e|es|ed|ing)\b",
}
CLICHE_RES = []
for _p in CLICHE_PHRASES:
    CLICHE_RES.append((_p, re.compile(CLICHE_OVERRIDES.get(_p, r"\b" + re.escape(_p) + r"\b"), re.I)))

NICE = {"meta title": "Meta title", "meta description": "Meta description", "url slug": "URL slug",
        "h1": "H1", "og title": "OG title", "og description": "OG description"}
FILLER_WORDS = {"the", "a", "an", "your", "of", "and", "to", "for", "in"}
WHAT_IS_RE = re.compile(r"^(?:what is|what's|what\u2019s|מה זה|מהו|מהי)\b", re.I)


class Report:
    def __init__(self):
        self.items = []  # (level, line, message)

    def error(self, line, msg):
        self.items.append(("ERROR", line, msg))

    def warn(self, line, msg):
        self.items.append(("WARNING", line, msg))

    def of(self, level):
        sel = [(ln, m) for lv, ln, m in self.items if lv == level]
        return sorted(sel, key=lambda t: (t[0] is None, t[0] or 0))


def fmt_lines(nums, limit=15):
    nums = sorted(set(nums))
    shown = ", ".join(str(n) for n in nums[:limit])
    if len(nums) > limit:
        shown += ", ... (%d more)" % (len(nums) - limit)
    return shown


def strip_fmt(text):
    """Remove markdown bold and backticks and trim."""
    return re.sub(r"\*\*|__|`", "", text).strip()


def split_row(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [c.replace("\\|", "|").strip() for c in re.split(r"(?<!\\)\|", s)]


def is_separator(cells):
    return bool(cells) and all(re.fullmatch(r":?-+:?", c.replace(" ", "")) for c in cells)


def find_tables(lines, lo, hi):
    """Tables = runs of lines starting with '|'. Returns [{'header': (ln, cells), 'rows': [(ln, cells)]}]."""
    tables = []
    cur = None
    for i in range(lo, hi):
        if lines[i].lstrip().startswith("|"):
            cells = split_row(lines[i])
            if cur is None:
                cur = {"header": (i + 1, cells), "rows": [], "_seen_header": True}
                tables.append(cur)
            elif is_separator(cells):
                continue
            else:
                cur["rows"].append((i + 1, cells))
        else:
            cur = None
    return tables


def parse_int(text):
    m = re.search(r"\d[\d,]*", text or "")
    return int(m.group(0).replace(",", "")) if m else None


def parse_bullets(lines, lo, hi):
    """Top-level bold-labelled bullets with their nested bullets, between lines lo..hi."""
    bullets = []
    last = None
    for i in range(lo, hi):
        line = lines[i]
        m = BULLET_RE.match(line)
        if m:
            label = m.group(1).strip().rstrip(":").strip().lower()
            rest = m.group(2).lstrip(":").strip()
            last = {"label": LABELS.get(label, label), "raw_label": label, "text": rest,
                    "nested": [], "line": i + 1}
            bullets.append(last)
            continue
        if re.match(r"^[-*+]\s+", line):
            last = None
            continue
        nm = NESTED_RE.match(line)
        if nm and last is not None:
            last["nested"].append(nm.group(1).strip())
    return bullets


def first_bullet(bullets, label):
    for b in bullets:
        if b["label"] == label:
            return b
    return None


def count_words(text):
    """Whitespace tokens that contain a letter or digit (table pipes and bullets do not count)."""
    return sum(1 for tok in WORD_TOKEN_RE.findall(text) if re.search(r"\w", tok))


def stem_forms(tok):
    forms = {tok}
    if tok.isascii():
        base = tok
        for suf in ("ings", "ing", "ies", "ed", "es", "s"):
            if tok.endswith(suf) and len(tok) - len(suf) >= 3:
                base = tok[: -len(suf)]
                break
        forms.add(base)
        if base.endswith("e") and len(base) >= 4:
            forms.add(base[:-1])
    elif len(tok) > 3 and tok[0] in "והבכלמש":
        forms.add(tok[1:])
        if len(tok) > 4 and tok[1] in "הבכלמש":
            forms.add(tok[2:])
    return forms


def topic_tokens(text):
    toks = []
    for tok in re.findall(r"\w+", text.lower()):
        if len(tok) < 3 or tok in STOPWORDS:
            continue
        toks.append(tok)
    return toks


def overlap_ratio(topic, pool_forms):
    toks = topic_tokens(topic)
    if not toks:
        return None
    hit = sum(1 for tok in toks if stem_forms(tok) & pool_forms)
    return hit / float(len(toks))


def analyse(path, kind, lang_opt):
    """Check one brief. Returns (report, info) or (None, error message) when unreadable."""
    try:
        with open(path, "r", encoding="utf-8-sig") as fh:
            text = fh.read()
    except (OSError, UnicodeDecodeError) as exc:
        return None, "cannot read %s: %s" % (path, exc)
    lines = text.splitlines()
    rep = Report()
    writer_mode = kind == "writer"
    mode_sections = WRITER_SECTIONS if writer_mode else SECTIONS
    section_by_key, section_index, section_en, section_he = section_maps(mode_sections)
    if writer_mode:  # recognise research-only headings so they can be flagged
        for _sid, _req, _en, _he in RESEARCH_ONLY:
            section_by_key.setdefault(norm_key(_en), _sid)
            section_by_key.setdefault(norm_key(_he), _sid)
    info = {"path": path, "kind": kind, "keywords": [], "onpage": {}, "total": None,
            "faq_allow": None, "items": [], "faq_qs": [], "title": None, "stakes": [],
            "opps": [], "words": count_words(text)}

    # ---- structure scan: headings (outside code fences) and sections
    in_fence = [False] * len(lines)
    fenced = False
    for i, ln in enumerate(lines):
        if FENCE_RE.match(ln):
            fenced = not fenced
            in_fence[i] = True
        else:
            in_fence[i] = fenced
    headings = []  # (idx, level, text)
    for i, ln in enumerate(lines):
        if in_fence[i]:
            continue
        m = HEADING_RE.match(ln)
        if m:
            headings.append((i, len(m.group(1)), m.group(2)))

    title = next((h for h in headings if h[1] == 1), None)
    info["title"] = title[2] if title else None
    lang = lang_opt
    if lang is None:
        lang = "he" if (title and HEBREW_RE.search(title[2])) else "en"
    info["lang"] = lang
    if title is None:
        rep.warn(1, "no '# ' title line found (expected '# <Topic> - Content Brief | <Client>')")

    sections = {}  # id -> (heading_idx, lo, hi, heading_text)
    order = []     # (sid, idx, heading_text)
    for n, (idx, level, htext) in enumerate(headings):
        if level != 2:
            continue
        sid = section_by_key.get(norm_key(htext))
        end = len(lines)
        for (j, lv2, _t) in headings[n + 1:]:
            if lv2 <= 2:
                end = j
                break
        if sid is not None:
            order.append((sid, idx, htext))
            if sid not in sections:
                sections[sid] = (idx, idx + 1, end, htext)

    def sec_range(sid):
        s = sections.get(sid)
        return (s[1], s[2]) if s else None

    # ---- 1. dashes
    em_lines = [i + 1 for i, ln in enumerate(lines) if EM_DASH in ln]
    if em_lines:
        rep.error(em_lines[0], "em-dash (U+2014) found on lines: %s (use a hyphen, comma or colon)" % fmt_lines(em_lines))
    en_lines = [i + 1 for i, ln in enumerate(lines) if EN_DASH in ln]
    if en_lines:
        rep.warn(en_lines[0], "en-dash (U+2013) found on lines: %s" % fmt_lines(en_lines))

    # ---- 2. forbidden leftovers
    found_forbidden = {}
    for i, ln in enumerate(lines):
        scrub = ln
        for allowed in ALLOWED_PLACEHOLDERS:
            scrub = allowed.sub(" ", scrub)
        for name, rx in FORBIDDEN:
            if rx.search(scrub):
                found_forbidden.setdefault(name, []).append(i + 1)
    for name, nums in found_forbidden.items():
        rep.error(nums[0], 'forbidden leftover "%s" on lines: %s' % (name, fmt_lines(nums)))
    comment_lines = [i + 1 for i, ln in enumerate(lines) if HTML_COMMENT_RE.search(ln)]
    if comment_lines:
        rep.error(comment_lines[0], "HTML comment '<!--' on lines: %s (comments vanish in the Google Doc; "
                  "write a visible '**TODO (human):** ...' line instead)" % fmt_lines(comment_lines))
    angle = {}
    named = {"<topic>", "<client>", "<keyword>"}  # already reported as forbidden leftovers
    for i, ln in enumerate(lines):
        if in_fence[i]:
            continue
        scrub = FILL_TOKEN_RE.sub(" ", CODE_SPAN_RE.sub(" ", ln))
        for m in ANGLE_RE.finditer(scrub):
            tok = m.group(0)
            if AUTOLINK_RE.match(m.group(1)) or tok.lower() in named:
                continue
            angle.setdefault(i + 1, []).append(tok)
    if angle:
        toks = []
        for nums in angle.values():
            for tok in nums:
                if tok not in toks:
                    toks.append(tok)
        rep.error(min(angle), "angle-bracket text %s on lines: %s (the Google Doc conversion drops it: write placeholders "
                  "in [square brackets] and no HTML tags)" % (", ".join(toks[:5]) + (" ..." if len(toks) > 5 else ""),
                                                           fmt_lines(angle.keys())))
    # markers in use (inline code spans, such as the Conventions line, are not counted)
    plain = [CODE_SPAN_RE.sub(" ", ln) for ln in lines]
    markers = {
        "todo_human": sum(len(TODO_RE.findall(ln)) for ln in plain),
        "cite": sum(len(CITE_RE.findall(ln)) for ln in plain),
        "internal_link": sum(len(INTERNAL_LINK_RE.findall(ln)) for ln in plain),
    }
    info["markers"] = markers

    # ---- 3. required sections and order
    for sid, required, en, he in mode_sections:
        if required and sid not in sections:
            rep.error(None, "required section missing: '## %s' (HE: '## %s')" % (en, he))
    max_seen = -1
    max_name = ""
    for sid, idx, htext in order:
        if sections[sid][0] != idx:
            rep.warn(idx + 1, "duplicate section heading '## %s'" % htext)
            continue
        if sid not in section_index:
            rep.warn(idx + 1, "writer brief: '## %s' belongs in the research brief (keep it there, linked, "
                     "not in the writer brief)" % htext)
            continue
        pos = section_index[sid]
        if pos < max_seen:
            rep.warn(idx + 1, "section '## %s' is out of order (it should come before '%s')" % (htext, max_name))
        else:
            max_seen = pos
            max_name = htext

    # ---- 4. on-page table
    onpage = info["onpage"]
    r = sec_range("onpage")
    if r:
        for t in find_tables(lines, r[0], r[1]):
            hdr = [strip_fmt(c).lower() for c in t["header"][1]]
            if writer_mode and any(c in ("reasoning", "נימוק") for c in hdr):
                rep.warn(t["header"][0], "writer brief: the on-page table has a Reasoning column (keep it in the research brief)")
            rec_col = next((k for k, c in enumerate(hdr) if "recommendation" in c or "המלצה" in c), 1)
            chars_col = next((k for k, c in enumerate(hdr) if c in ("chars", "תווים")), None)
            for ln, cells in t["rows"]:
                label = strip_fmt(cells[0]).lower() if cells else ""
                if label in ("meta title", "meta description", "url slug", "h1", "og title", "og description") \
                        and label not in onpage:
                    value = strip_fmt(cells[rec_col]) if len(cells) > rec_col else ""
                    chars = None
                    if chars_col is not None and len(cells) > chars_col:
                        chars = parse_int(strip_fmt(cells[chars_col]))
                    onpage[label] = {"line": ln, "value": value, "chars": chars}
        for label in ("meta title", "meta description", "url slug", "h1"):
            if label not in onpage:
                rep.error(sections["onpage"][0] + 1, "On-page table is missing the '%s' row" % NICE[label])
        limits = {"meta title": 60, "meta description": 155, "og title": 60, "og description": 200}
        for label, limit in limits.items():
            ent = onpage.get(label)
            if not ent:
                continue
            n = len(ent["value"])
            if n > limit:
                rep.error(ent["line"], "%s is %d characters (limit %d)" % (NICE[label], n, limit))
        for label, ent in onpage.items():
            if ent["chars"] is not None and abs(ent["chars"] - len(ent["value"])) > 2:
                rep.warn(ent["line"], "Chars column says %d for %s but the measured length is %d"
                         % (ent["chars"], label, len(ent["value"])))
        slug_ent = onpage.get("url slug")
        if slug_ent:
            slug = slug_ent["value"].strip()
            if "/" in slug:
                parts = [p for p in re.split(r"/+", re.sub(r"^[a-z]+://", "", slug)) if p]
                slug = parts[-1] if parts else ""
            if re.search(r"\s", slug):
                rep.error(slug_ent["line"], "URL slug contains spaces: '%s'" % slug)
            if re.search(r"[A-Z]", slug):
                rep.error(slug_ent["line"], "URL slug contains uppercase letters: '%s'" % slug)
            words = re.split(r"[-\s]+", slug)
            if "" in words:
                rep.error(slug_ent["line"], "URL slug has empty hyphen segments: '%s'" % slug)
            words = [w for w in words if w]
            if not 3 <= len(words) <= 5:
                rep.error(slug_ent["line"], "URL slug must be 3 to 5 hyphen-separated words, found %d: '%s'" % (len(words), slug))
            fillers = [w for w in words if w.lower() in FILLER_WORDS]
            if fillers:
                rep.error(slug_ent["line"], "URL slug contains filler word(s): %s" % ", ".join(sorted(set(fillers))))

    # ---- 5. keyword table
    primary_kw = None
    kw_set = set()  # every keyword string in the keyword table (casefolded, spaces collapsed)
    r = sec_range("keywords")
    if r:
        tables = find_tables(lines, r[0], r[1])
        ktable = next((t for t in tables if strip_fmt(t["header"][1][0]).lower() in ("type", "סוג")), None)
        if ktable is None and tables:
            ktable = tables[0]
        primaries = []
        if ktable:
            for ln, cells in ktable["rows"]:
                typ = strip_fmt(cells[0]).lower() if cells else ""
                if len(cells) > 1 and strip_fmt(cells[1]):
                    kw_set.add(" ".join(strip_fmt(cells[1]).split()).casefold())
                    info["keywords"].append({"line": ln, "keyword": " ".join(strip_fmt(cells[1]).split()),
                                             "volume": strip_fmt(cells[2]) if len(cells) > 2 else "", "type": typ})
                if typ.startswith("primary") or typ.startswith("ראשית"):
                    kw = strip_fmt(cells[1]) if len(cells) > 1 else ""
                    vol = strip_fmt(cells[2]) if len(cells) > 2 else ""
                    primaries.append((ln, kw, vol))
        dnt = [DNT_RE.match(lines[i]).group(1) for i in range(r[0], r[1])
               if not in_fence[i] and DNT_RE.match(lines[i])]
        info["dnt"] = " ".join(" ".join(strip_fmt(t).split()) for t in dnt)
        if not primaries:
            rep.error(sections["keywords"][0] + 1, "Keyword table has no Primary row")
        else:
            primary_kw = primaries[0][1]
            if lang == "he":
                for ln, kw, _vol in primaries:
                    if kw and not HEBREW_RE.search(kw):
                        rep.warn(ln, "Primary keyword '%s' has no Hebrew letter in a Hebrew brief: the primary must be in "
                                 "the market's search language as people there type it (a foreign-language PAA may only "
                                 "be a Question row; SKILL.md step 3)" % kw)
            for ln, kw, vol in primaries:
                digits = vol.replace(",", "").strip()
                if not digits or digits.lower() in ("n/a", "na", "-") or (digits.isdigit() and int(digits) == 0):
                    rep.warn(ln, "Primary keyword '%s' has no monthly search volume (%s)" % (kw, vol or "empty"))
            kl = primary_kw.lower()
            if kl:
                for label, nice in (("meta title", "Meta title"), ("h1", "H1"), ("og title", "OG title")):
                    ent = onpage.get(label)
                    if ent and kl not in ent["value"].lower():
                        rep.warn(ent["line"], "Primary keyword '%s' does not appear in the %s" % (primary_kw, nice))
                slug_ent = onpage.get("url slug")
                if slug_ent and all(ord(c) < 128 for c in primary_kw):
                    sl = slug_ent["value"].lower()
                    missing = [w for w in re.findall(r"[a-z0-9]+", kl) if w not in FILLER_WORDS and w not in sl]
                    if missing:
                        rep.warn(slug_ent["line"], "URL slug does not contain the primary keyword words (missing: %s)" % ", ".join(missing))

    # ---- 6. banned phrases
    for label in ("meta title", "og title"):
        ent = onpage.get(label)
        if ent:
            val = ent["value"].replace(chr(0x2019), "'")
            for name, rx in TITLE_BANNED:
                if rx.search(val):
                    rep.error(ent["line"], "%s uses a banned pattern: %s" % (NICE[label], name))
    ent = onpage.get("meta description")
    if ent:
        val = ent["value"].replace(chr(0x2019), "'")
        for name, rx in DESC_BANNED:
            if rx.search(val):
                rep.error(ent["line"], "Meta description uses a banned pattern: %s" % name)
    writer = sections.get("writer")
    skip_lo, skip_hi = (writer[1], writer[2]) if writer else (-1, -1)
    hits = {}
    for i, ln in enumerate(lines):
        if skip_lo <= i < skip_hi:
            continue
        low = ln.replace(chr(0x2019), "'")
        for phrase, rx in CLICHE_RES:
            if rx.search(low):
                hits.setdefault(phrase, []).append(i + 1)
    for phrase, nums in hits.items():
        rep.warn(nums[0], 'banned phrase "%s" on lines: %s' % (phrase, fmt_lines(nums)))

    # ---- 7. article structure
    items = []
    r = sec_range("structure")
    if r:
        lo, hi = r
        total = faq_allow = None
        for i in range(lo, hi):
            if total is None:
                m = TOTAL_RE.search(lines[i])
                if m:
                    total = int(m.group(1).replace(",", ""))
            if faq_allow is None:
                m = FAQ_ALLOW_RE.search(lines[i])
                if m:
                    faq_allow = int(m.group(1).replace(",", ""))
        info["total"], info["faq_allow"] = total, faq_allow
        hl = sections["structure"][0] + 1
        if total is None:
            rep.error(hl, "Article structure is missing '**Total word count:**' (HE: '**סה\"כ מילים:**')")
        if faq_allow is None:
            rep.error(hl, "Article structure is missing '**FAQ allowance:**' (HE: '**הקצאה לשאלות ותשובות:**')")

        item_idx = [i for i in range(lo, hi) if ITEM_RE.match(lines[i])]
        for n, i in enumerate(item_idx):
            m = ITEM_RE.match(lines[i])
            end = hi
            for j in range(i + 1, hi):
                if HEADING_RE.match(lines[j]) and not in_fence[j]:
                    end = j
                    break
            items.append({"line": i + 1, "kind": m.group(1), "title": m.group(2),
                          "bullets": parse_bullets(lines, i + 1, end)})
        if not items:
            rep.error(hl, "no outline items found (expected headings like '### H2: <heading>')")

        word_sum = 0
        snippets = []
        missing_reasoning = []
        has_reasoning = []
        has_covered = []
        current_h2 = None
        what_is = []
        for it in items:
            label = "%s: %s" % (it["kind"], it["title"])
            b = it["bullets"]
            wb = first_bullet(b, "words")
            wc = parse_int(wb["text"]) if wb else None
            it["wc"] = wc
            if wb is None:
                rep.error(it["line"], "%s has no Word count bullet" % label)
            elif not wc:
                rep.error(it["line"], "%s has a Word count of 0 or no number" % label)
            else:
                word_sum += wc
            ab = first_bullet(b, "angle")
            if ab is None or not ab["text"].strip():
                rep.error(it["line"], "%s has no Angle bullet or it is empty" % label)
            elif writer_mode and len(ab["text"].split()) > ANGLE_MAX_WORDS:
                rep.warn(ab["line"], "writer brief: %s has a %d-word Angle (one line, at most about %d words)"
                         % (label, len(ab["text"].split()), ANGLE_MAX_WORDS))
            gb = first_bullet(b, "guidelines")
            if gb is None or not gb["nested"]:
                rep.error(it["line"], "%s has no Guidelines bullet with nested bullets" % label)
            elif writer_mode and len(gb["nested"]) > 4:
                rep.warn(gb["line"], "writer brief: %s has %d guideline bullets (2 to 4: merge or compress)" % (label, len(gb["nested"])))
            if not writer_mode and first_bullet(b, "keywords") is None:
                rep.warn(it["line"], "%s has no Keywords bullet" % label)
            rb = first_bullet(b, "reasoning")
            if rb is None:
                missing_reasoning.append(it["line"])
            else:
                has_reasoning.append(it["line"])
            if first_bullet(b, "covered") is not None:
                has_covered.append(it["line"])
            it["snippet"] = None
            it["text"] = " ".join([it["title"]] + [x["text"] for x in b] + [g for x in b for g in x["nested"]])
            for sb in b:
                if sb["label"] == "snippet":
                    snippets.append((sb["line"], sb["text"]))
                    if it["snippet"] is None:
                        it["snippet"] = " ".join(sb["text"].split())
            if it["kind"] == "H2":
                current_h2 = it
                if WHAT_IS_RE.match(it["title"].strip()):
                    what_is.append(it["line"])
            elif it["kind"] in ("Hero", "Conclusion"):
                current_h2 = None
            elif it["kind"] == "H3" and current_h2 is not None and wc and current_h2.get("wc"):
                if wc > current_h2["wc"]:
                    rep.warn(it["line"], "H3 '%s' (%d words) is longer than its parent H2 '%s' (%d words)"
                             % (it["title"], wc, current_h2["title"], current_h2["wc"]))

        if total is not None and faq_allow is not None and items:
            grand = word_sum + faq_allow
            if total <= 0 or abs(grand - total) / float(total) > 0.01:
                pct = (abs(grand - total) / float(total) * 100.0) if total else 100.0
                rep.error(hl, "Word counts (%d) + FAQ allowance (%d) = %d, but Total word count is %d (off by %.1f%%, tolerance 1%%)"
                          % (word_sum, faq_allow, grand, total, pct))

        if len(what_is) > 1:
            rep.warn(what_is[1], "more than one H2 starts with 'What is' (lines: %s)" % fmt_lines(what_is))

        # snippet targets
        if len(snippets) > 3:
            rep.error(snippets[3][0], "%d snippet targets found (maximum 3)" % len(snippets))
        seen_q = {}
        for ln, txt in snippets:
            fmt, _sep, query = txt.partition("|")
            fmt = strip_fmt(fmt).lower()
            query = TRAILING_PAREN_RE.sub("", strip_fmt(query)).strip()
            if fmt not in ("paragraph", "list", "table"):
                rep.error(ln, "snippet target format '%s' must be paragraph, list or table" % fmt)
            if not query:
                rep.error(ln, "snippet target has no query (expected '<format> | <query>')")
            else:
                qk = query.casefold()
                if qk in seen_q:
                    rep.error(ln, "snippet target query '%s' is duplicated (also line %d)" % (query, seen_q[qk]))
                else:
                    seen_q[qk] = ln
                if kw_set and not FILL_TOKEN_RE.search(query) and " ".join(query.split()).casefold() not in kw_set:
                    rep.warn(ln, "snippet target query '%s' is not in the keyword table: target only queries pulled in "
                             "this run (add it as a pulled keyword or pick a pulled query)" % query)
        if not snippets:
            rep.warn(hl, "no snippet target in the outline (informational briefs usually warrant one)")
        ir = sec_range("intent") or (sec_range("summary") if writer_mode else None)
        if ir and snippets:
            intent_text = "\n".join(FILL_TOKEN_RE.sub(" ", lines[i]) for i in range(ir[0], ir[1]))
            if NOT_OBSERVED_RE.search(intent_text):
                unlabelled = [ln for ln, txt in snippets if not BET_RE.search(txt)]
                if unlabelled:
                    rep.warn(unlabelled[0], "SERP features were not observed, but snippet target(s) are not labelled a bet "
                             "(add '(answer-first bet; SERP features not observed)') at lines: %s" % fmt_lines(unlabelled))
                if len(snippets) > 2:
                    rep.warn(snippets[2][0], "SERP features were not observed: at most 2 snippet bets (found %d)" % len(snippets))
            elif NO_FS_RE.search(intent_text):
                unlabelled = [ln for ln, txt in snippets if not AIO_BLOCK_RE.search(txt)]
                if unlabelled:
                    rep.warn(unlabelled[0], "no featured snippet was observed, but snippet target(s) are not labelled "
                             "'(AI Overview answer block; no featured snippet observed)' at lines: %s" % fmt_lines(unlabelled))
                if len(snippets) > 2:
                    rep.warn(snippets[2][0], "no featured snippet observed: at most 2 AI Overview answer-block targets (found %d)" % len(snippets))

        if not writer_mode and items and missing_reasoning:
            rep.warn(missing_reasoning[0], "research brief: outline item(s) without a Reasoning bullet at lines: %s" % fmt_lines(missing_reasoning))
        if writer_mode and has_reasoning:
            rep.warn(has_reasoning[0], "writer brief: Reasoning bullets present at lines: %s (keep them in the research brief)" % fmt_lines(has_reasoning))
        if writer_mode and has_covered:
            rep.warn(has_covered[0], "writer brief: Covered by bullets present at lines: %s (keep them in the research brief)" % fmt_lines(has_covered))
    info["items"] = items

    # ---- 8. FAQs
    r = sec_range("faq")
    if r:
        lo, hi = r
        qs = [i for i in range(lo, hi) if re.match(r"^###\s+\S", lines[i]) and not in_fence[i]]
        info["faq_qs"] = [HEADING_RE.match(lines[i]).group(2) for i in qs]
        if len(qs) < 3:
            rep.warn(sections["faq"][0] + 1, "only %d FAQ question(s) found (expected at least 3)" % len(qs))
        for i in qs:
            end = hi
            for j in range(i + 1, hi):
                if HEADING_RE.match(lines[j]) and not in_fence[j]:
                    end = j
                    break
            q = HEADING_RE.match(lines[i]).group(2)
            gb = first_bullet(parse_bullets(lines, i + 1, end), "guidelines")
            if gb is None or not gb["nested"]:
                rep.error(i + 1, "FAQ '%s' has no Guidelines bullet with nested bullets" % q)
                continue
            first = gb["nested"][0]
            if "40" not in first or "50" not in first:
                rep.warn(gb["line"], "FAQ '%s': first guideline should state the 40 to 50 word answer rule" % q)
            for g in gb["nested"]:
                if len(g.split()) > 60:
                    rep.warn(gb["line"], "FAQ '%s': a guideline bullet has %d words and looks like a drafted answer" % (q, len(g.split())))

    # ---- 9. competitor table (research brief; flagged above if it appears in a writer brief)
    r = sec_range("competitive")
    if r and not writer_mode:
        tables = find_tables(lines, r[0], r[1])
        ctable = None
        for t in tables:
            if any(strip_fmt(c).lower() == "url" for c in t["header"][1]):
                ctable = t
                break
        if ctable is None:
            rep.warn(sections["competitive"][0] + 1, "no competitor table found (header with a URL column)")
        else:
            hdr = [strip_fmt(c).lower() for c in ctable["header"][1]]
            ucol = hdr.index("url")
            rows = [(ln, c) for ln, c in ctable["rows"] if any(x.strip() for x in c)]
            if len(rows) < 3:
                rep.warn(ctable["header"][0], "competitor table has %d data row(s) (expected at least 3)" % len(rows))
            for ln, cells in rows:
                raw = cells[ucol] if len(cells) > ucol else ""
                lm = re.search(r"\]\(\s*<?([^)\s>]+)", raw)
                cand = lm.group(1) if lm else strip_fmt(raw).strip("<>")
                token = cand.split()[0] if cand.split() else ""
                if not re.match(r"^https?://\S+", token, re.I):
                    rep.error(ln, "competitor URL is not an absolute http(s) URL: '%s'" % (strip_fmt(raw) or "(empty)"))

    # table stakes and opportunities (research brief), for --pair
    r = sec_range("gap")
    if r:
        bucket = None
        for i in range(r[0], r[1]):
            hm = HEADING_RE.match(lines[i])
            if hm and not in_fence[i]:
                bucket = "stakes" if STAKES_HEAD_RE.search(hm.group(2)) else (
                    "opps" if OPPS_HEAD_RE.search(hm.group(2)) else None)
                continue
            sm = STAKE_ITEM_RE.match(lines[i])
            if bucket and sm:
                topic = sm.group(1).strip().rstrip(":").strip()
                if norm_key(topic) not in ("reasoning", "נימוק"):
                    info[bucket].append((i + 1, topic))

    # ---- 10. language consistency
    if lang == "he":
        for sid, idx, htext in order:
            if sid not in section_en:
                continue
            k = norm_key(htext)
            if k == norm_key(section_en[sid]) and k != norm_key(section_he[sid]):
                rep.warn(idx + 1, "English section heading '## %s' in a Hebrew brief (use '## %s')" % (htext, section_he[sid]))
    else:
        for idx, level, htext in headings:
            if level >= 2 and HEBREW_RE.search(htext):
                rep.warn(idx + 1, "Hebrew heading '%s' in an English brief" % htext)

    # ---- 11. absolute URLs
    rel = []
    for i, ln in enumerate(lines):
        if re.search(r"\[[^\]\n]*\]\(\s*<?/[^)\s>]*", ln):
            rel.append(i + 1)
    if rel:
        rep.warn(rel[0], "markdown link(s) with a relative target (starts with '/'); use full absolute URLs. Lines: %s" % fmt_lines(rel))
    r = sec_range("ilinks")
    if writer_mode and r:
        for t in find_tables(lines, r[0], r[1]):
            hdr = [strip_fmt(c).lower() for c in t["header"][1]]
            ucol = next((k for k, c in enumerate(hdr) if c in ("url", "כתובת")), 1)
            for ln, cells in t["rows"]:
                raw = strip_fmt(cells[ucol]) if len(cells) > ucol else ""
                lm = re.search(r"\]\(\s*<?([^)\s>]+)", raw)
                cand = lm.group(1) if lm else raw.strip("<>")
                if not (re.match(r"^https?://\S+", cand, re.I) or INTERNAL_LINK_RE.search(cand)):
                    rep.error(ln, "internal link URL is not an absolute http(s) URL or an [INTERNAL LINK: ...] placeholder: '%s'"
                              % (raw or "(empty)"))

    # ---- 12. writer brief: length budget and compression
    if writer_mode:
        n_items = len(items) + len(info["faq_qs"])
        soft = max(WRITER_SOFT_MIN, WRITER_WORDS_PER_ITEM * n_items)
        hard = int(round(soft * WRITER_HARD_FACTOR))
        info["budget"] = {"items": n_items, "soft": soft, "hard": hard}
        if info["words"] > hard:
            rep.error(None, "writer brief is %d words, above the hard ceiling of %d (soft target %d for %d outline items "
                      "and FAQ questions): compress guidelines and notes, never drop an item"
                      % (info["words"], hard, soft, n_items))
        elif info["words"] > soft:
            rep.warn(None, "writer brief is %d words, above the soft target of %d (%d outline items and FAQ questions; "
                     "hard ceiling %d)" % (info["words"], soft, n_items, hard))
        r = sec_range("summary")
        if r:
            sw = count_words("\n".join(FILL_TOKEN_RE.sub(" ", lines[i]) for i in range(r[0], r[1])))
            if sw > SUMMARY_MAX_WORDS:
                rep.warn(sections["summary"][0] + 1, "Strategy summary is %d words (at most about 150)" % sw)
        stray = [b["line"] for b in parse_bullets(lines, 0, len(lines)) if b["label"] == "reasoning"]
        stray = [ln for ln in stray if ln not in has_reasoning_lines(items)]
        if stray:
            rep.warn(stray[0], "writer brief: Reasoning lines outside the outline at lines: %s" % fmt_lines(stray))
        r = sec_range("writer")
        if r:
            for b in parse_bullets(lines, r[0], r[1]):
                lab = b["raw_label"]
                if (lab in DO_LABELS or lab in DONT_LABELS) and len(b["nested"]) > DO_DONT_MAX:
                    rep.warn(b["line"], "writer brief: %d '%s' bullets (at most %d)" % (len(b["nested"]), lab, DO_DONT_MAX))
        if not any(RESEARCH_LINK_RE.match(ln) for ln in lines[:40]):
            rep.warn(1, "writer brief: no '**Research brief:**' link line in the header (HE: '**בריף מחקר:**')")

    return rep, info


def has_reasoning_lines(items):
    return {b["line"] for it in items for b in it["bullets"] if b["label"] == "reasoning"}


def norm_text(text):
    return " ".join((text or "").split())


def dnt_has(dnt, kw):
    """Is keyword kw listed, exactly, in the writer brief's 'Do not target' line?"""
    if not dnt:
        return False
    if any(q[0] + kw + q[1] in dnt for q in ('""', "\u201c\u201d", "''", "\u201d\u201d")):
        return True
    if '"' in dnt or "\u201c" in dnt:  # a quoted list: only a quoted string counts
        return False
    return re.search(r"(?<!\w)%s(?!\w)" % re.escape(kw), dnt) is not None


def pair_checks(writer, research, rep):
    """Compare the writer brief with the research brief it was distilled from."""
    wt, rt = norm_text(writer["title"]), norm_text(research["title"])
    if wt and rt and rt != wt + " | research":
        rep.warn(None, "pair: research title '%s' is not the writer title plus ' | research' ('%s | research')" % (rt, wt))
    # keywords and volumes
    wk = {k["keyword"]: k for k in writer["keywords"]}
    rk = {k["keyword"]: k for k in research["keywords"]}
    dnt = writer.get("dnt", "")
    for kw in rk:
        if kw not in wk:
            collapsible = rk[kw].get("type", "").startswith(COLLAPSIBLE_TYPES)
            if collapsible and dnt_has(dnt, kw):
                continue
            rep.error(None, "pair: keyword '%s' is in the research brief but not in the writer brief%s (strings must match exactly)"
                      % (kw, " (neither in the keyword table nor in its '**Do not target:**' line)" if collapsible else ""))
        elif norm_text(wk[kw]["volume"]) != norm_text(rk[kw]["volume"]):
            rep.error(wk[kw]["line"], "pair: volume for '%s' differs (writer %s, research %s)"
                      % (kw, wk[kw]["volume"], rk[kw]["volume"]))
    for kw in wk:
        if kw not in rk:
            rep.error(wk[kw]["line"], "pair: keyword '%s' is in the writer brief but not in the research brief" % kw)
    # totals
    for key, nice in (("total", "Total word count"), ("faq_allow", "FAQ allowance")):
        if writer[key] != research[key]:
            rep.error(None, "pair: %s differs (writer %s, research %s)" % (nice, writer[key], research[key]))
    # on-page values
    for label in ("meta title", "meta description", "url slug", "h1", "og title", "og description"):
        r_ent, w_ent = research["onpage"].get(label), writer["onpage"].get(label)
        if r_ent is None:
            continue
        if w_ent is None:
            rep.error(None, "pair: %s is in the research brief but missing from the writer brief" % NICE[label])
        elif norm_text(w_ent["value"]) != norm_text(r_ent["value"]):
            rep.error(w_ent["line"], "pair: %s differs (writer '%s', research '%s')" % (NICE[label], w_ent["value"], r_ent["value"]))
    # outline headings, word counts, snippet lines
    def key(it):
        return (it["kind"], norm_text(it["title"]))
    w_items = {key(it): it for it in writer["items"]}
    r_items = {key(it): it for it in research["items"]}
    for k, it in r_items.items():
        w = w_items.get(k)
        if w is None:
            rep.error(None, "pair: outline item '%s: %s' is in the research brief but not in the writer brief" % k)
            continue
        if w.get("wc") != it.get("wc"):
            rep.error(w["line"], "pair: Word count of '%s: %s' differs (writer %s, research %s)" % (k + (w.get("wc"), it.get("wc"))))
        if (w.get("snippet") or "") != (it.get("snippet") or ""):
            rep.warn(w["line"], "pair: snippet target of '%s: %s' differs from the research brief (copy it verbatim)" % k)
    for k, w in w_items.items():
        if k not in r_items:
            rep.error(w["line"], "pair: outline item '%s: %s' is in the writer brief but not in the research brief" % k)
    if [key(i) for i in writer["items"] if key(i) in r_items] != [key(i) for i in research["items"] if key(i) in w_items]:
        rep.warn(None, "pair: outline items are in a different order than in the research brief")
    # FAQ questions
    wq = [norm_text(q) for q in writer["faq_qs"]]
    rq = [norm_text(q) for q in research["faq_qs"]]
    for q in rq:
        if q not in wq:
            rep.error(None, "pair: FAQ question '%s' is in the research brief but not in the writer brief" % q)
    for q in wq:
        if q not in rq:
            rep.error(None, "pair: FAQ question '%s' is in the writer brief but not in the research brief" % q)
    # human markers: a TODO is moved, never dropped
    if writer["markers"]["todo_human"] < research["markers"]["todo_human"]:
        rep.warn(None, "pair: the writer brief has %d TODO (human) line(s), the research brief %d: keep every TODO "
                 "(those from dropped sections go to Writer notes)" % (writer["markers"]["todo_human"],
                                                                       research["markers"]["todo_human"]))
    # every table stake and opportunity still visible in the writer outline
    def pool_of(brief):
        pool = set()
        for it in brief["items"]:
            for tok in topic_tokens(it.get("text", "")):
                pool |= stem_forms(tok)
        return pool
    w_pool, r_pool = pool_of(writer), pool_of(research)
    for bucket, nice in (("stakes", "table stake"), ("opps", "strategic opportunity")):
        for ln, topic in research[bucket]:
            w_ratio = overlap_ratio(topic, w_pool)
            if w_ratio is None or w_ratio >= STAKE_MATCH_MIN:
                continue
            r_ratio = overlap_ratio(topic, r_pool)
            if r_ratio > w_ratio:
                rep.warn(None, "pair: research %s '%s' (research line %d) lost its match in distillation (%d%% token "
                         "overlap in the writer outline, %d%% in the research outline): keep it visible as an item or a "
                         "guideline" % (nice, topic, ln, w_ratio * 100, r_ratio * 100))
            else:
                rep.warn(None, "pair: research %s '%s' (research line %d) has under %d%% token overlap in both outlines "
                         "(%d%%): confirm by reading that an item or guideline carries it"
                         % (nice, topic, ln, STAKE_MATCH_MIN * 100, w_ratio * 100))


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Mechanical checks on a content brief in Markdown.")
    ap.add_argument("brief", help="path to the brief (.md)")
    ap.add_argument("--type", dest="kind", choices=["research", "writer"],
                    help="research (default): the full internal brief; writer: the distilled human-facing brief")
    ap.add_argument("--variant", choices=["full", "concise"],
                    help="DEPRECATED: full = --type research, concise = --type writer")
    ap.add_argument("--pair", help="the counterpart brief of the same run, for the pair checks")
    ap.add_argument("--lang", choices=["en", "he"], help="brief language (auto-detected when omitted)")
    ap.add_argument("--json", action="store_true", help="print the result as JSON")
    args = ap.parse_args(argv)

    kind = args.kind
    if args.variant:
        mapped = "writer" if args.variant == "concise" else "research"
        print("notice: --variant is deprecated (the concise variant was replaced by the writer brief); "
              "--variant %s is read as --type %s%s" % (args.variant, mapped,
                                                       "" if kind is None else ", but --type %s wins" % kind),
              file=sys.stderr)
        if kind is None:
            kind = mapped
    kind = kind or "research"

    rep, info = analyse(args.brief, kind, args.lang)
    if rep is None:
        print("error: %s" % info, file=sys.stderr)
        return 2
    other = None
    if args.pair:
        other_kind = "research" if kind == "writer" else "writer"
        _orep, other = analyse(args.pair, other_kind, args.lang)
        if _orep is None:
            print("error: %s" % other, file=sys.stderr)
            return 2
        if kind == "writer":
            pair_checks(info, other, rep)
        else:
            pair_checks(other, info, rep)

    errors = rep.of("ERROR")
    warnings = rep.of("WARNING")
    ok = not errors
    markers = info["markers"]
    if args.json:
        payload = {
            "file": args.brief, "language": info["lang"], "type": kind, "ok": ok, "markers": markers,
            "words": info["words"], "budget": info.get("budget"),
            "pair": args.pair, "pair_words": other["words"] if other else None,
            "errors": [{"line": ln, "message": m} for ln, m in errors],
            "warnings": [{"line": ln, "message": m} for ln, m in warnings],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        def show(title, entries):
            print("%s (%d)" % (title, len(entries)))
            if not entries:
                print("  none")
            for ln, m in entries:
                print("  - %s%s" % ("[line %d] " % ln if ln else "", m))
            print("")
        show("ERRORS", errors)
        show("WARNINGS", warnings)
        print("Markers: %d TODO (human), %d [CITE], %d [INTERNAL LINK]"
              % (markers["todo_human"], markers["cite"], markers["internal_link"]))
        words_line = "Words: %d" % info["words"]
        if info.get("budget"):
            b = info["budget"]
            words_line += " (writer budget: soft target %d, hard ceiling %d, for %d outline items and FAQ questions)" \
                          % (b["soft"], b["hard"], b["items"])
        if other:
            words_line += "; paired %s brief: %d words" % ("research" if kind == "writer" else "writer", other["words"])
        print(words_line)
        print("%s: %d error(s), %d warning(s) [lang=%s, type=%s%s]"
              % ("FAIL" if errors else "PASS", len(errors), len(warnings), info["lang"], kind,
                 ", paired" if other else ""))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
