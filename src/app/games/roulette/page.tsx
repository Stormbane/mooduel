"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatingsCompact } from "@/components/ui/ratings";

const ARCS = ["man-in-a-hole", "oedipus", "icarus", "cinderella", "rags-to-riches", "riches-to-rags"];
const CONTEXTS = ["solo", "date", "friends", "family"];
const WILDCARDS = [
  { label: "High comfort", filter: (m: SlimMoodMovie) => m.co >= 0.7 },
  { label: "Low comfort", filter: (m: SlimMoodMovie) => m.co <= 0.3 },
  { label: "Relentless pacing", filter: (m: SlimMoodMovie) => m.pa === "relentless" },
  { label: "Slow burn", filter: (m: SlimMoodMovie) => m.pa === "slow-burn" },
  { label: "Twist ending", filter: (m: SlimMoodMovie) => m.end === "twist" },
  { label: "Devastating ending", filter: (m: SlimMoodMovie) => m.end === "devastating" },
  { label: "Triumphant ending", filter: (m: SlimMoodMovie) => m.end === "triumphant" },
  { label: "Uplifting ending", filter: (m: SlimMoodMovie) => m.end === "uplifting" },
  { label: "Conversation starter", filter: (m: SlimMoodMovie) => m.conv >= 0.8 },
  { label: "High absorption", filter: (m: SlimMoodMovie) => m.ab >= 0.8 },
  { label: "High rated (8+)", filter: (m: SlimMoodMovie) => (m.r || 0) >= 8 },
  { label: "Deep meaning", filter: (m: SlimMoodMovie) => m.eu >= 0.8 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Phase = "ready" | "spinning" | "results";

export default function RoulettePage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("ready");
  const [reel1, setReel1] = useState(ARCS[0]);
  const [reel2, setReel2] = useState(CONTEXTS[0]);
  const [reel3, setReel3] = useState(WILDCARDS[0]);
  const [results, setResults] = useState<SlimMoodMovie[]>([]);

  const spin = useCallback(() => {
    setPhase("spinning");

    // Animate reels cycling
    let ticks = 0;
    const interval = setInterval(() => {
      setReel1(pickRandom(ARCS));
      setReel2(pickRandom(CONTEXTS));
      setReel3(pickRandom(WILDCARDS));
      ticks++;
      if (ticks >= 15) {
        clearInterval(interval);

        // Final values
        const finalArc = pickRandom(ARCS);
        const finalCtx = pickRandom(CONTEXTS);
        const finalWild = pickRandom(WILDCARDS);
        setReel1(finalArc);
        setReel2(finalCtx);
        setReel3(finalWild);

        // Filter movies
        const matched = movies.filter((m) =>
          m.arc === finalArc &&
          m.wc.includes(finalCtx) &&
          finalWild.filter(m)
        );

        // If too few, relax arc constraint
        const fallback = matched.length >= 3 ? matched :
          movies.filter((m) => m.wc.includes(finalCtx) && finalWild.filter(m));

        const sorted = (fallback.length > 0 ? fallback : movies.filter((m) => m.arc === finalArc))
          .sort((a, b) => (b.r || 0) - (a.r || 0))
          .slice(0, 8);

        setResults(sorted);
        setPhase("results");
      }
    }, 80);
  }, [movies]);

  const respin = useCallback((reel: 1 | 2 | 3) => {
    if (reel === 1) {
      const newArc = pickRandom(ARCS.filter((a) => a !== reel1));
      setReel1(newArc);
      const matched = movies.filter((m) => m.arc === newArc && m.wc.includes(reel2) && reel3.filter(m));
      setResults((matched.length >= 3 ? matched : movies.filter((m) => m.arc === newArc)).sort((a, b) => (b.r || 0) - (a.r || 0)).slice(0, 8));
    } else if (reel === 2) {
      const newCtx = pickRandom(CONTEXTS.filter((c) => c !== reel2));
      setReel2(newCtx);
      const matched = movies.filter((m) => m.arc === reel1 && m.wc.includes(newCtx) && reel3.filter(m));
      setResults((matched.length >= 3 ? matched : movies.filter((m) => m.wc.includes(newCtx))).sort((a, b) => (b.r || 0) - (a.r || 0)).slice(0, 8));
    } else {
      const newWild = pickRandom(WILDCARDS.filter((w) => w.label !== reel3.label));
      setReel3(newWild);
      const matched = movies.filter((m) => m.arc === reel1 && m.wc.includes(reel2) && newWild.filter(m));
      setResults((matched.length >= 3 ? matched : movies.filter((m) => newWild.filter(m))).sort((a, b) => (b.r || 0) - (a.r || 0)).slice(0, 8));
    }
  }, [movies, reel1, reel2, reel3]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.1)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-4xl mx-auto pt-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-2">
            Mood <span className="gradient-text-purple">Roulette</span>
          </h1>
          <p className="text-sm text-muted-foreground/60">Three reels. One mood. Pull the lever.</p>
        </div>

        {/* Reels */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <ReelCard
            label="Emotional Arc"
            value={reel1}
            spinning={phase === "spinning"}
            onRespin={() => respin(1)}
            showRespin={phase === "results"}
            color="pink"
          />
          <ReelCard
            label="Watch With"
            value={reel2}
            spinning={phase === "spinning"}
            onRespin={() => respin(2)}
            showRespin={phase === "results"}
            color="purple"
          />
          <ReelCard
            label="Wild Card"
            value={reel3.label}
            spinning={phase === "spinning"}
            onRespin={() => respin(3)}
            showRespin={phase === "results"}
            color="green"
          />
        </div>

        {/* Spin button */}
        <div className="text-center mb-12">
          <button
            onClick={spin}
            disabled={phase === "spinning"}
            className="rounded-xl px-10 py-4 text-lg font-bold tracking-widest text-white gradient-bg-purple shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_50px_rgba(139,92,246,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "spinning" ? "SPINNING..." : phase === "results" ? "SPIN AGAIN" : "PULL THE LEVER"}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {phase === "results" && results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-4">
                {results.length} movies match your mood
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl border border-border/30 bg-card/30 p-4"
                  >
                    <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
                      {m.t} <span className="text-muted-foreground/40 font-normal">({m.y})</span>
                      <MovieRatingsCompact movie={m} />
                    </p>
                    <p className="text-xs italic text-muted-foreground/60 mt-1 leading-relaxed">&ldquo;{m.v}&rdquo;</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {m.g.slice(0, 3).map((g) => (
                        <span key={g} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{g}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          {phase === "results" && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <p className="text-xl text-muted-foreground/40">No movies match this exact combo</p>
              <p className="text-sm text-muted-foreground/30 mt-1">Try re-spinning a reel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ReelCard({ label, value, spinning, onRespin, showRespin, color }: {
  label: string; value: string; spinning: boolean; onRespin: () => void; showRespin: boolean; color: string;
}) {
  const borderColors: Record<string, string> = {
    pink: "border-[var(--color-pop-pink)]/30",
    purple: "border-[var(--color-pop-purple)]/30",
    green: "border-[var(--color-pop-green)]/30",
  };
  const textColors: Record<string, string> = {
    pink: "text-[var(--color-pop-pink)]",
    purple: "text-[var(--color-pop-purple)]",
    green: "text-[var(--color-pop-green)]",
  };

  return (
    <div className={`rounded-xl border ${borderColors[color]} bg-card/30 p-4 text-center`}>
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">{label}</p>
      <p className={`font-[family-name:var(--font-display)] font-bold text-sm ${textColors[color]} ${spinning ? "animate-pulse" : ""} min-h-[2.5rem] flex items-center justify-center`}>
        {value}
      </p>
      {showRespin && (
        <button onClick={onRespin} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-2 cursor-pointer">
          re-spin ↻
        </button>
      )}
    </div>
  );
}
