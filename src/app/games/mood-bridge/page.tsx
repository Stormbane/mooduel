"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { ResultScreen } from "@/components/game-shell/result-screen";
import { GAMES } from "@/components/game-shell/types";
import { storageGet, storageSet } from "@/lib/games/client/storage";
import {
  moodDistance,
  BRIDGE_MAX_HOPS,
  BRIDGE_STATS_KEY,
  BRIDGE_EMPTY_STATS,
  type BridgeMovie,
  type BridgePuzzle,
  type BridgeStats,
} from "@/lib/games/mood-bridge";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["mood-bridge"];
const ACCENT = GAME.accent.color;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type Phase = "intro" | "playing" | "result";

interface SearchRow extends BridgeMovie {
  d: number;
  inReach: boolean;
}

const fmt = (n: number) => n.toFixed(2);

export default function MoodBridgePage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [puzzle, setPuzzle] = useState<BridgePuzzle | null>(null);
  const [puzzleError, setPuzzleError] = useState(false);
  const [path, setPath] = useState<BridgeMovie[]>([]);
  const [solved, setSolved] = useState(false);
  const [resultMovie, setResultMovie] = useState<SlimMoodMovie | null>(null);
  const [usedHints, setUsedHints] = useState(false);
  const [stats, setStats] = useState<BridgeStats | null>(null);

  useEffect(() => {
    // en-CA formats as YYYY-MM-DD in the player's own timezone
    const localDate = new Date().toLocaleDateString("en-CA");
    fetch(`/api/games/bridge/daily?date=${localDate}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPuzzle)
      .catch(() => setPuzzleError(true));
    setStats(storageGet<BridgeStats>(BRIDGE_STATS_KEY) ?? BRIDGE_EMPTY_STATS);
  }, []);

  const current = path[path.length - 1] ?? null;
  const hops = Math.max(0, path.length - 1);
  const gapToTarget = useMemo(
    () => (puzzle && current ? moodDistance(current, puzzle.target) : null),
    [puzzle, current],
  );
  const canCross =
    !!puzzle && !solved && gapToTarget !== null && gapToTarget <= puzzle.budget && hops < BRIDGE_MAX_HOPS;
  const collapsed = !!puzzle && !solved && hops >= BRIDGE_MAX_HOPS;

  const startRun = useCallback(() => {
    if (!puzzle) return;
    setPath([puzzle.start]);
    setSolved(false);
    setResultMovie(null);
    setUsedHints(false);
    setPhase("playing");
  }, [puzzle]);

  const hopTo = useCallback((movie: BridgeMovie) => {
    setPath((p) => [...p, movie]);
  }, []);

  const stepBack = useCallback(() => {
    setPath((p) => (p.length > 1 ? p.slice(0, -1) : p));
  }, []);

  const cross = useCallback(() => {
    if (!puzzle || !canCross) return;
    const finalPath = [...path, puzzle.target];
    setPath(finalPath);
    setSolved(true);

    const prior = storageGet<BridgeStats>(BRIDGE_STATS_KEY) ?? BRIDGE_EMPTY_STATS;
    if (prior.lastSolvedDate !== puzzle.date) {
      const yesterday = new Date(Date.parse(`${puzzle.date}T00:00:00Z`) - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const next: BridgeStats = {
        streak: prior.lastSolvedDate === yesterday ? prior.streak + 1 : 1,
        lastSolvedDate: puzzle.date,
        solved: prior.solved + 1,
        played: prior.played,
      };
      storageSet(BRIDGE_STATS_KEY, next);
      setStats(next);
    }

    setPhase("result");
    fetch(`/api/movies?ids=${puzzle.target.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setResultMovie(data?.movies?.[0] ?? null))
      .catch(() => setResultMovie(null));
  }, [puzzle, canCross, path]);

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle={
              puzzle
                ? `Today's crossing: ${puzzle.start.t} (${puzzle.start.y}) to ${puzzle.target.t} (${puzzle.target.y}).`
                : puzzleError
                  ? "The bridge is out."
                  : "Surveying today's gulf..."
            }
            description={
              puzzle ? (
                <>
                  Get across in {BRIDGE_MAX_HOPS} hops or fewer. Every hop is a
                  movie, and no hop can stretch the mood further than{" "}
                  {fmt(puzzle.budget)}. Today&apos;s gulf is{" "}
                  {fmt(moodDistance(puzzle.start, puzzle.target))} wide. Par{" "}
                  {puzzle.par}.
                  {stats && stats.streak > 0 && (
                    <>
                      <br />
                      <span className="text-foreground/50">
                        Crossing streak: {stats.streak}{" "}
                        {stats.streak === 1 ? "day" : "days"}.
                      </span>
                    </>
                  )}
                </>
              ) : puzzleError ? (
                "It happens to real bridges too. Refresh to try again."
              ) : undefined
            }
            ctaLabel="BUILD THE BRIDGE"
            onStart={startRun}
          />
        )}

        {phase === "playing" && puzzle && current && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8 sm:pt-10"
          >
            <Hud puzzle={puzzle} hops={hops} />
            <BridgeViz puzzle={puzzle} path={path} solved={solved} />

            <div className="mt-4 text-center min-h-[2.75rem]">
              <p className="text-sm text-foreground/80">
                You&apos;re at <span className="font-semibold">{current.t}</span>.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                The far bank is {fmt(gapToTarget ?? 0)} away. Your step limit is{" "}
                {fmt(puzzle.budget)}.
              </p>
            </div>

            <AnimatePresence>
              {canCross && (
                <motion.button
                  key="cross"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={cross}
                  className="block w-full mt-3 rounded-[4px] px-6 py-3.5 text-sm font-bold tracking-wide text-black transition-transform duration-100 hover:brightness-110 active:scale-[0.98]"
                  style={{ backgroundColor: ACCENT }}
                >
                  CROSS TO {puzzle.target.t.toUpperCase()}
                </motion.button>
              )}
            </AnimatePresence>

            {collapsed ? (
              <div className="mt-6 text-center rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-6">
                <p className="font-[family-name:var(--font-display)] font-bold text-lg mb-1">
                  The bridge ran out of planks.
                </p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Five hops, and the far bank is still {fmt(gapToTarget ?? 0)} away.
                </p>
                <button
                  onClick={startRun}
                  className="rounded-[4px] px-6 py-2.5 text-sm font-bold tracking-wide text-black transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
                  style={{ backgroundColor: ACCENT }}
                >
                  Tear it down, start over
                </button>
              </div>
            ) : (
              !solved && (
                <Workbench
                  puzzle={puzzle}
                  current={current}
                  path={path}
                  onHop={hopTo}
                  onHintUsed={() => setUsedHints(true)}
                />
              )
            )}

            {hops > 0 && !solved && (
              <button
                onClick={stepBack}
                className="block mx-auto mt-4 min-h-[44px] px-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ← Step back to {path[path.length - 2].t}
              </button>
            )}
          </motion.div>
        )}

        {phase === "result" && puzzle && (
          <CrossingResult
            key="result"
            puzzle={puzzle}
            path={path}
            movie={resultMovie}
            usedHints={usedHints}
            stats={stats}
            onPlayAgain={startRun}
          />
        )}
      </AnimatePresence>
    </GamePage>
  );
}

