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

interface Phase {
  label: string;
  startRound: number;
  endRound: number; // inclusive
  color: string;
  activeColor: string;
  glowColor: string;
}

const PHASES: Phase[] = [
  {
    label: "Mood",
    startRound: 0,
    endRound: 2,
    color: "bg-[var(--color-pop-purple)]/25",
    activeColor: "gradient-bg-purple",
    glowColor: "shadow-[var(--color-pop-purple)]/30",
  },
  {
    label: "Discovery",
    startRound: 3,
    endRound: 8,
    color: "bg-[var(--color-pop-pink)]/25",
    activeColor: "gradient-bg-pink",
    glowColor: "shadow-[var(--color-pop-pink)]/30",
  },
  {
    label: "Arena",
    startRound: 9,
    endRound: 9,
    color: "bg-[var(--color-pop-yellow)]/25",
    activeColor: "bg-[var(--color-pop-yellow)]",
    glowColor: "shadow-[var(--color-pop-yellow)]/30",
  },
];

export function RoundHeader({ roundType, roundNumber, totalRounds }: RoundHeaderProps) {
  const isTournament = roundType === "tournament";

  const title = useMemo(() => getRandomCopy(ROUND_TITLES[roundType]), [roundType]);
  const subtitle = useMemo(() => getRandomCopy(ROUND_SUBTITLES[roundType]), [roundType]);
  const progress = getProgressText(roundNumber, totalRounds);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-3"
    >
      {/* Phase progress bar */}
      {!isTournament && (
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            {PHASES.map((phase) => {
              const roundCount = phase.endRound - phase.startRound + 1;
              const isCurrentPhase = roundNumber >= phase.startRound && roundNumber <= phase.endRound;
              const isCompleted = roundNumber > phase.endRound;

              // How many rounds within this phase are done
              return (
                <div key={phase.label} className="flex flex-col items-center gap-1.5">
                  {/* Phase label */}
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.2em] font-semibold font-[family-name:var(--font-display)] transition-all duration-500",
                      isCurrentPhase
                        ? "text-foreground"
                        : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                    )}
                  >
                    {phase.label}
                  </span>

                  {/* Round dots */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: roundCount }).map((_, i) => {
                      const roundIdx = phase.startRound + i;
                      const isDone = roundIdx < roundNumber;
                      const isCurrent = roundIdx === roundNumber;

                      return (
                        <motion.div
                          key={roundIdx}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: roundIdx * 0.04 }}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            isCurrent
                              ? cn("w-8", phase.activeColor, "shadow-md", phase.glowColor)
                              : isDone
                                ? cn("w-5", phase.activeColor, "opacity-60")
                                : cn("w-4", phase.color),
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {progress}
          </p>
        </div>
      )}

      {/* Round number */}
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-pop-green)] font-semibold font-[family-name:var(--font-display)]">
        Round {roundNumber + 1}
      </p>

      {/* Title */}
      <h2 className="text-3xl md:text-5xl font-black tracking-tight font-[family-name:var(--font-display)] gradient-text-pink">
        {title}
      </h2>

      {/* Subtitle */}
      <p className="text-base text-muted-foreground max-w-md">
        {subtitle}
      </p>
    </motion.div>
  );
}
