"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

type Phase = "intro" | "picking" | "reveal" | "history";

export default function BlindTastePage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("intro");
  const [candidates, setCandidates] = useState<SlimMoodMovie[]>([]);
  const [picked, setPicked] = useState<SlimMoodMovie | null>(null);
  const [history, setHistory] = useState<{ picked: SlimMoodMovie; others: SlimMoodMovie[] }[]>([]);

  const goodMovies = useMemo(() => movies.filter((m) => m.v.length > 10 && m.r && m.r >= 5), [movies]);

  const startRound = useCallback(() => {
    const picks = pickRandom(goodMovies, 5);
    setCandidates(picks);
    setPicked(null);
    setPhase("picking");
  }, [goodMovies]);

  const handlePick = useCallback((movie: SlimMoodMovie) => {
    setPicked(movie);
    setHistory((h) => [...h, { picked: movie, others: candidates.filter((m) => m.id !== movie.id) }]);
    setPhase("reveal");
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(233,30,140,0.1)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ── INTRO ── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 text-center">
              <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
                Blind <span className="gradient-text-pink">Taste</span> Test
              </h1>
              <p className="text-muted-foreground mb-2 max-w-md mx-auto leading-relaxed">
                Five movies. No titles. No posters. No years.
              </p>
              <p className="text-muted-foreground/60 mb-8 max-w-md mx-auto text-sm">
                Just how each one feels — described in a single sentence.
                Pick the one you&rsquo;d watch tonight.
              </p>
              <button
                onClick={startRound}
                className="rounded-xl px-8 py-3 text-sm font-bold tracking-widest text-white gradient-bg-pink shadow-[0_0_30px_rgba(233,30,140,0.2)] hover:shadow-[0_0_50px_rgba(233,30,140,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                SHOW ME THE VIBES
              </button>
            </motion.div>
          )}

          {/* ── PICKING ── */}
          {phase === "picking" && (
            <motion.div key="picking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16">
              <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-pink)] mb-2">
                Round {history.length + 1}
              </p>
              <h2 className="text-center text-2xl font-[family-name:var(--font-display)] font-bold mb-2">
                Which one are you watching tonight?
              </h2>
              <p className="text-center text-sm text-muted-foreground/50 mb-10">
                No peeking. Trust the vibe.
              </p>

              <div className="space-y-4">
                {candidates.map((movie, i) => (
                  <motion.button
                    key={movie.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handlePick(movie)}
                    className="w-full text-left rounded-xl border border-border/30 bg-card/30 px-6 py-5 transition-all duration-300 hover:border-[var(--color-pop-pink)]/40 hover:bg-card/50 cursor-pointer group"
                  >
                    <p className="text-base italic text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                      &ldquo;{movie.v}&rdquo;
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── REVEAL ── */}
          {phase === "reveal" && picked && (
            <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16">
              <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-green)] mb-6">
                You chose
              </p>

              {/* Picked movie - big reveal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="rounded-2xl border border-[var(--color-pop-pink)]/30 bg-card/40 p-6 mb-6"
              >
                <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl text-foreground/90 mb-1">
                  {picked.t}
                  <span className="text-muted-foreground/40 font-normal text-lg ml-2">({picked.y})</span>
                </h2>
                <p className="text-sm italic text-foreground/60 mb-4">&ldquo;{picked.v}&rdquo;</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <MiniStat label="Valence" value={picked.va.toFixed(2)} />
                  <MiniStat label="Arousal" value={picked.ar.toFixed(2)} />
                  <MiniStat label="Comfort" value={picked.co.toFixed(2)} />
                  <MiniStat label="Conversation" value={picked.conv.toFixed(2)} />
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="rounded-full bg-[var(--color-pop-pink)]/10 border border-[var(--color-pop-pink)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-pink)]">{picked.pa}</span>
                  <span className="rounded-full bg-[var(--color-pop-green)]/10 border border-[var(--color-pop-green)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-green)]">{picked.end}</span>
                  <span className="rounded-full bg-[var(--color-pop-purple)]/10 border border-[var(--color-pop-purple)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-purple)]">{picked.arc}</span>
                  {picked.wc.map((c) => (
                    <span key={c} className="rounded-full bg-border/20 px-2.5 py-0.5 text-[10px] text-muted-foreground/60">{c}</span>
                  ))}
                </div>

                {picked.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {picked.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-muted-foreground/40">#{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* What you didn't pick */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <p className="text-xs text-muted-foreground/40 mb-3 uppercase tracking-wider font-semibold">What you passed on</p>
                <div className="space-y-2">
                  {candidates.filter((m) => m.id !== picked.id).map((m) => (
                    <div key={m.id} className="rounded-lg border border-border/20 bg-card/20 px-4 py-3">
                      <p className="font-medium text-sm text-foreground/70">{m.t} <span className="text-muted-foreground/30">({m.y})</span></p>
                      <p className="text-xs italic text-muted-foreground/40 mt-0.5">&ldquo;{m.v}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={startRound}
                  className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white gradient-bg-pink hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  NEXT ROUND
                </button>
                {history.length > 0 && (
                  <button
                    onClick={() => setPhase("history")}
                    className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    My picks ({history.length})
                  </button>
                )}
              </div>

              {/* Mood insight */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-center">
                <p className="text-xs text-muted-foreground/30 italic">
                  {picked.va > 0.3 ? "You're drawn to warmth tonight." :
                   picked.va < -0.3 ? "You're seeking something that challenges." :
                   "You're in a nuanced mood — neither light nor dark."}
                  {picked.ar > 0.5 ? " You want intensity." : " You want calm."}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── HISTORY ── */}
          {phase === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16">
              <h2 className="text-center text-2xl font-[family-name:var(--font-display)] font-bold mb-2">Your Taste Profile</h2>
              <p className="text-center text-sm text-muted-foreground/50 mb-8">
                {history.length} round{history.length !== 1 ? "s" : ""} played
              </p>

              {/* Aggregate stats */}
              {history.length >= 2 && (
                <div className="rounded-xl border border-[var(--color-pop-purple)]/20 bg-card/30 p-5 mb-8">
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--color-pop-purple)] mb-3">Your averages</p>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <MiniStat label="Valence" value={(history.reduce((s, h) => s + h.picked.va, 0) / history.length).toFixed(2)} />
                    <MiniStat label="Arousal" value={(history.reduce((s, h) => s + h.picked.ar, 0) / history.length).toFixed(2)} />
                    <MiniStat label="Comfort" value={(history.reduce((s, h) => s + h.picked.co, 0) / history.length).toFixed(2)} />
                    <MiniStat label="Convo" value={(history.reduce((s, h) => s + h.picked.conv, 0) / history.length).toFixed(2)} />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="rounded-lg border border-border/20 bg-card/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground/30 mb-1">Round {i + 1}</p>
                    <p className="font-medium text-sm text-foreground/80">{h.picked.t} ({h.picked.y})</p>
                    <p className="text-xs italic text-muted-foreground/50">&ldquo;{h.picked.v}&rdquo;</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <button onClick={startRound} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white gradient-bg-pink hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  PLAY AGAIN
                </button>
                <button onClick={() => setPhase("reveal")} className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground/40 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="font-mono text-foreground/70 mt-0.5">{value}</p>
    </div>
  );
}