/* ---------------------------------- HUD --------------------------------- */

function Hud({ puzzle, hops }: { puzzle: BridgePuzzle; hops: number }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
        Bridge #{puzzle.number} · Par {puzzle.par}
      </p>
      <p
        className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums"
        style={{ color: ACCENT }}
      >
        Hop {Math.min(hops + 1, BRIDGE_MAX_HOPS)} of {BRIDGE_MAX_HOPS}
      </p>
    </div>
  );
}

/* ------------------------------- Bridge viz ------------------------------ */

function Node({
  movie,
  state,
}: {
  movie: BridgeMovie;
  state: "done" | "current" | "target-far" | "target-reached";
}) {
  const ring =
    state === "current" || state === "target-reached" ? ACCENT : "oklch(0.25 0 0)";
  return (
    <div className="shrink-0 w-10">
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] border transition-colors"
        style={{
          borderColor: ring,
          opacity: state === "target-far" ? 0.55 : 1,
        }}
        title={movie.t}
      >
        {movie.pp ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w92${movie.pp}`}
            alt={movie.t}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-0.5 bg-[oklch(0.14_0_0)]">
            <p className="text-center text-[7px] font-bold text-foreground/70 leading-tight">
              {movie.t}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BridgeViz({
  puzzle,
  path,
  solved,
}: {
  puzzle: BridgePuzzle;
  path: BridgeMovie[];
  solved: boolean;
}) {
  const hops = Math.max(0, path.length - 1);
  const remaining = Math.max(0, BRIDGE_MAX_HOPS - hops - (solved ? 0 : 0));
  const placeholders = solved ? 0 : Math.max(0, BRIDGE_MAX_HOPS - hops);

  return (
    <div className="flex items-center justify-center gap-1.5 overflow-x-auto px-1 py-2" aria-label="bridge so far">
      {path.map((m, i) => (
        <div key={`${m.id}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <Plank built />}
          <Node
            movie={m}
            state={
              solved && i === path.length - 1
                ? "target-reached"
                : i === path.length - 1
                  ? "current"
                  : "done"
            }
          />
        </div>
      ))}
      {!solved && (
        <>
          {Array.from({ length: placeholders }, (_, i) => (
            <Plank key={`p${i}`} built={false} />
          ))}
          <Node movie={puzzle.target} state="target-far" />
        </>
      )}
      {remaining < 0 && null}
    </div>
  );
}

