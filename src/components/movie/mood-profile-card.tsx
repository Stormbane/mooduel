"use client";

import Image from "next/image";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface MoodProfileCardProps {
  movie: SlimMoodMovie;
  /** Accent colour (hex) for the card's left edge. */
  accent: string;
  /** Optional label shown above the title, e.g. "YOUR PICK". */
  eyebrow?: string;
}

/**
 * Compact winner-movie card. Poster + title + year + vibe sentence +
 * a 4-stat mood strip + genre chips. Used across all game result screens
 * and as the hero card in the main Mooduel winner screen.
 */
export function MoodProfileCard({ movie, accent, eyebrow }: MoodProfileCardProps) {
  return (
    <div
      className="rounded-[4px] border bg-[oklch(0.12_0_0)] overflow-hidden"
      style={{ borderColor: `${accent}4D` }}
    >
      {eyebrow && (
        <div
          className="px-5 py-2 text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: accent, borderBottom: `1px solid ${accent}26` }}
        >
          {eyebrow}
        </div>
      )}
      <div className="flex gap-4 p-5">
        {movie.pp ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w185${movie.pp}`}
            alt={movie.t}
            width={80}
            height={120}
            className="w-20 h-[120px] rounded-[2px] object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-[120px] rounded-[2px] bg-[oklch(0.18_0_0)] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-xl text-foreground/95 leading-tight">
            {movie.t}
            <span className="text-muted-foreground/40 font-normal text-sm ml-2">
              ({movie.y})
            </span>
          </h2>
          <p className="text-sm italic text-foreground/70 leading-relaxed mt-2">
            &ldquo;{movie.v}&rdquo;
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {movie.g.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-[2px] bg-border/20 px-2 py-0.5 text-[10px] text-muted-foreground/70"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-0 border-t border-white/5">
        <MiniStat label="Valence" value={movie.va} signed />
        <MiniStat label="Arousal" value={movie.ar} signed />
        <MiniStat label="Comfort" value={movie.co} />
        <MiniStat label="Convo" value={movie.conv} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const display = signed
    ? (value >= 0 ? "+" : "") + value.toFixed(2)
    : value.toFixed(2);
  return (
    <div className="px-3 py-3 text-center border-r border-white/5 last:border-r-0">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{label}</p>
      <p className="font-[family-name:var(--font-geist-mono)] text-sm text-foreground/80 mt-0.5 tabular-nums">
        {display}
      </p>
    </div>
  );
}
