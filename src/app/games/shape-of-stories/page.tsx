"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { ResultScreen } from "@/components/game-shell/result-screen";
import { GAMES } from "@/components/game-shell/types";
import { ensureSession, emitSignal } from "@/lib/games/client/signals";
import { storageGet, storageSet } from "@/lib/games/client/storage";
import {
  SOS_RUN_LENGTH,
  SOS_PROMPT_VERSION,
  SHAPES,
  SHAPE_BY_SLUG,
  revealLine,
  SOS_STATS_KEY,
  SOS_EMPTY_STATS,
  type ShapedRecord,
  type SosStats,
  type StoryShape,
} from "@/lib/games/shape-of-stories";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["shape-of-stories"];
const ACCENT = GAME.accent.color;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface Single {
  assignmentId: string;
  movie: {
    tmdb_id: number;
    title: string;
    year: number;
    poster_path: string | null;
    genres: string[];
    modelLabel: string | null;
  };
  dimension: string;
}

type Phase = "intro" | "playing" | "result";
type DealError = "cap" | "fail" | null;

async function fetchSingle(): Promise<Single> {
  const res = await fetch(
    `/api/games/single?dimension=arc&game=shape-of-stories&v=1&p=${SOS_PROMPT_VERSION}`,
  );
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const emptySubscribe = () => () => {};
let statsRaw: string | null = null;
let statsSnap: SosStats | null = null;
function readStats(): SosStats | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SOS_STATS_KEY);
  } catch {
    raw = null;
  }
  if (raw !== statsRaw) {
    statsRaw = raw;
    try {
      statsSnap = raw ? (JSON.parse(raw) as SosStats) : null;
    } catch {
      statsSnap = null;
    }
  }
  return statsSnap;
}

