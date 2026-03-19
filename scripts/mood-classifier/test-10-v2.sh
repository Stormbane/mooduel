#!/bin/bash
# Test the v2 classifier on 10 movies from the corpus.
# Uses corpus data (enriched with reviews, tags, etc.) rather than live fetches.
# Usage: ./test-10-v2.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
CORPUS="$PROJECT_ROOT/data/movie-input-corpus.jsonl"
SCHEMA="$SCRIPT_DIR/schema.json"
PROMPT="$SCRIPT_DIR/prompt.txt"
OUTPUT_DIR="$PROJECT_ROOT/data/mood-scores-v2"
COMBINED="$PROJECT_ROOT/data/test-10-v2-results.json"

mkdir -p "$OUTPUT_DIR"

# 10 movies spanning the full mood space
# Same set as v1 test for comparison
MOVIES=(
  "278:The Shawshank Redemption"
  "8363:Superbad"
  "76341:Mad Max: Fury Road"
  "493922:Hereditary"
  "376867:Moonlight"
  "496243:Parasite"
  "120467:The Grand Budapest Hotel"
  "14160:Up"
  "37799:The Social Network"
  "545611:Everything Everywhere All at Once"
)

SYSTEM_PROMPT=$(cat "$PROMPT")
SCHEMA_JSON=$(cat "$SCHEMA")

echo "=== Movie Mood Classification Test v2 (10 movies) ==="
echo "Schema: v2 (with watchContext, vibeSentence, pacing, endingType, etc.)"
echo "Source: corpus (enriched with RT reviews, MovieLens tags)"
echo ""

FAILED=0
SUCCEEDED=0

for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  NAME="${ENTRY#*:}"

  echo "─────────────────────────────────────"
  echo "[$TMDB_ID] $NAME"
  echo "─────────────────────────────────────"

  # Extract movie data from corpus
  MOVIE_JSON=$(grep "\"tmdbId\":${TMDB_ID}," "$CORPUS" | head -1)

  if [ -z "$MOVIE_JSON" ]; then
    echo "  ERROR: Movie $TMDB_ID not found in corpus" >&2
    FAILED=$((FAILED + 1))
    continue
  fi

  # Build user prompt from corpus data
  TITLE=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.title)")
  YEAR=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.year||'')")
  GENRES=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((m.genres||[]).join(', '))")
  RUNTIME=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.runtime||'')")
  LANGUAGE=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.originalLanguage||'')")
  TAGLINE=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.tagline||'')")
  KEYWORDS=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((m.keywords||[]).join(', '))")
  OVERVIEW=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.overview||'')")
  PLOT=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((m.wikipediaPlot||'').slice(0,4000))")
  CERT=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.certification||'')")
  SOURCES=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((m.inputSources||[]).join(', '))")

  # Build reviews section
  REVIEWS=$(echo "$MOVIE_JSON" | node -e "
    const m=JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!m.reviews || m.reviews.length===0) { process.exit(0); }
    const lines = m.reviews.slice(0,3).map(r => {
      const label = r.source==='rt' ? '[RT'+(r.isTopCritic?' Top Critic':'')+']' : '[TMDB User]';
      const sent = r.sentiment ? ' ('+r.sentiment+')' : '';
      return label+sent+' '+r.text.slice(0,500);
    });
    console.log(lines.join('\n\n'));
  ")

  # Build MovieLens tags section
  ML_TAGS=$(echo "$MOVIE_JSON" | node -e "
    const m=JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!m.movieLensTags) { process.exit(0); }
    const tags = Object.entries(m.movieLensTags).slice(0,10).map(([t,r])=>t+' ('+r+')').join(', ');
    console.log(tags);
  ")

  # Assemble user prompt
  USER_PROMPT="Classify the mood dimensions of this movie.

TITLE: $TITLE
YEAR: $YEAR
GENRES: $GENRES"

  [ -n "$RUNTIME" ] && USER_PROMPT="$USER_PROMPT
RUNTIME: ${RUNTIME}min"
  [ -n "$LANGUAGE" ] && USER_PROMPT="$USER_PROMPT
LANGUAGE: $LANGUAGE"
  [ -n "$TAGLINE" ] && USER_PROMPT="$USER_PROMPT
TAGLINE: $TAGLINE"
  [ -n "$KEYWORDS" ] && USER_PROMPT="$USER_PROMPT
KEYWORDS: $KEYWORDS"
  [ -n "$CERT" ] && USER_PROMPT="$USER_PROMPT
CERTIFICATION: $CERT"

  [ -n "$OVERVIEW" ] && USER_PROMPT="$USER_PROMPT

TMDB OVERVIEW:
$OVERVIEW"

  [ -n "$PLOT" ] && USER_PROMPT="$USER_PROMPT

WIKIPEDIA PLOT SUMMARY:
$PLOT"

  [ -n "$REVIEWS" ] && USER_PROMPT="$USER_PROMPT

CRITIC/USER REVIEWS:
$REVIEWS"

  [ -n "$ML_TAGS" ] && USER_PROMPT="$USER_PROMPT

MOVIELENS TAGS: $ML_TAGS"

  USER_PROMPT="$USER_PROMPT

