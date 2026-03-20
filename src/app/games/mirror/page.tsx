"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

// ── Questions: binary mood trade-offs ──
interface Question {
  optionA: string;
  optionB: string;
  // How choosing A shifts the profile
  aShift: { v?: number; a?: number; co?: number; eu?: number; he?: number; pr?: number };
  bShift: { v?: number; a?: number; co?: number; eu?: number; he?: number; pr?: number };
}

const QUESTIONS: Question[] = [
  // Vibe pairs
  { optionA: "Warm glow, familiar shapes", optionB: "Cold edge, unfamiliar territory",
    aShift: { v: 0.3, co: 0.2 }, bShift: { v: -0.2, pr: 0.3 } },
  { optionA: "Laugh until it hurts", optionB: "Feel something you can't name",
    aShift: { he: 0.3, v: 0.2 }, bShift: { eu: 0.3, pr: 0.2 } },
  { optionA: "Heart racing, edge of seat", optionB: "Slow drift, hypnotic pull",
    aShift: { a: 0.4 }, bShift: { a: -0.3 } },
  { optionA: "A story that resolves", optionB: "A question that lingers",
    aShift: { co: 0.2, v: 0.1 }, bShift: { pr: 0.3, co: -0.1 } },

  // Mood dimension trade-offs
  { optionA: "Comfort", optionB: "Intensity",
    aShift: { co: 0.3, a: -0.1 }, bShift: { co: -0.2, a: 0.3 } },
  { optionA: "Meaning", optionB: "Fun",
    aShift: { eu: 0.3, he: -0.1 }, bShift: { he: 0.3, eu: -0.1 } },
  { optionA: "Familiar", optionB: "Perspective-shifting",
    aShift: { co: 0.2, pr: -0.1 }, bShift: { pr: 0.3, co: -0.1 } },
  { optionA: "Empowering", optionB: "Overwhelming",
    aShift: { v: 0.2 }, bShift: { v: -0.2 } },

  // Ending / context preferences
  { optionA: "Resolution", optionB: "Ambiguity",
    aShift: { co: 0.2, v: 0.1 }, bShift: { pr: 0.2, co: -0.2 } },
  { optionA: "Watch alone", optionB: "Watch with someone",
    aShift: { a: -0.1, eu: 0.1 }, bShift: { he: 0.1, co: 0.1 } },
  { optionA: "Catharsis — let it out", optionB: "Escape — take me somewhere else",
    aShift: { eu: 0.3, v: -0.1 }, bShift: { he: 0.3, v: 0.2 } },
  { optionA: "I want to think", optionB: "I want to feel",
    aShift: { pr: 0.3, a: -0.1 }, bShift: { eu: 0.2, a: 0.2 } },
];

// ── Quadrant names ──
function getQuadrantName(v: number, a: number): string {
  if (v > 0 && a > 0) return "Electric Joy";
  if (v > 0 && a <= 0) return "Quiet Warmth";
  if (v <= 0 && a > 0) return "Contemplative Storm";
  return "Still Water";
}

function getQuadrantDesc(v: number, a: number): string {
  if (v > 0 && a > 0) return "You're seeking energy and uplift — thrilling, joyful, alive.";
  if (v > 0 && a <= 0) return "You want something gentle and warm — comforting, tender, safe.";
  if (v <= 0 && a > 0) return "You're drawn to intensity with depth — challenging, gripping, thought-provoking.";
  return "You want quiet contemplation — meditative, melancholic, slow.";
}

function getQuadrantColor(v: number, a: number): string {
  if (v > 0 && a > 0) return "var(--color-pop-yellow)";
  if (v > 0 && a <= 0) return "var(--color-pop-green)";
  if (v <= 0 && a > 0) return "var(--color-pop-pink)";
  return "var(--color-pop-blue)";
}

type Phase = "intro" | "questioning" | "result";

