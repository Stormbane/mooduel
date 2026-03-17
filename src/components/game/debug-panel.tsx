"use client";

import { useState } from "react";
import type { MovieProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DebugPanelProps {
  profile: MovieProfile;

  round: number;
  phase: string;
}

export function DebugPanel({ profile, round, phase }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sortedGenres = Object.entries(profile.genreWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const sortedEras = Object.entries(profile.eraPreference)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className={cn(
      "fixed right-0 top-0 z-50 h-full transition-all duration-300",
      collapsed ? "w-8" : "w-64 md:w-72",
    )}>
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute left-0 top-4 -translate-x-full rounded-l-lg px-1.5 py-2",
          "bg-secondary text-xs text-muted-foreground",
          "hover:text-foreground transition-colors",
        )}
        title={collapsed ? "Show debug" : "Hide debug"}
      >
        {collapsed ? "◀" : "▶"}
      </button>

      {!collapsed && (
        <div className="h-full overflow-y-auto bg-card/95 backdrop-blur-sm border-l border-border p-3 font-mono text-[11px]">
          <h3 className="text-xs font-bold mb-3 gradient-text-green font-[family-name:var(--font-display)] uppercase tracking-wider">
            SYSTEM DIAGNOSTICS
          </h3>

          {/* Status */}
          <div className="mb-3 flex gap-2">
            <div className="rounded-lg bg-[var(--color-pop-pink)]/10 px-2.5 py-1">
              <span className="text-muted-foreground">RND </span>
              <span className="text-[var(--color-pop-pink)] font-bold">{round + 1}</span>
            </div>
            <div className="rounded-lg bg-[var(--color-pop-green)]/10 px-2.5 py-1">
              <span className="text-muted-foreground">MODE </span>
              <span className="text-[var(--color-pop-green)] font-bold uppercase">{phase}</span>
            </div>
          </div>

          {/* Mood VA */}
          {(profile.moodScores.valence !== undefined || profile.moodScores.arousal !== undefined) && (
            <Section title="MOOD_VA">
              <div className="flex gap-3 mb-1">
                <div className="rounded-lg bg-[var(--color-pop-purple)]/10 px-2.5 py-1">
                  <span className="text-muted-foreground">V </span>
                  <span className="text-[var(--color-pop-purple)] font-bold">
                    {(profile.moodScores.valence ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="rounded-lg bg-[var(--color-pop-orange)]/10 px-2.5 py-1">
                  <span className="text-muted-foreground">A </span>
                  <span className="text-[var(--color-pop-orange)] font-bold">
                    {(profile.moodScores.arousal ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </Section>
          )}

          {/* Genre Weights */}
          <Section title="GENRE_WEIGHTS">
            {sortedGenres.length === 0 ? (
              <p className="text-muted-foreground italic">awaiting input...</p>
            ) : (
              sortedGenres.map(([genre, weight]) => (
                <WeightBar key={genre} label={genre} value={weight} color="pink" />
              ))
            )}
          </Section>

          {/* Era */}
          <Section title="ERA_PREF">
            {sortedEras.length === 0 ? (
              <p className="text-muted-foreground italic">awaiting input...</p>
            ) : (
              sortedEras.map(([era, weight]) => (
                <WeightBar key={era} label={era} value={weight} color="green" />
              ))
            )}
          </Section>

          {/* Picks */}
          <Section title={`PICK_LOG [${profile.picks.length}]`}>
            {profile.picks.slice(-5).reverse().map((pick, i) => (
              <div key={i} className="mb-1 text-[10px] text-muted-foreground font-mono">
                <span className="text-[var(--color-pop-green)]">R{pick.round + 1}</span>
                <span className="text-muted-foreground/50"> · </span>
                <span>{pick.roundType}</span>
                {pick.movieId && <span className="text-foreground/60"> m:{pick.movieId}</span>}
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
        {title}
      </h4>
      {children}
    </div>
  );
}

function WeightBar({ label, value, max = 1, color = "pink" }: { label: string; value: number; max?: number; color?: "pink" | "green" | "purple" }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = {
    pink: "bg-[var(--color-pop-pink)]",
    green: "bg-[var(--color-pop-green)]",
    purple: "bg-[var(--color-pop-purple)]",
  };

  return (
    <div className="mb-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-foreground/70">{label}</span>
        <span className="text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