function Plank({ built }: { built: boolean }) {
  return (
    <span
      className="shrink-0 h-0.5 w-3 rounded-full"
      style={{ backgroundColor: built ? ACCENT : "rgba(255,255,255,0.15)" }}
      aria-hidden
    />
  );
}

/* ------------------------------- Workbench ------------------------------- */

function Workbench({
  puzzle,
  current,
  path,
  onHop,
  onHintUsed,
}: {
  puzzle: BridgePuzzle;
  current: BridgeMovie;
  path: BridgeMovie[];
  onHop: (m: BridgeMovie) => void;
  onHintUsed: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [rail, setRail] = useState<BridgeMovie[]>([]);
  const [railLoading, setRailLoading] = useState(false);
  const pathIds = useMemo(() => new Set(path.map((m) => m.id)), [path]);
  const debounceRef = useRef<number | null>(null);

  // Re-rank existing rows and refresh the rail when the position changes.
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) => {
        const d = moodDistance(r, current);
        return { ...r, d, inReach: d <= puzzle.budget };
      }),
    );
    if (railOpen) void loadRail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  const loadRail = useCallback(async () => {
    setRailLoading(true);
    try {
      const res = await fetch(
        `/api/games/bridge/near?from=${current.id}&date=${puzzle.date}`,
      );
      const data = res.ok ? await res.json() : null;
      setRail((data?.movies ?? []).filter((m: BridgeMovie) => !pathIds.has(m.id) && m.id !== puzzle.target.id));
    } catch {
      setRail([]);
    } finally {
      setRailLoading(false);
    }
  }, [current.id, pathIds, puzzle.target.id]);

  const openRail = useCallback(() => {
    setRailOpen(true);
    onHintUsed();
    void loadRail();
  }, [loadRail, onHintUsed]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setRows([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies?search=${encodeURIComponent(q)}&limit=8`);
        const data = res.ok ? await res.json() : null;
        const movies: SlimMoodMovie[] = data?.movies ?? [];
        setRows(
          movies
            .filter((m) => !pathIds.has(m.id) && m.id !== puzzle.target.id && m.va != null)
            .map((m) => {
              const b: BridgeMovie = {
                id: m.id, t: m.t, y: m.y, pp: m.pp ?? null,
                va: m.va, ar: m.ar, do: m.do, ab: m.ab, he: m.he,
                eu: m.eu, pr: m.pr, co: m.co, conv: m.conv,
              };
              const d = moodDistance(b, current);
              return { ...b, d, inReach: d <= puzzle.budget };
            }),
        );
      } catch {
        setRows([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, current.id]);

  return (
    <div className="mt-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name a movie that moves the mood…"
        className="w-full rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.4_0_0)]"
      />

      <div className="mt-2 space-y-1.5">
        {searching && rows.length === 0 && (
          <p className="text-center text-xs text-muted-foreground/40 py-2">Searching…</p>
        )}
        {rows.map((r) =>
          r.inReach ? (
            <button
              key={r.id}
              onClick={() => {
                setQuery("");
                setRows([]);
                onHop(r);
              }}
              className="flex w-full items-center gap-3 rounded-[4px] border bg-[oklch(0.12_0_0)] px-3 py-2 text-left transition-colors hover:bg-[oklch(0.14_0_0)] cursor-pointer min-h-[52px]"
              style={{ borderColor: `${ACCENT}55` }}
            >
              <RowThumb movie={r} />
              <span className="min-w-0 flex-1 text-sm text-foreground/85 truncate">
                {r.t} <span className="text-muted-foreground/40">({r.y})</span>
              </span>
              <span
                className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-black"
                style={{ backgroundColor: ACCENT }}
              >
                {fmt(r.d)} · hop
              </span>
            </button>
          ) : (
            <div
              key={r.id}
              className="flex w-full items-center gap-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-3 py-2 opacity-50 min-h-[52px]"
            >
              <RowThumb movie={r} />
              <span className="min-w-0 flex-1 text-sm text-foreground/60 truncate">
                {r.t} <span className="text-muted-foreground/40">({r.y})</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
                {fmt(r.d)} · too far
              </span>
            </div>
          ),
        )}
      </div>

      <div className="mt-4">
        {railOpen ? (
          <>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
              Within reach of {current.t}
            </p>
            {railLoading ? (
              <p className="text-xs text-muted-foreground/40 py-3">Scouting the bank…</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {rail.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onHop(m)}
                    className="shrink-0 w-16 text-left cursor-pointer group"
                    title={m.t}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] border border-[oklch(0.25_0_0)] group-hover:border-[oklch(0.4_0_0)] transition-colors">
                      {m.pp ? (
                        <Image
                          src={`${TMDB_IMAGE_BASE}/w154${m.pp}`}
                          alt={m.t}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-1 bg-[oklch(0.14_0_0)]">
                          <p className="text-center text-[8px] font-bold text-foreground/70 leading-tight">
                            {m.t}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground/60 leading-tight line-clamp-2">
                      {m.t}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={openRail}
            className="block mx-auto min-h-[44px] px-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Stuck? See what&apos;s in reach 🧭
          </button>
        )}
      </div>
    </div>
  );
}

function RowThumb({ movie }: { movie: BridgeMovie }) {
  return (
    <div className="relative w-8 shrink-0 aspect-[2/3] overflow-hidden rounded-[2px] border border-white/10">
      {movie.pp ? (
        <Image
          src={`${TMDB_IMAGE_BASE}/w92${movie.pp}`}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        <div className="h-full bg-[oklch(0.16_0_0)]" />
      )}
    </div>
  );
}

/* -------------------------------- Result --------------------------------- */

function CrossingResult({
  puzzle,
  path,
  movie,
  usedHints,
  stats,
  onPlayAgain,
}: {
  puzzle: BridgePuzzle;
  path: BridgeMovie[];
  movie: SlimMoodMovie | null;
  usedHints: boolean;
  stats: BridgeStats | null;
  onPlayAgain: () => void;
}) {
  const hops = path.length - 1;
  const verdict =
    hops < puzzle.par
      ? "Under par. The model didn't see that route."
      : hops === puzzle.par
        ? "Right on par."
        : "Made it across.";

  const pathList = (
    <div className="mt-6">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
        Your crossing
      </p>
      <div className="space-y-1.5">
        {path.map((m, i) => (
          <div
            key={`${m.id}-${i}`}
            className="flex items-center gap-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span
              className="w-4 shrink-0 text-center font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums"
              style={{ color: i === 0 || i === path.length - 1 ? ACCENT : "rgba(255,255,255,0.4)" }}
            >
              {i}
            </span>
            <span className="min-w-0 flex-1 text-sm text-foreground/80 truncate">
              {m.t} <span className="text-muted-foreground/40">({m.y})</span>
            </span>
            {i > 0 && (
              <span className="shrink-0 text-[10px] text-muted-foreground/40 tabular-nums">
                +{fmt(moodDistance(path[i - 1], m))}
              </span>
            )}
          </div>
        ))}
      </div>
      {stats && stats.streak > 1 && (
        <p
          className="mt-3 text-center text-[11px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: ACCENT }}
        >
          {stats.streak}-day crossing streak
        </p>
      )}
    </div>
  );

  if (!movie) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-12"
      >
        <p className="text-center text-2xl font-[family-name:var(--font-display)] font-bold">
          {verdict}
        </p>
        {pathList}
      </motion.div>
    );
  }

  return (
    <ResultScreen
      game={GAME}
      movie={movie}
      eyebrow="Bridge crossed"
      headline={
        <>
          {puzzle.start.t} to {puzzle.target.t} in {hops} hops. {verdict}
        </>
      }
      sharePayload={{
        game: "mood-bridge",
        pickedMovieId: puzzle.target.id,
        path: path.map((m) => m.id),
        hops,
        par: puzzle.par,
        number: puzzle.number,
        usedHints,
      }}
      shareIntent={`Mood Bridge #${puzzle.number}: ${puzzle.start.t} → ${puzzle.target.t} in ${hops} hops (par ${puzzle.par}).${usedHints ? " 🧭" : ""} ${"▓".repeat(hops)}${"░".repeat(Math.max(0, BRIDGE_MAX_HOPS - hops))}`}
      onPlayAgain={onPlayAgain}
      playAgainLabel="Walk it again"
    >
      {pathList}
    </ResultScreen>
  );
}
