#!/usr/bin/env python3
"""Convert a finished brief (Markdown) to HTML for the Google Doc upload, and verify the Doc.

Standard library only, Python 3.9+, works on Windows and Linux.

Why: Drive's Markdown import drops right-to-left direction (a Hebrew Doc comes out
left-aligned, and mixed Hebrew and Latin lines reorder) and silently swallows
angle-bracket text. A Hebrew (or Arabic) brief is therefore ALWAYS uploaded as
text/html made by this script; an English brief may use Markdown or this script.

Output form (tested on a real Doc import, 2026-10-28): ONE <style> block of
element selectors (body, h1 to h6, p, li, td, th, blockquote: font-family,
direction, text-align; table borders) plus dir and lang on <html> and <body>.
Blocks carry no attributes. Docs applies the style block to every paragraph,
list item, heading and cell (the export shows dir="rtl" and the font on each),
so repeating inline styles only made the payload larger (R2-3 research brief:
138,936 bytes inline, 88,664 compact, about 1.23 x the Markdown). Each $ amount
is wrapped in <span dir="ltr">: Docs import deletes the text between two $ signs
when the second follows a non-space character ("$0.0050 (x) and-$0").
Upload the output EXACTLY as written: never shorten styles or retype text.

Usage
    python md_to_html.py brief.md brief.html --lang he
    python md_to_html.py brief.md brief.html --lang he --font "Heebo"
    python md_to_html.py brief.md brief.html --lang he --logo https://www.example.com/logo.png
    python md_to_html.py brief.md brief.html                 # English, left to right
    python md_to_html.py brief.md --verify doc-export.html --lang he --font "Heebo"

Options
    OUT                   Output path (default: the input path with .html).
    --lang en|he|ar|fa    Brief language. he, ar and fa set dir="rtl" and lang on
                          <html> and <body>, and right to left with right
                          alignment in the style block.
    --rtl                 Force right to left for any language.
    --font NAME           Font family from a client brand rule (for example
                          "Heebo"), quoted in the style block with Arial as the
                          fallback. Default: Arial.
    --title TEXT          <title> of the HTML (default: the first # heading).
    --logo URL            A logo from a client brand rule, placed above the
                          title (repeat for two logos). Use a PNG or JPG at a
                          public https URL: Drive does not import SVG. Check the
                          logo on read-back; if it is missing, add a visible
                          **TODO (human):** line instead.
    --inline-styles       Also repeat dir and style on every block (the old,
                          about 1.6 x larger form). Only if a future Docs import
                          stops honouring the style block (--verify shows the
                          font or RTL missing although the upload was exact).
    --verify EXPORT       Do not convert. Check a Doc export against the
                          Markdown. EXPORT is the Doc exported with Drive
                          download_file_content, exportMimeType text/html
                          (preferred), or text/plain (no direction or font
                          check, so it fails for RTL or --font). Checks:
                          1. Words: visible word counts within --tolerance.
                          2. RTL (he, ar, fa, --rtl): dir="rtl",
                             direction:rtl or text-align:right present.
                          3. Font (with --font): the font named on the Doc's
                             text blocks; 0 blocks fails, under 90% warns.
                          4. Text: a word-sequence diff of the Markdown's
                             visible text (rendered by this converter) against
                             the Doc's text. Prints the first 20 differing
                             segments with 6 words of context, each labelled
                             heading, cell, keyword (a string from a table
                             column headed keyword, query, "מילת מפתח" or
                             similar), number, url, or prose. ANY difference
                             fails: a changed letter, digit or URL means the
                             Doc is not the converter output.
                          Tolerated, never reported: whitespace of any kind
                          (spaces, no-break spaces, line and paragraph breaks,
                          empty paragraphs), Unicode normal form (NFKC),
                          invisible format characters (bidi marks, zero-width
                          joiners, soft hyphen), curly vs straight quotes,
                          Hebrew geresh and gershayim vs ' and ", dash
                          variants, . , ; : ! ? quotes brackets * _ at the
                          start or end of a word, tokens with no letter or
                          digit (bullets, |), markup, link targets (Docs
                          rewrites hrefs), and in a text/plain export the
                          list numbers and bullets at the start of a line.
                          Exit 1 on any failure.
    --tolerance PCT       Word-count tolerance for --verify (default 3).

Supported Markdown (what the brief templates use): ATX headings, paragraphs,
bold, italic, inline code, links [text](url), autolinks <https://...>, bare
URLs, unordered and ordered lists with nesting, tables (with escaped \\| in
cells), block quotes, horizontal rules, fenced code. Markers such as
[CITE: ...], [INTERNAL LINK: anchor -> topic] and **TODO (human):** pass
through as visible text. Every < > & in the text is escaped, so nothing is
swallowed.

Word counts: whitespace tokens that contain a letter or digit (the
check_brief.py rule), counted on the Markdown with its syntax removed (list
markers, heading hashes, table rules, link targets) and on the visible HTML
text, so the two are comparable.
Exit code: 0 ok, 1 verify failed, 2 cannot read or write a file.
"""

