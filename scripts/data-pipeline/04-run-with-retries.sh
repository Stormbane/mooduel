#!/bin/bash
# Run Wikipedia plot fetcher with automatic retries on rate limits.
# Keeps running until all plots are fetched.
# Usage: bash 04-run-with-retries.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAX_RETRIES=20
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    echo ""
    echo "=== Attempt $((RETRY + 1)) at $(date) ==="
    echo ""

    python "$SCRIPT_DIR/04-fetch-wikipedia-plots.py" --resume

    # Check if output is complete
    EXPECTED=$(wc -l < "$SCRIPT_DIR/../../data/raw/top-50k.jsonl")
    if [ -f "$SCRIPT_DIR/../../data/raw/wikipedia-plots.jsonl" ]; then
        ACTUAL=$(wc -l < "$SCRIPT_DIR/../../data/raw/wikipedia-plots.jsonl")
        echo "Output: $ACTUAL / $EXPECTED lines"
        if [ "$ACTUAL" -ge "$EXPECTED" ]; then
            echo "Done! All movies processed."
            exit 0
        fi
    fi

    RETRY=$((RETRY + 1))
    if [ $RETRY -lt $MAX_RETRIES ]; then
        # Wait 40 minutes for rate limit to expire
        echo "Rate limited. Waiting 40 minutes before retry..."
        sleep 2400
    fi
done

echo "Max retries reached. Run again manually if needed."
