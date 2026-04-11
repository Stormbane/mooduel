"use client";

import { useState } from "react";
import Image from "next/image";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatings, MovieRatingsCompact } from "@/components/ui/ratings";
import { VAIndicator } from "./va-indicator";
import { ComfortBar } from "./comfort-bar";
import { DimBar } from "./dim-bar";
import { FieldTooltip } from "@/components/ui/field-tooltip";
import { CorrectionDialog } from "@/components/corrections/correction-dialog";
import { CorrectionList } from "@/components/corrections/correction-list";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const WATCH_ICONS: Record<string, string> = {
  solo: "◉",
  date: "♡",
  friends: "⚑",
  family: "☆",
};
const WATCH_LABELS: Record<string, string> = {
  solo: "Best watched alone",
  date: "Good for a date night",
  friends: "Great with friends",
  family: "Family-friendly viewing",
};

const PACING_COLORS: Record<string, string> = {
  "slow-burn": "text-[var(--color-pop-orange)]",
  building: "text-[var(--color-pop-blue)]",
  steady: "text-[var(--color-pop-green)]",
  relentless: "text-[var(--color-pop-coral)]",
  episodic: "text-[var(--color-pop-purple)]",
};

const ENDING_COLORS: Record<string, string> = {
  triumphant: "text-[var(--color-pop-green)]",
  bittersweet: "text-[var(--color-pop-yellow)]",
  devastating: "text-[var(--color-pop-coral)]",
  ambiguous: "text-[var(--color-pop-blue)]",
  twist: "text-[var(--color-pop-purple)]",
  uplifting: "text-[var(--color-pop-green)]",
  unsettling: "text-[var(--color-pop-orange)]",
};

const ARC_COLORS: Record<string, string> = {
  "man-in-a-hole": "text-[var(--color-pop-purple)]",
  oedipus: "text-[var(--color-pop-pink)]",
  "riches-to-rags": "text-[var(--color-pop-coral)]",
  icarus: "text-[var(--color-pop-orange)]",
  "rags-to-riches": "text-[var(--color-pop-green)]",
  steady: "text-[var(--color-pop-blue)]",
  cinderella: "text-[var(--color-pop-yellow)]",
};

/** VA-derived background color for poster placeholder */
function getVAColor(va: number, ar: number): string {
  if (va > 0 && ar > 0)
    return "from-[var(--color-pop-pink)]/15 to-[var(--color-pop-yellow)]/10";
  if (va > 0 && ar <= 0)
    return "from-[var(--color-pop-green)]/15 to-[var(--color-pop-blue)]/10";
  if (va <= 0 && ar > 0)
    return "from-[var(--color-pop-purple)]/15 to-[var(--color-pop-coral)]/10";
  return "from-[var(--color-pop-blue)]/15 to-[var(--color-pop-purple)]/10";
}

export type MovieCardVariant = "minimal" | "default" | "expanded";

interface MovieCardProps {
  movie: SlimMoodMovie;
  variant?: MovieCardVariant;
  expandable?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MovieCard({
  movie,
  variant = "default",
  expandable = false,
  onClick,
  className = "",
}: MovieCardProps) {
  const [expanded, setExpanded] = useState(variant === "expanded");
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionRefresh, setCorrectionRefresh] = useState(0);
  const isExpanded = variant === "expanded" || expanded;

  const handleClick = () => {
    if (onClick) onClick();
    else if (expandable) setExpanded((e) => !e);
  };

  const isClickable = !!onClick || expandable;
  const Wrapper = isClickable ? "button" : "div";

  // ── Minimal ──
  if (variant === "minimal") {
    return (
      <Wrapper
        onClick={isClickable ? handleClick : undefined}
        className={`flex items-center gap-3 text-left rounded-lg transition-colors ${isClickable ? "cursor-pointer hover:bg-card/50" : ""} ${className}`}
      >
        {movie.pp ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w92${movie.pp}`}
            alt={movie.t}
            width={40}
            height={60}
            className="w-10 h-[60px] rounded-md object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-[60px] rounded-md bg-gradient-to-br ${getVAColor(movie.va, movie.ar)} shrink-0 flex items-center justify-center`}
          >
            <span className="text-[8px] text-muted-foreground/30 font-mono">
              {movie.y}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90 truncate">
            {movie.t}
          </p>
          <MovieRatingsCompact movie={movie} />
        </div>
      </Wrapper>
    );
  }