import argparse
import difflib
import html
import os
import re
import sys
import unicodedata
from html.parser import HTMLParser

RTL_LANGS = {"he", "ar", "fa", "ur", "yi"}

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
HR_RE = re.compile(r"^\s{0,3}([-*_])(?:\s*\1){2,}\s*$")
LIST_RE = re.compile(r"^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$")
QUOTE_RE = re.compile(r"^\s{0,3}>\s?(.*)$")
SEP_CELL_RE = re.compile(r"^:?-{1,}:?$")
WORD_TOKEN_RE = re.compile(r"\S+")
PH = "\x00"  # placeholder delimiter, never in real text


# ---------------------------------------------------------------- inline

def _ph(store, value):
    store.append(value)
    return "%s%d%s" % (PH, len(store) - 1, PH)


def _restore(text, store):
    # placeholders may nest (link text holding a code span), so restore until stable
    prev = None
    while prev != text:
        prev = text
        text = re.sub(PH + r"(\d+)" + PH, lambda m: store[int(m.group(1))], text)
    return text


def _attr(value):
    """Escape a double-quoted attribute value; single quotes (font names) stay readable."""
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _url_attr(url):
    return _attr(url.strip())


def _trim_url(url):
    """Split trailing punctuation off a bare URL."""
    tail = ""
    while url and url[-1] in ".,;:!?'\"":
        tail = url[-1] + tail
        url = url[:-1]
    # a closing parenthesis belongs to the URL only when it opens one too
    while url.endswith(")") and url.count("(") < url.count(")"):
        tail = ")" + tail
        url = url[:-1]
    return url, tail


DOLLAR_RE = re.compile(r"\$[^\s<>&*_" + PH + r"]*")


def _guard_dollars(escaped):
    """Wrap each $ amount in <span dir="ltr">.

    Google Docs import drops everything from one $ to the next when the second
    $ follows a non-space character ("$0.0050 (x) and-$0", "$5 \u05d5-$7"), in
    any language: it reads the pair as an equation. Entities (&#36;),
    zero-width characters and plain <span> do not stop it; a span with dir does
    (tested 2026-10-28), and the visible text is unchanged.
    """
    return DOLLAR_RE.sub(lambda m: '<span dir="ltr">%s</span>' % m.group(0), escaped)


def inline(text, store=None):
    """Markdown inline syntax to HTML. Text is escaped; markup is added after."""
    own = store is None
    if own:
        store = []
    # 1. code spans
    text = re.sub(r"`([^`]+)`", lambda m: _ph(store, "<code>%s</code>" % _guard_dollars(html.escape(m.group(1), quote=False))), text)
    # 2. links [text](url) and [text](<url>), not the [CITE: ...] / [INTERNAL LINK: ...] markers
    def link(m):
        label, url = m.group(1), m.group(2).strip().strip("<>")
        return _ph(store, '<a href="%s">%s</a>' % (_url_attr(url), inline(label, store)))
    text = re.sub(r"\[([^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*)\]\(\s*(<[^>]+>|[^()\s]+(?:\([^()\s]*\))?[^()\s]*)\s*\)", link, text)
    # 3. autolinks <https://...>
    text = re.sub(r"<((?:https?|mailto):[^<>\s]+)>",
                  lambda m: _ph(store, '<a href="%s">%s</a>' % (_url_attr(m.group(1)), html.escape(m.group(1), quote=False))),
                  text)
    # 4. bare URLs
    def bare(m):
        url, tail = _trim_url(m.group(0))
        return _ph(store, '<a href="%s">%s</a>' % (_url_attr(url), html.escape(url, quote=False))) + tail
    text = re.sub(r"https?://[^\s<>\]|" + PH + r"]+", bare, text)
    # 5. escape what is left (every < > & of the text survives as text)
    text = _guard_dollars(html.escape(text, quote=False))
    # 6. emphasis
    text = re.sub(r"\*\*(?=\S)(.+?)(?<=\S)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w_])__(?=\S)(.+?)(?<=\S)__(?![\w_])", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![\w*])", r"<em>\1</em>", text)
    # 7. backslash escapes of Markdown punctuation
    text = re.sub(r"\\([\\`*_{}\[\]()#+\-.!|>])", r"\1", text)
    return _restore(text, store) if own else text


