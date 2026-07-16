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
import type { PairwiseDimension } from "@/lib/games/dimensions";
import {
  RUN_LENGTH,
  DIMENSION_COPY,
  GRID_GLYPH,
  VERDICT_MS,
  STATS_KEY,
  EMPTY_STATS,
  judge,
  normalizedGap,
  randomDimension,
  championRound,
  type Verdict,
  type RoundRecord,
  type HotterStats,
} from "@/lib/games/hotter";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES.hotter;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const ACCENT = GAME.accent.color;

interface PairMovie {
  key: "a" | "b";
  tmdb_id: number;
  title: string;
  year: number;
  poster_path: string | null;
  genres: string[];
  score: number | null;
}

interface Pair {
  assignmentId: string;
  movies: PairMovie[];
  dimension: PairwiseDimension;
}

interface VerdictInfo {
  verdict: Verdict;
  pickedKey: "a" | "b";
  /** Title of the movie the model backed (for hot-take copy). */
  modelPick: string;
  streakAfter: number;
}

type Phase = "intro" | "playing" | "result";
type DealError = "cap" | "fail" | null;

/** Sound design hook — every beat has a cue name; v1 ships silent. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function playCue(cue: "snap" | "sync" | "take" | "tie") {}

/**
 * Hydration-safe read of all-time stats: null on the server, the parsed
 * localStorage record on the client. Snapshot is cached by raw string so
 * useSyncExternalStore sees a stable reference.
 */
const emptySubscribe = () => () => {};
let statsSnapshotRaw: string | null = null;
let statsSnapshot: HotterStats | null = null;
function readStatsSnapshot(): HotterStats | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STATS_KEY);
  } catch {
    raw = null;
  }
  if (raw !== statsSnapshotRaw) {
    statsSnapshotRaw = raw;
    try {
      statsSnapshot = raw ? (JSON.parse(raw) as HotterStats) : null;
    } catch {
      statsSnapshot = null;
    }
  }
  return statsSnapshot;
}

