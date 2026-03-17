#!/bin/bash
# Run the full data pipeline for movie-input-corpus.jsonl
# Usage: bash run-all.sh [--resume]
#
# Steps:
#   01 — Download TMDB daily export, select top 60K by popularity
#   02 — Enrich with TMDB API (details, keywords, external IDs) ~25min
#   03 — Score and select top 50K
#   04 — Fetch Wikipedia plot summaries ~40min
#   05 — Build final movie-input-corpus.jsonl

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESUME_FLAG="${1:-}"

echo "====================================="
echo "  Movie Mood Dataset — Data Pipeline"
echo "====================================="
echo ""

# Step 1: TMDB daily export
echo ">>> Step 1: Downloading TMDB daily export..."
python "$SCRIPT_DIR/01-fetch-tmdb-ids.py"
echo ""

# Step 2: Enrich from TMDB API
echo ">>> Step 2: Enriching from TMDB API..."
python "$SCRIPT_DIR/02-enrich-tmdb.py" $RESUME_FLAG
echo ""

# Step 3: Score and select top 50K
echo ">>> Step 3: Selecting top 50K..."
python "$SCRIPT_DIR/03-select-top-50k.py"
echo ""

# Step 4: Wikipedia plots
echo ">>> Step 4: Fetching Wikipedia plots..."
python "$SCRIPT_DIR/04-fetch-wikipedia-plots.py" $RESUME_FLAG
echo ""

# Step 5: Build corpus
echo ">>> Step 5: Building final corpus..."
python "$SCRIPT_DIR/05-build-corpus.py"
echo ""

echo "====================================="
echo "  Pipeline complete!"
echo "====================================="
