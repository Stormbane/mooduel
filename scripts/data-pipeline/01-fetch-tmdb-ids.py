"""
Step 1: Download TMDB daily movie ID export and select top candidates by popularity.

TMDB publishes daily gzipped JSON files with all movie IDs + popularity.
We download today's export, filter out adult content, sort by popularity,
and save the top N candidates for enrichment.

Usage: python 01-fetch-tmdb-ids.py [--top N]
Output: data/raw/tmdb-candidates.jsonl
"""

import gzip
import json
import sys
import os
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import HTTPError

# Fix Windows console encoding
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TOP_N = 60000  # Take more than 50K so we can filter after enrichment

# Parse args
for i, arg in enumerate(sys.argv):
    if arg == "--top" and i + 1 < len(sys.argv):
        TOP_N = int(sys.argv[i + 1])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(RAW_DIR, "tmdb-candidates.jsonl")


def get_export_url(date):
    """TMDB daily export URL for a given date."""
    ds = date.strftime("%m_%d_%Y")
    return f"http://files.tmdb.org/p/exports/movie_ids_{ds}.json.gz"


def download_export():
    """Download the most recent daily export. Try today, then yesterday."""
    for days_back in range(0, 4):
        date = datetime.now(timezone.utc) - timedelta(days=days_back)
        url = get_export_url(date)
        print(f"Trying {url}...")
        try:
            req = Request(url, headers={"User-Agent": "movie-picker/1.0"})
            resp = urlopen(req, timeout=60)
            data = gzip.decompress(resp.read())
            print(f"  Downloaded ({len(data):,} bytes)")
            return data, date
        except HTTPError as e:
            print(f"  {e.code} — trying earlier date")
        except Exception as e:
            print(f"  Error: {e} — trying earlier date")
    raise RuntimeError("Could not download TMDB daily export from the last 4 days")


def parse_export(raw_data):
    """Parse newline-delimited JSON. Each line: {id, original_title, popularity, adult, video}"""
    movies = []
    for line in raw_data.decode("utf-8").strip().split("\n"):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            # Skip adult content and video-only entries
            if obj.get("adult", False) or obj.get("video", False):
                continue
            movies.append(obj)
        except json.JSONDecodeError:
            continue
    return movies


def main():
    print(f"=== TMDB Daily Export — selecting top {TOP_N:,} candidates ===\n")

    raw_data, date = download_export()
    print(f"Export date: {date.strftime('%Y-%m-%d')}\n")

    movies = parse_export(raw_data)
    print(f"Parsed {len(movies):,} non-adult movies")

    # Sort by popularity descending
    movies.sort(key=lambda m: m.get("popularity", 0), reverse=True)

    # Take top N
    candidates = movies[:TOP_N]
    print(f"Selected top {len(candidates):,} by popularity")
    print(f"  Popularity range: {candidates[0]['popularity']:.1f} — {candidates[-1]['popularity']:.3f}")
    print(f"  #1: {candidates[0].get('original_title', '?')} (pop: {candidates[0]['popularity']:.1f})")
    print(f"  #100: {candidates[99].get('original_title', '?')} (pop: {candidates[99]['popularity']:.1f})")
    print(f"  #{TOP_N}: {candidates[-1].get('original_title', '?')} (pop: {candidates[-1]['popularity']:.3f})")

    # Write JSONL
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for m in candidates:
            f.write(json.dumps({"id": m["id"], "popularity": m["popularity"]}) + "\n")

    print(f"\nSaved to {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE):,} bytes")


if __name__ == "__main__":
    main()