async function fetchPair(): Promise<Pair> {
  const res = await fetch(`/api/games/pair?dimension=${randomDimension()}&game=hotter&v=1`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function HotterPage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [pair, setPair] = useState<Pair | null>(null);
  const [round, setRound] = useState(0);
  const [records, setRecords] = useState<RoundRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [verdictInfo, setVerdictInfo] = useState<VerdictInfo | null>(null);
  const [dealError, setDealError] = useState<DealError>(null);
  const [champion, setChampion] = useState<SlimMoodMovie | null>(null);
  const [priorStats, setPriorStats] = useState<HotterStats | null>(null);

  const nextPairRef = useRef<Promise<Pair | null> | null>(null);
  const sessionReady = useRef<Promise<string | null> | null>(null);
  const allTimeStats = useSyncExternalStore(emptySubscribe, readStatsSnapshot, () => null);

  useEffect(() => {
    sessionReady.current = ensureSession();
  }, []);

  const safeDeal = useCallback(async (): Promise<Pair | null> => {
    try {
      await sessionReady.current;
      return await fetchPair();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "401") {
        // stale cookie — re-establish the session and retry once
        try {
          sessionReady.current = ensureSession();
          await sessionReady.current;
          return await fetchPair();
        } catch {
          return null;
        }
      }
      if (msg === "429") throw e; // daily cap — surface, don't retry
      return null;
    }
  }, []);

  const dealInto = useCallback(
    async (promise: Promise<Pair | null>) => {
      setPair(null);
      setDealError(null);
      try {
        const next = await promise;
        if (next) setPair(next);
        else setDealError("fail");
      } catch {
        setDealError("cap");
      }
    },
    [],
  );

  const startRun = useCallback(() => {
    setRound(0);
    setRecords([]);
    setStreak(0);
    setBestStreak(0);
    setVerdictInfo(null);
    setChampion(null);
    setPhase("playing");
    nextPairRef.current = null;
    void dealInto(safeDeal());
  }, [dealInto, safeDeal]);

  const finishRun = useCallback(
    (finalRecords: RoundRecord[], runBest: number) => {
      const syncs = finalRecords.filter((r) => r.verdict === "sync").length;
      const takes = finalRecords.filter((r) => r.verdict === "take").length;
      const prior = storageGet<HotterStats>(STATS_KEY) ?? EMPTY_STATS;
      setPriorStats(prior);
      storageSet<HotterStats>(STATS_KEY, {
        runs: prior.runs + 1,
        rounds: prior.rounds + finalRecords.length,
        syncs: prior.syncs + syncs,
        takes: prior.takes + takes,
        bestStreak: Math.max(prior.bestStreak, runBest),
      });
      setPhase("result");
      const c = championRound(finalRecords);
      if (c) {
        fetch(`/api/movies?ids=${c.pickedId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setChampion(data?.movies?.[0] ?? null))
          .catch(() => setChampion(null));
      }
    },
    [],
  );

  const handleTap = useCallback(
    (m: PairMovie) => {
      if (!pair || verdictInfo) return;
      const other = pair.movies.find((x) => x.key !== m.key)!;

      playCue("snap");
      emitSignal(pair.assignmentId, m.key);

      const verdict = judge(pair.dimension, m.score, other.score);
      const gap = normalizedGap(pair.dimension, m.score, other.score);
      const record: RoundRecord = {
        verdict,
        dimension: pair.dimension,
        pickedId: m.tmdb_id,
        pickedTitle: m.title,
        otherId: other.tmdb_id,
        otherTitle: other.title,
        gap,
      };
      const newRecords = [...records, record];
      const newStreak = verdict === "sync" ? streak + 1 : verdict === "take" ? 0 : streak;
      const newBest = Math.max(bestStreak, newStreak);

      setRecords(newRecords);
      setStreak(newStreak);
      setBestStreak(newBest);
      setVerdictInfo({ verdict, pickedKey: m.key, modelPick: other.title, streakAfter: newStreak });
      playCue(verdict === "sync" ? "sync" : verdict === "take" ? "take" : "tie");

      // Prefetch the next pair during the verdict beat. Server-side latency
      // for that assignment will include this beat (~1–2s) — known skew.
      const isLast = newRecords.length >= RUN_LENGTH;
      if (!isLast) nextPairRef.current = safeDeal().catch(() => null);

      window.setTimeout(() => {
        setVerdictInfo(null);
        if (isLast) {
          finishRun(newRecords, newBest);
        } else {
          setRound(newRecords.length);
          void dealInto(nextPairRef.current ?? safeDeal());
        }
      }, VERDICT_MS[verdict]);
    },
    [pair, verdictInfo, records, streak, bestStreak, safeDeal, dealInto, finishRun],
  );

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle="Two posters. One question. Tap the one that hits harder."
            description={
              <>
                The model scored thirty thousand movies on how they feel. Each
                round it hides its answer until you commit. Stay in sync and the
                streak climbs. Disagree and your hot take goes on the record.
                Twelve pairs a run.
                {allTimeStats && allTimeStats.bestStreak > 0 && (
                  <>
                    <br />
                    <span className="text-foreground/50">
                      Your best streak so far: {allTimeStats.bestStreak}.
                    </span>
                  </>
                )}
              </>
            }
            ctaLabel="DEAL ME IN"
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
            <Hud round={round} records={records} streak={streak} />

            {dealError === "cap" && <CapNotice />}
            {dealError === "fail" && (
              <DealFailed onRetry={() => void dealInto(safeDeal())} />
            )}

            {!dealError && (
              <AnimatePresence mode="wait">
                {pair ? (
                  <motion.div
                    key={pair.assignmentId}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <h2 className="min-h-[4rem] px-2 text-center text-xl sm:text-2xl font-[family-name:var(--font-display)] font-bold leading-snug flex items-center justify-center">
                      {DIMENSION_COPY[pair.dimension].question}
                    </h2>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {pair.movies.map((m) => (
                        <PosterButton
                          key={m.key}
                          movie={m}
                          pickedKey={verdictInfo?.pickedKey ?? null}
                          locked={!!verdictInfo}
                          reduceMotion={!!reduceMotion}
                          onTap={handleTap}
                        />
                      ))}
                    </div>

                    <VerdictStrip info={verdictInfo} reduceMotion={!!reduceMotion} />

                    {round === 0 && !verdictInfo && (
                      <p className="mt-2 text-center text-xs text-muted-foreground/40">
                        Trust your gut. The model only shows its hand after you tap.
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <PairSkeleton key="skeleton" />
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {phase === "result" && (
          <RunResult
            key="result"
            records={records}
            bestStreak={bestStreak}
            priorBest={priorStats?.bestStreak ?? 0}
            champion={champion}
            onPlayAgain={startRun}
          />
        )}
      </AnimatePresence>
    </GamePage>
  );
}

/* ---------------------------------- HUD --------------------------------- */

function Hud({
  round,
  records,
  streak,
}: {
  round: number;
  records: RoundRecord[];
  streak: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between">
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
          Pair {Math.min(round + 1, RUN_LENGTH)} of {RUN_LENGTH}
        </p>
        <p
          className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums transition-opacity"
          style={{
            color: ACCENT,
            opacity: streak >= 2 ? 1 : 0,
            textShadow: streak >= 5 ? `0 0 12px ${ACCENT}80` : undefined,
          }}
          aria-hidden={streak < 2}
        >
          {streak} in sync
        </p>
      </div>
      {/* The run wire: one tick per pair, coloured by verdict. */}
      <div className="mt-2 flex justify-center gap-1" aria-hidden>
        {Array.from({ length: RUN_LENGTH }, (_, i) => {
          const r = records[i];
          const color = !r
            ? i === round
              ? "rgba(255,255,255,0.25)"
              : "rgba(255,255,255,0.08)"
            : r.verdict === "sync"
              ? ACCENT
              : r.verdict === "take"
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.3)";
          return (
            <span
              key={i}
              className="h-1 w-3 rounded-[1px] transition-colors duration-300"
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Poster card ------------------------------ */

function PosterButton({
  movie,
  pickedKey,
  locked,
  reduceMotion,
  onTap,
}: {
  movie: PairMovie;
  pickedKey: "a" | "b" | null;
  locked: boolean;
  reduceMotion: boolean;
  onTap: (m: PairMovie) => void;
}) {
  const isPicked = pickedKey === movie.key;
  const isPassed = pickedKey !== null && !isPicked;

  return (
    <motion.button
      onClick={() => onTap(movie)}
      disabled={locked}
      className="text-left cursor-pointer disabled:cursor-default"
      animate={
        reduceMotion
          ? { opacity: isPassed ? 0.35 : 1 }
          : {
              scale: isPicked ? 1.03 : isPassed ? 0.96 : 1,
              opacity: isPassed ? 0.35 : 1,
            }
      }
      whileTap={!locked && !reduceMotion ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
    >
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border bg-[oklch(0.12_0_0)] transition-colors duration-150"
        style={{ borderColor: isPicked ? ACCENT : "oklch(0.25 0 0)" }}
      >
        {movie.poster_path ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w342${movie.poster_path}`}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 50vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4">
            <p className="text-center font-[family-name:var(--font-display)] font-bold text-foreground/70 leading-snug">
              {movie.title}
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground/80 leading-tight">
        {movie.title}{" "}
        <span className="text-muted-foreground/50">({movie.year})</span>
      </p>
    </motion.button>
  );
}

/* ------------------------------ Verdict strip ---------------------------- */

function VerdictStrip({
  info,
  reduceMotion,
}: {
  info: VerdictInfo | null;
  reduceMotion: boolean;
}) {
  return (
    <div className="mt-5 min-h-[3.5rem] text-center" aria-live="polite">
      <AnimatePresence>
        {info && (
          <motion.p
            key={info.verdict + info.pickedKey}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="text-sm sm:text-base text-foreground/80 leading-relaxed"
          >
            {info.verdict === "sync" && (
              <>
                <span className="font-semibold" style={{ color: ACCENT }}>
                  Synced.
                </span>{" "}
                The model reads it the same way.
                {info.streakAfter >= 3 && ` That's ${info.streakAfter} straight.`}
              </>
            )}
            {info.verdict === "take" && (
              <>
                <span className="font-semibold text-foreground">Hot take.</span>{" "}
                The model backs {info.modelPick}. Your dissent is on the record.
              </>
            )}
            {info.verdict === "tie" && (
              <>
                <span className="font-semibold text-foreground">Dead heat.</span>{" "}
                The model won&apos;t call this one. Your vote decides it.
              </>
            )}
            {info.verdict === "unscored" && (
              <>
                <span className="font-semibold text-foreground">Uncharted.</span>{" "}
                The model has no read here yet. Yours is the first.
              </>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Load / error ----------------------------- */

function PairSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="min-h-[4rem]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="aspect-[2/3] w-full animate-pulse rounded-[4px] border border-[oklch(0.2_0_0)] bg-[oklch(0.14_0_0)]" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded-[2px] bg-[oklch(0.16_0_0)]" />
          </div>
        ))}
      </div>
      <div className="mt-5 min-h-[3.5rem]" />
    </motion.div>
  );
}

function CapNotice() {
  return (
    <div className="pt-12 text-center">
      <p className="text-lg font-[family-name:var(--font-display)] font-bold mb-2">
        You&apos;ve played through today&apos;s deck.
      </p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        The dealer needs to reshuffle. Come back tomorrow — the model will be
        waiting.
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
        The deal fell through. Bad connection, probably.
      </p>
      <button
        onClick={onRetry}
        className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: ACCENT }}
      >
        Deal again
      </button>
    </div>
  );
}

/* -------------------------------- Result --------------------------------- */

function RunResult({
  records,
  bestStreak,
  priorBest,
  champion,
  onPlayAgain,
}: {
  records: RoundRecord[];
  bestStreak: number;
  priorBest: number;
  champion: SlimMoodMovie | null;
  onPlayAgain: () => void;
}) {
  const syncs = records.filter((r) => r.verdict === "sync").length;
  const takes = records.filter((r) => r.verdict === "take");
  const c = championRound(records);
  const grid = records.map((r) => GRID_GLYPH[r.verdict]).join("");
  const newBest = bestStreak > priorBest && priorBest > 0;

  if (!c) return null;

  const headline =
    c.verdict === "take" ? (
      <>
        You backed {c.pickedTitle} over {c.otherTitle}. The model disagrees.
      </>
    ) : takes.length === 0 && syncs > 0 ? (
      <>
        {RUN_LENGTH} pairs, not one argument. You and the model agree — this
        one delivers.
      </>
    ) : (
      <>The model couldn&apos;t call a thing. Your gut ran the table.</>
    );

  if (!champion) {
    // Movie record still loading (or lookup failed) — show the stats shell.
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-12"
      >
        <RunStats records={records} bestStreak={bestStreak} newBest={newBest} />
        <div className="flex justify-center mt-8">
          <button
            onClick={onPlayAgain}
            className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: ACCENT }}
          >
            Run it back
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <ResultScreen
      game={GAME}
      movie={champion}
      eyebrow={c.verdict === "take" ? "Your hottest take" : "Highest conviction"}
      headline={headline}
      sharePayload={{
        game: "hotter",
        pickedMovieId: c.pickedId,
        vsMovieId: c.otherId,
        dimension: c.dimension,
        agreed: c.verdict === "sync",
        syncs,
        takes: takes.length,
        rounds: records.length,
        bestStreak,
        grid,
      }}
      shareIntent={`Hotter: ${syncs}/${records.length} in sync with the model, best streak ${bestStreak}. ${grid}`}
      onPlayAgain={onPlayAgain}
      playAgainLabel="Run it back"
    >
      <RunStats records={records} bestStreak={bestStreak} newBest={newBest} />
    </ResultScreen>
  );
}

