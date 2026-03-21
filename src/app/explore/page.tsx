"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatings } from "@/components/ui/ratings";

const WATCH_ICONS: Record<string, string> = { solo: "◉", date: "♡", friends: "⚑", family: "☆" };
const ENDING_COLORS: Record<string, string> = {
  triumphant: "text-[var(--color-pop-green)]", bittersweet: "text-[var(--color-pop-yellow)]",
  devastating: "text-[var(--color-pop-coral)]", ambiguous: "text-[var(--color-pop-blue)]",
  twist: "text-[var(--color-pop-purple)]", uplifting: "text-[var(--color-pop-green)]",
  unsettling: "text-[var(--color-pop-orange)]",
};
const PACING_OPTIONS = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDING_OPTIONS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const CONTEXT_OPTIONS = ["solo", "date", "friends", "family"];
const PAGE_SIZE = 60;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ExplorePage() {
  const { data: movies, loading } = useMoodData();
  const [search, setSearch] = useState("");
  const [contextFilter, setContextFilter] = useState<string[]>([]);
  const [endingFilter, setEndingFilter] = useState<string[]>([]);
  const [pacingFilter, setPacingFilter] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    setPage(0);
    return movies.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.t.toLowerCase().includes(q) &&
            !m.v.toLowerCase().includes(q) &&
            !m.tags.some((t) => t.includes(q)) &&
            !m.g.some((g) => g.toLowerCase().includes(q))) return false;
      }
      if (contextFilter.length > 0 && !contextFilter.some((c) => m.wc.includes(c))) return false;
      if (endingFilter.length > 0 && !endingFilter.includes(m.end)) return false;
      if (pacingFilter.length > 0 && !pacingFilter.includes(m.pa)) return false;
      return true;
    });
  }, [movies, search, contextFilter, endingFilter, pacingFilter]);

  const paged = useMemo(() => filtered.slice(0, (page + 1) * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const activeFilterCount = contextFilter.length + endingFilter.length + pacingFilter.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">◎</div>
          <p className="text-sm text-muted-foreground/50">Loading 30,000+ movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.15)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/explore" className="text-foreground font-medium">Explore</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        {/* Search */}
        <div className="pt-12 pb-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold text-center mb-8">
              Explore the <span className="gradient-text-purple">Mood Database</span>
            </h1>
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[var(--color-pop-purple)]/20 via-[var(--color-pop-pink)]/10 to-[var(--color-pop-blue)]/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, vibe, tag, or genre..."
                className="relative w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-4 text-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[var(--color-pop-purple)]/40 transition-colors"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-sm">
                {filtered.length.toLocaleString()}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="pb-8 space-y-3">
          <FilterRow label="Watch with">
            {CONTEXT_OPTIONS.map((c) => (
              <Chip key={c} label={`${WATCH_ICONS[c]} ${c}`} active={contextFilter.includes(c)} onClick={() => toggleFilter(contextFilter, c, setContextFilter)} />
            ))}
          </FilterRow>
          <FilterRow label="Ending">
            {ENDING_OPTIONS.map((e) => (
              <Chip key={e} label={e} active={endingFilter.includes(e)} onClick={() => toggleFilter(endingFilter, e, setEndingFilter)} />
            ))}
          </FilterRow>
          <FilterRow label="Pacing">
            {PACING_OPTIONS.map((p) => (
              <Chip key={p} label={p} active={pacingFilter.includes(p)} onClick={() => toggleFilter(pacingFilter, p, setPacingFilter)} />
            ))}
          </FilterRow>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setContextFilter([]); setEndingFilter([]); setPacingFilter([]); }}
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors ml-1 cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </motion.div>

        {/* Movie Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-5xl mb-4 opacity-20">◎</div>
            <p className="text-xl font-[family-name:var(--font-display)] text-muted-foreground/60 mb-2">No movies match your mood</p>
            <p className="text-sm text-muted-foreground/30">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paged.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  expanded={expandedId === movie.id}
                  onToggle={() => setExpandedId(expandedId === movie.id ? null : movie.id)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-10">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-border/40 px-8 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer"
                >
                  Show more ({(filtered.length - paged.length).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </>
        )}

        <div className="text-center pt-10 text-sm text-muted-foreground/30">
          {filtered.length.toLocaleString()} of {movies.length.toLocaleString()} movies
          {" · "}
          <Link href="/about" className="text-[var(--color-pop-purple)]/60 hover:text-[var(--color-pop-purple)] transition-colors underline underline-offset-2">
            About the dataset
          </Link>
        </div>
      </main>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 shrink-0 w-20">{label}</span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
        active
          ? "border-[var(--color-pop-purple)]/60 bg-[var(--color-pop-purple)]/10 text-[var(--color-pop-purple)]"
          : "border-border/40 text-muted-foreground/50 hover:border-border hover:text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function VAIndicator({ valence, arousal }: { valence: number; arousal: number }) {
  const x = ((valence + 1) / 2) * 100;
  const y = ((1 - (arousal + 1) / 2)) * 100;
  return (
    <div className="relative w-8 h-8 shrink-0" title={`V: ${valence.toFixed(2)}, A: ${arousal.toFixed(2)}`}>
      <div className="absolute inset-0 border border-border/20 rounded-sm">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/10" />
      </div>
      <div
        className="absolute w-2 h-2 rounded-full bg-[var(--color-pop-pink)] shadow-[0_0_6px_rgba(233,30,140,0.6)]"
        style={{ left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)` }}
      />
    </div>
  );
}

function ComfortBar({ level }: { level: number }) {
  const hue = level * 120;
  return (
    <div className="w-full h-1 rounded-full bg-border/20 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${level * 100}%`, backgroundColor: `hsl(${hue}, 70%, 50%)`, boxShadow: `0 0 8px hsla(${hue}, 70%, 50%, 0.4)` }}
      />
    </div>
  );
}

function DimBar({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  const pct = signed ? ((value + 1) / 2) * 100 : value * 100;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground/60 w-24 shrink-0 text-right font-mono">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/20 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-pop-purple)]" style={{ width: `${Math.max(2, pct)}%`, opacity: 0.7 }} />
      </div>
      <span className="text-muted-foreground/40 w-10 font-mono text-right">{value.toFixed(2)}</span>
    </div>
  );
}

function MovieCard({ movie, expanded, onToggle }: { movie: SlimMoodMovie; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-border/60 transition-colors duration-300">
      <button onClick={onToggle} className="w-full text-left p-5 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-foreground/90 leading-tight">{movie.t}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/50">
              <span>{movie.y}</span>
              {movie.rt && <><span>·</span><span>{movie.rt}m</span></>}
              <MovieRatings movie={movie} />
            </div>
          </div>
          <VAIndicator valence={movie.va} arousal={movie.ar} />
        </div>

        <p className="text-sm italic text-foreground/70 leading-relaxed mb-4 font-light">
          &ldquo;{movie.v}&rdquo;
        </p>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {movie.g.slice(0, 3).map((g) => (
              <span key={g} className="rounded-md bg-border/20 px-2 py-0.5 text-[10px] text-muted-foreground/60 font-medium">{g}</span>
            ))}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {movie.wc.map((c) => (
              <span key={c} className="text-xs text-muted-foreground/40" title={c}>{WATCH_ICONS[c]}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] mb-3">
          <span className="text-muted-foreground/40">{movie.pa}</span>
          <span className="text-muted-foreground/15">·</span>
          <span className={ENDING_COLORS[movie.end] || "text-muted-foreground/40"}>{movie.end}</span>
          <span className="text-muted-foreground/15">·</span>
          <span className="text-muted-foreground/40">{movie.arc}</span>
        </div>

        <ComfortBar level={movie.co} />

        {movie.warn.length > 0 && (
          <div className="flex gap-1 mt-2">
            {movie.warn.map((w) => (
              <span key={w} className="rounded-md bg-[var(--color-pop-coral)]/10 px-1.5 py-0.5 text-[9px] text-[var(--color-pop-coral)]/70 font-medium">{w}</span>
            ))}
          </div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-border/20 space-y-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Mood Tags</p>
                <div className="flex flex-wrap gap-1">
                  {movie.tags.map((t) => (
                    <span key={t} className="rounded-full border border-[var(--color-pop-purple)]/20 px-2 py-0.5 text-[10px] text-[var(--color-pop-purple)]/70">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Dominant Emotions</p>
                <div className="flex gap-1.5">
                  {movie.em.map((e) => (
                    <span key={e} className="rounded-full bg-[var(--color-pop-pink)]/10 border border-[var(--color-pop-pink)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-pink)]/70 font-medium">{e}</span>
                  ))}
                </div>
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
