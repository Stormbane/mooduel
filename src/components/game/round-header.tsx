"use client";

import type { RoundType } from "@/lib/types";

const ROUND_LABELS: Record<RoundType, string> = {
  "poster-pick": "Pick a Movie",
  "actor-pick": "Pick an Actor",
  "director-pick": "Pick a Director",
  "tournament": "Tournament",
};

const ROUND_SUBTITLES: Record<RoundType, string> = {
  "poster-pick": "Which one are you in the mood for?",
  "actor-pick": "Who do you want to see tonight?",
  "director-pick": "Whose vision speaks to you?",
  "tournament": "Head to head — only one survives",
};

interface RoundHeaderProps {
  roundType: RoundType;
  roundNumber: number;
  totalRounds: number;
}

export function RoundHeader({ roundType, roundNumber, totalRounds }: RoundHeaderProps) {
  const isTournament = roundType === "tournament";

  return (
    <div className="text-center space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
      {!isTournament && (
        <div className="flex items-center justify-center gap-2 mb-2">
          {Array.from({ length: totalRounds + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < roundNumber
                  ? "w-6 bg-primary"
                  : i === roundNumber
                    ? "w-8 bg-primary"
                    : i === totalRounds
                      ? "w-4 bg-muted-foreground/30"
                      : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl md:text-2xl font-bold tracking-tight">
        {ROUND_LABELS[roundType]}
      </h2>
      <p className="text-sm text-muted-foreground">
        {ROUND_SUBTITLES[roundType]}
      </p>
    </div>
  );
}
