"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const LEVELS = [
  { min: 0.75, max: 1.0, name: "Safe Harbor", desc: "Warm, familiar, predictable. A hug in movie form.", color: "var(--color-pop-green)" },
  { min: 0.55, max: 0.75, name: "Gentle Edge", desc: "Mostly comfortable with a touch of complexity. You're safe, but something's stirring.", color: "var(--color-pop-blue)" },
  { min: 0.35, max: 0.55, name: "Open Water", desc: "Genuinely challenging moments. Not always comfortable, but deeply rewarding.", color: "var(--color-pop-yellow)" },
  { min: 0.15, max: 0.35, name: "The Deep End", desc: "This might shake you. Intense, confronting, unforgettable.", color: "var(--color-pop-orange)" },
  { min: 0.0, max: 0.15, name: "The Abyss", desc: "Transgressive, devastating, emotionally extreme. Not for the faint-hearted.", color: "var(--color-pop-coral)" },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

type Phase = "intro" | "playing" | "summary";

export default function ComfortZonePage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [candidates, setCandidates] = useState<SlimMoodMovie[]>([]);
  const [history, setHistory] = useState<{ level: number; movie: SlimMoodMovie }[]>([]);
  const [deepestLevel, setDeepestLevel] = useState(0);

  const goodMovies = useMemo(() => movies.filter((m) => m.v.length > 10 && (m.r || 0) >= 5.5), [movies]);

  const loadLevel = useCallback((level: number) => {
    const l = LEVELS[level];
    const pool = goodMovies.filter((m) => m.co >= l.min && m.co < l.max);
    setCandidates(pickRandom(pool, 3));
    setCurrentLevel(level);
  }, [goodMovies]);

  const startGame = useCallback(() => {
    setPhase("playing");
    setHistory([]);
    setDeepestLevel(0);
    loadLevel(0);
  }, [loadLevel]);

  const handlePick = useCallback((movie: SlimMoodMovie) => {
    setHistory((h) => [...h, { level: currentLevel, movie }]);
    if (currentLevel > deepestLevel) setDeepestLevel(currentLevel);
  }, [currentLevel, deepestLevel]);

  const goDeeper = useCallback(() => {
    if (currentLevel + 1 < LEVELS.length) {
      loadLevel(currentLevel + 1);
    } else {
      setPhase("summary");
    }
  }, [currentLevel, loadLevel]);

  const stayHere = useCallback(() => {
    loadLevel(currentLevel); // reload same level with new movies
  }, [currentLevel, loadLevel]);

  const currentPick = history.find((h) => h.level === currentLevel);
  const level = LEVELS[currentLevel];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(249,115,22,0.08)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 text-center">
              <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
                Comfort <span className="gradient-text-orange">Zone</span>
              </h1>
              <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                How far outside your comfort zone will you go tonight?
              </p>
              <p className="text-sm text-muted-foreground/60 mb-8 max-w-md mx-auto">
                Five levels, from cozy to devastating. At each level, pick a movie.
                Then decide: go deeper, or stay where you are.
              </p>

              {/* Level preview */}
              <div className="flex gap-1 mb-8 max-w-sm mx-auto">
                {LEVELS.map((l, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full" style={{ backgroundColor: l.color, opacity: 0.5 }} />
                ))}
              </div>

              <button onClick={startGame} className="rounded-xl px-8 py-3 text-sm font-bold tracking-widest text-white bg-[var(--color-pop-orange)] shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                BEGIN
              </button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div key={`level-${currentLevel}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="pt-16">
              {/* Progress */}
              <div className="flex gap-1 mb-6">
                {LEVELS.map((l, i) => (
                  <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-500 ${i <= currentLevel ? "" : "opacity-20"}`}
                    style={{ backgroundColor: l.color }} />
                ))}
              </div>

              <div className="text-center mb-8">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: level.color }}>
                  Level {currentLevel + 1} — {level.name}
                </p>
                <p className="text-sm text-muted-foreground/60">{level.desc}</p>
                <p className="text-xs text-muted-foreground/30 mt-1">
                  Comfort range: {level.min.toFixed(2)}–{level.max.toFixed(2)}
                </p>
              </div>

              {/* Movie choices */}
              {!currentPick ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground/50 mb-4">Pick one:</p>
                  {candidates.map((m, i) => (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handlePick(m)}
                      className="w-full text-left rounded-xl border border-border/30 bg-card/30 p-4 hover:border-border/60 transition-all cursor-pointer group"
                    >
                      <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/80 group-hover:text-foreground">
                        {m.t} <span className="text-muted-foreground/40 font-normal">({m.y})</span>
                        {m.r && <span className="text-[var(--color-pop-yellow)] text-xs ml-2">★ {m.r}</span>}
                      </p>
                      <p className="text-xs italic text-muted-foreground/60 mt-1">&ldquo;{m.v}&rdquo;</p>
                      <div className="flex gap-1.5 mt-2">
                        {m.g.slice(0, 3).map((g) => (
                          <span key={g} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{g}</span>
                        ))}
                      </div>
                      {m.warn.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {m.warn.map((w) => (
                            <span key={w} className="rounded bg-[var(--color-pop-coral)]/10 px-1.5 py-0.5 text-[9px] text-[var(--color-pop-coral)]/70">{w}</span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-xl border bg-card/40 p-5 mb-6" style={{ borderColor: `${level.color}40` }}>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: level.color }}>Your pick</p>
                    <p className="font-[family-name:var(--font-display)] font-bold text-foreground/90">
                      {currentPick.movie.t} ({currentPick.movie.y})
                    </p>
                    <p className="text-sm italic text-muted-foreground/60 mt-1">&ldquo;{currentPick.movie.v}&rdquo;</p>
                    <p className="text-xs text-muted-foreground/30 mt-2">Comfort: {currentPick.movie.co.toFixed(2)}</p>
                  </div>

                  {currentLevel + 1 < LEVELS.length ? (
                    <div className="flex flex-col gap-3">
                      <button onClick={goDeeper} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: LEVELS[currentLevel + 1].color }}>
                        GO DEEPER — {LEVELS[currentLevel + 1].name}
                      </button>
                      <button onClick={stayHere} className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        Stay here — show me more at this level
                      </button>
                      <button onClick={() => setPhase("summary")} className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-pointer mt-2">
                        I&rsquo;m done
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground/60 mb-4">You&rsquo;ve reached the deepest level.</p>
                      <button onClick={() => setPhase("summary")} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white bg-[var(--color-pop-coral)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                        SEE MY JOURNEY
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-16 text-center">
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-2">Your Comfort Journey</h2>
              <p className="text-sm text-muted-foreground/60 mb-8">
                You reached <span style={{ color: LEVELS[deepestLevel].color }} className="font-semibold">{LEVELS[deepestLevel].name}</span> — level {deepestLevel + 1} of {LEVELS.length}
              </p>

              {/* Journey visualization */}
              <div className="flex gap-1 mb-8">
                {LEVELS.map((l, i) => (
                  <div key={i} className={`flex-1 h-3 rounded-full transition-all`}
                    style={{ backgroundColor: l.color, opacity: i <= deepestLevel ? 1 : 0.15 }} />
                ))}
              </div>

              <div className="space-y-3 text-left">
                {history.map((h, i) => (
                  <div key={i} className="rounded-xl border border-border/20 bg-card/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: LEVELS[h.level].color }}>
                      {LEVELS[h.level].name}
                    </p>
                    <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/80">
                      {h.movie.t} ({h.movie.y})
                    </p>
                    <p className="text-xs italic text-muted-foreground/50 mt-0.5">&ldquo;{h.movie.v}&rdquo;</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <button onClick={startGame} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white bg-[var(--color-pop-orange)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  PLAY AGAIN
                </button>
                <Link href="/games" className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  More games
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
