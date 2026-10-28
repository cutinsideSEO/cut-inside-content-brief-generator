#!/usr/bin/env python3
"""Convert a finished brief (Markdown) to HTML for the Google Doc upload, and verify the Doc.

Standard library only, Python 3.9+, works on Windows and Linux.

Why: Drive's Markdown import drops right-to-left direction (a Hebrew Doc comes out
left-aligned, and mixed Hebrew and Latin lines reorder) and silently swallows
angle-bracket text. A Hebrew (or Arabic) brief is therefore ALWAYS uploaded as
text/html made by this script; an English brief may use Markdown or this script.

Usage
    python md_to_html.py brief.md brief.html --lang he
    python md_to_html.py brief.md brief.html --lang he --font "Heebo"
    python md_to_html.py brief.md brief.html --lang he --logo https://www.example.com/logo.png
    python md_to_html.py brief.md brief.html                 # English, left to right
    python md_to_html.py brief.md --verify doc-export.html --lang he

Options
    OUT                   Output path (default: the input path with .html).
    --lang en|he|ar|fa    Brief language. he, ar and fa set dir="rtl" and lang on
                          <html> and <body> and dir="rtl" plus right alignment on
                          every block (p, li, h1 to h6, table, th, td, blockquote).
    --rtl                 Force right to left for any language.
    --font NAME           Font family from a client brand rule (for example
                          "Heebo"); applied to the body and every block, with
                          Arial as the fallback. Default: Arial.
    --title TEXT          <title> of the HTML (default: the first # heading).
    --logo URL            A logo from a client brand rule, placed above the
                          title (repeat for two logos). Use a PNG or JPG at a
                          public https URL: Drive does not import SVG. Check the
                          logo on read-back; if it is missing, add a visible
                          **TODO (human):** line instead.
    --verify EXPORT       Do not convert. Compare EXPORT (the Doc exported as
                          HTML with Drive download_file_content, exportMimeType
                          text/html, or the plain text from read_file_content)
                          with the Markdown: visible word counts must be within
                          --tolerance, and for a right-to-left language the
                          export must show RTL paragraphs (dir="rtl",
                          direction:rtl or text-align:right). Exit 1 on failure.
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
import html
import os
import re
import sys
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


def inline(text, store=None):
    """Markdown inline syntax to HTML. Text is escaped; markup is added after."""
    own = store is None
    if own:
        store = []
    # 1. code spans
    text = re.sub(r"`([^`]+)`", lambda m: _ph(store, "<code>%s</code>" % html.escape(m.group(1), quote=False)), text)
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
    text = html.escape(text, quote=False)
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
    def __init__(self, rtl=False, font=None):
        self.rtl = rtl
        self.font = font
        self.rtl_blocks = 0

    def attrs(self, tag, extra_style=""):
        """dir and inline style for a block element."""
        style = []
        dir_attr = ""
        if self.rtl:
            dir_attr = ' dir="rtl"'
            self.rtl_blocks += 1
            if tag not in ("ul", "ol", "table"):
                style.append("text-align:right")
            style.append("direction:rtl")
        if self.font and tag not in ("ul", "ol", "table"):
            style.append("font-family:%s" % self.font_stack())
        if extra_style:
            style.append(extra_style)
        style_attr = ' style="%s"' % _attr(";".join(style)) if style else ""
        return dir_attr + style_attr

    def font_stack(self):
        if not self.font:
            return "Arial, sans-serif"
        name = self.font.replace('"', "").replace("'", "").strip()
        return "'%s', Arial, sans-serif" % name

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
                out.append('<pre dir="ltr"><code>%s</code></pre>' % html.escape("\n".join(body), quote=False))
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
                inner = Converter(self.rtl, self.font)
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


def document(md, lang="en", rtl=None, font=None, title=None, logos=None):
    if rtl is None:
        rtl = lang in RTL_LANGS
    conv = Converter(rtl=rtl, font=font)
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
    css = ("body{font-family:%(f)s;direction:%(d)s;text-align:%(a)s;}"
           "p,li,h1,h2,h3,h4,h5,h6,td,th,blockquote{font-family:%(f)s;direction:%(d)s;text-align:%(a)s;}"
           "table{border-collapse:collapse;direction:%(d)s;}"
           "th,td{border:1px solid #999999;padding:4px;vertical-align:top;}"
           "th{background:#eef3f8;}") % {"f": stack, "d": direction, "a": align}
    lang_attr = html.escape(lang or "en", quote=True)
    dir_attr = ' dir="rtl"' if rtl else ""
    body_style = "font-family:%s;direction:%s;text-align:%s" % (stack, direction, align)
    page = ('<!DOCTYPE html>\n<html lang="%s"%s>\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n'
            '<style>%s</style>\n</head>\n<body lang="%s"%s style="%s">\n%s\n</body>\n</html>\n'
            % (lang_attr, dir_attr, html.escape(title, quote=False), css, lang_attr, dir_attr,
               _attr(body_style), body))
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
        doc_words = count_words(html_visible_text(exp) if is_html else exp)
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
        print("VERIFY %s" % ("PASS" if ok else "FAIL"))
        return 0 if ok else 1

    out_path = args.out or (os.path.splitext(args.src)[0] + ".html")
    for url in args.logo or []:
        if not re.match(r"^https?://", url, re.I) or url.lower().split("?")[0].endswith(".svg"):
            print("warning: logo %s is not a public PNG or JPG URL; Drive may not import it" % url, file=sys.stderr)
    page, rtl_blocks = document(md, lang=lang, rtl=rtl, font=args.font, title=args.title, logos=args.logo)
    try:
        with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(page)
    except OSError as exc:
        print("error: cannot write %s: %s" % (out_path, exc), file=sys.stderr)
        return 2
    html_words = count_words(html_visible_text(page))
    gap = abs(html_words - md_words) / float(md_words) * 100.0 if md_words else 0.0
    print("Wrote %s (%d bytes; lang=%s, %s, font %s; %d blocks marked dir=rtl)"
          % (out_path, len(page.encode("utf-8")), lang, "right to left" if rtl else "left to right",
             args.font or "Arial", rtl_blocks))
    print("Words: Markdown %d, HTML %d (gap %.1f%%)" % (md_words, html_words, gap))
    return 0


if __name__ == "__main__":
    sys.exit(main())
