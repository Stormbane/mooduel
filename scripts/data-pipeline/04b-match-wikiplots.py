"""
Step 4b: Match WikiPlots corpus to our movie list.

WikiPlots has 112K story plots from Wikipedia (pre-2017).
Matches by title patterns: "Title (film)", "Title (YYYY film)", exact title.

Usage: python 04b-match-wikiplots.py
Input:  data/raw/top-50k.jsonl + data/raw/titles + data/raw/plots
Output: data/raw/wikipedia-plots.jsonl (merged with any existing API-fetched plots)
"""

import json
import os
import sys
import re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MOVIES_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "top-50k.jsonl")
TITLES_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "titles")
PLOTS_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "plots")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "wikipedia-plots.jsonl")
API_CACHE = os.path.join(PROJECT_ROOT, "data", "raw", "wikipedia-titles.json")


def load_wikiplots():
    """Load WikiPlots corpus into a title → plot dict."""
    print("Loading WikiPlots corpus...", flush=True)

    # Load titles
    with open(TITLES_FILE, "r", encoding="utf-8") as f:
        titles = [line.strip() for line in f]

    # Load plots (sentences separated by newlines, stories by <EOS>)
    with open(PLOTS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    stories = content.split("<EOS>")

    print(f"  Titles: {len(titles):,}, Stories: {len(stories):,}", flush=True)

    # Build lookup
    plots = {}
    for i, title in enumerate(titles):
        if i < len(stories):
            plot = stories[i].strip()
            if plot and len(plot) > 50:  # Skip very short plots
                plots[title] = plot

    print(f"  Valid plots: {len(plots):,}", flush=True)
    return plots


def normalize_title(title):
    """Normalize a title for fuzzy matching."""
    t = title.lower().strip()
    t = re.sub(r'\s+', ' ', t)
    # Remove common suffixes
    t = re.sub(r'\s*\(film\)\s*$', '', t)
    t = re.sub(r'\s*\(\d{4}\s+film\)\s*$', '', t)
    return t


def match_movie_to_wikiplots(movie, wikiplots_by_title, wikiplots_normalized):
    """Try to match a movie to a WikiPlots entry."""
    title = movie["title"]
    year = movie.get("releaseDate", "")[:4]

    # Try exact matches first
    candidates = []
    if year:
        candidates.append(f"{title} ({year} film)")
    candidates.append(f"{title} (film)")
    candidates.append(title)

    for c in candidates:
        if c in wikiplots_by_title:
            return c, wikiplots_by_title[c]

    # Try normalized matching
    norm = normalize_title(title)
    if norm in wikiplots_normalized:
        matched_title, plot = wikiplots_normalized[norm]
        return matched_title, plot

    return None, None


def load_api_plots():
    """Load any plots already fetched via API (from the cache)."""
    api_extracts = {}
    if os.path.exists(API_CACHE):
        with open(API_CACHE, "r", encoding="utf-8") as f:
            cache = json.load(f)
        api_extracts = cache.get("extracts", {})
        print(f"  API-cached extracts: {len(api_extracts):,}", flush=True)
    return api_extracts


def extract_plot_section(full_text):
    """Extract Plot/Synopsis section from full Wikipedia text."""
    if not full_text:
        return ""
    lines = full_text.split("\n")
    plot_lines = []
    in_plot = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("== ") and stripped.endswith(" =="):
            section = stripped.strip("= ").lower()
            if section in ("plot", "synopsis", "plot summary"):
                in_plot = True
                continue
            elif in_plot:
                break
        elif stripped.startswith("=== ") and in_plot:
            continue
        elif in_plot:
            plot_lines.append(line)
    plot = "\n".join(plot_lines).strip()
    if len(plot) > 4000:
        plot = plot[:4000].rsplit(" ", 1)[0] + "..."
    return plot


def main():
    print("=== WikiPlots Matcher ===\n", flush=True)

    # Load movies
    movies = []
    with open(MOVIES_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                movies.append(json.loads(line))
    print(f"Movies: {len(movies):,}", flush=True)

    # Load WikiPlots
    wikiplots = load_wikiplots()

    # Build normalized lookup
    wikiplots_normalized = {}
    for title, plot in wikiplots.items():
        norm = normalize_title(title)
        if norm not in wikiplots_normalized:
            wikiplots_normalized[norm] = (title, plot)

    # Load API-fetched extracts
    api_extracts = load_api_plots()

    # Load API title resolution cache
    api_resolved = {}
    if os.path.exists(API_CACHE):
        with open(API_CACHE, "r", encoding="utf-8") as f:
            cache = json.load(f)
        api_resolved = cache.get("resolved", {})
        print(f"  API-resolved titles: {len(api_resolved):,}", flush=True)

    # Match movies
    print(f"\nMatching...", flush=True)

    from_wikiplots = 0
    from_api = 0
    not_found = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        for m in movies:
            tmdb_id = m["tmdbId"]
            plot = ""
            wiki_title = None
            source = None

            # Strategy 1: Check API cache first (higher quality — has Plot section extraction)
            api_title = api_resolved.get(str(tmdb_id))
            if api_title and api_title in api_extracts:
                full_text = api_extracts[api_title]
                plot = extract_plot_section(full_text)
                if plot:
                    wiki_title = api_title
                    source = "api"

            # Strategy 2: WikiPlots corpus
            if not plot:
                matched_title, wp_plot = match_movie_to_wikiplots(m, wikiplots, wikiplots_normalized)
                if wp_plot:
                    # WikiPlots plots are already just the plot text (no section extraction needed)
                    # Truncate to 4000 chars
                    plot = wp_plot[:4000]
                    if len(wp_plot) > 4000:
                        plot = plot.rsplit(" ", 1)[0] + "..."
                    wiki_title = matched_title
                    source = "wikiplots"

            record = {
                "tmdbId": tmdb_id,
                "wikipediaTitle": wiki_title,
                "plot": plot,
                "plotLength": len(plot),
                "source": source,
            }
            out.write(json.dumps(record, ensure_ascii=False) + "\n")

            if source == "wikiplots":
                from_wikiplots += 1
            elif source == "api":
                from_api += 1
            else:
                not_found += 1

    total = from_wikiplots + from_api + not_found
    found = from_wikiplots + from_api
    print(f"\n=== Results ===", flush=True)
    print(f"Total: {total:,}")
    print(f"Matched: {found:,} ({found/total*100:.1f}%)")
    print(f"  From WikiPlots: {from_wikiplots:,}")
    print(f"  From API cache: {from_api:,}")
    print(f"Missing: {not_found:,} ({not_found/total*100:.1f}%)")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
