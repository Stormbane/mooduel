"use client";

import { useState } from "react";
import type { MovieProfile, TmdbGenre } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DebugPanelProps {
  profile: MovieProfile;
  genres: TmdbGenre[];
  round: number;
  phase: string;
}

export function DebugPanel({ profile, genres, round, phase }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sortedGenres = Object.entries(profile.genreWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const sortedEras = Object.entries(profile.eraPreference)
    .sort(([, a], [, b]) => b - a);

  const sortedActors = Object.entries(profile.peoplePreferences.actors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const sortedDirectors = Object.entries(profile.peoplePreferences.directors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={cn(
      "fixed right-0 top-0 z-50 h-full transition-all duration-300",
      collapsed ? "w-8" : "w-64 md:w-72",
    )}>
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute left-0 top-4 -translate-x-full rounded-l-md px-1.5 py-2",
          "glass text-[9px] font-[family-name:var(--font-display)] uppercase tracking-wider",
          "hover:border-[var(--color-neon-cyan)] transition-colors neon-text-cyan",
        )}
        title={collapsed ? "Show debug" : "Hide debug"}
      >
        {collapsed ? "◀" : "▶"}
      </button>

      {!collapsed && (
        <div className="h-full overflow-y-auto glass p-3 font-mono text-[10px]">
          <h3 className="text-xs font-bold mb-3 neon-text-cyan font-[family-name:var(--font-display)] uppercase tracking-wider">
            // SYSTEM DIAGNOSTICS
          </h3>

          {/* Status */}
          <div className="mb-3 flex gap-2">
            <div className="rounded-sm bg-[var(--color-neon-pink)]/10 border border-[var(--color-neon-pink)]/30 px-2 py-0.5">
              <span className="text-muted-foreground">RND </span>
              <span className="neon-text-pink font-bold">{round + 1}</span>
            </div>
            <div className="rounded-sm bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/30 px-2 py-0.5">
              <span className="text-muted-foreground">MODE </span>
              <span className="neon-text-cyan font-bold uppercase">{phase}</span>
            </div>
          </div>

          {/* Genre Weights */}
          <Section title="GENRE_WEIGHTS">
            {sortedGenres.length === 0 ? (
              <p className="text-muted-foreground italic">awaiting_input...</p>
            ) : (
              sortedGenres.map(([genre, weight]) => (
                <WeightBar key={genre} label={genre} value={weight} color="pink" />
              ))
            )}
          </Section>

          {/* Era */}
          <Section title="ERA_PREF">
            {sortedEras.length === 0 ? (
              <p className="text-muted-foreground italic">awaiting_input...</p>
            ) : (
              sortedEras.map(([era, weight]) => (
                <WeightBar key={era} label={era} value={weight} color="cyan" />
              ))
            )}
          </Section>

          {/* People */}
          {sortedActors.length > 0 && (
            <Section title="ACTOR_AFFINITY">
              {sortedActors.map(([id, weight]) => (
                <WeightBar key={id} label={`#${id}`} value={weight} max={0.5} color="purple" />
              ))}
            </Section>
          )}

          {sortedDirectors.length > 0 && (
            <Section title="DIRECTOR_AFFINITY">
              {sortedDirectors.map(([id, weight]) => (
                <WeightBar key={id} label={`#${id}`} value={weight} max={0.5} color="purple" />
              ))}
            </Section>
          )}

          {/* Picks */}
          <Section title={`PICK_LOG [${profile.picks.length}]`}>
            {profile.picks.slice(-5).reverse().map((pick, i) => (
              <div key={i} className="mb-1 text-[9px] text-muted-foreground font-mono">
                <span className="neon-text-cyan">R{pick.round + 1}</span>
                <span className="text-muted-foreground/50"> // </span>
                <span>{pick.roundType}</span>
                {pick.movieId && <span className="text-foreground/60"> m:{pick.movieId}</span>}
                {pick.personId && <span className="text-foreground/60"> p:{pick.personId}</span>}
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
      <h4 className="text-[9px] uppercase tracking-wider text-[var(--color-neon-cyan)]/60 mb-1.5 font-bold">
        {title}
      </h4>
      {children}
    </div>
  );
}

function WeightBar({ label, value, max = 1, color = "pink" }: { label: string; value: number; max?: number; color?: "pink" | "cyan" | "purple" }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = {
    pink: "bg-[var(--color-neon-pink)]",
    cyan: "bg-[var(--color-neon-cyan)]",
    purple: "bg-[var(--color-neon-purple)]",
  };

  return (
    <div className="mb-1">
      <div className="flex justify-between mb-0.5">
        <span className="text-foreground/70 uppercase">{label}</span>
        <span className="text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
