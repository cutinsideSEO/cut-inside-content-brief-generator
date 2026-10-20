#!/usr/bin/env python3
"""Compute the agency's weighted competitor score from SERP rows.

Standard library only, Python 3.9+, works on Windows and Linux.

Input
    A CSV file (header required, columns keyword,volume,url,rank; extra columns
    are ignored) or a JSON file (a list of objects with the same keys).

Rule
    Only rows with rank 1..10 count (organic top 10 per keyword).
    For every URL: score += volume * max(1, 21 - rank) for each keyword where it
    appears. A missing, blank or 'n/a' volume counts as 0 (the ranking is still
    recorded). Volumes may contain thousands commas.
    The same URL appearing twice for one keyword counts once (best rank).

URL normalisation
    Lowercase scheme and host, strip 'www.', strip the fragment, strip utm_*,
    gclid and fbclid query parameters, strip a trailing slash (except root).
    Two URLs with the same normalised form are the same page.

Usage
    python score_competitors.py serp.csv
    python score_competitors.py serp.json --top 15 --json scores.json
    python score_competitors.py serp.csv --exclude-domain client.com \\
        --exclude-keyword "client brand" --priority-url https://rival.com/page

Options
    --exclude-domain D   repeatable. Matches the domain and its subdomains. Pages
                         on it are listed separately as "client pages ranking"
                         with their rankings (refresh / cannibalisation risk).
    --exclude-keyword K  repeatable. Rows whose keyword equals K or contains K
                         (case-insensitive) are dropped from scoring (brand terms).
    --flag-domain D      repeatable. Adds to the default flag list (reddit.com,
                         quora.com, wikipedia.org, youtube.com, facebook.com,
                         tiktok.com, linkedin.com, medium.com, pinterest.com,
                         x.com, twitter.com, instagram.com). Flagged pages stay
                         in the ranking but are marked as an intent signal, not
                         a template.
    --priority-url U     repeatable. Starred pages: always shown, marked priority.
    --top N              rows to show in the table (default 10).
    --json OUT           write the full results as JSON to OUT.

Output (stdout, Markdown)
    | # | URL | Weighted score | Keywords ranked | Best rank | Flags |
    then the "Top 3 for full reading" line, the client pages section and a
    summary line: N keywords, N rows, N unique URLs.

Exit codes: 0 ok, 2 bad input (missing columns, non-numeric rank, unreadable file).
"""

import argparse
import csv
import json
import re
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit

DEFAULT_FLAG_DOMAINS = [
    "reddit.com", "quora.com", "wikipedia.org", "youtube.com", "facebook.com",
    "tiktok.com", "linkedin.com", "medium.com", "pinterest.com", "x.com",
    "twitter.com", "instagram.com",
]
FLAG_TEXT = "UGC/video/encyclopedia: intent signal, not a template"
REQUIRED_COLUMNS = ["keyword", "volume", "url", "rank"]
MAX_RANK = 10


class InputError(Exception):
    """Raised for bad input; reported as a message with exit code 2."""


# ---------------------------------------------------------------- helpers

