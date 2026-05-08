"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { MovieCard } from "@/components/movie/movie-card";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";
import { useDebouncedValue } from "@/lib/mood-data/use-movies";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

const PACING_OPTIONS = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDING_OPTIONS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const CONTEXT_OPTIONS = ["solo", "date", "friends", "family"];
const WATCH_ICONS: Record<string, string> = { solo: "\u25C9", date: "\u2661", friends: "\u2691", family: "\u2606" };
const PAGE_SIZE = 60;

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1 text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer",
        R,
        active
          ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/10 text-[#8B5CF6]"
          : "border-[oklch(0.25_0_0)] text-muted-foreground/50 hover:border-[oklch(0.35_0_0)] hover:text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 shrink-0 w-20">
        {label}
      </span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [contextFilter, setContextFilter] = useState<string[]>([]);
  const [endingFilter, setEndingFilter] = useState<string[]>([]);
  const [pacingFilter, setPacingFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<SlimMoodMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Post-OAuth deep link: ?correct=<movieId> → reopen that card's correction dialog.
  // We capture the id once, then strip the query so refreshes don't loop.
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pendingCorrectionId, setPendingCorrectionId] = useState<number | null>(null);
  useEffect(() => {
    const raw = searchParams.get("correct");
    if (!raw) return;
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) setPendingCorrectionId(id);
    const url = new URL(window.location.href);
    url.searchParams.delete("correct");
    router.replace(url.pathname + (url.search || ""), { scroll: false });
  }, [searchParams, router]);

  const debouncedSearch = useDebouncedValue(search, 300);
  const pacingKey = pacingFilter.sort().join(",");
  const endingKey = endingFilter.sort().join(",");
  const contextKey = contextFilter.sort().join(",");

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setMovies([]);
  }, [debouncedSearch, pacingKey, endingKey, contextKey]);

  // Fetch movies
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (pacingKey) params.set("pacing", pacingKey);
    if (endingKey) params.set("ending", endingKey);
    if (contextKey) params.set("context", contextKey);

    fetch(`/api/movies?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setMovies((prev) => page === 1 ? data.movies : [...prev, ...data.movies]);
          setTotal(data.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [page, debouncedSearch, pacingKey, endingKey, contextKey]);

  const hasMore = movies.length < total;

  const toggleFilter = (
    arr: string[],
    val: string,
    setter: (v: string[]) => void,
  ) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const activeFilterCount =
    contextFilter.length + endingFilter.length + pacingFilter.length;

  return (
    <PageLayout currentPage="/explore">
      {/* Header */}
      <div className="pt-12 pb-8">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-3">
            EXPLORE
          </p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[2rem] sm:text-[2.5rem] tracking-tight mb-3">
            The Mood Database
          </h1>
          <p className="text-muted-foreground max-w-lg">
            Search and filter {total > 0 ? total.toLocaleString() : "30,000+"} movies scored
            across 18 psychological dimensions.
          </p>
        </Reveal>
      </div>

      {/* Search */}
      <Reveal delay={100}>
        <div className="max-w-2xl mb-8">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, vibe, tag, or genre..."
              className={cn(
                "w-full border px-5 pr-20 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[oklch(0.35_0_0)] transition-colors duration-150",
                SURFACE,
                BORDER,
                R,
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-muted-foreground/30 hover:text-foreground/60 transition-colors duration-150 cursor-pointer text-sm leading-none"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <span className="text-muted-foreground/20 text-xs font-[family-name:var(--font-geist-mono)]">
                {loading && movies.length === 0 ? "..." : total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Filters */}
      <Reveal delay={150}>
        <div className="pb-8 space-y-3">
          <FilterRow label="Watch with">
            {CONTEXT_OPTIONS.map((c) => (
              <Chip
                key={c}
                label={`${WATCH_ICONS[c]} ${c}`}
                active={contextFilter.includes(c)}
                onClick={() =>
                  toggleFilter(contextFilter, c, setContextFilter)
                }
              />
            ))}
          </FilterRow>
          <FilterRow label="Ending">
            {ENDING_OPTIONS.map((e) => (
              <Chip
                key={e}
                label={e}
                active={endingFilter.includes(e)}
                onClick={() => toggleFilter(endingFilter, e, setEndingFilter)}
              />
            ))}
          </FilterRow>
          <FilterRow label="Pacing">
            {PACING_OPTIONS.map((p) => (
              <Chip
                key={p}
                label={p}
                active={pacingFilter.includes(p)}
                onClick={() => toggleFilter(pacingFilter, p, setPacingFilter)}
              />
            ))}
          </FilterRow>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setContextFilter([]);
                setEndingFilter([]);
                setPacingFilter([]);
              }}
              className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors duration-150 ml-1 cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      </Reveal>

      {/* Movie Grid */}
      {!loading && movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-4xl mb-4 text-muted-foreground/10">{"◎"}</div>
          <p className="font-[family-name:var(--font-display)] font-bold text-lg text-muted-foreground/40 mb-2">
            No movies match your mood
          </p>
          <p className="text-sm text-muted-foreground/25">
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <>
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",
            loading && movies.length === 0 && "opacity-50 transition-opacity duration-200",
          )}>
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                expandable
                autoOpenCorrection={pendingCorrectionId === movie.id}
              />
            ))}
          </div>
          {loading && movies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-2xl animate-pulse text-muted-foreground/30">◎</div>
              <p className="text-sm font-[family-name:var(--font-geist-mono)] text-muted-foreground/40 tracking-wide">
                Loading first 60 movies...
              </p>
            </div>
          )}
          {hasMore && (
            <div className="text-center pt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className={cn(
                  "border px-8 py-3 text-sm font-semibold text-muted-foreground/50 hover:text-foreground hover:border-[oklch(0.35_0_0)] transition-all duration-150 cursor-pointer disabled:opacity-30",
                  BORDER,
                  R,
                )}
              >
                {loading ? "Loading..." : `Show more (${(total - movies.length).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      <div className="text-center pt-10 text-xs text-muted-foreground/25 font-[family-name:var(--font-geist-mono)]">
        {movies.length.toLocaleString()} of {total.toLocaleString()} movies
      </div>
    </PageLayout>
  );
}
