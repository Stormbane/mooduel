"""
Step 3: Score enriched movies and select the top 50K.

Scoring formula (from spec):
  0.4 * log(vote_count) + 0.3 * log(popularity) + 0.3 * vote_average/10

Filters:
  - vote_count >= 10
  - has overview
  - not adult
  - status = "Released"

Usage: python 03-select-top-50k.py [--top N]
Input:  data/raw/tmdb-enriched.jsonl
Output: data/raw/top-50k.jsonl
"""

import json
import math
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TOP_N = 50000
for i, arg in enumerate(sys.argv):
    if arg == "--top" and i + 1 < len(sys.argv):
        TOP_N = int(sys.argv[i + 1])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "tmdb-enriched.jsonl")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "top-50k.jsonl")


def relevance_score(movie):
    vc = max(movie.get("voteCount", 0), 1)
    pop = max(movie.get("popularity", 0), 0.01)
    rating = movie.get("voteAverage", 0) or 0
    return 0.4 * math.log(vc) + 0.3 * math.log(pop) + 0.3 * (rating / 10)


def main():
    print(f"=== Select Top {TOP_N:,} Movies ===\n")

    # Load enriched movies
    movies = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    movies.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    print(f"Loaded {len(movies):,} enriched movies")

    # Filter
    filtered = [
        m for m in movies
        if m.get("voteCount", 0) >= 10
        and m.get("overview", "").strip()
        and not m.get("adult", False)
        and m.get("status", "") in ("Released", "")
    ]
    print(f"After filtering (votes>=10, has overview, released): {len(filtered):,}")

    # Score
    for m in filtered:
        m["_relevanceScore"] = relevance_score(m)

    # Sort by score descending
    filtered.sort(key=lambda m: m["_relevanceScore"], reverse=True)

    # Select top N
    selected = filtered[:TOP_N]
    print(f"Selected top {len(selected):,}")

    # Stats
    if selected:
        print(f"\n  Score range: {selected[0]['_relevanceScore']:.3f} — {selected[-1]['_relevanceScore']:.3f}")
        print(f"  #1: {selected[0]['title']} ({selected[0].get('releaseDate', '?')[:4]}) — "
              f"votes: {selected[0]['voteCount']:,}, rating: {selected[0]['voteAverage']}")
        print(f"  #100: {selected[99]['title']} ({selected[99].get('releaseDate', '?')[:4]})")
        print(f"  #{len(selected)}: {selected[-1]['title']} ({selected[-1].get('releaseDate', '?')[:4]}) — "
              f"votes: {selected[-1]['voteCount']:,}, rating: {selected[-1]['voteAverage']}")

        # Language distribution
        langs = {}
        for m in selected:
            lang = m.get("originalLanguage", "?")
            langs[lang] = langs.get(lang, 0) + 1
        top_langs = sorted(langs.items(), key=lambda x: -x[1])[:10]
        print(f"\n  Top languages: {', '.join(f'{l}:{c}' for l, c in top_langs)}")

        # Decade distribution
        decades = {}
        for m in selected:
            year = m.get("releaseDate", "")[:4]
            if year and year.isdigit():
                decade = f"{int(year) // 10 * 10}s"
                decades[decade] = decades.get(decade, 0) + 1
        top_decades = sorted(decades.items())
        print(f"  Decades: {', '.join(f'{d}:{c}' for d, c in top_decades)}")

    # Write output (without internal score field)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for m in selected:
            del m["_relevanceScore"]
            f.write(json.dumps(m, ensure_ascii=False) + "\n")

    print(f"\nSaved to {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE):,} bytes")


if __name__ == "__main__":
    main()
