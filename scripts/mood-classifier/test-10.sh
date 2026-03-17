#!/bin/bash
# Classify 10 test movies spanning all mood quadrants and arc types
# Usage: ./test-10.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../../data/mood-scores"
COMBINED="$SCRIPT_DIR/../../data/test-10-results.json"

mkdir -p "$OUTPUT_DIR"

# 10 movies chosen to span the full VA space + arc types + experience types
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

echo "=== Movie Mood Classification Test (10 movies) ==="
echo ""

FAILED=0
SUCCEEDED=0

for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  NAME="${ENTRY#*:}"

  echo "─────────────────────────────────────"
  echo "[$TMDB_ID] $NAME"
  echo "─────────────────────────────────────"

  if bash "$SCRIPT_DIR/classify.sh" "$TMDB_ID"; then
    SUCCEEDED=$((SUCCEEDED + 1))
    echo ""
  else
    echo "ERROR: Classification failed for $NAME" >&2
    FAILED=$((FAILED + 1))
    echo ""
  fi
done

# Combine all individual results into one array
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
echo "Results saved to: $COMBINED"
echo ""

# Print comparison table
echo "=== SCORE COMPARISON TABLE ==="
printf "%-32s %6s %6s %6s %5s %5s %5s %5s %s\n" "TITLE" "V" "A" "D" "ABS" "HED" "EUD" "RICH" "ARC"
echo "─────────────────────────────────────────────────────────────────────────────────────────────────"

for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    jq -r '[
      .title[:30],
      (.valence | tostring),
      (.arousal | tostring),
      (.dominance | tostring),
      (.absorptionPotential | tostring),
      (.hedonicValence | tostring),
      (.eudaimonicValence | tostring),
      (.psychologicallyRichValence | tostring),
      .emotionalArc
    ] | @tsv' "$FILE" | awk -F'\t' '{printf "%-32s %6s %6s %6s %5s %5s %5s %5s %s\n", $1, $2, $3, $4, $5, $6, $7, $8, $9}'
  fi
done

echo ""
echo "=== MOOD TAGS ==="
for ENTRY in "${MOVIES[@]}"; do
  TMDB_ID="${ENTRY%%:*}"
  FILE="$OUTPUT_DIR/${TMDB_ID}.json"
  if [ -f "$FILE" ]; then
    TITLE=$(jq -r '.title[:30]' "$FILE")
    TAGS=$(jq -r '.moodTags | join(", ")' "$FILE")
    EMOTIONS=$(jq -r '.dominantEmotions | join(", ")' "$FILE")
    printf "%-32s  emotions: %-30s  tags: %s\n" "$TITLE" "$EMOTIONS" "$TAGS"
  fi
done
