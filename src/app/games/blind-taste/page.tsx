"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { ResultScreen } from "@/components/game-shell/result-screen";
import { GAMES } from "@/components/game-shell/types";
import { useGameSession } from "@/lib/game/use-game-session";

const GAME = GAMES["blind-taste"];

type Phase = "intro" | "picking" | "reveal" | "history";

interface Session {
  history: { pickedId: number; passedIds: number[] }[];
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function BlindTastePage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("intro");
  const [candidates, setCandidates] = useState<SlimMoodMovie[]>([]);
  const [picked, setPicked] = useState<SlimMoodMovie | null>(null);
  const [session, setSession, clearSession] = useGameSession<Session>(
    "blind-taste",
    { history: [] },
  );

  const goodMovies = useMemo(
    () => movies.filter((m) => m.v.length > 10 && m.r && m.r >= 5),
    [movies],
  );

  const moviesById = useMemo(() => {
    const map = new Map<number, SlimMoodMovie>();
    for (const m of movies) map.set(m.id, m);
    return map;
  }, [movies]);

  const startRound = useCallback(() => {
    const picks = pickRandom(goodMovies, 5);
    setCandidates(picks);
    setPicked(null);
    setPhase("picking");
  }, [goodMovies]);

  const handlePick = useCallback(
    (movie: SlimMoodMovie) => {
      const passedIds = candidates.filter((m) => m.id !== movie.id).map((m) => m.id);
      setPicked(movie);
      setSession((s) => ({
        history: [...s.history, { pickedId: movie.id, passedIds }],
      }));
      setPhase("reveal");
    },
    [candidates, setSession],
  );

  const resetAll = useCallback(() => {
    clearSession();
    setPicked(null);
    setCandidates([]);
    setPhase("intro");
  }, [clearSession]);

  if (loading) {
    return (
      <GamePage game={GAME}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground/50 animate-pulse">
            Loading movies...
          </p>
        </div>
      </GamePage>
    );
  }

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle="Five movies. No titles. No posters. No years."
            description="Just how each one feels, described in a single sentence. Pick the one you'd watch tonight."
            ctaLabel="SHOW ME THE VIBES"
            onStart={startRound}
          />
        )}

        {phase === "picking" && (
          <motion.div
            key="picking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-16"
          >
            <p
              className="text-center text-[11px] font-semibold tracking-[0.2em] uppercase mb-3"
              style={{ color: GAME.accent.color }}
            >
              Round {session.history.length + 1}
            </p>
            <h2 className="text-center text-2xl font-[family-name:var(--font-display)] font-bold mb-2">
              Which one are you watching tonight?
            </h2>
            <p className="text-center text-sm text-muted-foreground/50 mb-10">
              No peeking. Trust the vibe.
            </p>

            <div className="space-y-3">
              {candidates.map((movie, i) => (
                <motion.button
                  key={movie.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handlePick(movie)}
                  className="w-full text-left rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] px-6 py-5 transition-colors duration-150 hover:border-[oklch(0.35_0_0)] hover:bg-[oklch(0.14_0_0)] cursor-pointer"
                >
                  <p className="text-base italic text-foreground/80 leading-relaxed">
                    &ldquo;{movie.v}&rdquo;
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "reveal" && picked && (
          <ResultScreen
            key="reveal"
            game={GAME}
            movie={picked}
            eyebrow="You chose"
            sharePayload={{
              game: "blind-taste",
              pickedMovieId: picked.id,
              passedMovieIds: candidates
                .filter((m) => m.id !== picked.id)
                .map((m) => m.id),
            }}
            shareIntent={`I picked ${picked.t} (${picked.y}) from five mystery vibes on Mooduel.`}
            onPlayAgain={startRound}
            playAgainLabel="Next round"
          >
            {/* Passed-on candidates */}
            <div className="mt-6">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-3">
                What you passed on
              </p>
              <div className="space-y-2">
                {candidates
                  .filter((m) => m.id !== picked.id)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-3"
                    >
                      <p className="text-sm text-foreground/70">
                        {m.t}{" "}
                        <span className="text-muted-foreground/40">({m.y})</span>
                      </p>
                      <p className="text-xs italic text-muted-foreground/40 mt-0.5">
                        &ldquo;{m.v}&rdquo;
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {session.history.length > 1 && (
              <button
                onClick={() => setPhase("history")}
                className="block mx-auto mt-6 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                My picks ({session.history.length}) →
              </button>
            )}
          </ResultScreen>
        )}

        {phase === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-12"
          >
            <h2 className="text-center text-2xl font-[family-name:var(--font-display)] font-bold mb-2">
              Your taste profile
            </h2>
            <p className="text-center text-sm text-muted-foreground/50 mb-8">
              {session.history.length} round{session.history.length !== 1 ? "s" : ""} played
            </p>

            {session.history.length >= 2 && (
              <AggregateCard
                history={session.history}
                moviesById={moviesById}
                accent={GAME.accent.color}
              />
            )}

            <div className="space-y-2 mt-6">
              {session.history.map((h, i) => {
                const m = moviesById.get(h.pickedId);
                if (!m) return null;
                return (
                  <div
                    key={i}
                    className="rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <p className="text-[10px] text-muted-foreground/30 mb-1">
                      Round {i + 1}
                    </p>
                    <p className="text-sm text-foreground/80">
                      {m.t}{" "}
                      <span className="text-muted-foreground/40">({m.y})</span>
                    </p>
                    <p className="text-xs italic text-muted-foreground/50 mt-0.5">
                      &ldquo;{m.v}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button
                onClick={startRound}
                className="rounded-[4px] px-5 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: GAME.accent.color }}
              >
                Next round
              </button>
              <button
                onClick={() => setPhase("reveal")}
                className="rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
              >
                Back
              </button>
              <button
                onClick={resetAll}
                className="rounded-[4px] px-5 py-2.5 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Reset session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GamePage>
  );
}

function AggregateCard({
  history,
  moviesById,
  accent,
}: {
  history: { pickedId: number; passedIds: number[] }[];
  moviesById: Map<number, SlimMoodMovie>;
  accent: string;
}) {
  const picks = history
    .map((h) => moviesById.get(h.pickedId))
    .filter((m): m is SlimMoodMovie => !!m);
  if (picks.length === 0) return null;

  const avg = (sel: (m: SlimMoodMovie) => number) =>
    picks.reduce((s, m) => s + sel(m), 0) / picks.length;

  const stats = [
    { label: "Valence", value: avg((m) => m.va), signed: true },
    { label: "Arousal", value: avg((m) => m.ar), signed: true },
    { label: "Comfort", value: avg((m) => m.co), signed: false },
    { label: "Convo", value: avg((m) => m.conv), signed: false },
  ];

  return (
    <div
      className="rounded-[4px] border bg-[oklch(0.12_0_0)] p-5"
      style={{ borderColor: `${accent}4D` }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3"
        style={{ color: accent }}
      >
        Your averages
      </p>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
              {s.label}
            </p>
            <p className="font-[family-name:var(--font-geist-mono)] text-sm text-foreground/80 mt-0.5 tabular-nums">
              {s.signed
                ? (s.value >= 0 ? "+" : "") + s.value.toFixed(2)
                : s.value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
