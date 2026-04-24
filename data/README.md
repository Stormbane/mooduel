# Data — raw & intermediate

This directory holds large raw and intermediate data files from the Mooduel
pipeline. They are **deliberately gitignored** (see `../.gitignore`).

Back up manually to Google Drive; the live dataset is mirrored in Supabase
and released in `/dataset/`.

## What lives here

| File / dir | Size | Regeneratable? | Notes |
|---|---|---|---|
| `raw/` | ~1.4 GB | yes — from TMDB + Wikipedia scrapes | Raw scraped pages, TMDB responses. Largest. |
| `movie-input-corpus.jsonl` | ~83 MB | yes — via `scripts/data-pipeline/05-build-corpus.py` | Joined input corpus fed to the classifier. |
| `movie-mood-scores.jsonl` | ~43 MB | expensive — costs API credits to regenerate | **Canonical classifier output, 30,611 records.** This is the one you don't want to lose. |
| `movie-mood-scores-batch1-parsed.jsonl.bak` | ~11 MB | — | Backup of an earlier batch parse. |
| `batch-log*.jsonl` | small | — | Anthropic batch API logs. |
| `mood-scores*/` | small | — | Small test-run JSON files (v1 and v2). In git. |
| `test-*-results.json` | small | — | Classifier validation runs. In git. |

## Recovery strategy

- **Supabase** — `movies` table is the live source of truth. Re-export with
  `npm run export:dataset` if needed.
- **Google Drive** — manual sync of `movie-mood-scores.jsonl` (43 MB) is the
  critical backup. Everything else can be regenerated from it + TMDB.
- **HuggingFace** — the `/dataset/` publish is the public-facing archival
  copy.

## Pipeline

Regeneration steps live in `scripts/data-pipeline/` (TMDB → enrich → corpus)
and `scripts/mood-classifier/` (corpus → mood scores via Claude Haiku).