Score this movie on all dimensions. Use the full range of each scale."

  echo "  Sources: $SOURCES" >&2
  echo "  Reviews: $(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((m.reviews||[]).length)")" >&2
  echo "  ML tags: $(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Object.keys(m.movieLensTags||{}).length)")" >&2
  echo "  Classifying..." >&2

  # Call claude -p
  RESULT=$(echo "$USER_PROMPT" | claude -p \
    --model haiku \
    --output-format json \
    --max-turns 2 \
    --allowedTools "" \
    --system-prompt "$SYSTEM_PROMPT" \
    --json-schema "$SCHEMA_JSON")

  MOOD_SCORE=$(echo "$RESULT" | jq '.structured_output // empty')
  if [ -z "$MOOD_SCORE" ] || [ "$MOOD_SCORE" = "null" ]; then
    echo "  ERROR: No structured_output from claude" >&2
    echo "$RESULT" | jq '{subtype, result, errors}' >&2
    FAILED=$((FAILED + 1))
    continue
  fi

  # Build output record
  IMDB_ID=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.imdbId||'')")
  VOTE_AVG=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.voteAverage||0)")
  VOTE_COUNT=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.voteCount||0)")
  POPULARITY=$(echo "$MOVIE_JSON" | node -e "const m=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(m.popularity||0)")

  OUTPUT=$(jq -n \
    --argjson tmdbId "$TMDB_ID" \
    --arg imdbId "$IMDB_ID" \
    --arg title "$TITLE" \
    --argjson year "${YEAR:-null}" \
    --arg genres "$GENRES" \
    --arg originalLanguage "$LANGUAGE" \
    --argjson runtime "${RUNTIME:-null}" \
    --argjson tmdbPopularity "${POPULARITY:-0}" \
    --argjson tmdbVoteCount "${VOTE_COUNT:-0}" \
    --argjson tmdbRating "${VOTE_AVG:-null}" \
    --arg tmdbUrl "https://www.themoviedb.org/movie/$TMDB_ID" \
    --arg sources "$SOURCES" \
    --arg cert "${CERT:-}" \
    --argjson moodScore "$MOOD_SCORE" \
    '{
      tmdbId: $tmdbId,
      imdbId: (if $imdbId == "" then null else $imdbId end),
      title: $title,
      year: $year,
      genres: ($genres | split(", ")),
      originalLanguage: $originalLanguage,
      runtime: $runtime,
      tmdbPopularity: $tmdbPopularity,
      tmdbVoteCount: $tmdbVoteCount,
      tmdbRating: $tmdbRating,
      tmdbUrl: $tmdbUrl,
      certification: (if $cert == "" then null else $cert end),
      inputSources: ($sources | split(", ")),
      classifierModel: "claude-haiku-4-5",
      classifierVersion: "2.0.0",
      classifiedAt: (now | todate),
    } + $moodScore')

  echo "$OUTPUT" | jq . > "$OUTPUT_DIR/${TMDB_ID}.json"
  echo "  ✓ Saved" >&2
  SUCCEEDED=$((SUCCEEDED + 1))
  echo ""
done

# Combine results
echo "=== Combining results ==="
RESULTS="[]"
for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    RESULTS=$(echo "$RESULTS" | jq --slurpfile r "$FILE" '. + $r')
  fi
done
echo "$RESULTS" | jq . > "$COMBINED"

echo ""
echo "=== SUMMARY ==="
echo "Classified: $SUCCEEDED / ${#MOVIES[@]}"
echo "Failed: $FAILED"
echo "Results: $COMBINED"
echo ""

# Comparison table
echo "=== SCORES ==="
printf "%-28s %5s %5s %5s %5s %5s %5s %5s %5s %5s %-12s %-10s\n" "TITLE" "V" "A" "D" "ABS" "HED" "EUD" "RICH" "CMF" "CNV" "ARC" "PACING"
echo "──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────"

for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    jq -r '[
      .title[:26],
      (.valence | tostring),
      (.arousal | tostring),
      (.dominance | tostring),
      (.absorptionPotential | tostring),
      (.hedonicValence | tostring),
      (.eudaimonicValence | tostring),
      (.psychologicallyRichValence | tostring),
      (.comfortLevel | tostring),
      (.conversationPotential | tostring),
      .emotionalArc,
      .pacing
    ] | @tsv' "$FILE" | awk -F'\t' '{printf "%-28s %5s %5s %5s %5s %5s %5s %5s %5s %5s %-12s %-10s\n", $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12}'
  fi
done

echo ""
echo "=== VIBES + CONTEXT ==="
for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    TITLE=$(jq -r '.title[:28]' "$FILE")
    VIBE=$(jq -r '.vibeSentence' "$FILE")
    CONTEXT=$(jq -r '.watchContext | join(", ")' "$FILE")
    ENDING=$(jq -r '.endingType' "$FILE")
    SAFETY=$(jq -r '.emotionalSafetyWarnings | join(", ")' "$FILE")
    printf "%-28s  %-10s  %-14s  vibe: %s\n" "$TITLE" "$CONTEXT" "$ENDING" "$VIBE"
    if [ -n "$SAFETY" ]; then
      printf "%-28s  warnings: %s\n" "" "$SAFETY"
    fi
  fi
done

echo ""
echo "=== MOOD TAGS + EMOTIONS ==="
for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    TITLE=$(jq -r '.title[:28]' "$FILE")
    TAGS=$(jq -r '.moodTags | join(", ")' "$FILE")
    EMOTIONS=$(jq -r '.dominantEmotions | join(", ")' "$FILE")
    printf "%-28s  emotions: %-28s  tags: %s\n" "$TITLE" "$EMOTIONS" "$TAGS"
  fi
done
