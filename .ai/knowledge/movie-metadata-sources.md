# Movie Metadata Sources for LLM Mood Classification

Research date: 2026-03-14

---

## 1. TMDB (The Movie Database)

### Available Fields (Movie Details endpoint)
- `overview` - Plot synopsis (typically 2-5 sentences, ~50-150 words)
- `tagline` - Short promotional tagline
- `genres` - Genre list (Action, Drama, etc.)
- `keywords` - User-contributed plot keywords (accessible via separate endpoint)
- `title`, `original_title`
- `release_date`, `runtime`, `status`
- `vote_average`, `vote_count`, `popularity`
- `budget`, `revenue`
- `production_companies`, `production_countries`, `spoken_languages`
- `belongs_to_collection`
- `poster_path`, `backdrop_path`
- `imdb_id` (cross-reference key)
- Also available: credits (cast/crew), similar movies, recommendations

### Rate Limits
- ~50 requests/second per IP (CDN-enforced)
- No daily request cap
- Very permissive for bulk operations

### Bulk Export / Data Dumps
- **Daily ID exports** at `https://files.tmdb.org/p/exports/`
- Export types: Movies, TV Series, People, Collections, Keywords, TV Networks, Production Companies
- Format: gzipped JSONL (one JSON object per line), NOT full details -- just IDs + basic metadata (adult flag, popularity, video indicator)
- Files available for ~3 months, generated daily at ~7:00 AM UTC
- No auth required to download exports
- **Strategy**: Download daily movie ID export, then hydrate via API calls (at 50 req/s, 100K movies takes ~30 minutes)

### Synopsis Quality
- Moderate length, community-curated, generally consistent
- Good for basic mood classification but not deeply descriptive
- **Weakness**: Overviews are marketing-style summaries, not detailed plot descriptions

### Licensing
- Free for non-commercial use with attribution (TMDB logo + disclaimer)
- Commercial use requires commercial license agreement
- Ads on a website do NOT make it "commercial"
- Open source projects: fine for non-commercial use with attribution
- **Cannot redistribute raw TMDB data** -- must access via API
- Cannot cache/store data beyond what's needed for your app

### Kaggle Mirror: Full TMDB Movies Dataset (1M Movies)
- ~1,000,000 movies, updated daily
- Includes overviews, genres, ratings, budget, revenue, runtime, popularity
- License: ODC Attribution License (ODC-By)
- ~249 MB download
- **This is the easiest way to get bulk TMDB data without crawling**

---

## 2. OMDb (Open Movie Database)

### Fields
- `Title`, `Year`, `Rated` (MPAA rating), `Released`, `Runtime`
- `Genre`, `Director`, `Writer`, `Actors`
- `Plot` -- available in **short** (~1-2 sentences) or **full** (~paragraph) versions
- `Language`, `Country`, `Awards`
- `Poster` URL
- `Ratings` array: IMDb, Rotten Tomatoes, Metacritic scores
- `Metascore`, `imdbRating`, `imdbVotes`
- `Type` (movie, series, episode)
- `BoxOffice`, `Production`
- `DVD` release date

### What OMDb Has That TMDB Doesn't
- **Rotten Tomatoes score** (Tomatometer)
- **Metacritic score** (Metascore)
- MPAA content rating (`Rated` field)
- More structured awards info

### Rate Limits
- Free tier: **1,000 requests/day** (very limiting for bulk work)
- Paid tiers available (Patreon-based)
- No bulk export available

### Synopsis Quality
- Full plot is more detailed than TMDB overview
- Sourced from IMDb, generally well-written
- **Better for mood classification than TMDB's overview**

### Licensing
- Free for non-commercial use
- Requires API key (free registration)
- Rate limit makes bulk use impractical without paid tier

---

## 3. IMDb Non-Commercial Datasets

### Available Files (from datasets.imdbws.com)
| File | Contents |
|------|----------|
| `title.basics.tsv.gz` | titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres |
| `title.ratings.tsv.gz` | averageRating, numVotes |
| `title.crew.tsv.gz` | directors, writers (nconst IDs) |
| `title.principals.tsv.gz` | Cast/crew with category, job, characters |
| `title.akas.tsv.gz` | Alternative titles by region |
| `title.episode.tsv.gz` | TV episode info |
| `name.basics.tsv.gz` | Person info: name, birth/death year, profession, knownForTitles |

### What's NOT Included
- **No plot summaries**
- **No reviews**
- **No keywords/tags**
- No poster images
- No budget/revenue data

### Licensing
- **Non-commercial use only**
- Cannot redistribute
- Must cite IMDb
- Updated daily

### Verdict
Useful for structured metadata (ratings, genres, cast/crew) but **useless for mood classification** due to lack of textual content.

---

## 4. Wikidata / Wikipedia

### Wikidata (Structured)
- Queryable via SPARQL endpoint
- Movie properties: genre, director, cast, country, release date, awards, MPAA rating
- Cross-reference IDs: IMDb, TMDB, Freebase, etc.
- Coverage: good for popular movies, sparse for obscure titles
- **No plot summaries in Wikidata itself**

