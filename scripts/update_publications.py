#!/usr/bin/env python3
"""Refresh data/publications.json from the Google Scholar profiles listed in data/site.csv.

Every `member` row with a Google Scholar URL in the `scholar` column is looked up.
Publications are merged and de-duplicated by title. If Scholar blocks the request or
returns nothing, the existing publications.json is left untouched.

Requires: pip install scholarly
"""
import csv
import datetime
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "site.csv"
OUT_PATH = ROOT / "data" / "publications.json"


def scholar_id(value):
    """Accept a full profile URL or a bare ID."""
    value = value.strip()
    if not value:
        return None
    if "scholar.google" in value:
        ids = parse_qs(urlparse(value).query).get("user")
        return ids[0] if ids else None
    return value if re.fullmatch(r"[\w-]{12}", value) else None


def norm(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())


def main():
    from scholarly import scholarly  # imported here so --help style errors are clear

    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    ids = []
    for r in rows:
        if (r.get("type") or "").strip().lower() == "member":
            sid = scholar_id(r.get("scholar", ""))
            if sid and sid not in ids:
                ids.append(sid)

    if not ids:
        print("No Google Scholar IDs found in site.csv; leaving publications.json unchanged.")
        return 0

    merged = {}
    for sid in ids:
        try:
            author = scholarly.search_author_id(sid)
            author = scholarly.fill(author, sections=["publications"])
        except Exception as e:  # network block, bad ID, etc.
            print(f"Skipping {sid}: {e}", file=sys.stderr)
            continue
        for pub in author.get("publications", []):
            try:
                pub = scholarly.fill(pub)
                time.sleep(1.5)  # be polite to Scholar
            except Exception as e:
                print(f"  could not fill a publication for {sid}: {e}", file=sys.stderr)
            bib = pub.get("bib", {})
            title = bib.get("title", "").strip()
            if not title:
                continue
            year = str(bib.get("pub_year", "")).strip()
            entry = {
                "title": title,
                "authors": bib.get("author", "").replace(" and ", ", "),
                "venue": bib.get("journal") or bib.get("conference") or bib.get("citation", ""),
                "year": year if year.isdigit() else "",
                "url": pub.get("pub_url", ""),
                "citations": pub.get("num_citations", 0),
            }
            key = norm(title)
            if key not in merged or entry["citations"] > merged[key]["citations"]:
                merged[key] = entry

    if not merged:
        print("Scholar returned nothing (possibly blocked); keeping the existing file.", file=sys.stderr)
        return 0

    pubs = sorted(merged.values(), key=lambda p: (p["year"] or "0", p["title"]), reverse=True)
    OUT_PATH.write_text(
        json.dumps(
            {"updated": datetime.date.today().isoformat(), "source": "Google Scholar", "publications": pubs},
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(pubs)} publications from {len(ids)} profile(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
