"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { RoundType } from "@/lib/types";
import { ROUND_TITLES, ROUND_SUBTITLES, getRandomCopy, getProgressText } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface RoundHeaderProps {
  roundType: RoundType;
  roundNumber: number;
  totalRounds: number;
}

export function RoundHeader({ roundType, roundNumber, totalRounds }: RoundHeaderProps) {
  const isTournament = roundType === "tournament";

  const title = useMemo(() => getRandomCopy(ROUND_TITLES[roundType]), [roundType]);
  const subtitle = useMemo(() => getRandomCopy(ROUND_SUBTITLES[roundType]), [roundType]);
  const progress = getProgressText(roundNumber, totalRounds);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-2"
    >
      {/* Progress bar */}
      {!isTournament && (
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalRounds + 1 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i < roundNumber
                    ? "w-6 bg-[var(--color-neon-pink)]"
                    : i === roundNumber
                      ? "w-8 bg-[var(--color-neon-cyan)] animate-[neon-pulse_1.5s_ease-in-out_infinite]"
                      : i === totalRounds
                        ? "w-5 bg-[var(--color-neon-yellow)]/20"
                        : "w-4 bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {progress}
          </p>
        </div>
      )}

      {/* Round number */}
      <p className="text-[10px] uppercase tracking-[0.4em] neon-text-cyan font-bold font-[family-name:var(--font-display)]">
        ROUND {roundNumber + 1}
      </p>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-black tracking-tight font-[family-name:var(--font-display)] uppercase neon-text-pink">
        {title}
      </h2>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground max-w-md">
        {subtitle}
      </p>
    </motion.div>
  );
}