export default function MirrorPage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [profile, setProfile] = useState({ v: 0, a: 0, co: 0.5, eu: 0.5, he: 0.5, pr: 0.5 });

  const handleChoice = useCallback((choice: "a" | "b") => {
    const q = QUESTIONS[questionIdx];
    const shift = choice === "a" ? q.aShift : q.bShift;
    setProfile((p) => ({
      v: Math.max(-1, Math.min(1, p.v + (shift.v || 0))),
      a: Math.max(-1, Math.min(1, p.a + (shift.a || 0))),
      co: Math.max(0, Math.min(1, p.co + (shift.co || 0))),
      eu: Math.max(0, Math.min(1, p.eu + (shift.eu || 0))),
      he: Math.max(0, Math.min(1, p.he + (shift.he || 0))),
      pr: Math.max(0, Math.min(1, p.pr + (shift.pr || 0))),
    }));

    if (questionIdx + 1 >= QUESTIONS.length) {
      setPhase("result");
    } else {
      setQuestionIdx((i) => i + 1);
    }
  }, [questionIdx]);

  // Find matching movies
  const matches = useMemo(() => {
    if (phase !== "result" || movies.length === 0) return [];
    return movies
      .map((m) => {
        const dist = Math.sqrt(
          (m.va - profile.v) ** 2 * 2 + // Weight valence higher
          (m.ar - profile.a) ** 2 * 2 +
          (m.co - profile.co) ** 2 +
          (m.eu - profile.eu) ** 2 +
          (m.he - profile.he) ** 2 +
          (m.pr - profile.pr) ** 2
        );
        return { movie: m, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
      .map((r) => r.movie);
  }, [phase, movies, profile]);

  const restart = useCallback(() => {
    setPhase("intro");
    setQuestionIdx(0);
    setProfile({ v: 0, a: 0, co: 0.5, eu: 0.5, he: 0.5, pr: 0.5 });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  const quadrantName = getQuadrantName(profile.v, profile.a);
  const quadrantColor = getQuadrantColor(profile.v, profile.a);

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(30,215,96,0.08)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ── INTRO ── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 text-center">
              <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
                Mood <span className="gradient-text-green">Mirror</span>
              </h1>
              <p className="text-muted-foreground mb-2 max-w-sm mx-auto leading-relaxed">
                Twelve quick choices. No right answers.
              </p>
              <p className="text-muted-foreground/60 mb-8 max-w-sm mx-auto text-sm">
                At the end, you&rsquo;ll see your emotional fingerprint —
                and the movies that match it perfectly.
              </p>
              <button
                onClick={() => setPhase("questioning")}
                className="rounded-xl px-8 py-3 text-sm font-bold tracking-widest text-white gradient-bg-green shadow-[0_0_30px_rgba(30,215,96,0.2)] hover:shadow-[0_0_50px_rgba(30,215,96,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                START
              </button>
            </motion.div>
          )}

          {/* ── QUESTIONING ── */}
          {phase === "questioning" && (
            <motion.div key={`q-${questionIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="pt-20">
              {/* Progress */}
              <div className="flex gap-1 mb-8">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < questionIdx ? "bg-[var(--color-pop-green)]" : i === questionIdx ? "bg-[var(--color-pop-green)]/50" : "bg-border/20"}`} />
                ))}
              </div>

              <p className="text-xs text-muted-foreground/40 text-center mb-8">
                {questionIdx + 1} / {QUESTIONS.length}
              </p>

              <p className="text-center text-sm text-muted-foreground/60 mb-6">Tonight, would you rather...</p>

              <div className="space-y-4">
                <button
                  onClick={() => handleChoice("a")}
                  className="w-full rounded-xl border border-border/30 bg-card/30 px-6 py-5 text-left transition-all duration-200 hover:border-[var(--color-pop-green)]/40 hover:bg-card/50 cursor-pointer group"
                >
                  <p className="text-lg font-[family-name:var(--font-display)] font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                    {QUESTIONS[questionIdx].optionA}
                  </p>
                </button>

                <div className="text-center text-xs text-muted-foreground/20 tracking-widest">OR</div>

                <button
                  onClick={() => handleChoice("b")}
                  className="w-full rounded-xl border border-border/30 bg-card/30 px-6 py-5 text-left transition-all duration-200 hover:border-[var(--color-pop-green)]/40 hover:bg-card/50 cursor-pointer group"
                >
                  <p className="text-lg font-[family-name:var(--font-display)] font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                    {QUESTIONS[questionIdx].optionB}
                  </p>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── RESULT — Mood Card ── */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="pt-16">
              <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground/40 mb-6">
                Your mood tonight
              </p>

              {/* Mood Card */}
              <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden mb-8">
                {/* Header with quadrant color */}
                <div className="px-6 py-5" style={{ borderBottom: `1px solid ${quadrantColor}33` }}>
                  <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold" style={{ color: quadrantColor }}>
                    {quadrantName}
                  </h2>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {getQuadrantDesc(profile.v, profile.a)}
                  </p>
                </div>

                {/* Dimension bars */}
                <div className="px-6 py-5 space-y-3">
                  <DimBar label="Valence" value={profile.v} min={-1} max={1} color="var(--color-pop-pink)" />
                  <DimBar label="Arousal" value={profile.a} min={-1} max={1} color="var(--color-pop-orange)" />
                  <DimBar label="Comfort" value={profile.co} min={0} max={1} color="var(--color-pop-green)" />
                  <DimBar label="Meaning" value={profile.eu} min={0} max={1} color="var(--color-pop-purple)" />
                  <DimBar label="Fun" value={profile.he} min={0} max={1} color="var(--color-pop-yellow)" />
                  <DimBar label="Novelty" value={profile.pr} min={0} max={1} color="var(--color-pop-blue)" />
                </div>

                {/* VA position mini-map */}
                <div className="px-6 pb-5 flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0 border border-border/20 rounded">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/10" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-border/10" />
                    <div
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        left: `${((profile.v + 1) / 2) * 100}%`,
                        top: `${((1 - (profile.a + 1) / 2)) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        backgroundColor: quadrantColor,
                        boxShadow: `0 0 10px ${quadrantColor}80`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/40 leading-relaxed">
                    V: {profile.v.toFixed(2)} · A: {profile.a.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Matching movies */}
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-4">
                Movies that match your mood
              </p>
              <div className="space-y-3">
                {matches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="rounded-xl border border-border/20 bg-card/20 px-5 py-4"
                  >
                    <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/80">
                      {m.t} <span className="text-muted-foreground/40 font-normal">({m.y})</span>
                      {m.r && <span className="text-[var(--color-pop-yellow)] text-xs ml-2">★ {m.r}</span>}
                    </p>
                    <p className="text-xs italic text-muted-foreground/60 mt-1">&ldquo;{m.v}&rdquo;</p>
                    <div className="flex gap-1.5 mt-2">
                      {m.g.slice(0, 3).map((g) => (
                        <span key={g} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{g}</span>
                      ))}
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{m.pa}</span>
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{m.end}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 mt-10">
                <button
                  onClick={restart}
                  className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white gradient-bg-green hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  PLAY AGAIN
                </button>
                <Link
                  href="/games"
                  className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
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

function DimBar({ label, value, min, max, color }: { label: string; value: number; min: number; max: number; color: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground/50 w-16 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-border/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />
      </div>
      <span className="text-muted-foreground/30 w-10 font-mono text-right">{value.toFixed(2)}</span>
    </div>
  );
}
