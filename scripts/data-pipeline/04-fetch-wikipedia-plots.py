"""
Step 4: Fetch Wikipedia plot summaries for movies.

Smart approach to stay under Wikipedia rate limits:
  - Check one title per movie first ("Title (YYYY film)"), then fallback passes
  - Save intermediate state so we can resume after 429s
  - Conservative rate: ~1 batch/s

Usage: python 04-fetch-wikipedia-plots.py [--resume]
Input:  data/raw/top-50k.jsonl
Output: data/raw/wikipedia-plots.jsonl
        data/raw/wikipedia-titles.json (intermediate, for resume)
"""

import asyncio
import aiohttp
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "top-50k.jsonl")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "wikipedia-plots.jsonl")
TITLES_CACHE = os.path.join(PROJECT_ROOT, "data", "raw", "wikipedia-titles.json")

WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "MoviePicker/1.0 (mood-dataset-research; github.com/movie-picker)"}


def extract_plot(full_text):
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


async def fetch_with_retry(session, params, retries=3):
    for attempt in range(retries):
        try:
            async with session.get(WIKI_API, params=params,
                                   timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 429:
                    retry_after = int(resp.headers.get("Retry-After", "60"))
                    return {"_rate_limited": True, "_retry_after": retry_after}
                text = await resp.text()
                if not text.strip():
                    await asyncio.sleep(2)
                    continue
                return json.loads(text)
        except (aiohttp.ClientError, asyncio.TimeoutError, json.JSONDecodeError):
            if attempt < retries - 1:
                await asyncio.sleep(1)
    return None


def load_titles_cache():
    """Load intermediate title resolution cache."""
    if os.path.exists(TITLES_CACHE):
        with open(TITLES_CACHE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"resolved": {}, "checked": [], "existing": []}


def save_titles_cache(cache):
    with open(TITLES_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


async def batch_check_titles(session, titles_to_check, cache, start_time):
    """Check which Wikipedia titles exist. Returns False if rate limited."""
    checked_set = set(cache["checked"])
    existing_set = set(cache["existing"])

    remaining = [t for t in titles_to_check if t not in checked_set]
    if not remaining:
        return True

    print(f"  Checking {len(remaining):,} titles ({len(checked_set):,} cached)...", flush=True)

    batch_size = 50
    for i in range(0, len(remaining), batch_size):
        batch = remaining[i:i + batch_size]
        params = {
            "action": "query",
            "titles": "|".join(batch),
            "redirects": "true",
            "format": "json",
        }
        data = await fetch_with_retry(session, params)

        if data and data.get("_rate_limited"):
            retry_after = data["_retry_after"]
            # Save progress before stopping
            cache["checked"] = list(checked_set)
            cache["existing"] = list(existing_set)
            save_titles_cache(cache)
            print(f"\n  Rate limited! Retry-After: {retry_after}s ({retry_after//60}min)", flush=True)
            print(f"  Progress saved: {len(checked_set):,} checked, {len(existing_set):,} existing", flush=True)
            print(f"  Run again with --resume after waiting.", flush=True)
            return False

        if data:
            # Track redirects
            redirect_map = cache.setdefault("redirects", {})
            for r in data.get("query", {}).get("redirects", []):
                redirect_map[r["from"]] = r["to"]

            norm_map = {}
            for n in data.get("query", {}).get("normalized", []):
                norm_map[n["to"]] = n["from"]

            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                if int(page_id) > 0:
                    page_title = page["title"]
                    existing_set.add(page_title)
                    orig = norm_map.get(page_title, page_title)
                    existing_set.add(orig)

        checked_set.update(batch)
        await asyncio.sleep(0.5)

        if (i + batch_size) % 2000 == 0 or i + batch_size >= len(remaining):
            elapsed = time.time() - start_time
            total_checked = len(checked_set)
            print(f"  Checked: {total_checked:,}/{len(titles_to_check):,} — "
                  f"existing: {len(existing_set):,} — {elapsed:.0f}s", flush=True)
            # Save periodically
            cache["checked"] = list(checked_set)
            cache["existing"] = list(existing_set)
            save_titles_cache(cache)

    cache["checked"] = list(checked_set)
    cache["existing"] = list(existing_set)
    save_titles_cache(cache)
    return True


async def main():
    resume = "--resume" in sys.argv

    movies = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                movies.append(json.loads(line))

    print(f"=== Wikipedia Plot Fetcher — {len(movies):,} movies ===", flush=True)

    # Check if we already have final output
    done_ids = set()
    if resume and os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        done_ids.add(json.loads(line)["tmdbId"])
                    except (json.JSONDecodeError, KeyError):
                        pass
        if len(done_ids) == len(movies):
            print("All done!")
            return
        if done_ids:
            print(f"  {len(done_ids):,} already in output file", flush=True)

    remaining = [m for m in movies if m["tmdbId"] not in done_ids]
    print(f"Remaining: {len(remaining):,}\n", flush=True)

    start_time = time.time()

    # Load or create cache
    cache = load_titles_cache() if resume else {"resolved": {}, "checked": [], "existing": [], "redirects": {}}

    # ── Build candidate titles (prioritized) ──
    # Pass A: "Title (YYYY film)" — most specific, best hit rate
    # Pass B: "Title (film)" — for movies without year or year match failed
    # Pass C: bare "Title" — last resort

    movie_candidates = {}
    for m in remaining:
        title = m["title"]
        year = m.get("releaseDate", "")[:4]
        cands = []
        if year:
            cands.append(f"{title} ({year} film)")
        cands.append(f"{title} (film)")
        cands.append(title)
        movie_candidates[m["tmdbId"]] = cands

    # Collect all unique candidates across all passes
    all_titles = set()
    for cands in movie_candidates.values():
        all_titles.update(cands)

    print(f"Total unique candidate titles: {len(all_titles):,}", flush=True)

    # ── PASS 1: Check page existence ──
    print("\nPass 1: Checking which Wikipedia pages exist...", flush=True)

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        success = await batch_check_titles(session, list(all_titles), cache, start_time)

    if not success:
        return  # Rate limited — will resume later

    existing_set = set(cache["existing"])
    redirect_map = cache.get("redirects", {})

    # Resolve best title per movie
    for m in remaining:
        tmdb_id = m["tmdbId"]
        if str(tmdb_id) in cache["resolved"]:
            continue
        for candidate in movie_candidates[tmdb_id]:
            resolved = redirect_map.get(candidate, candidate)
            if candidate in existing_set or resolved in existing_set:
                cache["resolved"][str(tmdb_id)] = resolved if resolved in existing_set else candidate
                break

    save_titles_cache(cache)

    resolved_count = len(cache["resolved"])
    print(f"\n  Resolved: {resolved_count:,} / {len(remaining):,} "
          f"({resolved_count/len(remaining)*100:.1f}%)\n", flush=True)

    # ── PASS 2: Fetch extracts (sequential, cached) ──
    unique_fetch_titles = list(set(cache["resolved"].values()))

    # Load extract cache for resume
    extracts_cache = cache.get("extracts", {})
    remaining_titles = [t for t in unique_fetch_titles if t not in extracts_cache]
    print(f"Pass 2: Fetching {len(remaining_titles):,} Wikipedia extracts "
          f"({len(extracts_cache):,} cached)...", flush=True)

    extracts = dict(extracts_cache)  # Start with cached
    fetch_count = len(extracts_cache)

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        rate_limited = False
        for i, title in enumerate(remaining_titles):
            params = {
                "action": "query",
                "titles": title,
                "prop": "extracts",
                "explaintext": "true",
                "exchars": "15000",  # Cap at 15K chars — Plot section is usually in first 15K
                "format": "json",
            }
            data = await fetch_with_retry(session, params)
            await asyncio.sleep(0.5)  # Be polite — one request per 0.5s

            if data and data.get("_rate_limited"):
                # Save extract cache before stopping
                cache["extracts"] = extracts
                save_titles_cache(cache)
                print(f"\n  Rate limited at {fetch_count:,} extracts. Progress saved.", flush=True)
                print(f"  Run again with --resume after waiting.", flush=True)
                rate_limited = True
                break

            if data and not data.get("_rate_limited"):
                pages = data.get("query", {}).get("pages", {})
                for page_id, page in pages.items():
                    if int(page_id) > 0:
                        text = page.get("extract", "")
                        if text:
                            extracts[title] = text

            fetch_count += 1

            if (i + 1) % 500 == 0 or i == len(remaining_titles) - 1:
                elapsed = time.time() - start_time
                rate = fetch_count / elapsed if elapsed > 0 else 0
                titles_left = len(remaining_titles) - i - 1
                eta = titles_left / rate / 60 if rate > 0 else 0
                print(f"  Fetched: {fetch_count:,}/{len(unique_fetch_titles):,} — "
                      f"with text: {len(extracts):,} — "
                      f"{rate:.1f}/s — ETA: {eta:.0f}min", flush=True)
                # Save periodically
                cache["extracts"] = extracts
                save_titles_cache(cache)

    if rate_limited:
        return

    # ── PASS 3: Extract plots and write ──
    print(f"\nPass 3: Extracting plots...", flush=True)

    mode = "a" if done_ids else "w"
    out = open(OUTPUT_FILE, mode, encoding="utf-8")
    found = 0
    not_found = 0

    for m in remaining:
        tmdb_id = m["tmdbId"]
        wiki_title = cache["resolved"].get(str(tmdb_id))
        plot = ""

        if wiki_title:
            full_text = extracts.get(wiki_title, "")
            plot = extract_plot(full_text)

        record = {
            "tmdbId": tmdb_id,
            "wikipediaTitle": wiki_title if plot else None,
            "plot": plot,
            "plotLength": len(plot),
        }
        out.write(json.dumps(record, ensure_ascii=False) + "\n")

        if plot:
            found += 1
        else:
            not_found += 1

    out.close()

    elapsed = time.time() - start_time
    print(f"\n=== Done ({elapsed/60:.1f} min) ===", flush=True)
    print(f"Plots found: {found:,} / {len(remaining):,} ({found/len(remaining)*100:.1f}%)")
    print(f"Missing: {not_found:,}")
    print(f"Output: {OUTPUT_FILE}")

    # Cleanup cache
    if os.path.exists(TITLES_CACHE):
        os.remove(TITLES_CACHE)
        print("Cleaned up titles cache.")


if __name__ == "__main__":
    asyncio.run(main())
