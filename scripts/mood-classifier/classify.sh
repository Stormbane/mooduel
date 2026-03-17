#!/bin/bash
# Classify a single movie's mood dimensions using claude -p
# Usage: ./classify.sh <tmdb_id>
# Requires: TMDB_READ_ACCESS_TOKEN env var, claude CLI

set -euo pipefail

TMDB_ID="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/schema.json"
PROMPT_FILE="$SCRIPT_DIR/prompt.txt"
OUTPUT_DIR="$SCRIPT_DIR/../../data/mood-scores"

mkdir -p "$OUTPUT_DIR"

# Check env
if [ -z "${TMDB_READ_ACCESS_TOKEN:-}" ]; then
  # Try loading from .env.local
  if [ -f "$SCRIPT_DIR/../../.env.local" ]; then
    export TMDB_READ_ACCESS_TOKEN=$(grep TMDB_READ_ACCESS_TOKEN "$SCRIPT_DIR/../../.env.local" | cut -d'=' -f2-)
  fi
fi

if [ -z "${TMDB_READ_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: TMDB_READ_ACCESS_TOKEN not set" >&2
  exit 1
fi

TMDB_HEADERS="Authorization: Bearer $TMDB_READ_ACCESS_TOKEN"

# ── Fetch TMDB movie details ──
echo "Fetching TMDB data for movie $TMDB_ID..." >&2
TMDB_DATA=$(curl -s "https://api.themoviedb.org/3/movie/${TMDB_ID}?language=en-US&append_to_response=keywords" \
  -H "$TMDB_HEADERS" -H "Content-Type: application/json")

TITLE=$(echo "$TMDB_DATA" | jq -r '.title // empty')
if [ -z "$TITLE" ]; then
  echo "ERROR: Could not fetch movie $TMDB_ID from TMDB" >&2
  exit 1
fi

ORIGINAL_TITLE=$(echo "$TMDB_DATA" | jq -r '.original_title // empty')
OVERVIEW=$(echo "$TMDB_DATA" | jq -r '.overview // empty')
GENRES=$(echo "$TMDB_DATA" | jq -r '[.genres[].name] | join(", ")')
RELEASE_DATE=$(echo "$TMDB_DATA" | jq -r '.release_date // empty')
RUNTIME=$(echo "$TMDB_DATA" | jq -r '.runtime // empty')
VOTE_AVG=$(echo "$TMDB_DATA" | jq -r '.vote_average // empty')
VOTE_COUNT=$(echo "$TMDB_DATA" | jq -r '.vote_count // empty')
TAGLINE=$(echo "$TMDB_DATA" | jq -r '.tagline // empty')
KEYWORDS=$(echo "$TMDB_DATA" | jq -r '[.keywords.keywords[].name] | join(", ")')
POPULARITY=$(echo "$TMDB_DATA" | jq -r '.popularity // empty')
LANGUAGE=$(echo "$TMDB_DATA" | jq -r '.original_language // empty')
IMDB_ID=$(echo "$TMDB_DATA" | jq -r '.imdb_id // empty')

# ── Fetch Wikipedia plot summary ──
echo "Fetching Wikipedia plot for '$TITLE'..." >&2

# URL-encode the title for Wikipedia
WIKI_TITLE=$(echo "$TITLE" | sed 's/ /_/g')
WIKI_DATA=$(curl -s "https://en.wikipedia.org/w/api.php?action=query&titles=${WIKI_TITLE}&prop=extracts&explaintext=true&format=json" \
  | jq -r '.query.pages | to_entries[0].value.extract // empty')

# Extract the Plot section if it exists
WIKI_PLOT=""
if [ -n "$WIKI_DATA" ]; then
  # Try to extract text between "== Plot ==" and the next "==" section
  WIKI_PLOT=$(echo "$WIKI_DATA" | awk '/^== Plot ==/{found=1; next} found && /^== /{exit} found{print}')
  # If no Plot section, try "== Synopsis =="
  if [ -z "$WIKI_PLOT" ]; then
    WIKI_PLOT=$(echo "$WIKI_DATA" | awk '/^== Synopsis ==/{found=1; next} found && /^== /{exit} found{print}')
  fi
fi

# Truncate plot to ~800 words to keep prompt reasonable
if [ -n "$WIKI_PLOT" ]; then
  WIKI_PLOT=$(echo "$WIKI_PLOT" | head -c 4000)
  PLOT_SOURCE="Wikipedia"
else
  PLOT_SOURCE="TMDB overview only"
fi

echo "  Title: $TITLE ($RELEASE_DATE)" >&2
echo "  Genres: $GENRES" >&2
echo "  Plot source: $PLOT_SOURCE (${#WIKI_PLOT} chars)" >&2

# ── Build the user prompt ──
USER_PROMPT="Classify the mood dimensions of this movie.

TITLE: $TITLE"

if [ "$ORIGINAL_TITLE" != "$TITLE" ] && [ -n "$ORIGINAL_TITLE" ]; then
  USER_PROMPT="$USER_PROMPT (original: $ORIGINAL_TITLE)"
fi

USER_PROMPT="$USER_PROMPT
YEAR: ${RELEASE_DATE:0:4}
GENRES: $GENRES
RUNTIME: ${RUNTIME}min
LANGUAGE: $LANGUAGE"

if [ -n "$TAGLINE" ]; then
  USER_PROMPT="$USER_PROMPT
TAGLINE: $TAGLINE"
fi

if [ -n "$KEYWORDS" ]; then
  USER_PROMPT="$USER_PROMPT
KEYWORDS: $KEYWORDS"
fi

USER_PROMPT="$USER_PROMPT

TMDB OVERVIEW:
$OVERVIEW"

if [ -n "$WIKI_PLOT" ]; then
  USER_PROMPT="$USER_PROMPT

WIKIPEDIA PLOT SUMMARY:
$WIKI_PLOT"
fi

USER_PROMPT="$USER_PROMPT

Score this movie on all dimensions. Use the full range of each scale."

# ── Call claude -p ──
echo "Classifying with claude..." >&2

SYSTEM_PROMPT=$(cat "$PROMPT_FILE")
SCHEMA=$(cat "$SCHEMA_FILE")

RESULT=$(echo "$USER_PROMPT" | claude -p \
  --model haiku \
  --output-format json \
  --max-turns 2 \
  --allowedTools "" \
  --system-prompt "$SYSTEM_PROMPT" \
  --json-schema "$SCHEMA")

# structured_output contains the validated JSON schema output
MOOD_SCORE=$(echo "$RESULT" | jq '.structured_output // empty')
if [ -z "$MOOD_SCORE" ] || [ "$MOOD_SCORE" = "null" ]; then
  echo "ERROR: No structured_output from claude" >&2
  echo "$RESULT" | jq '{subtype, result, errors}' >&2
  exit 1
fi

# ── Build the full output record ──
YEAR="${RELEASE_DATE:0:4}"
OUTPUT=$(jq -n \
  --argjson tmdbId "$TMDB_ID" \
  --arg imdbId "$IMDB_ID" \
  --arg title "$TITLE" \
  --arg originalTitle "$ORIGINAL_TITLE" \
  --argjson year "${YEAR:-null}" \
  --arg genres "$GENRES" \
  --arg originalLanguage "$LANGUAGE" \
  --arg releaseDate "$RELEASE_DATE" \
  --argjson runtime "${RUNTIME:-null}" \
  --argjson tmdbPopularity "${POPULARITY:-0}" \
  --argjson tmdbVoteCount "${VOTE_COUNT:-0}" \
  --argjson tmdbRating "${VOTE_AVG:-null}" \
  --arg tmdbUrl "https://www.themoviedb.org/movie/$TMDB_ID" \
  --arg imdbUrl "https://www.imdb.com/title/$IMDB_ID" \
  --arg plotSource "$PLOT_SOURCE" \
  --argjson moodScore "$MOOD_SCORE" \
  '{
    tmdbId: $tmdbId,
    imdbId: (if $imdbId == "" then null else $imdbId end),
    title: $title,
    originalTitle: $originalTitle,
    year: $year,
    genres: ($genres | split(", ")),
    originalLanguage: $originalLanguage,
    releaseDate: $releaseDate,
    runtime: $runtime,
    tmdbPopularity: $tmdbPopularity,
    tmdbVoteCount: $tmdbVoteCount,
    tmdbRating: $tmdbRating,
    tmdbUrl: $tmdbUrl,
    imdbUrl: (if $imdbId == "" then null else $imdbUrl end),
    inputSources: (if $plotSource == "TMDB overview only" then ["tmdb"] else ["tmdb", "wikipedia"] end),
    classifierModel: "claude-haiku-4-5",
    classifiedAt: (now | todate),
  } + $moodScore')

# Save individual result
echo "$OUTPUT" | jq . > "$OUTPUT_DIR/${TMDB_ID}.json"
echo "Saved to $OUTPUT_DIR/${TMDB_ID}.json" >&2
echo "$OUTPUT"
