"use client";

import { useState } from "react";
import Image from "next/image";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatings, MovieRatingsCompact } from "@/components/ui/ratings";
import { VAIndicator } from "./va-indicator";
import { ComfortBar } from "./comfort-bar";
import { DimBar } from "./dim-bar";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const WATCH_ICONS: Record<string, string> = { solo: "◉", date: "♡", friends: "⚑", family: "☆" };

const ENDING_COLORS: Record<string, string> = {
  triumphant: "text-[var(--color-pop-green)]",
  bittersweet: "text-[var(--color-pop-yellow)]",
  devastating: "text-[var(--color-pop-coral)]",
  ambiguous: "text-[var(--color-pop-blue)]",
  twist: "text-[var(--color-pop-purple)]",
  uplifting: "text-[var(--color-pop-green)]",
  unsettling: "text-[var(--color-pop-orange)]",
};

/** VA-derived background color for poster placeholder */
function getVAColor(va: number, ar: number): string {
  if (va > 0 && ar > 0) return "from-[var(--color-pop-pink)]/15 to-[var(--color-pop-yellow)]/10";
  if (va > 0 && ar <= 0) return "from-[var(--color-pop-green)]/15 to-[var(--color-pop-blue)]/10";
  if (va <= 0 && ar > 0) return "from-[var(--color-pop-purple)]/15 to-[var(--color-pop-coral)]/10";
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

export function MovieCard({ movie, variant = "default", expandable = false, onClick, className = "" }: MovieCardProps) {
  const [expanded, setExpanded] = useState(variant === "expanded");
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
          <Image src={`${TMDB_IMAGE_BASE}/w92${movie.pp}`} alt={movie.t} width={40} height={60} className="w-10 h-[60px] rounded-md object-cover shrink-0" />
        ) : (
          <div className={`w-10 h-[60px] rounded-md bg-gradient-to-br ${getVAColor(movie.va, movie.ar)} shrink-0 flex items-center justify-center`}>
            <span className="text-[8px] text-muted-foreground/30 font-mono">{movie.y}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90 truncate">{movie.t}</p>
          <MovieRatingsCompact movie={movie} />
        </div>
      </Wrapper>
    );
  }

  // ── Default + Expanded ──
  return (
    <div className={`rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-border/60 transition-colors duration-300 ${className}`}>
      <Wrapper
        onClick={isClickable ? handleClick : undefined}
        className={`w-full text-left p-5 ${isClickable ? "cursor-pointer" : ""}`}
      >
        {/* Header: poster + title + year + runtime + VA */}
        <div className="flex gap-4 mb-3">
          {movie.pp ? (
            <Image src={`${TMDB_IMAGE_BASE}/w185${movie.pp}`} alt={movie.t} width={80} height={120} className="w-20 h-[120px] rounded-lg object-cover shrink-0" />
          ) : (
            <div className={`w-20 h-[120px] rounded-lg bg-gradient-to-br ${getVAColor(movie.va, movie.ar)} shrink-0 flex items-center justify-center`}>
              <VAIndicator valence={movie.va} arousal={movie.ar} size={40} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-foreground/90 leading-tight">{movie.t}</h3>
              {!movie.pp && <VAIndicator valence={movie.va} arousal={movie.ar} />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/50">
              <span>{movie.y}</span>
              {movie.rt && <><span>·</span><span>{movie.rt}m</span></>}
            </div>
            <div className="mt-1">
              <MovieRatings movie={movie} />
            </div>
            {/* Vibe sentence */}
            <p className="text-sm italic text-foreground/70 leading-relaxed mt-2 font-light line-clamp-3">
              &ldquo;{movie.v}&rdquo;
            </p>
          </div>
        </div>

        {/* Genre + watch context */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {movie.g.slice(0, 4).map((g) => (
              <span key={g} className="rounded-md bg-border/20 px-2 py-0.5 text-[10px] text-muted-foreground/60 font-medium">{g}</span>
            ))}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {movie.wc.map((c) => (
              <span key={c} className="text-xs text-muted-foreground/40" title={c}>{WATCH_ICONS[c]}</span>
            ))}
          </div>
        </div>

        {/* Pacing · ending · arc */}
        <div className="flex items-center gap-2 text-[10px] mb-3">
          <span className="text-muted-foreground/40">{movie.pa}</span>
          <span className="text-muted-foreground/15">·</span>
          <span className={ENDING_COLORS[movie.end] || "text-muted-foreground/40"}>{movie.end}</span>
          <span className="text-muted-foreground/15">·</span>
          <span className="text-muted-foreground/40">{movie.arc}</span>
        </div>

        {/* Comfort bar */}
        <ComfortBar level={movie.co} />

        {/* Safety warnings */}
        {movie.warn.length > 0 && (
          <div className="flex gap-1 mt-2">
            {movie.warn.map((w) => (
              <span key={w} className="rounded-md bg-[var(--color-pop-coral)]/10 px-1.5 py-0.5 text-[9px] text-[var(--color-pop-coral)]/70 font-medium">{w}</span>
            ))}
          </div>
        )}
      </Wrapper>

      {/* Expanded section */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-2 border-t border-border/20 space-y-4">
            {/* Mood tags */}
            {movie.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Mood Tags</p>
                <div className="flex flex-wrap gap-1">
                  {movie.tags.map((t) => (
                    <span key={t} className="rounded-full border border-[var(--color-pop-purple)]/20 px-2 py-0.5 text-[10px] text-[var(--color-pop-purple)]/70">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant emotions */}
            {movie.em.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Dominant Emotions</p>
                <div className="flex gap-1.5">
                  {movie.em.map((e) => (
                    <span key={e} className="rounded-full bg-[var(--color-pop-pink)]/10 border border-[var(--color-pop-pink)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-pink)]/70 font-medium">{e}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Mood profile bars */}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Mood Profile</p>
              <div className="space-y-1.5">
                <DimBar label="valence" value={movie.va} signed />
                <DimBar label="arousal" value={movie.ar} signed />
                <DimBar label="dominance" value={movie.do} signed />
                <DimBar label="absorption" value={movie.ab} />
                <DimBar label="hedonic" value={movie.he} />
                <DimBar label="eudaimonic" value={movie.eu} />
                <DimBar label="psych. rich" value={movie.pr} />
                <DimBar label="comfort" value={movie.co} />
                <DimBar label="conversation" value={movie.conv} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
