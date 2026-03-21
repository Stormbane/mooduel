"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

// Quick mood selection options
const MOOD_OPTIONS = [
  { label: "Happy & energetic", va: 0.6, ar: 0.6, icon: "☀" },
  { label: "Calm & content", va: 0.4, ar: -0.3, icon: "🌙" },
  { label: "Thoughtful", va: 0.1, ar: 0.1, icon: "◎" },
  { label: "Melancholic", va: -0.3, ar: -0.3, icon: "☁" },
  { label: "Tense & wired", va: -0.1, ar: 0.7, icon: "⚡" },
  { label: "Adventurous", va: 0.3, ar: 0.5, icon: "◇" },
];

const COMFORT_OPTIONS = [
  { label: "Keep it cozy", value: 0.8 },
  { label: "Some edge is fine", value: 0.5 },
  { label: "Challenge us", value: 0.2 },
];

interface PlayerProfile {
  mood: { va: number; ar: number } | null;
  comfort: number;
}

type Phase = "intro" | "player1-mood" | "player1-comfort" | "player2-mood" | "player2-comfort" | "results";

export default function CouplesPage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("intro");
  const [player1, setPlayer1] = useState<PlayerProfile>({ mood: null, comfort: 0.5 });
  const [player2, setPlayer2] = useState<PlayerProfile>({ mood: null, comfort: 0.5 });

  const matches = useMemo(() => {
    if (phase !== "results" || !player1.mood || !player2.mood) return [];

    // Target = midpoint of both moods
    const targetVa = (player1.mood.va + player2.mood.va) / 2;
    const targetAr = (player1.mood.ar + player2.mood.ar) / 2;
    const targetCo = (player1.comfort + player2.comfort) / 2;
    const minCo = Math.min(player1.comfort, player2.comfort) - 0.15;

    return movies
      .filter((m) => m.v.length > 10 && (m.r || 0) >= 5.5 && m.co >= minCo)
      .map((m) => ({
        movie: m,
        dist: Math.sqrt(
          (m.va - targetVa) ** 2 * 2 +
          (m.ar - targetAr) ** 2 * 2 +
          (m.co - targetCo) ** 2 +
          (m.conv * 0.3) // bonus for high conversation potential
        ) - (m.conv * 0.15), // slight preference for talkable movies
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map((r) => r.movie);
  }, [phase, movies, player1, player2]);

  const restart = useCallback(() => {
    setPhase("intro");
    setPlayer1({ mood: null, comfort: 0.5 });
    setPlayer2({ mood: null, comfort: 0.5 });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(233,30,140,0.08)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 text-center">
              <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
                Couples <span className="gradient-text-pink">Mediator</span>
              </h1>
              <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
                Two moods. One movie.
              </p>
              <p className="text-sm text-muted-foreground/60 mb-8 max-w-sm mx-auto">
                Each person picks their mood independently. We find the movie
                that satisfies both — the emotional intersection of tonight.
              </p>
              <button onClick={() => setPhase("player1-mood")} className="rounded-xl px-8 py-3 text-sm font-bold tracking-widest text-white gradient-bg-pink shadow-[0_0_30px_rgba(233,30,140,0.2)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                START
              </button>
            </motion.div>
          )}

          {/* Player 1 Mood */}
          {phase === "player1-mood" && (
            <MoodPicker
              key="p1-mood"
              player="Person 1"
              playerColor="var(--color-pop-pink)"
              onPick={(mood) => { setPlayer1((p) => ({ ...p, mood })); setPhase("player1-comfort"); }}
            />
          )}

          {/* Player 1 Comfort */}
          {phase === "player1-comfort" && (
            <ComfortPicker
              key="p1-comfort"
              player="Person 1"
              playerColor="var(--color-pop-pink)"
              onPick={(comfort) => { setPlayer1((p) => ({ ...p, comfort })); setPhase("player2-mood"); }}
            />
          )}

          {/* Player 2 Mood */}
          {phase === "player2-mood" && (
            <motion.div key="handoff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 text-center">
              <p className="text-sm text-muted-foreground/60 mb-4">Person 1 is done. Hand the device to Person 2.</p>
              <button onClick={() => setPhase("player2-mood")} className="rounded-xl px-8 py-3 text-sm font-bold tracking-widest text-white bg-[var(--color-pop-purple)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                PERSON 2&rsquo;S TURN
              </button>
              <MoodPicker
                player="Person 2"
                playerColor="var(--color-pop-purple)"
                onPick={(mood) => { setPlayer2((p) => ({ ...p, mood })); setPhase("player2-comfort"); }}
              />
            </motion.div>
          )}

          {/* Player 2 Comfort */}
          {phase === "player2-comfort" && (
            <ComfortPicker
              key="p2-comfort"
              player="Person 2"
              playerColor="var(--color-pop-purple)"
              onPick={(comfort) => { setPlayer2((p) => ({ ...p, comfort })); setPhase("results"); }}
            />
          )}

          {/* Results */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-16">
              <h2 className="text-center text-2xl font-[family-name:var(--font-display)] font-bold mb-2">Your Shared Movies</h2>
              <p className="text-center text-sm text-muted-foreground/50 mb-8">
                The emotional intersection of both moods.
              </p>

              {/* Mood comparison */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-xl border border-[var(--color-pop-pink)]/20 bg-card/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-pop-pink)] mb-1">Person 1</p>
                  <p className="text-xs text-muted-foreground/50">V:{player1.mood?.va} A:{player1.mood?.ar} C:{player1.comfort}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-pop-purple)]/20 bg-card/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-pop-purple)] mb-1">Person 2</p>
                  <p className="text-xs text-muted-foreground/50">V:{player2.mood?.va} A:{player2.mood?.ar} C:{player2.comfort}</p>
                </div>
              </div>

              <div className="space-y-4">
                {matches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-border/30 bg-card/30 p-4"
                  >
                    <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
                      {m.t} <span className="text-muted-foreground/40 font-normal">({m.y})</span>
                      {m.r && <span className="text-[var(--color-pop-yellow)] text-xs ml-2">★ {m.r}</span>}
                    </p>
                    <p className="text-xs italic text-muted-foreground/60 mt-1">&ldquo;{m.v}&rdquo;</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {m.g.slice(0, 3).map((g) => (
                        <span key={g} className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{g}</span>
                      ))}
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{m.pa}</span>
                      <span className="rounded bg-border/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{m.end}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/30 mt-2">
                      Comfort: {m.co.toFixed(2)} · Conversation: {m.conv.toFixed(2)}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <button onClick={restart} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white gradient-bg-pink hover:scale-105 active:scale-95 transition-all cursor-pointer">
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

function MoodPicker({ player, playerColor, onPick }: {
  player: string; playerColor: string; onPick: (mood: { va: number; ar: number }) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="pt-16">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: playerColor }}>{player}</p>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold mb-2">How are you feeling?</h2>
      <p className="text-sm text-muted-foreground/50 mb-6">Pick the closest match. Don&rsquo;t overthink it.</p>

      <div className="grid grid-cols-2 gap-3">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onPick({ va: opt.va, ar: opt.ar })}
            className="rounded-xl border border-border/30 bg-card/30 p-4 text-left hover:border-border/60 transition-all cursor-pointer group"
          >
            <span className="text-xl mb-2 block">{opt.icon}</span>
            <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-foreground/70 group-hover:text-foreground">{opt.label}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ComfortPicker({ player, playerColor, onPick }: {
  player: string; playerColor: string; onPick: (comfort: number) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="pt-16">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: playerColor }}>{player}</p>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold mb-2">How adventurous tonight?</h2>
      <p className="text-sm text-muted-foreground/50 mb-6">How much emotional challenge are you up for?</p>

      <div className="space-y-3">
        {COMFORT_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onPick(opt.value)}
            className="w-full rounded-xl border border-border/30 bg-card/30 px-5 py-4 text-left hover:border-border/60 transition-all cursor-pointer group"
          >
            <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-foreground/70 group-hover:text-foreground">{opt.label}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