# ---------------------------------------------------------------- blocks

def split_row(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [c.replace("\\|", "|").strip() for c in re.split(r"(?<!\\)\|", s)]


def is_separator(line):
    if "-" not in line:
        return False
    cells = split_row(line)
    return bool(cells) and all(SEP_CELL_RE.match(c.replace(" ", "")) for c in cells)


def is_table_start(lines, i):
    return "|" in lines[i] and i + 1 < len(lines) and is_separator(lines[i + 1])


def block_start(lines, i):
    ln = lines[i]
    return bool(HEADING_RE.match(ln) or FENCE_RE.match(ln) or HR_RE.match(ln) or LIST_RE.match(ln)
                or QUOTE_RE.match(ln) or is_table_start(lines, i))


class Converter:
    """Markdown blocks to HTML.

    Compact mode (default): blocks carry no attributes; one <style> block in <head>
    (element selectors) sets font, direction and alignment for the whole Doc.
    Tested 2026-10-28: Google Docs import applies it to every h1 to h4, p, li,
    td and th (the export shows dir="rtl" and the font on every block).
    inline_styles=True repeats dir and style on every block (the old, larger
    form), for the case a future import stops honouring the style block.
    """

    def __init__(self, rtl=False, font=None, inline_styles=False):
        self.rtl = rtl
        self.font = font
        self.inline_styles = inline_styles
        self.rtl_blocks = 0

    def attrs(self, tag, extra_style=""):
        """dir and inline style for a block element (compact mode: only what the style block cannot say)."""
        style = []
        dir_attr = ""
        if self.inline_styles:
            if self.rtl:
                dir_attr = ' dir="rtl"'
                self.rtl_blocks += 1
                if tag not in ("ul", "ol", "table"):
                    style.append("text-align:right")
                style.append("direction:rtl")
            if self.font and tag not in ("ul", "ol", "table"):
                style.append("font-family:%s" % self.font_stack())
        elif self.rtl:
            self.rtl_blocks += 1
        if extra_style:
            style.append(extra_style)
        style_attr = ' style="%s"' % _attr(";".join(style)) if style else ""
        return dir_attr + style_attr

    def font_stack(self):
        if not self.font:
            return "Arial,sans-serif"
        name = self.font.replace('"', "").replace("'", "").strip()
        return "'%s',Arial,sans-serif" % name

    # -- lists
    def list_block(self, lines, i):
        """Consume a (possibly nested) list starting at line i. Returns (html, next index)."""
        entries = []  # [indent, ordered, text]
        indents = []
        n = len(lines)
        while i < n:
            ln = lines[i]
            m = LIST_RE.match(ln)
            if m and not HR_RE.match(ln):
                indent = len(m.group(1).expandtabs(4))
                entries.append([indent, m.group(2)[0].isdigit(), [m.group(3)]])
                i += 1
                continue
            if not ln.strip():
                j = i + 1
                while j < n and not lines[j].strip():
                    j += 1
                if j < n and (LIST_RE.match(lines[j]) and not HR_RE.match(lines[j])
                              or (lines[j].startswith((" ", "\t")) and entries)):
                    i = j
                    continue
                break
            if entries and (ln.startswith((" ", "\t")) or not block_start(lines, i)):
                entries[-1][2].append(ln.strip())
                i += 1
                continue
            break
        out = []
        open_lists = []
        for indent, ordered, text in entries:
            while indents and indent < indents[-1]:
                indents.pop()
            if not indents or indent > indents[-1]:
                indents.append(indent)
            level = len(indents) - 1
            tag = "ol" if ordered else "ul"
            while len(open_lists) > level + 1:
                out.append("</li></%s>" % open_lists.pop())
            if len(open_lists) == level + 1:
                if open_lists[-1] != tag:
                    out.append("</li></%s>" % open_lists.pop())
                else:
                    out.append("</li>")
            while len(open_lists) < level + 1:
                out.append("<%s%s>" % (tag, self.attrs(tag)))
                open_lists.append(tag)
            out.append("<li%s>%s" % (self.attrs("li"), self.para_text(text)))
        while open_lists:
            out.append("</li></%s>" % open_lists.pop())
        return "".join(out), i

    def para_text(self, raw_lines):
        parts = []
        for k, ln in enumerate(raw_lines):
            hard = ln.endswith("  ") or ln.endswith("\\")
            s = ln.strip()
            if s.endswith("\\"):
                s = s[:-1].rstrip()
            parts.append(inline(s))
            if k < len(raw_lines) - 1:
                nxt = raw_lines[k + 1].strip()
                parts.append("<br>" if (hard or nxt.startswith("**")) else " ")
        return "".join(parts)

    def table(self, lines, i):
        header = split_row(lines[i])
        aligns = []
        for c in split_row(lines[i + 1]):
            c = c.replace(" ", "")
            aligns.append("center" if c.startswith(":") and c.endswith(":") else
                          "right" if c.endswith(":") else "left" if c.startswith(":") else "")
        i += 2
        rows = []
        while i < len(lines) and "|" in lines[i] and lines[i].strip():
            rows.append(split_row(lines[i]))
            i += 1
        width = max([len(header)] + [len(r) for r in rows])

        def cell(tag, text, k):
            al = aligns[k] if k < len(aligns) else ""
            extra = "text-align:%s" % al if (al and not self.rtl) else ""
            return "<%s%s>%s</%s>" % (tag, self.attrs(tag, extra), inline(text), tag)

        out = ["<table%s>" % self.attrs("table"), "<thead><tr>"]
        out += [cell("th", header[k] if k < len(header) else "", k) for k in range(width)]
        out.append("</tr></thead><tbody>")
        for r in rows:
            out.append("<tr>")
            out += [cell("td", r[k] if k < len(r) else "", k) for k in range(width)]
            out.append("</tr>")
        out.append("</tbody></table>")
        return "".join(out), i

    def convert(self, md):
        lines = md.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        out = []
        i, n = 0, len(lines)
        while i < n:
            ln = lines[i]
            if not ln.strip():
                i += 1
                continue
            if FENCE_RE.match(ln):
                fence = FENCE_RE.match(ln).group(1)
                body = []
                i += 1
                while i < n and not lines[i].strip().startswith(fence):
                    body.append(lines[i])
                    i += 1
                i += 1
                out.append('<pre dir="ltr"><code>%s</code></pre>' % _guard_dollars(html.escape("\n".join(body), quote=False)))
                continue
            m = HEADING_RE.match(ln)
            if m:
                level = len(m.group(1))
                tag = "h%d" % level
                out.append("<%s%s>%s</%s>" % (tag, self.attrs(tag), inline(m.group(2)), tag))
                i += 1
                continue
            if is_table_start(lines, i):
                h, i = self.table(lines, i)
                out.append(h)
                continue
            if HR_RE.match(ln):
                out.append("<hr>")
                i += 1
                continue
            if LIST_RE.match(ln):
                h, i = self.list_block(lines, i)
                out.append(h)
                continue
            if QUOTE_RE.match(ln):
                body = []
                while i < n and QUOTE_RE.match(lines[i]):
                    body.append(QUOTE_RE.match(lines[i]).group(1))
                    i += 1
                inner = Converter(self.rtl, self.font, self.inline_styles)
                out.append("<blockquote%s>%s</blockquote>" % (self.attrs("blockquote"), inner.convert("\n".join(body))))
                self.rtl_blocks += inner.rtl_blocks
                continue
            para = [ln]
            i += 1
            while i < n and lines[i].strip() and not block_start(lines, i):
                para.append(lines[i])
                i += 1
            out.append("<p%s>%s</p>" % (self.attrs("p"), self.para_text(para)))
        return "\n".join(out)


def document(md, lang="en", rtl=None, font=None, title=None, logos=None, inline_styles=False):
    if rtl is None:
        rtl = lang in RTL_LANGS
    conv = Converter(rtl=rtl, font=font, inline_styles=inline_styles)
    body = conv.convert(md)
    if logos:
        imgs = " ".join('<img src="%s" alt="logo" height="48">' % _url_attr(u) for u in logos)
        body = "<p%s>%s</p>\n%s" % (conv.attrs("p"), imgs, body)
    if title is None:
        m = next((HEADING_RE.match(l) for l in md.splitlines() if l.startswith("# ")), None)
        title = re.sub(r"[*`]", "", m.group(2)) if m else "Brief"
    stack = conv.font_stack()
    direction = "rtl" if rtl else "ltr"
    align = "right" if rtl else "left"
    # element selectors only: the Docs importer applies these, it ignores class selectors
    css = ("body,h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote{font-family:%(f)s;direction:%(d)s;text-align:%(a)s}"
           "table{border-collapse:collapse}"
           "th,td{border:1px solid #999;padding:4px;vertical-align:top}"
           "th{background:#eef3f8}") % {"f": stack, "d": direction, "a": align}
    lang_attr = html.escape(lang or "en", quote=True)
    dir_attr = ' dir="rtl"' if rtl else ""
    body_style = ""
    if inline_styles:
        body_style = ' style="%s"' % _attr("font-family:%s;direction:%s;text-align:%s" % (stack, direction, align))
    page = ('<!DOCTYPE html>\n<html lang="%s"%s>\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n'
            '<style>%s</style>\n</head>\n<body lang="%s"%s%s>\n%s\n</body>\n</html>\n'
            % (lang_attr, dir_attr, html.escape(title, quote=False), css, lang_attr, dir_attr,
               body_style, body))
    return page, conv.rtl_blocks


# ---------------------------------------------------------------- word counts

def count_words(text):
    return sum(1 for tok in WORD_TOKEN_RE.findall(text) if re.search(r"\w", tok))


def markdown_visible_text(md):
    out = []
    in_fence = False
    for ln in md.splitlines():
        if FENCE_RE.match(ln):
            in_fence = not in_fence
            continue
        if in_fence:
            out.append(ln)
            continue
        if is_separator(ln) and "|" in ln:
            continue
        ln = re.sub(r"^\s{0,3}>\s?", "", ln)
        ln = re.sub(r"^#{1,6}\s+", "", ln)
        ln = re.sub(r"^(\s*)([-*+]|\d{1,9}[.)])\s+", r"\1", ln)
        ln = re.sub(r"\[([^\[\]]*)\]\(\s*(<[^>]+>|[^()\s]+(?:\([^()\s]*\))?[^()\s]*)\s*\)", r"\1", ln)
        ln = re.sub(r"(?<!\\)\|", " ", ln)
        out.append(ln)
    return "\n".join(out)


class _TextGrab(HTMLParser):
    SKIP = {"style", "script", "head", "title"}
    INLINE = {"a", "b", "strong", "i", "em", "code", "span", "u", "s", "sup", "sub", "font", "small", "mark"}

    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        if tag not in self.INLINE:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag not in self.INLINE:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def html_visible_text(doc):
    grab = _TextGrab()
    grab.feed(doc)
    grab.close()
    return "".join(grab.parts)


def rtl_markers(doc):
    low = doc.lower()
    return (len(re.findall(r'dir\s*=\s*["\']?rtl', low)) + len(re.findall(r"direction\s*:\s*rtl", low))
            + len(re.findall(r"text-align\s*:\s*right", low)))


# ---------------------------------------------------------------- text diff (--verify)

HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
CELL_TAGS = {"td", "th"}
QUOTE_MAP = {ord(c): "'" for c in "\u2018\u2019\u201a\u201b\u2032\u05f3`"}
QUOTE_MAP.update({ord(c): '"' for c in "\u201c\u201d\u201e\u201f\u2033\u05f4"})
QUOTE_MAP.update({ord(c): "-" for c in "\u2010\u2011\u2012\u2013\u2014\u2015\u2212"})
EDGE_PUNCT = ".,;:!?'\"()[]{}*_"
URL_RE = re.compile(r"(?:https?://|www\.)|^[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}(?:/|$)", re.I)
KEYWORD_HEADER_RE = re.compile(r"keyword|query|search term|\u05de\u05d9\u05dc\u05ea \u05de\u05e4\u05ea\u05d7|"
                               r"\u05de\u05d9\u05dc\u05d5\u05ea \u05de\u05e4\u05ea\u05d7|\u05d1\u05d9\u05d8\u05d5\u05d9|"
                               r"\u05e9\u05d0\u05d9\u05dc\u05ea", re.I)


class _TokenGrab(HTMLParser):
    """Visible text of an HTML page as (text, kind) runs; kind is heading, cell or text."""

    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.runs = []
        self.skip = 0
        self.heading = 0
        self.cell = 0

    def _kind(self):
        return "heading" if self.heading else "cell" if self.cell else "text"

    def handle_starttag(self, tag, attrs):
        if tag in _TextGrab.SKIP:
            self.skip += 1
        if tag in HEADING_TAGS:
            self.heading += 1
        if tag in CELL_TAGS:
            self.cell += 1
        if tag not in _TextGrab.INLINE:
            self.runs.append((" ", "text"))

    def handle_endtag(self, tag):
        if tag in _TextGrab.SKIP and self.skip:
            self.skip -= 1
        if tag in HEADING_TAGS and self.heading:
            self.heading -= 1
        if tag in CELL_TAGS and self.cell:
            self.cell -= 1
        if tag not in _TextGrab.INLINE:
            self.runs.append((" ", "text"))

    def handle_data(self, data):
        if not self.skip:
            self.runs.append((data, self._kind()))


def norm_token(tok):
    """Comparison key of one word, or "" for a token that is only punctuation.

    Tolerated (not reported): Unicode normal form (NFKC, so no-break and other
    spaces, ligatures and the ellipsis character fold), invisible format
    characters (bidi marks, zero-width joiners, soft hyphen), curly vs straight
    quotes and Hebrew geresh/gershayim vs ' and ", dash variants vs -, leading or
    trailing . , ; : ! ? quotes brackets * _, and tokens with no letter or digit.
    Everything else (a letter, a digit, a separator inside a number, a URL
    path) must match exactly. Case is kept.
    """
    tok = unicodedata.normalize("NFKC", tok)
    tok = "".join(ch for ch in tok if unicodedata.category(ch) != "Cf").translate(QUOTE_MAP)
    tok = tok.strip(EDGE_PUNCT)
    return tok if re.search(r"\w", tok) else ""


def tokens_of(runs):
    """[(key, shown, kind)] from (text, kind) runs; a word split across runs keeps the strongest kind."""
    text = "".join(t for t, _ in runs)
    kinds = []
    for t, k in runs:
        kinds.extend([k] * len(t))
    rank = {"text": 0, "cell": 1, "heading": 2}
    out = []
    for m in WORD_TOKEN_RE.finditer(text):
        key = norm_token(m.group(0))
        if not key:
            continue
        kind = max(kinds[m.start():m.end()], key=lambda k: rank[k]) if kinds else "text"
        out.append((key, m.group(0), kind))
    return out


def plain_export_text(export):
    """A plain-text Doc export writes list markers as text ("1. ", "* "); the Markdown's visible text has none."""
    return re.sub(r"(?m)^[ \t]*(?:\d{1,3}[.)]|[*\u2022\u25cf\u25cb\u25a0-])[ \t]+", "", export)


def html_tokens(doc):
    grab = _TokenGrab()
    grab.feed(doc)
    grab.close()
    # the space-like characters NFKC does not split on (no-break space) become plain spaces first
    runs = [(re.sub(r"[\u00a0\u2000-\u200a\u202f\u205f\u3000]", " ", t), k) for t, k in grab.runs]
    return tokens_of(runs)


def keyword_phrases(md):
    """Keyword strings from every Markdown table column whose header names keywords or queries."""
    lines = md.replace("\r\n", "\n").split("\n")
    phrases = set()
    i = 0
    while i < len(lines):
        if is_table_start(lines, i):
            header = split_row(lines[i])
            cols = [k for k, h in enumerate(header) if KEYWORD_HEADER_RE.search(h)]
            i += 2
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                row = split_row(lines[i])
                for k in cols:
                    if k < len(row):
                        key = " ".join(filter(None, (norm_token(t) for t in html_visible_text(inline(row[k])).split())))
                        if key:
                            phrases.add(key)
                i += 1
            continue
        i += 1
    return phrases


def _categories(src, doc, i1, i2, j1, j2, phrases, ctx=4):
    cats = set()
    for tok in src[i1:i2] + doc[j1:j2]:
        if tok[2] != "text":
            cats.add(tok[2])
        if re.search(r"\d", tok[0]):
            cats.add("number")
        if URL_RE.search(tok[0]):
            cats.add("url")
    # an insertion takes the kind of the source words around it
    if i1 == i2:
        for tok in src[max(0, i1 - 1):i1 + 1]:
            if tok[2] != "text":
                cats.add(tok[2])
    window = " " + " ".join(t[0] for t in src[max(0, i1 - ctx):i2 + ctx]) + " "
    dwindow = " " + " ".join(t[0] for t in doc[max(0, j1 - ctx):j2 + ctx]) + " "
    for ph in phrases:
        if (" %s " % ph) in window and (" %s " % ph) not in dwindow:
            cats.add("keyword")
            break
    return cats


def text_diff(md, export, is_html, lang, rtl, font, phrases, limit=20, ctx=6):
    """Word-sequence diff of the Markdown's visible text against the Doc export.

    Returns (segments, printed lines for the first `limit`, source word count, Doc word count).
    """
    src_page, _ = document(md, lang=lang, rtl=rtl, font=font)
    src = html_tokens(src_page)
    if is_html:
        doc = html_tokens(export)
    else:
        doc = tokens_of([(re.sub(r"[\u00a0\u2000-\u200a\u202f\u205f\u3000]", " ", plain_export_text(export)), "text")])
    sm = difflib.SequenceMatcher(None, [t[0] for t in src], [t[0] for t in doc], autojunk=False)
    segs = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        segs.append((op, i1, i2, j1, j2, _categories(src, doc, i1, i2, j1, j2, phrases)))
    lines = []
    for n, (op, i1, i2, j1, j2, cats) in enumerate(segs[:limit], 1):
        def show(seq, a, b):
            before = " ".join(t[1] for t in seq[max(0, a - ctx):a])
            mid = " ".join(t[1] for t in seq[a:b]) or "(nothing)"
            after = " ".join(t[1] for t in seq[b:b + ctx])
            return "%s [[ %s ]] %s" % (before, mid, after)
        where = ("after source word %d" % i1) if op == "insert" else ("source words %d to %d" % (i1 + 1, i2))
        lines.append("  %d. %s, %s (%s)" % (n, op, ", ".join(sorted(cats)) or "prose", where))
        lines.append("     md : %s" % show(src, i1, i2))
        lines.append("     doc: %s" % show(doc, j1, j2))
    return segs, lines, len(src), len(doc)


def font_blocks(doc, font):
    """(blocks naming the font, text blocks) in a Doc HTML export."""
    name = font.replace('"', "").replace("'", "").strip().lower()
    total = hit = 0
    for m in re.finditer(r"<(p|h[1-6]|li)\b([^>]*)>(.*?)</\1>", doc, re.I | re.S):
        if not re.sub(r"<[^>]+>|&nbsp;|\s", "", m.group(3)):
            continue  # empty paragraph
        total += 1
        block = (m.group(2) + m.group(3)).lower().replace("&quot;", '"')
        if re.search(r"font-family\s*:\s*[^;>]*" + re.escape(name), block):
            hit += 1
    return hit, total


# ---------------------------------------------------------------- main

def read(path):
    with open(path, "r", encoding="utf-8-sig") as fh:
        return fh.read()


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Convert a brief (Markdown) to HTML for the Google Doc upload, or verify the Doc.")
    ap.add_argument("src", help="the brief in Markdown")
    ap.add_argument("out", nargs="?", help="output HTML path (default: src with .html)")
    ap.add_argument("--lang", default="en", help="brief language: en, he (right to left), ar, fa ...")
    ap.add_argument("--rtl", action="store_true", help="force right to left")
    ap.add_argument("--font", help="font family from the client's brand rule, for example Heebo (default Arial)")
    ap.add_argument("--title", help="HTML <title> (default: the first # heading)")
    ap.add_argument("--logo", action="append", metavar="URL", help="logo image URL (PNG or JPG, public https); repeatable")
    ap.add_argument("--verify", metavar="EXPORT", help="compare a Doc export (HTML or text) with the Markdown instead of converting")
    ap.add_argument("--tolerance", type=float, default=3.0, help="word-count tolerance in percent for --verify (default 3)")
    ap.add_argument("--inline-styles", action="store_true",
                    help="repeat dir and style on every block (larger; only if the Doc import ever ignores the style block)")
    args = ap.parse_args(argv)
    lang = (args.lang or "en").lower()
    rtl = args.rtl or lang in RTL_LANGS

    try:
        md = read(args.src)
    except (OSError, UnicodeDecodeError) as exc:
        print("error: cannot read %s: %s" % (args.src, exc), file=sys.stderr)
        return 2
    md_words = count_words(markdown_visible_text(md))

    if args.verify:
        try:
            exp = read(args.verify)
        except (OSError, UnicodeDecodeError) as exc:
            print("error: cannot read %s: %s" % (args.verify, exc), file=sys.stderr)
            return 2
        is_html = bool(re.search(r"<(?:html|body|p|div|span|table)\b", exp, re.I))
        doc_words = count_words(html_visible_text(exp) if is_html else plain_export_text(exp))
        gap = abs(doc_words - md_words) / float(md_words) * 100.0 if md_words else 100.0
        ok = gap <= args.tolerance
        print("Words: Markdown %d, Doc %d (gap %.1f%%, tolerance %.1f%%): %s"
              % (md_words, doc_words, gap, args.tolerance, "OK" if ok else
                 "FAIL, the conversion dropped or added text (look for angle brackets, broken tables or lost list items)"))
        if rtl:
            if not is_html:
                print("RTL: not checked (plain-text export; export the Doc as text/html to check direction)")
                ok = False
            else:
                n = rtl_markers(exp)
                print("RTL: %d right-to-left markers (dir=rtl, direction:rtl, text-align:right): %s"
                      % (n, "OK" if n else "FAIL, the Doc renders left to right: re-upload the HTML from md_to_html.py"))
                ok = ok and n > 0
        if args.font:
            if not is_html:
                print("Font: not checked (plain-text export; export the Doc as text/html)")
                ok = False
            else:
                hit, total = font_blocks(exp, args.font)
                share = 100.0 * hit / total if total else 0.0
                verdict = ("OK" if share >= 90 else "WARN, some blocks use another font" if hit else
                           "FAIL, the font is not in the Doc: re-upload the converter output unchanged")
                print("Font: %s on %d of %d text blocks (%.0f%%): %s" % (args.font, hit, total, share, verdict))
                ok = ok and hit > 0
        phrases = keyword_phrases(md)
        segs, lines, n_src, n_doc = text_diff(md, exp, is_html, lang, rtl, args.font, phrases)
        critical = [sg for sg in segs if sg[5] & {"heading", "cell", "keyword", "number", "url"}]
        prose = len(segs) - len(critical)
        print("Text: %d source words, %d Doc words compared; %d differing segments (%d in a heading, table cell, "
              "keyword, number or URL; %d prose only): %s"
              % (n_src, n_doc, len(segs), len(critical), prose,
                 "OK" if not segs else
                 "FAIL, the Doc text is not the source text: re-upload the converter output unchanged"))
        if segs:
            print("First %d differences ([[ ]] marks the change):" % min(20, len(segs)))
            for ln in lines:
                print(ln)
        ok = ok and not segs
        print("VERIFY %s" % ("PASS" if ok else "FAIL"))
        return 0 if ok else 1

    out_path = args.out or (os.path.splitext(args.src)[0] + ".html")
    for url in args.logo or []:
        if not re.match(r"^https?://", url, re.I) or url.lower().split("?")[0].endswith(".svg"):
            print("warning: logo %s is not a public PNG or JPG URL; Drive may not import it" % url, file=sys.stderr)
    page, rtl_blocks = document(md, lang=lang, rtl=rtl, font=args.font, title=args.title, logos=args.logo,
                                inline_styles=args.inline_styles)
    try:
        with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(page)
    except OSError as exc:
        print("error: cannot write %s: %s" % (out_path, exc), file=sys.stderr)
        return 2
    html_words = count_words(html_visible_text(page))
    gap = abs(html_words - md_words) / float(md_words) * 100.0 if md_words else 0.0
    print("Wrote %s (%d bytes; lang=%s, %s, font %s; %s)"
          % (out_path, len(page.encode("utf-8")), lang, "right to left" if rtl else "left to right",
             args.font or "Arial", "%d blocks with inline dir and style" % rtl_blocks if args.inline_styles
             else "compact: one style block, no per-block styles"))
    print("Upload this file's content exactly as written; never shorten or retype it (split the brief into two Docs if it is too large)")
    print("Words: Markdown %d, HTML %d (gap %.1f%%)" % (md_words, html_words, gap))
    return 0


if __name__ == "__main__":
    sys.exit(main())
