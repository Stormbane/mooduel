"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatingsCompact } from "@/components/ui/ratings";

// Simple but effective text similarity: tokenize, compute TF overlap + mood keyword boosting
function scoreMatch(movie: SlimMoodMovie, query: string): number {
  const q = query.toLowerCase();
  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  if (qWords.length === 0) return 0;

  let score = 0;

  // Vibe sentence match (highest weight — this is the core feature)
  const vibe = movie.v.toLowerCase();
  for (const word of qWords) {
    if (vibe.includes(word)) score += 10;
  }
  // Exact phrase match in vibe sentence
  if (vibe.includes(q)) score += 25;

  // Mood tag match (high weight)
  for (const tag of movie.tags) {
    for (const word of qWords) {
      if (tag.includes(word)) score += 8;
    }
  }

  // Genre match
  for (const genre of movie.g) {
    for (const word of qWords) {
      if (genre.toLowerCase().includes(word)) score += 5;
    }
  }

  // Title match (moderate weight)
  const title = movie.t.toLowerCase();
  for (const word of qWords) {
    if (title.includes(word)) score += 3;
  }

  // Mood keyword → dimension boosting
  const moodKeywords: Record<string, (m: SlimMoodMovie) => number> = {
    "happy": (m) => m.va * 5,
    "joyful": (m) => m.va * 5,
    "warm": (m) => (m.va + m.co) * 3,
    "cozy": (m) => m.co * 8,
    "comfortable": (m) => m.co * 6,
    "comfort": (m) => m.co * 6,
    "sad": (m) => -m.va * 5,
    "melancholy": (m) => (-m.va + (1 - m.ar)) * 3,
    "dark": (m) => -m.va * 4,
    "intense": (m) => m.ar * 5,
    "calm": (m) => -m.ar * 5,
    "quiet": (m) => -m.ar * 5,
    "peaceful": (m) => (-m.ar + m.co) * 3,
    "thrilling": (m) => m.ar * 5,
    "scary": (m) => (m.ar - m.va) * 3,
    "funny": (m) => m.he * 5,
    "fun": (m) => m.he * 5,
    "meaningful": (m) => m.eu * 5,
    "deep": (m) => m.eu * 4,
    "thought": (m) => m.pr * 4,
    "weird": (m) => m.pr * 5,
    "strange": (m) => m.pr * 4,
    "challenging": (m) => (1 - m.co) * 4,
    "devastating": (m) => (m.end === "devastating" ? 10 : 0),
    "uplifting": (m) => (m.end === "uplifting" || m.end === "triumphant" ? 10 : 0),
    "twist": (m) => (m.end === "twist" ? 10 : 0),
    "slow": (m) => (m.pa === "slow-burn" ? 8 : 0),
    "fast": (m) => (m.pa === "relentless" ? 8 : 0),
    "relentless": (m) => (m.pa === "relentless" ? 10 : 0),
    "solo": (m) => (m.wc.includes("solo") ? 6 : 0),
    "alone": (m) => (m.wc.includes("solo") ? 6 : 0),
    "date": (m) => (m.wc.includes("date") ? 6 : 0),
    "friends": (m) => (m.wc.includes("friends") ? 6 : 0),
    "family": (m) => (m.wc.includes("family") ? 6 : 0),
    "rainy": (m) => (-m.ar + m.co + m.eu) * 2,
    "sunday": (m) => (-m.ar + m.co) * 2,
    "night": (m) => m.ar * 2,
    "morning": (m) => (m.va + m.co - m.ar) * 2,
    "beautiful": (m) => (m.pr + m.eu) * 2,
    "cry": (m) => (m.eu - m.va) * 3,
    "laugh": (m) => m.he * 4,
    "escape": (m) => m.he * 3,
    "empowering": (m) => m.do * 4,
    "overwhelming": (m) => -m.do * 4,
  };

  for (const word of qWords) {
    for (const [keyword, scorer] of Object.entries(moodKeywords)) {
      if (word.includes(keyword) || keyword.includes(word)) {
        score += scorer(movie);
      }
    }
  }

  // Rating bonus (slight preference for better-rated movies)
  score += (movie.r || 5) / 10;

  return score;
}

const EXAMPLE_QUERIES = [
  "something that feels like a rainy Sunday",
  "intense and thought-provoking",
  "cozy comfort movie for a cold night",
  "weird and beautiful",
  "devastating but meaningful",
  "fun with friends, nothing too heavy",
  "slow quiet melancholy",
  "empowering solo watch",
  "dark twisted thriller with a twist ending",
  "something to make me cry and feel better after",
];

export default function VibeSearchPage() {
  const { data: movies, loading } = useMoodData();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim() || query.length < 3) return [];
    return movies
      .map((m) => ({ movie: m, score: scoreMatch(m, query) }))
      .filter((r) => r.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [movies, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(56,189,248,0.08)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">Games</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-3xl mx-auto">
        <div className="pt-16 text-center mb-8">
          <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-2">
            Vibe <span className="gradient-text-green">Search</span>
          </h1>
          <p className="text-sm text-muted-foreground/60">
            Describe a feeling. We&rsquo;ll find the movie.
          </p>
        </div>

        {/* Search */}
        <div className="relative group mb-6">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[var(--color-pop-blue)]/20 via-[var(--color-pop-green)]/10 to-[var(--color-pop-purple)]/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe a feeling..."
            className="relative w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-5 text-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[var(--color-pop-blue)]/40 transition-colors"
            autoFocus
          />
        </div>

        {/* Example queries */}
        {!query && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p className="text-xs text-muted-foreground/30 mb-3 uppercase tracking-wider font-semibold">Try these</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((eq) => (
                <button
                  key={eq}
                  onClick={() => setQuery(eq)}
                  className="rounded-full border border-border/30 px-3 py-1.5 text-xs text-muted-foreground/50 hover:text-foreground hover:border-border/60 transition-colors cursor-pointer"
                >
                  {eq}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground/30 mb-4 mt-6">
                {results.length} movies match &ldquo;{query}&rdquo;
              </p>
              <div className="space-y-4">
                {results.map((r, i) => (
                  <motion.div
                    key={r.movie.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/30 bg-card/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
                          {r.movie.t}
                          <span className="text-muted-foreground/40 font-normal ml-1">({r.movie.y})</span>
                          <MovieRatingsCompact movie={r.movie} />
                        </p>
                        <p className="text-sm italic text-foreground/60 mt-1 leading-relaxed">
                          &ldquo;{r.movie.v}&rdquo;
                        </p>
                      </div>
                      {/* VA mini indicator */}
                      <div className="relative w-8 h-8 shrink-0 border border-border/20 rounded-sm">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/10" />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/10" />
                        <div
                          className="absolute w-2 h-2 rounded-full bg-[var(--color-pop-blue)] shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                          style={{
                            left: `calc(${((r.movie.va + 1) / 2) * 100}% - 4px)`,
                            top: `calc(${((1 - (r.movie.ar + 1) / 2)) * 100}% - 4px)`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {r.movie.g.slice(0, 3).map((g) => (
                        <span key={g} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{g}</span>
                      ))}
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{r.movie.pa}</span>
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{r.movie.end}</span>
                      {r.movie.wc.map((c) => (
                        <span key={c} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{c}</span>
                      ))}
                    </div>

                    {r.movie.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.movie.tags.slice(0, 5).map((t) => (
                          <span key={t} className="text-[9px] text-muted-foreground/30">#{t}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {query.length >= 3 && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <p className="text-muted-foreground/40">No movies match that vibe. Try different words.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
