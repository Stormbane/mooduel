"""
Step 2: Enrich TMDB candidates with full movie details.

Reads tmdb-candidates.jsonl and fetches full details from TMDB API for each movie:
  - overview, genres, keywords, runtime, release_date, original_language
  - vote_count, vote_average, popularity
  - external IDs (imdb_id, wikidata_id)

Uses append_to_response to combine movie details + keywords + external_ids in one call.
Async with 40 concurrent requests, rate-limited to ~45 req/s.

Usage: python 02-enrich-tmdb.py [--resume]
Output: data/raw/tmdb-enriched.jsonl (append-safe, supports resume)
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
CANDIDATES_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "tmdb-candidates.jsonl")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "tmdb-enriched.jsonl")

# Load TMDB token from .env.local
ENV_FILE = os.path.join(PROJECT_ROOT, ".env.local")
TMDB_TOKEN = None
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            if line.startswith("TMDB_READ_ACCESS_TOKEN="):
                TMDB_TOKEN = line.split("=", 1)[1].strip()
                break

if not TMDB_TOKEN:
    print("ERROR: TMDB_READ_ACCESS_TOKEN not found in .env.local")
    sys.exit(1)

CONCURRENCY = 40  # Max concurrent requests
RATE_LIMIT = 45   # Requests per second


def extract_fields(raw):
    """Extract the fields we need from the TMDB response."""
    ext = raw.get("external_ids", {})
    kw = raw.get("keywords", {})

    return {
        "tmdbId": raw["id"],
        "imdbId": ext.get("imdb_id"),
        "wikidataId": ext.get("wikidata_id"),
        "title": raw.get("title", ""),
        "originalTitle": raw.get("original_title", ""),
        "overview": raw.get("overview", ""),
        "tagline": raw.get("tagline", ""),
        "genres": [g["name"] for g in raw.get("genres", [])],
        "keywords": [k["name"] for k in kw.get("keywords", [])],
        "originalLanguage": raw.get("original_language", ""),
        "releaseDate": raw.get("release_date", ""),
        "runtime": raw.get("runtime"),
        "popularity": raw.get("popularity", 0),
        "voteCount": raw.get("vote_count", 0),
        "voteAverage": raw.get("vote_average", 0),
        "adult": raw.get("adult", False),
        "status": raw.get("status", ""),
    }


def load_done_ids():
    """Load already-enriched movie IDs for resume support."""
    done = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        obj = json.loads(line)
                        done.add(obj["tmdbId"])
                    except (json.JSONDecodeError, KeyError):
                        continue
    return done


async def fetch_movie(session, semaphore, rate_limiter, movie_id):
    """Fetch movie details + keywords + external_ids in one API call."""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?language=en-US&append_to_response=keywords,external_ids"

    async with semaphore:
        async with rate_limiter:
            for attempt in range(3):
                try:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        if resp.status == 404:
                            return None
                        if resp.status == 429:
                            retry_after = int(resp.headers.get("Retry-After", "2"))
                            await asyncio.sleep(retry_after)
                            continue
                        resp.raise_for_status()
                        return await resp.json()
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    if attempt < 2:
                        await asyncio.sleep(1)
                        continue
                    return None
    return None


class RateLimiter:
    """Token bucket rate limiter as async context manager."""
    def __init__(self, rate):
        self.rate = rate
        self.tokens = rate
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def __aenter__(self):
        while True:
            async with self.lock:
                now = time.monotonic()
                elapsed = now - self.last_refill
                self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
                self.last_refill = now

                if self.tokens >= 1:
                    self.tokens -= 1
                    return self

            await asyncio.sleep(1.0 / self.rate)

    async def __aexit__(self, *args):
        pass


async def main():
    resume = "--resume" in sys.argv

    # Load candidates
    candidates = []
    with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                candidates.append(json.loads(line))

    print(f"=== TMDB Enrichment — {len(candidates):,} candidates ===\n")

    # Resume support
    done_ids = set()
    if resume:
        done_ids = load_done_ids()
        print(f"Resume mode: {len(done_ids):,} already enriched")

    remaining = [c for c in candidates if c["id"] not in done_ids]
    print(f"Remaining to fetch: {len(remaining):,}")

    if not remaining:
        print("Nothing to do!")
        return

    print(f"Concurrency: {CONCURRENCY}, Rate limit: {RATE_LIMIT}/s")
    print(f"Estimated time: ~{len(remaining) / RATE_LIMIT / 60:.0f} minutes\n")

    # Open output file
    mode = "a" if resume else "w"
    out = open(OUTPUT_FILE, mode, encoding="utf-8")

    semaphore = asyncio.Semaphore(CONCURRENCY)
    rate_limiter = RateLimiter(RATE_LIMIT)

    headers = {
        "Authorization": f"Bearer {TMDB_TOKEN}",
        "Content-Type": "application/json",
    }

    fetched = 0
    skipped = 0
    start_time = time.time()
    last_title = ""

    async with aiohttp.ClientSession(headers=headers) as session:
        # Process in chunks for orderly progress reporting
        chunk_size = 500
        for chunk_start in range(0, len(remaining), chunk_size):
            chunk = remaining[chunk_start:chunk_start + chunk_size]

            tasks = [
                fetch_movie(session, semaphore, rate_limiter, c["id"])
                for c in chunk
            ]
            results = await asyncio.gather(*tasks)

            for raw in results:
                if raw is None:
                    skipped += 1
                    continue

                movie = extract_fields(raw)
                if not movie["overview"]:
                    skipped += 1
                    continue

                out.write(json.dumps(movie, ensure_ascii=False) + "\n")
                fetched += 1
                last_title = movie.get("title", "?")

            out.flush()

            # Progress
            total_done = fetched + skipped + len(done_ids)
            pct = total_done / len(candidates) * 100
            elapsed = time.time() - start_time
            rate = (fetched + skipped) / elapsed if elapsed > 0 else 0
            eta = (len(remaining) - chunk_start - len(chunk)) / rate / 60 if rate > 0 else 0
            print(f"  [{total_done:,}/{len(candidates):,}] {pct:.1f}% — "
                  f"fetched: {fetched:,}, skipped: {skipped:,} — "
                  f"{rate:.1f}/s — ETA: {eta:.0f}min — "
                  f"latest: {last_title[:40]}")

    out.close()

    total_enriched = fetched + len(done_ids)
    elapsed = time.time() - start_time
    print(f"\n=== Done ({elapsed/60:.1f} min) ===")
    print(f"Total enriched: {total_enriched:,}")
    print(f"Skipped (404/no overview): {skipped:,}")
    print(f"Output: {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE):,} bytes")


if __name__ == "__main__":
    asyncio.run(main())
