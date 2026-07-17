"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { apiUrl } from "@/lib/games/client/api";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { GAMES, accentTextColor } from "@/components/game-shell/types";
import { ensureSession, emitSignal } from "@/lib/games/client/signals";
import {
  SEEN_IT_RUN,
  SEEN_IT_PROMPT_VERSION,
  addToKnownSet,
  getKnownSet,
  brainVerdict,
  type Recognition,
} from "@/lib/games/seen-it";

const GAME = GAMES["seen-it"];
const ACCENT = GAME.accent.color;
const ACCENT_TEXT = accentTextColor(ACCENT);
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface Single {
  assignmentId: string;
  movie: {
    tmdb_id: number;
    title: string;
    year: number;
    poster_path: string | null;
    genres: string[];
  };
}

type Phase = "intro" | "playing" | "result";

/** The chosen answer slides the card out toward its meaning. */
const EXIT_X: Record<Recognition, number> = { seen: 320, heard: 0, nope: -320 };

export default function SeenItPage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [cards, setCards] = useState<Single[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Recognition[]>([]);
  const [exiting, setExiting] = useState<Recognition | null>(null);
  const [loadError, setLoadError] = useState(false);
  const sessionReady = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    sessionReady.current = ensureSession();
  }, []);

  const startRun = useCallback(async () => {
    setPhase("playing");
    setCards([]);
    setIdx(0);
    setAnswers([]);
    setExiting(null);
    setLoadError(false);
    try {
      await sessionReady.current;
      const res = await fetch(
        apiUrl(`/api/games/single?dimension=recognition&game=seen-it&v=1&p=${SEEN_IT_PROMPT_VERSION}&count=${SEEN_IT_RUN}`),
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.singles?.length) throw new Error();
      setCards(data.singles);
    } catch {
      setLoadError(true);
    }
  }, []);

  const answer = useCallback(
    (r: Recognition) => {
      const card = cards[idx];
      if (!card || exiting) return;
      emitSignal(card.assignmentId, r);
      addToKnownSet(card.movie.tmdb_id, r);
      setExiting(r);
      window.setTimeout(() => {
        setAnswers((a) => [...a, r]);
        setExiting(null);
        if (idx + 1 >= cards.length) setPhase("result");
        else setIdx((i) => i + 1);
      }, reduceMotion ? 40 : 180);
    },
    [cards, idx, exiting, reduceMotion],
  );

  const card = cards[idx] ?? null;
  const seenCount = answers.filter((a) => a === "seen").length;
  const heardCount = answers.filter((a) => a === "heard").length;

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle="A dozen posters. Seen it, heard of it, or never met it."
            description={
              <>
                Every answer teaches the table what you actually know, so the
                card game deals you hands you can play with conviction. Takes
                about thirty seconds. No wrong answers, only honest ones.
              </>
            }
            ctaLabel="ROLL THE REEL"
            onStart={startRun}
          />
        )}

        {phase === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8"
          >
            {loadError ? (
              <div className="pt-12 text-center">
                <p className="text-sm text-muted-foreground mb-5">
                  The projector jammed. Bad connection, probably.
                </p>
                <button
                  onClick={startRun}
                  className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
                  style={{ backgroundColor: ACCENT, color: ACCENT_TEXT }}
                >
                  Roll it again
                </button>
              </div>
            ) : cards.length === 0 ? (
              <ReelSkeleton />
            ) : (
              <>
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
                    Poster {Math.min(idx + 1, cards.length)} of {cards.length}
                  </p>
                  <p
                    className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums"
                    style={{ color: ACCENT }}
                  >
                    Seen {seenCount}
                  </p>
                </div>

                <div className="mx-auto max-w-[280px]">
                  <AnimatePresence mode="wait">
                    {card && (
                      <motion.div
                        key={card.movie.tmdb_id}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                        animate={
                          exiting
                            ? reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, x: EXIT_X[exiting], y: exiting === "heard" ? -80 : 0, rotate: exiting === "seen" ? 8 : exiting === "nope" ? -8 : 0 }
                            : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
                        }
                        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border-2 border-[oklch(0.25_0_0)]">
                          {card.movie.poster_path ? (
                            <Image
                              src={`${TMDB_IMAGE_BASE}/w342${card.movie.poster_path}`}
                              alt={`${card.movie.title} poster`}
                              fill
                              sizes="280px"
                              className="object-cover"
                              priority
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-4 bg-[oklch(0.14_0_0)]">
                              <p className="text-center font-[family-name:var(--font-display)] font-bold text-foreground/70">
                                {card.movie.title}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-center text-sm text-foreground/85 leading-tight">
                          {card.movie.title}{" "}
                          <span className="text-muted-foreground/50">({card.movie.year})</span>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
                  <button
                    onClick={() => answer("nope")}
                    className="min-h-[52px] rounded-[4px] border border-[oklch(0.28_0_0)] px-3 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-white/[0.04] cursor-pointer"
                  >
                    Never met it
                  </button>
                  <button
                    onClick={() => answer("heard")}
                    className="min-h-[52px] rounded-[4px] border border-[oklch(0.28_0_0)] px-3 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-white/[0.04] cursor-pointer"
                  >
                    Heard of it
                  </button>
                  <button
                    onClick={() => answer("seen")}
                    className="min-h-[52px] rounded-[4px] px-3 py-2.5 text-sm font-bold transition-transform duration-100 hover:brightness-110 active:scale-[0.97] cursor-pointer"
                    style={{ backgroundColor: ACCENT, color: ACCENT_TEXT }}
                  >
                    Seen it
                  </button>
                </div>
                {idx === 0 && !exiting && (
                  <p className="mt-3 text-center text-xs text-muted-foreground/40">
                    Honest answers only — this tunes every deal you get.
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pt-16 text-center"
          >
            <p
              className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Reel complete
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-3">
              Seen {seenCount} of {answers.length}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mb-2">
              {brainVerdict(seenCount, answers.length)}
            </p>
            <p className="text-sm text-muted-foreground/50 mb-8">
              {heardCount > 0 && `Plus ${heardCount} you've heard of. `}
              Your movie brain now holds {getKnownSet().seen.length} titles the
              table can deal from.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/games/card-game"
                className="rounded-[4px] px-6 py-3 text-sm font-bold tracking-wide transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: ACCENT, color: ACCENT_TEXT }}
              >
                Take it to the card table
              </Link>
              <button
                onClick={startRun}
                className="rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
              >
                Another dozen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GamePage>
  );
}

function ReelSkeleton() {
  return (
    <div className="mx-auto max-w-[280px] pt-8">
      <div className="aspect-[2/3] w-full animate-pulse rounded-[4px] border border-[oklch(0.2_0_0)] bg-[oklch(0.13_0_0)]" />
      <div className="mx-auto mt-3 h-4 w-2/3 animate-pulse rounded-[2px] bg-[oklch(0.15_0_0)]" />
    </div>
  );
}
