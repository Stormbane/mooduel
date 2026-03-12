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
      collapsed ? "w-10" : "w-72 md:w-80",
    )}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute left-0 top-4 -translate-x-full rounded-l-lg px-2 py-3",
          "bg-card border border-r-0 border-border text-xs font-mono",
          "hover:bg-accent transition-colors",
        )}
        title={collapsed ? "Show debug" : "Hide debug"}
      >
        {collapsed ? "◀" : "▶"}
      </button>

      {!collapsed && (
        <div className="h-full overflow-y-auto border-l border-border bg-card/95 backdrop-blur-sm p-4 font-mono text-xs">
          <h3 className="text-sm font-bold mb-3 text-primary">
            Profile Debug
          </h3>

          {/* Round & Phase */}
          <div className="mb-4 flex gap-3">
            <div className="rounded bg-muted px-2 py-1">
              <span className="text-muted-foreground">Round </span>
              <span className="font-bold">{round + 1}</span>
            </div>
            <div className="rounded bg-muted px-2 py-1">
              <span className="text-muted-foreground">Phase </span>
              <span className="font-bold capitalize">{phase}</span>
            </div>
          </div>

          {/* Genre Weights */}
          <Section title="Genre Weights">
            {sortedGenres.length === 0 ? (
              <p className="text-muted-foreground italic">No data yet</p>
            ) : (
              sortedGenres.map(([genre, weight]) => (
                <WeightBar key={genre} label={genre} value={weight} />
              ))
            )}
          </Section>

          {/* Era Preference */}
          <Section title="Era Preference">
            {sortedEras.length === 0 ? (
              <p className="text-muted-foreground italic">No data yet</p>
            ) : (
              sortedEras.map(([era, weight]) => (
                <WeightBar key={era} label={era} value={weight} />
              ))
            )}
          </Section>

          {/* People */}
          {sortedActors.length > 0 && (
            <Section title="Actor Affinity">
              {sortedActors.map(([id, weight]) => (
                <WeightBar key={id} label={`ID ${id}`} value={weight} max={0.5} />
              ))}
            </Section>
          )}

          {sortedDirectors.length > 0 && (
            <Section title="Director Affinity">
              {sortedDirectors.map(([id, weight]) => (
                <WeightBar key={id} label={`ID ${id}`} value={weight} max={0.5} />
              ))}
            </Section>
          )}

          {/* Pick History */}
          <Section title={`Picks (${profile.picks.length})`}>
            {profile.picks.slice(-5).reverse().map((pick, i) => (
              <div key={i} className="mb-1 text-[10px] text-muted-foreground">
                R{pick.round + 1} · {pick.roundType}
                {pick.movieId && ` · movie:${pick.movieId}`}
                {pick.personId && ` · person:${pick.personId}`}
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
    <div className="mb-4">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
        {title}
      </h4>
      {children}
    </div>
  );
}

function WeightBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="mb-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
