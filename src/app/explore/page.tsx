"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { PageLayout } from "@/components/layout/page-layout";
import { MovieCard } from "@/components/movie/movie-card";
import { useMoodData } from "@/lib/mood-data/use-mood-data";

const PACING_OPTIONS = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDING_OPTIONS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const CONTEXT_OPTIONS = ["solo", "date", "friends", "family"];
const WATCH_ICONS: Record<string, string> = { solo: "◉", date: "♡", friends: "⚑", family: "☆" };
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
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    setPage(0);
    return movies.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.t.toLowerCase().includes(q) && !m.v.toLowerCase().includes(q) &&
            !m.tags.some((t) => t.includes(q)) && !m.g.some((g) => g.toLowerCase().includes(q))) return false;
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
    <PageLayout currentPage="/explore" maxWidth="max-w-7xl">
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

      {/* Movie Grid — now using shared MovieCard */}
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
              <MovieCard key={movie.id} movie={movie} expandable />
            ))}
          </div>
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
      </div>
    </PageLayout>
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