def normalize_url(raw):
    """Return the canonical form of a URL (see module docstring)."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", raw):
        raw = "https://" + raw
    parts = urlsplit(raw)
    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    try:
        port = parts.port
    except ValueError:
        port = None
    netloc = host
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        netloc = "%s:%d" % (host, port)
    path = parts.path or "/"
    if len(path) > 1:
        path = path.rstrip("/") or "/"
    pairs = [
        (k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not (k.lower().startswith("utm_") or k.lower() in ("gclid", "fbclid"))
    ]
    query = urlencode(pairs)
    out = "%s://%s%s" % (scheme, netloc, path)
    if query:
        out += "?" + query
    return out


def host_of(norm_url):
    return (urlsplit(norm_url).hostname or "").lower()


def clean_domain(d):
    d = (d or "").strip().lower()
    d = re.sub(r"^[a-z][a-z0-9+.\-]*://", "", d)
    d = d.split("/")[0].split(":")[0]
    if d.startswith("www."):
        d = d[4:]
    return d


def domain_matches(host, domain):
    return bool(domain) and (host == domain or host.endswith("." + domain))


def parse_volume(value):
    if value is None:
        return 0
    s = str(value).strip().replace(",", "").replace(" ", "")
    if not s or s.lower() in ("n/a", "na", "-", "none", "null", "nan"):
        return 0
    try:
        return max(0, int(round(float(s))))
    except ValueError:
        return 0


def parse_rank(value, where):
    s = str(value).strip() if value is not None else ""
    try:
        f = float(s)
    except ValueError:
        raise InputError("%s: rank %r is not numeric" % (where, s))
    if f != int(f):
        raise InputError("%s: rank %r is not a whole number" % (where, s))
    return int(f)


def load_rows(path):
    """Return a list of (where, keyword, volume_raw, url, rank_raw)."""
    try:
        if path.lower().endswith(".json"):
            with open(path, "r", encoding="utf-8-sig") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                for k in ("rows", "data", "results", "items"):
                    if isinstance(data.get(k), list):
                        data = data[k]
                        break
            if not isinstance(data, list):
                raise InputError("JSON input must be a list of objects")
            records = []
            seen_keys = set()
            for i, obj in enumerate(data, 1):
                if not isinstance(obj, dict):
                    raise InputError("JSON item %d is not an object" % i)
                low = {str(k).strip().lower(): v for k, v in obj.items()}
                seen_keys.update(low)
                records.append(("JSON item %d" % i, low))
            missing = [c for c in REQUIRED_COLUMNS if c not in seen_keys]
            if records and missing:
                raise InputError("missing key(s) in JSON: %s" % ", ".join(missing))
        else:
            with open(path, "r", encoding="utf-8-sig", newline="") as fh:
                first_line = fh.readline()
                fh.seek(0)
                delim = max(",;\t", key=first_line.count)
                reader = csv.DictReader(fh, delimiter=delim)
                if reader.fieldnames is None:
                    raise InputError("CSV file is empty (header row required)")
                header = [str(h).strip().lower() for h in reader.fieldnames]
                missing = [c for c in REQUIRED_COLUMNS if c not in header]
                if missing:
                    raise InputError("missing column(s) in CSV header: %s (found: %s)"
                                     % (", ".join(missing), ", ".join(header)))
                records = []
                for obj in reader:
                    low = {str(k).strip().lower(): v for k, v in obj.items() if k is not None}
                    records.append(("CSV line %d" % reader.line_num, low))
    except OSError as exc:
        raise InputError("cannot read %s: %s" % (path, exc))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise InputError("cannot parse %s: %s" % (path, exc))

    rows = []
    for where, low in records:
        values = [low.get(c) for c in REQUIRED_COLUMNS]
        if all(v is None or str(v).strip() == "" for v in values):
            continue  # blank line
        keyword = str(low.get("keyword") or "").strip()
        url = str(low.get("url") or "").strip()
        if not keyword:
            raise InputError("%s: empty keyword" % where)
        if not url:
            continue  # nothing to score
        rows.append((where, keyword, low.get("volume"), url, low.get("rank")))
    return rows


# ---------------------------------------------------------------- scoring

def compute(rows, exclude_domains, exclude_keywords, flag_domains, priority_urls):
    excl_kw = [k.strip().lower() for k in exclude_keywords if k.strip()]
    best = {}  # (norm_url, keyword_key) -> dict
    dropped_kw = dropped_rank = merged = 0
    for where, keyword, vol_raw, url, rank_raw in rows:
        rank = parse_rank(rank_raw, where)
        kw_key = keyword.lower()
        if any(k in kw_key for k in excl_kw):
            dropped_kw += 1
            continue
        if not 1 <= rank <= MAX_RANK:
            dropped_rank += 1
            continue
        norm = normalize_url(url)
        key = (norm, kw_key)
        volume = parse_volume(vol_raw)
        if key in best:
            merged += 1
            cur = best[key]
            cur["rank"] = min(cur["rank"], rank)
            cur["volume"] = max(cur["volume"], volume)
        else:
            best[key] = {"keyword": keyword, "rank": rank, "volume": volume, "url": norm}

    pages = {}
    for (norm, _kw), rec in best.items():
        page = pages.setdefault(norm, {"url": norm, "score": 0, "rankings": []})
        page["score"] += rec["volume"] * max(1, 21 - rec["rank"])
        page["rankings"].append(
            {"keyword": rec["keyword"], "rank": rec["rank"], "volume": rec["volume"]})

    competitors, client_pages = [], []
    for norm, page in pages.items():
        page["rankings"].sort(key=lambda r: (r["rank"], r["keyword"].lower()))
        page["keywords_ranked"] = len(page["rankings"])
        page["best_rank"] = min(r["rank"] for r in page["rankings"])
        host = host_of(norm)
        page["priority"] = norm in priority_urls
        page["flagged"] = any(domain_matches(host, d) for d in flag_domains)
        if any(domain_matches(host, d) for d in exclude_domains):
            client_pages.append(page)
        else:
            competitors.append(page)

    sort_key = lambda p: (-p["score"], p["best_rank"], p["url"])
    competitors.sort(key=sort_key)
    client_pages.sort(key=sort_key)
    for i, page in enumerate(competitors, 1):
        page["position"] = i
        page["flags"] = (["PRIORITY"] if page["priority"] else []) + ([FLAG_TEXT] if page["flagged"] else [])
    for page in client_pages:
        page["flags"] = []

    # Top 3 for full reading: priority first, then by score, skipping flagged pages.
    top3 = [p for p in competitors if p["priority"]]
    top3 += [p for p in competitors if not p["priority"] and not p["flagged"]]
    top3 = top3[:3]

    found = {p["url"] for p in competitors} | {p["url"] for p in client_pages}
    missing_priority = sorted(u for u in priority_urls if u not in found)
    keywords = {kw for (_u, kw) in best}
    summary = {
        "keywords": len(keywords),
        "rows": len(best),
        "unique_urls": len(pages),
        "competitor_urls": len(competitors),
        "client_urls": len(client_pages),
        "rows_dropped_excluded_keyword": dropped_kw,
        "rows_dropped_rank_outside_1_10": dropped_rank,
        "duplicate_rows_merged": merged,
    }
    return competitors, client_pages, top3, missing_priority, summary


# ---------------------------------------------------------------- output

def md_cell(text):
    return str(text).replace("|", "\\|")


def render(competitors, client_pages, top3, missing_priority, summary, top_n, has_client_domains):
    out = []
    shown = [p for p in competitors if p["position"] <= top_n or p["priority"]]
    out.append("| # | URL | Weighted score | Keywords ranked | Best rank | Flags |")
    out.append("| --- | --- | --- | --- | --- | --- |")
    for p in shown:
        out.append("| %d | %s | %s | %d | %d | %s |" % (
            p["position"], md_cell(p["url"]), format(p["score"], ","),
            p["keywords_ranked"], p["best_rank"], md_cell("; ".join(p["flags"]))))
    if not shown:
        out.append("| - | (no competitor pages found) | 0 | 0 | - | |")
    out.append("")
    if top3:
        names = "; ".join("%s (%s)" % (p["url"], format(p["score"], ",")) for p in top3)
        line = "**Top 3 for full reading:** " + names
        if len(top3) < 3:
            line += " (only %d available: fewer than 3 non-flagged pages)" % len(top3)
    else:
        line = "**Top 3 for full reading:** none available (no non-flagged pages)"
    out.append(line)
    for u in missing_priority:
        out.append("Note: priority URL not found in the SERP data: %s" % u)
    out.append("")
    out.append("**Client pages ranking (refresh or cannibalisation risk):**")
    if client_pages:
        for p in client_pages:
            rk = ", ".join("%s (#%d, vol %s)" % (r["keyword"], r["rank"], format(r["volume"], ","))
                           for r in p["rankings"])
            out.append("- %s: score %s; %s" % (p["url"], format(p["score"], ","), rk))
    elif has_client_domains:
        out.append("- None: no excluded-domain pages in the top 10.")
    else:
        out.append("- None (no --exclude-domain given).")
    out.append("")
    out.append("Summary: %d keywords, %d rows, %d unique URLs" % (
        summary["keywords"], summary["rows"], summary["unique_urls"]))
    notes = []
    if summary["rows_dropped_excluded_keyword"]:
        notes.append("%d row(s) dropped for excluded keywords" % summary["rows_dropped_excluded_keyword"])
    if summary["rows_dropped_rank_outside_1_10"]:
        notes.append("%d row(s) ignored (rank outside 1-10)" % summary["rows_dropped_rank_outside_1_10"])
    if summary["duplicate_rows_merged"]:
        notes.append("%d duplicate url+keyword row(s) merged (best rank kept)" % summary["duplicate_rows_merged"])
    if summary["client_urls"]:
        notes.append("%d of the unique URLs are client pages (listed above, not in the table)" % summary["client_urls"])
    if notes:
        out.append("Notes: " + "; ".join(notes) + ".")
    return "\n".join(out)


def build_parser():
    p = argparse.ArgumentParser(
        description="Compute the weighted competitor score from SERP rows "
                    "(CSV or JSON with keyword,volume,url,rank).")
    p.add_argument("path", help="SERP data file (.csv or .json)")
    p.add_argument("--exclude-domain", action="append", default=[], metavar="D",
                   help="client domain (and subdomains) to list separately; repeatable")
    p.add_argument("--exclude-keyword", action="append", default=[], metavar="K",
                   help="keyword (substring, case-insensitive) to drop, e.g. brand terms; repeatable")
    p.add_argument("--flag-domain", action="append", default=[], metavar="D",
                   help="extra domain to flag as UGC/video/encyclopedia; repeatable")
    p.add_argument("--priority-url", action="append", default=[], metavar="U",
                   help="starred URL, always shown and marked priority; repeatable")
    p.add_argument("--top", type=int, default=10, metavar="N", help="rows to show (default 10)")
    p.add_argument("--json", dest="json_out", metavar="OUT", help="write full results as JSON to OUT")
    return p


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    if args.top < 1:
        print("error: --top must be at least 1", file=sys.stderr)
        return 2
    try:
        rows = load_rows(args.path)
        exclude_domains = [d for d in (clean_domain(x) for x in args.exclude_domain) if d]
        flag_domains = DEFAULT_FLAG_DOMAINS + [d for d in (clean_domain(x) for x in args.flag_domain) if d]
        priority = {normalize_url(u) for u in args.priority_url if u.strip()}
        competitors, client_pages, top3, missing_priority, summary = compute(
            rows, exclude_domains, args.exclude_keyword, flag_domains, priority)
    except InputError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 2

    print(render(competitors, client_pages, top3, missing_priority, summary,
                 args.top, bool(exclude_domains)))

    if args.json_out:
        payload = {
            "summary": summary,
            "options": {
                "exclude_domains": exclude_domains,
                "exclude_keywords": args.exclude_keyword,
                "flag_domains": flag_domains,
                "priority_urls": sorted(priority),
                "top": args.top,
            },
            "competitors": competitors,
            "client_pages": client_pages,
            "top3_for_full_reading": [p["url"] for p in top3],
            "missing_priority_urls": missing_priority,
        }
        try:
            with open(args.json_out, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
        except OSError as exc:
            print("error: cannot write %s: %s" % (args.json_out, exc), file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
