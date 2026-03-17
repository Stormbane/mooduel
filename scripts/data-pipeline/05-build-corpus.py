"""
Step 5: Build the final movie-input-corpus.jsonl.

Joins TMDB enriched data with Wikipedia plots into the format
the classifier expects.

Usage: python 05-build-corpus.py
Input:  data/raw/top-50k.jsonl + data/raw/wikipedia-plots.jsonl
Output: data/movie-input-corpus.jsonl
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MOVIES_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "top-50k.jsonl")
PLOTS_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "wikipedia-plots.jsonl")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl")


def main():
    print("=== Building Movie Input Corpus ===\n")

    # Load Wikipedia plots into a lookup
    plots = {}
    if os.path.exists(PLOTS_FILE):
        with open(PLOTS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    obj = json.loads(line)
                    if obj.get("plot"):
                        plots[obj["tmdbId"]] = obj
        print(f"Loaded {len(plots):,} Wikipedia plots")
    else:
        print("No Wikipedia plots file found — proceeding with TMDB data only")

    # Load and join movies
    movies = []
    with open(MOVIES_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                movies.append(json.loads(line))

    print(f"Loaded {len(movies):,} movies")

    # Build corpus
    with_plot = 0
    without_plot = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        for movie in movies:
            tmdb_id = movie["tmdbId"]
            plot_data = plots.get(tmdb_id, {})

            year = movie.get("releaseDate", "")[:4]
            year = int(year) if year and year.isdigit() else None

            record = {
                # Identifiers
                "tmdbId": tmdb_id,
                "imdbId": movie.get("imdbId"),
                "wikidataId": movie.get("wikidataId"),
                "title": movie["title"],
                "originalTitle": movie.get("originalTitle", ""),
                "year": year,

                # URLs
                "tmdbUrl": f"https://www.themoviedb.org/movie/{tmdb_id}",
                "imdbUrl": f"https://www.imdb.com/title/{movie['imdbId']}" if movie.get("imdbId") else None,
                "wikipediaUrl": f"https://en.wikipedia.org/wiki/{plot_data['wikipediaTitle'].replace(' ', '_')}" if plot_data.get("wikipediaTitle") else None,

                # Metadata
                "genres": movie.get("genres", []),
                "keywords": movie.get("keywords", []),
                "originalLanguage": movie.get("originalLanguage", ""),
                "releaseDate": movie.get("releaseDate", ""),
                "runtime": movie.get("runtime"),
                "popularity": movie.get("popularity", 0),
                "voteCount": movie.get("voteCount", 0),
                "voteAverage": movie.get("voteAverage", 0),
                "tagline": movie.get("tagline", ""),

                # Text for classification
                "overview": movie.get("overview", ""),
                "wikipediaPlot": plot_data.get("plot", ""),

                # Sources
                "inputSources": ["tmdb"] + (["wikipedia"] if plot_data.get("plot") else []),
            }

            out.write(json.dumps(record, ensure_ascii=False) + "\n")

            if plot_data.get("plot"):
                with_plot += 1
            else:
                without_plot += 1

    total = with_plot + without_plot
    print(f"\n=== Corpus Built ===")
    print(f"Total movies: {total:,}")
    print(f"With Wikipedia plot: {with_plot:,} ({with_plot/total*100:.1f}%)")
    print(f"TMDB overview only: {without_plot:,} ({without_plot/total*100:.1f}%)")
    print(f"Output: {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE):,} bytes")


if __name__ == "__main__":
    main()