export default function ShapeOfStoriesPage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState<Single | null>(null);
  const [records, setRecords] = useState<ShapedRecord[]>([]);
  const [skips, setSkips] = useState(0);
  const [reveal, setReveal] = useState<{ pickedSlug: string; line: string } | null>(null);
  const [dealError, setDealError] = useState<DealError>(null);
  const [resultMovie, setResultMovie] = useState<SlimMoodMovie | null>(null);
  const allTime = useSyncExternalStore(emptySubscribe, readStats, () => null);

  const nextRef = useRef<Promise<Single | null> | null>(null);
  const sessionReady = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    sessionReady.current = ensureSession();
  }, []);

  const safeDeal = useCallback(async (): Promise<Single | null> => {
    try {
      await sessionReady.current;
      return await fetchSingle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "401") {
        try {
          sessionReady.current = ensureSession();
          await sessionReady.current;
          return await fetchSingle();
        } catch {
          return null;
        }
      }
      if (msg === "429") throw e;
      return null;
    }
  }, []);

  const dealInto = useCallback(async (promise: Promise<Single | null>) => {
    setCurrent(null);
    setDealError(null);
    try {
      const next = await promise;
      if (next) setCurrent(next);
      else setDealError("fail");
    } catch {
      setDealError("cap");
    }
  }, []);

  const startRun = useCallback(() => {
    setRecords([]);
    setSkips(0);
    setReveal(null);
    setResultMovie(null);
    setPhase("playing");
    nextRef.current = null;
    void dealInto(safeDeal());
  }, [dealInto, safeDeal]);

  const finishRun = useCallback((finalRecords: ShapedRecord[], finalSkips: number) => {
    const prior = storageGet<SosStats>(SOS_STATS_KEY) ?? SOS_EMPTY_STATS;
    storageSet<SosStats>(SOS_STATS_KEY, {
      runs: prior.runs + 1,
      shaped: prior.shaped + finalRecords.length,
      agreed: prior.agreed + finalRecords.filter((r) => r.agreed).length,
      skips: prior.skips + finalSkips,
    });
    setPhase("result");
    const last = finalRecords[finalRecords.length - 1];
    if (last) {
      fetch(`/api/movies?ids=${last.movieId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setResultMovie(data?.movies?.[0] ?? null))
        .catch(() => setResultMovie(null));
    }
  }, []);

  const handlePick = useCallback(
    (shape: StoryShape) => {
      if (!current || reveal) return;
      emitSignal(current.assignmentId, shape.slug);

      const record: ShapedRecord = {
        movieId: current.movie.tmdb_id,
        title: current.movie.title,
        year: current.movie.year,
        pickedSlug: shape.slug,
        modelLabel: current.movie.modelLabel,
        agreed: current.movie.modelLabel === shape.slug,
      };
      const newRecords = [...records, record];
      setRecords(newRecords);
      const line = revealLine(shape.slug, current.movie.modelLabel);
      setReveal({ pickedSlug: shape.slug, line });

      const isLast = newRecords.length >= SOS_RUN_LENGTH;
      if (!isLast) nextRef.current = safeDeal().catch(() => null);

      window.setTimeout(() => {
        setReveal(null);
        if (isLast) {
          finishRun(newRecords, skips);
        } else {
          void dealInto(nextRef.current ?? safeDeal());
        }
      }, record.agreed ? 1400 : 1900);
    },
    [current, reveal, records, skips, safeDeal, dealInto, finishRun],
  );

  const handleSkip = useCallback(() => {
    if (!current || reveal) return;
    emitSignal(current.assignmentId, "skip");
    setSkips((s) => s + 1);
    void dealInto(safeDeal());
  }, [current, reveal, dealInto, safeDeal]);

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle="Kurt Vonnegut swore every story has a shape you could draw on graph paper."
            description={
              <>
                The model tried to draw all thirty thousand movies. Fair
                warning: it is a mediocre artist. It thinks two of every three
                stories are the same shape. Shape eight movies you know and
                set the record straight.
                {allTime && allTime.shaped > 0 && (
                  <>
                    <br />
                    <span className="text-foreground/50">
                      Shapes in your sketchbook so far: {allTime.shaped}.
                    </span>
                  </>
                )}
              </>
            }
            ctaLabel="OPEN THE SKETCHBOOK"
            onStart={startRun}
          />
        )}

        {phase === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8 sm:pt-12"
          >
            <Hud shaped={records.length} />

            {dealError === "cap" && <CapNotice />}
            {dealError === "fail" && (
              <DealFailed onRetry={() => void dealInto(safeDeal())} />
            )}

            {!dealError && (
              <AnimatePresence mode="wait">
                {current ? (
                  <motion.div
                    key={current.assignmentId}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <MovieHeader movie={current.movie} />

                    <div className="min-h-[2.5rem] mt-4 mb-3 text-center" aria-live="polite">
                      <AnimatePresence mode="wait">
                        {reveal ? (
                          <motion.p
                            key="reveal"
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-sm sm:text-base text-foreground/80"
                          >
                            <span className="font-semibold" style={{ color: ACCENT }}>
                              {SHAPE_BY_SLUG.get(reveal.pickedSlug)?.name}.
                            </span>{" "}
                            {reveal.line}
                          </motion.p>
                        ) : (
                          <motion.h2
                            key="question"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-lg sm:text-xl font-[family-name:var(--font-display)] font-bold"
                          >
                            Which shape did it draw?
                          </motion.h2>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {SHAPES.map((shape, i) => (
                        <ShapeCard
                          key={shape.slug}
                          shape={shape}
                          index={i}
                          picked={reveal?.pickedSlug ?? null}
                          locked={!!reveal}
                          reduceMotion={!!reduceMotion}
                          onPick={handlePick}
                        />
                      ))}
                    </div>

                    {!reveal && (
                      <button
                        onClick={handleSkip}
                        className="block mx-auto mt-5 min-h-[44px] px-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        Haven&apos;t seen it — deal another
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <SingleSkeleton key="skeleton" />
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {phase === "result" && (
          <GalleryResult
            key="result"
            records={records}
            movie={resultMovie}
            onPlayAgain={startRun}
          />
        )}
      </AnimatePresence>
    </GamePage>
  );
}

/* ---------------------------------- HUD --------------------------------- */

function Hud({ shaped }: { shaped: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between">
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
          Shaped {Math.min(shaped + 1, SOS_RUN_LENGTH)} of {SOS_RUN_LENGTH}
        </p>
      </div>
      <div className="mt-2 flex justify-center gap-1" aria-hidden>
        {Array.from({ length: SOS_RUN_LENGTH }, (_, i) => (
          <span
            key={i}
            className="h-1 w-4 rounded-[1px] transition-colors duration-300"
            style={{
              backgroundColor:
                i < shaped ? ACCENT : i === shaped ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Movie header ----------------------------- */

function MovieHeader({
  movie,
}: {
  movie: Single["movie"];
}) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="relative w-20 shrink-0 aspect-[2/3] overflow-hidden rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)]">
        {movie.poster_path ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w185${movie.poster_path}`}
            alt={`${movie.title} poster`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-1">
            <p className="text-center text-[10px] font-bold text-foreground/70 leading-tight">
              {movie.title}
            </p>
          </div>
        )}
      </div>
      <div className="text-left max-w-[220px]">
        <p className="font-[family-name:var(--font-display)] font-bold text-lg leading-snug">
          {movie.title}
        </p>
        <p className="text-sm text-muted-foreground/60">
          {movie.year}
          {movie.genres?.length ? ` · ${movie.genres.slice(0, 2).join(", ")}` : ""}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Shape card ------------------------------ */

function ShapeCard({
  shape,
  index,
  picked,
  locked,
  reduceMotion,
  onPick,
}: {
  shape: StoryShape;
  index: number;
  picked: string | null;
  locked: boolean;
  reduceMotion: boolean;
  onPick: (s: StoryShape) => void;
}) {
  const isPicked = picked === shape.slug;
  const isPassed = picked !== null && !isPicked;

  return (
    <motion.button
      onClick={() => onPick(shape)}
      disabled={locked}
      className="text-left rounded-[4px] border bg-[oklch(0.12_0_0)] p-3 transition-colors duration-150 cursor-pointer disabled:cursor-default hover:bg-[oklch(0.14_0_0)]"
      style={{ borderColor: isPicked ? ACCENT : "oklch(0.25 0 0)" }}
      animate={{ opacity: isPassed ? 0.35 : 1 }}
      whileTap={!locked && !reduceMotion ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15 }}
    >
      <svg viewBox="0 0 100 56" className="w-full h-12" fill="none" aria-hidden>
        <motion.path
          d={shape.path}
          stroke={isPicked ? ACCENT : "rgba(255,255,255,0.65)"}
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.45, delay: index * 0.05, ease: "easeOut" }
          }
        />
      </svg>
      <p className="mt-1.5 text-xs font-semibold text-foreground/85">{shape.name}</p>
      <p className="text-[10px] text-muted-foreground/50">{shape.hint}</p>
    </motion.button>
  );
}