  // ── Default + Expanded ──
  return (
    <div
      className={`rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] overflow-hidden hover:border-[oklch(0.35_0_0)] transition-colors duration-150 ${className}`}
    >
      <Wrapper
        onClick={isClickable ? handleClick : undefined}
        className={`w-full text-left p-5 ${isClickable ? "cursor-pointer" : ""}`}
      >
        {/* Header: poster + title + year + runtime + VA */}
        <div className="flex gap-4 mb-3">
          {movie.pp ? (
            <Image
              src={`${TMDB_IMAGE_BASE}/w185${movie.pp}`}
              alt={movie.t}
              width={80}
              height={120}
              className="w-20 h-[120px] rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className={`w-20 h-[120px] rounded-lg bg-gradient-to-br ${getVAColor(movie.va, movie.ar)} shrink-0 flex items-center justify-center`}
            >
              <VAIndicator valence={movie.va} arousal={movie.ar} size={40} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-foreground leading-tight">
                {movie.t}
              </h3>
              {!movie.pp && (
                <VAIndicator valence={movie.va} arousal={movie.ar} />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/70">
              <span>{movie.y}</span>
              {movie.rt && (
                <>
                  <span>·</span>
                  <span>{movie.rt}m</span>
                </>
              )}
            </div>
            <div className="mt-1">
              <MovieRatings movie={movie} />
            </div>
            {/* Vibe sentence */}
            <FieldTooltip fieldKey="vibeSentence" as="div" value={movie.v}>
              <p className="text-sm italic text-foreground/80 leading-relaxed mt-2 font-light line-clamp-3 cursor-help">
                &ldquo;{movie.v}&rdquo;
              </p>
            </FieldTooltip>
          </div>
        </div>

        {/* Genre + watch context */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {movie.g.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-md bg-border/20 px-2 py-0.5 text-[11px] text-muted-foreground/80 font-medium"
                title={g}
              >
                {g}
              </span>
            ))}
          </div>
          <FieldTooltip fieldKey="watchContext" value={movie.wc.join(", ")}>
            <div className="flex gap-1.5 shrink-0 cursor-help">
              {movie.wc.map((c) => (
                <span
                  key={c}
                  className="text-xs text-muted-foreground/60"
                  title={WATCH_LABELS[c] || c}
                >
                  {WATCH_ICONS[c]}
                </span>
              ))}
            </div>
          </FieldTooltip>
        </div>

        {/* Pacing · ending · arc */}
        <div className="flex items-baseline gap-x-4 gap-y-1 text-[11px] mb-3 flex-wrap">
          <FieldTooltip fieldKey="pacing" value={movie.pa}>
            <span className="cursor-help">
              <span className="text-muted-foreground/40 uppercase tracking-wider text-[9px] mr-1">
                Pacing
              </span>
              <span className={PACING_COLORS[movie.pa] || "text-foreground/70"}>
                {movie.pa}
              </span>
            </span>
          </FieldTooltip>
          <FieldTooltip fieldKey="endingType" value={movie.end}>
            <span className="cursor-help">
              <span className="text-muted-foreground/40 uppercase tracking-wider text-[9px] mr-1">
                Ending
              </span>
              <span
                className={
                  ENDING_COLORS[movie.end] || "text-foreground/70"
                }
              >
                {movie.end}
              </span>
            </span>
          </FieldTooltip>
          <FieldTooltip fieldKey="emotionalArc" value={movie.arc}>
            <span className="cursor-help">
              <span className="text-muted-foreground/40 uppercase tracking-wider text-[9px] mr-1">
                Arc
              </span>
              <span className={ARC_COLORS[movie.arc] || "text-foreground/70"}>
                {movie.arc}
              </span>
            </span>
          </FieldTooltip>
        </div>

        {/* Comfort bar */}
        <FieldTooltip fieldKey="comfortLevel" as="div" value={movie.co.toFixed(2)}>
          <div className="cursor-help">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/40">
                Comfort
              </span>
              <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums">
                {movie.co.toFixed(2)}
              </span>
            </div>
            <ComfortBar level={movie.co} />
          </div>
        </FieldTooltip>

        {/* Safety warnings */}
        {movie.warn.length > 0 && (
          <FieldTooltip fieldKey="emotionalSafetyWarnings" as="div" value={movie.warn.join(", ")}>
            <div className="flex flex-wrap gap-1 mt-3 cursor-help">
              {movie.warn.map((w) => (
                <span
                  key={w}
                  className="rounded-md bg-[var(--color-pop-coral)]/10 px-2 py-0.5 text-[10px] text-[var(--color-pop-coral)]/80 font-medium"
                  title={`Content warning: ${w}`}
                >
                  {w}
                </span>
              ))}
            </div>
          </FieldTooltip>
        )}
      </Wrapper>

      {/* Expanded section */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-2 border-t border-[oklch(0.25_0_0)]/50 space-y-4">
            {/* Mood tags */}
            {movie.tags.length > 0 && (
              <FieldTooltip fieldKey="moodTags" as="div" value={movie.tags.slice(0, 3).join(", ") + (movie.tags.length > 3 ? "..." : "")}>
                <div className="cursor-help">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/60 mb-2">
                    Mood Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {movie.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--color-pop-purple)]/25 px-2 py-0.5 text-[10px] text-[var(--color-pop-purple)]/80"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </FieldTooltip>
            )}

            {/* Dominant emotions */}
            {movie.em.length > 0 && (
              <FieldTooltip fieldKey="dominantEmotions" as="div" value={movie.em.join(", ")}>
                <div className="cursor-help">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/60 mb-2">
                    Dominant Emotions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.em.map((e) => (
                      <span
                        key={e}
                        className="rounded-full bg-[var(--color-pop-pink)]/10 border border-[var(--color-pop-pink)]/25 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-pink)]/80 font-medium"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </FieldTooltip>
            )}

            {/* Mood profile bars */}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/60 mb-2">
                Mood Profile
              </p>
              <div className="space-y-1.5">
                <DimBar
                  label="valence"
                  fieldKey="valence"
                  value={movie.va}
                  signed
                />
                <DimBar
                  label="arousal"
                  fieldKey="arousal"
                  value={movie.ar}
                  signed
                />
                <DimBar
                  label="dominance"
                  fieldKey="dominance"
                  value={movie.do}
                  signed
                />
                <DimBar
                  label="absorption"
                  fieldKey="absorptionPotential"
                  value={movie.ab}
                />
                <DimBar
                  label="hedonic"
                  fieldKey="hedonicValence"
                  value={movie.he}
                />
                <DimBar
                  label="eudaimonic"
                  fieldKey="eudaimonicValence"
                  value={movie.eu}
                />
                <DimBar
                  label="psych. rich"
                  fieldKey="psychologicallyRichValence"
                  value={movie.pr}
                />
                <DimBar
                  label="comfort"
                  fieldKey="comfortLevel"
                  value={movie.co}
                />
                <DimBar
                  label="conversation"
                  fieldKey="conversationPotential"
                  value={movie.conv}
                />
              </div>
            </div>

            {/* Corrections */}
            <div className="pt-2 border-t border-[oklch(0.25_0_0)]/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/60">
                  Community
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCorrectionDialog(true); }}
                  className="text-[10px] font-semibold text-[#8B5CF6] hover:text-[#8B5CF6]/80 transition-colors cursor-pointer"
                >
                  Suggest correction
                </button>
              </div>
              <CorrectionList movieId={movie.id} refreshKey={correctionRefresh} />
            </div>
          </div>
        </div>
      </div>

      {showCorrectionDialog && (
        <CorrectionDialog
          movie={movie}
          onClose={() => setShowCorrectionDialog(false)}
          onSubmitted={() => setCorrectionRefresh((r) => r + 1)}
        />
      )}
    </div>
  );
}