function RunStats({
  records,
  bestStreak,
  newBest,
}: {
  records: RoundRecord[];
  bestStreak: number;
  newBest: boolean;
}) {
  const syncs = records.filter((r) => r.verdict === "sync").length;
  const takes = records.filter((r) => r.verdict === "take");

  return (
    <div className="mt-6">
      <div className="rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-5">
        <div className="flex justify-center gap-1 mb-4" aria-hidden>
          {records.map((r, i) => (
            <span
              key={i}
              className="h-1.5 w-4 rounded-[1px]"
              style={{
                backgroundColor:
                  r.verdict === "sync"
                    ? ACCENT
                    : r.verdict === "take"
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "In sync", value: syncs },
            { label: "Best streak", value: bestStreak },
            { label: "Hot takes", value: takes.length },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
                {s.label}
              </p>
              <p className="font-[family-name:var(--font-geist-mono)] text-lg text-foreground/90 mt-0.5 tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>
        {newBest && (
          <p
            className="mt-3 text-center text-[11px] font-semibold tracking-[0.15em] uppercase"
            style={{ color: ACCENT }}
          >
            New all-time best streak
          </p>
        )}
      </div>

      {takes.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
            Your takes, on the record
          </p>
          <div className="space-y-2">
            {takes.map((t, i) => (
              <div
                key={i}
                className="rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <p className="text-sm text-foreground/70 leading-snug">
                  You took {t.pickedTitle}. The model took {t.otherTitle}.
                </p>
                <p className="text-xs text-muted-foreground/40 mt-0.5">
                  On {DIMENSION_COPY[t.dimension].noun}. History will judge.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