/* ------------------------------ Load / error ----------------------------- */

function SingleSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-4 justify-center">
        <div className="w-20 aspect-[2/3] animate-pulse rounded-[4px] border border-[oklch(0.2_0_0)] bg-[oklch(0.14_0_0)]" />
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-[2px] bg-[oklch(0.16_0_0)]" />
          <div className="h-4 w-24 animate-pulse rounded-[2px] bg-[oklch(0.14_0_0)]" />
        </div>
      </div>
      <div className="min-h-[2.5rem] mt-4 mb-3" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-[4px] border border-[oklch(0.2_0_0)] bg-[oklch(0.13_0_0)]"
          />
        ))}
      </div>
    </motion.div>
  );
}

function CapNotice() {
  return (
    <div className="pt-12 text-center">
      <p className="text-lg font-[family-name:var(--font-display)] font-bold mb-2">
        The sketchbook is full for today.
      </p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Come back tomorrow with fresh eyes. The shapes will wait.
      </p>
      <Link
        href="/games"
        className="inline-block mt-6 rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
      >
        More games
      </Link>
    </div>
  );
}

function DealFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="pt-12 text-center">
      <p className="text-sm text-muted-foreground mb-5">
        The page tore. Bad connection, probably.
      </p>
      <button
        onClick={onRetry}
        className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: ACCENT }}
      >
        Deal another
      </button>
    </div>
  );
}

/* -------------------------------- Result --------------------------------- */

function GalleryResult({
  records,
  movie,
  onPlayAgain,
}: {
  records: ShapedRecord[];
  movie: SlimMoodMovie | null;
  onPlayAgain: () => void;
}) {
  const agreed = records.filter((r) => r.agreed).length;
  const glyphs = records
    .map((r) => SHAPE_BY_SLUG.get(r.pickedSlug)?.glyph ?? "·")
    .join("");
  const last = records[records.length - 1];

  const gallery = (
    <div className="mt-6">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
        The gallery
      </p>
      <div className="space-y-2">
        {records.map((r, i) => {
          const shape = SHAPE_BY_SLUG.get(r.pickedSlug);
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-2.5"
            >
              <svg viewBox="0 0 100 56" className="w-10 h-6 shrink-0" fill="none" aria-hidden>
                <path
                  d={shape?.path ?? ""}
                  stroke={ACCENT}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-sm text-foreground/80 truncate">
                  {r.title} <span className="text-muted-foreground/40">({r.year})</span>
                </p>
                <p className="text-xs text-muted-foreground/40">
                  {shape?.name}
                  {r.agreed ? " · the model agrees" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!movie || !last) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-12"
      >
        {gallery}
        <div className="flex justify-center mt-8">
          <button
            onClick={onPlayAgain}
            className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: ACCENT }}
          >
            Draw eight more
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <ResultScreen
      game={GAME}
      movie={movie}
      eyebrow="Gallery closed"
      headline={
        <>
          Eight stories, eight lines. The model matched {agreed} of{" "}
          {records.length}.
        </>
      }
      sharePayload={{
        game: "shape-of-stories",
        pickedMovieId: last.movieId,
        shapes: glyphs,
        agreed,
        rounds: records.length,
      }}
      shareIntent={`I drew the shapes of ${records.length} movies on Mooduel. The model matched ${agreed}. ${glyphs}`}
      onPlayAgain={onPlayAgain}
      playAgainLabel="Draw eight more"
    >
      {gallery}
    </ResultScreen>
  );
}