### Wikipedia (Plot Summaries)
- Plot sections in Wikipedia articles are typically **300-1000 words** -- much longer than TMDB/OMDb
- **Best free source of detailed plot descriptions**
- Available via Wikipedia API or dumps

### CMU Movie Summary Corpus
- 42,306 movie plot summaries extracted from Wikipedia (2012 dump)
- Aligned with Freebase metadata (genres, release dates, box office)
- Character-level metadata (gender, age)
- Pre-processed through Stanford CoreNLP
- **Dated but excellent for training/baseline**

### WikiPlots Corpus
- 112,936 story plots from English Wikipedia (movies, books, etc.)
- Broader coverage than CMU corpus

### Quality Assessment
- Wikipedia plots are the **longest and most descriptive** freely available summaries
- Excellent for mood classification -- they describe emotional arcs, themes, tone
- Coverage is strong for popular/notable movies, weak for obscure titles
- **No licensing issues for derived data** (CC BY-SA)

---

## 5. Letterboxd

### API Access
- Official API exists but is **invite-only** (email api@letterboxd.com)
- **They explicitly do NOT grant access for data analysis, visualization, recommendation, or LLM projects**
- No public API documentation

### Reviews
- Letterboxd reviews are often emotionally descriptive and mood-rich
- Users frequently describe how a movie made them feel
- **Would be excellent for mood classification if accessible**

### Alternative Access
- Third-party scrapers exist (Apify, etc.) but violate ToS
- Users can export their own data (watched, ratings, reviews, diary)
- No bulk public dataset available

### Verdict
**Not viable as a data source.** API access is restricted, scraping violates ToS, and there's no public dataset. The reviews would be gold for mood classification, but they're inaccessible at scale.

---

## 6. MovieLens Tag Genome

### Dataset Overview
- **1,128 tags** scored against **9,734 movies**
- Each movie-tag pair has a relevance score from 0.0 to 1.0
- Tags computed via ML on user tags, ratings, and textual reviews
- Tag Genome 2021 version: 1,084 tags, 9,734 movies, 10.5M relevance scores

### Example Tags (mood/atmosphere relevant)
- Atmospheric, thought-provoking, realistic, dark, funny, violent
- Cult film, cerebral, big budget, nonlinear
- Tags span visual qualities, thematic properties, production characteristics

### How It Works
- Continuous relevance scores (not binary)
- E.g., Pulp Fiction might score 0.95 on "dark", 0.87 on "nonlinear", 0.92 on "violent"
- Allows nuanced filtering: "like Pulp Fiction but less dark"

### Licensing
- Available for research and non-commercial use
- From GroupLens Research, University of Minnesota
- Well-established in recommender systems research

### Mood Classification Value
- **Extremely valuable as pre-existing mood/tone features**
- Tags like "atmospheric", "dark", "feel-good", "thought-provoking" directly map to mood dimensions
- Could serve as ground truth or supplementary features
- **Limitation**: Only covers ~10K movies (popular/well-rated films)

---

## 7. Kaggle Datasets

### Rotten Tomatoes Movies + Critic Reviews
- **17,000+ movies** with critic reviews
- **CC0 Public Domain license** -- fully open
- Movies file: title, description, genres, duration, director, actors, tomatometer, audience score
- Critics file: critic name, publication, date, score, **full review text**
- Data as of 2020-10-31 (not actively updated)
- **Excellent source of critic review text for mood analysis**

### TMDB 5000 Movies Dataset
- 5,000 movies with credits, keywords, overviews
- Older but well-structured

### IMDB 50K Movie Reviews
- 50,000 movie reviews labeled positive/negative
- Good for sentiment but not structured by movie

### Cornell Movie Review Data (Hugging Face)
- 5,331 positive + 5,331 negative Rotten Tomatoes sentences
- Preprocessed for sentiment analysis
- Too short for mood classification

---

## Key Questions Answered

### Best source for plot synopsis for mood classification?
**Wikipedia** (via CMU corpus or direct extraction). Wikipedia plots are 300-1000 words, describe emotional arcs and themes in detail. TMDB overviews are too short (50-150 words). OMDb full plots are moderate but behind a rate limit.

**Recommended approach**: Use Wikipedia plots as primary text, TMDB overview as fallback for movies without Wikipedia articles.

### Which sources include reviews for mood enhancement?
1. **Kaggle Rotten Tomatoes dataset** (17K movies, full critic reviews, CC0 license) -- best option
2. **IMDb 50K reviews** (sentiment-labeled but not movie-structured)
3. **Letterboxd** -- inaccessible at scale
4. **Cornell/Hugging Face RT data** -- too short

### Is there a source with existing emotional tags/tone descriptors?
**MovieLens Tag Genome** is the best existing source. Tags like "atmospheric", "dark", "feel-good", "thought-provoking" with continuous relevance scores. Covers ~10K movies.

