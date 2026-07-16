"use client";

import { motion } from "framer-motion";
import { accentTextColor, type GameConfig } from "./types";

interface IntroScreenProps {
  game: GameConfig;
  /** Optional override for the primary heading (defaults to game.title). */
  title?: React.ReactNode;
  /** Optional override for the subtitle (defaults to game.tagline). */
  subtitle?: React.ReactNode;
  /** Second line of muted description. */
  description?: React.ReactNode;
  /** CTA button label, e.g. "START". */
  ctaLabel: string;
  onStart: () => void;
}

/**
 * Canonical intro screen: eyebrow colour, title, tagline, muted description,
 * single accent CTA. Every game uses this; no per-game variation in layout.
 */
export function IntroScreen({
  game,
  title,
  subtitle,
  description,
  ctaLabel,
  onStart,
}: IntroScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-24 text-center"
    >
      <p
        className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4"
        style={{ color: game.accent.color }}
      >
        {game.id.replace(/-/g, " ")}
      </p>
      <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
        {title ?? game.title}
      </h1>
      <p className="text-muted-foreground mb-2 max-w-md mx-auto leading-relaxed">
        {subtitle ?? game.tagline}
      </p>
      {description && (
        <p className="text-muted-foreground/60 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          {description}
        </p>
      )}
      <button
        onClick={onStart}
        className="rounded-[4px] px-8 py-3 text-sm font-semibold tracking-wide transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: game.accent.color, color: accentTextColor(game.accent.color) }}
      >
        {ctaLabel}
      </button>
    </motion.div>
  );
}