### Can we legally use these for open-source and redistribute derived data (mood scores)?
| Source | Use in open-source? | Redistribute derived scores? |
|--------|---------------------|------------------------------|
| TMDB | Yes (with attribution) | Yes (derived data, not raw) |
| OMDb | Yes (non-commercial) | Yes (derived scores) |
| IMDb datasets | Non-commercial only | Derived scores likely OK |
| Wikipedia/CMU | Yes (CC BY-SA) | Yes |
| MovieLens Tag Genome | Research/non-commercial | Derived scores likely OK |
| Kaggle RT dataset | Yes (CC0) | Yes, fully open |
| Letterboxd | No | No |

**Key insight**: You can redistribute **derived mood scores** (your own classification output) even if the source data has restrictions. You just can't redistribute the raw source data.

### Best strategy: one source or combine multiple?
**Combine multiple.** Recommended stack:

| Layer | Source | Purpose |
|-------|--------|---------|
| Plot text | Wikipedia (CMU corpus or fresh extraction) | Primary text for LLM mood classification |
| Synopsis fallback | TMDB overview (Kaggle 1M dataset) | For movies without Wikipedia articles |
| Structured metadata | TMDB (genres, keywords, runtime, rating) | Feature enrichment |
| Critic reviews | Kaggle RT dataset (CC0) | 2-3 representative reviews per movie for mood signal |
| Existing mood tags | MovieLens Tag Genome | Ground truth / validation / bootstrapping |
| Aggregate scores | OMDb (RT + Metacritic scores) | Supplementary signals |

### Does TMDB have bulk export?
Yes, but only ID lists (not full details). Daily exports at `files.tmdb.org` give you movie IDs + popularity. You then hydrate via API at ~50 req/s. Alternatively, use the **Kaggle TMDB 1M dataset** (ODC-By license, updated daily, includes overviews).

### Would including reviews improve LLM mood classification?
**Yes, significantly.** Reviews describe subjective emotional experience ("this movie left me feeling hollow", "uplifting and heartwarming"). Plot summaries describe what happens; reviews describe how it feels. Even 2-3 representative critic reviews would substantially improve mood classification accuracy.

### Rotten Tomatoes critics consensus -- accessible?
- Not via any official API (RT shut down their public API years ago)
- The Kaggle RT dataset includes individual critic reviews and scores but the "critics consensus" blurb specifically is not confirmed as a field
- Best alternative: use the top 2-3 scored critic review excerpts as a proxy

### Aggregated review sentiment?
- OMDb provides RT Tomatometer + Metacritic scores (aggregated scores, not sentiment)
- No public API provides pre-computed review sentiment
- The Kaggle RT dataset (CC0) is your best bet for computing your own sentiment from raw review text

---

## Recommended Data Pipeline

```
1. Start with Kaggle TMDB 1M dataset (overviews, genres, metadata)
2. Enrich with Wikipedia plots (CMU corpus or fresh MediaWiki API extraction)
3. Add Kaggle RT critic reviews (2-3 per movie, CC0)
4. Cross-reference MovieLens Tag Genome for validation/bootstrapping
5. Use OMDb sparingly for RT/Metacritic scores on priority movies
6. Feed combined text (plot + reviews) to LLM for mood dimension scoring
7. Redistribute only your derived mood scores (not source text)
```

---

## Sources

- [TMDB API Docs](https://developer.themoviedb.org/reference/intro/getting-started)
- [TMDB Daily ID Exports](https://developer.themoviedb.org/docs/daily-id-exports)
- [TMDB Rate Limiting](https://developer.themoviedb.org/docs/rate-limiting)
- [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use)
- [OMDb API](https://www.omdbapi.com/)
- [IMDb Non-Commercial Datasets](https://developer.imdb.com/non-commercial-datasets/)
- [Letterboxd API](https://api-docs.letterboxd.com/)
- [MovieLens Tag Genome](https://grouplens.org/datasets/movielens/tag-genome-2021/)
- [Tag Genome README](https://files.grouplens.org/datasets/tag-genome/README.html)
- [Kaggle TMDB 1M Movies](https://www.kaggle.com/datasets/asaniczka/tmdb-movies-dataset-2023-930k-movies)
- [Kaggle RT Movies + Critic Reviews](https://www.kaggle.com/datasets/stefanoleone992/rotten-tomatoes-movies-and-critic-reviews-dataset)
- [CMU Movie Summary Corpus](http://www.ark.cs.cmu.edu/personas/)
- [WikiPlots Corpus](https://github.com/markriedl/WikiPlots)
- [Cornell Movie Review Data (Hugging Face)](https://huggingface.co/datasets/cornell-movie-review-data/rotten_tomatoes)
- [Zuplo: IMDb vs TMDb vs OMDb comparison](https://zuplo.com/learning-center/best-movie-api-imdb-vs-omdb-vs-tmdb)
- [Mood-Based Movie Recommendation (Medium)](https://medium.com/@indubarnwal752/mood-based-movie-recommendation-system-part-1-0466bdf059a2)
- [LLM Movie Domain Adaptation (ACL 2025)](https://aclanthology.org/2025.conll-1.13.pdf)
