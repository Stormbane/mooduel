"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { ResultScreen } from "@/components/game-shell/result-screen";
import { GAMES } from "@/components/game-shell/types";
import { guestState, GUEST_GLYPH, THREADED_AT } from "@/lib/games/dinner-party";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["dinner-party"];
const ACCENT = GAME.accent.color;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface ShelfMovie {
  id: number;
  t: string;
  y: number;
  pp: string | null;
  v: string;
  reactions: { s: number; line: string }[];
  total: number;
}

interface Party {
  guests: { name: string; vignette: string }[];
  shelf: ShelfMovie[];
  modelPickId: number;
}

interface PartyRecord {
  served: ShelfMovie;
  threaded: number;
  modelPick: ShelfMovie;
  glyphs: string;
}

type Phase = "intro" | "playing" | "result";

export default function DinnerPartyPage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [partyIdx, setPartyIdx] = useState(0);
  const [servedIdx, setServedIdx] = useState<number | null>(null);
  const [records, setRecords] = useState<PartyRecord[]>([]);
  const [champion, setChampion] = useState<SlimMoodMovie | null>(null);

  const loadParties = useCallback(() => {
    setParties(null);
    setLoadError(false);
    fetch("/api/games/party?count=3")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setParties(data.parties))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(loadParties, [loadParties]);

  const startRun = useCallback(() => {
    if (!parties) return;
    setPartyIdx(0);
    setServedIdx(null);
    setRecords([]);
    setChampion(null);
    setPhase("playing");
  }, [parties]);

  const party = parties?.[partyIdx] ?? null;

  const serve = useCallback(
    (idx: number) => {
      if (!party || servedIdx !== null) return;
      const served = party.shelf[idx];
      const threaded = served.reactions.filter((r) => r.s >= THREADED_AT).length;
      const modelPick = party.shelf.find((m) => m.id === party.modelPickId) ?? served;
      setServedIdx(idx);
      setRecords((rs) => [
        ...rs,
        {
          served,
          threaded,
          modelPick,
          glyphs: served.reactions.map((r) => GUEST_GLYPH[guestState(r.s)]).join(""),
        },
      ]);
    },
    [party, servedIdx],
  );

  const advance = useCallback(() => {
    if (!parties) return;
    if (partyIdx + 1 >= parties.length) {
      const best = records.reduce((a, b) => (b.served.total > a.served.total ? b : a));
      setPhase("result");
      fetch(`/api/movies?ids=${best.served.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setChampion(data?.movies?.[0] ?? null))
        .catch(() => setChampion(null));
      // fresh parties for the next run
      loadParties();
      return;
    }
    setPartyIdx((i) => i + 1);
    setServedIdx(null);
  }, [parties, partyIdx, records, loadParties]);

  return (
    <GamePage game={GAME}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen
            key="intro"
            game={GAME}
            subtitle="Four guests. Four moods. One film that has to land for everyone."
            description={
              loadError ? (
                "The kitchen's in chaos — refresh and we'll reset the table."
              ) : (
                <>
                  Zillmann called it mood management: we choose what we watch
                  to fix how we feel. Read the table, then serve the one film
                  that threads every guest. Three parties tonight.
                </>
              )
            }
            ctaLabel={parties ? "SEAT THE GUESTS" : "SETTING THE TABLE…"}
            onStart={startRun}
          />
        )}

        {phase === "playing" && party && (
          <motion.div
            key={`party-${partyIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8 sm:pt-10"
          >
            <div className="mb-5 flex items-baseline justify-between">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
                Party {partyIdx + 1} of {parties!.length}
              </p>
              {servedIdx !== null && (
                <p
                  className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums"
                  style={{ color: ACCENT }}
                >
                  {records[records.length - 1].threaded} of {party.guests.length} threaded
                </p>
              )}
            </div>

            {/* The table */}
            <div className="space-y-2">
              {party.guests.map((g, gi) => (
                <GuestCard
                  key={g.name}
                  name={g.name}
                  vignette={g.vignette}
                  reaction={servedIdx !== null ? party.shelf[servedIdx].reactions[gi] : null}
                  reduceMotion={!!reduceMotion}
                />
              ))}
            </div>

            {servedIdx === null ? (
              <>
                <h2 className="mt-6 mb-3 text-center text-lg sm:text-xl font-[family-name:var(--font-display)] font-bold">
                  What do you put on?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {party.shelf.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => serve(i)}
                      className="text-left rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-3 transition-colors duration-150 hover:bg-[oklch(0.14_0_0)] hover:border-[oklch(0.35_0_0)] cursor-pointer"
                    >
                      <div className="flex gap-2.5">
                        <div className="relative w-12 shrink-0 aspect-[2/3] overflow-hidden rounded-[3px] border border-white/10">
                          {m.pp ? (
                            <Image
                              src={`${TMDB_IMAGE_BASE}/w154${m.pp}`}
                              alt={`${m.t} poster`}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full bg-[oklch(0.16_0_0)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground/90 leading-tight">
                            {m.t}
                          </p>
                          <p className="text-[11px] text-muted-foreground/50">{m.y}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs italic text-muted-foreground/60 leading-relaxed line-clamp-3">
                        &ldquo;{m.v}&rdquo;
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <ServedPanel
                party={party}
                record={records[records.length - 1]}
                isLast={partyIdx + 1 >= parties!.length}
                onAdvance={advance}
              />
            )}
          </motion.div>
        )}

        {phase === "result" && records.length > 0 && (
          <NightResult
            key="result"
            records={records}
            movie={champion}
            onPlayAgain={startRun}
            partiesReady={!!parties}
          />
        )}
      </AnimatePresence>
    </GamePage>
  );
}

/* ------------------------------- Guest card ------------------------------ */

function GuestCard({
  name,
  vignette,
  reaction,
  reduceMotion,
}: {
  name: string;
  vignette: string;
  reaction: { s: number; line: string } | null;
  reduceMotion: boolean;
}) {
  const state = reaction ? guestState(reaction.s) : null;
  const border =
    state === "threaded" ? `${ACCENT}88` : state === "partial" ? "rgba(255,255,255,0.25)" : state === "miss" ? "rgba(255,255,255,0.08)" : "oklch(0.25 0 0)";

  return (
    <motion.div
      layout={!reduceMotion}
      className="rounded-[4px] border bg-[oklch(0.12_0_0)] px-4 py-3 transition-colors duration-200"
      style={{ borderColor: border, opacity: state === "miss" ? 0.65 : 1 }}
    >
      <p className="text-sm text-foreground/85">
        <span className="font-semibold">{name}</span>
        {state && (
          <span className="ml-2" aria-hidden>
            {GUEST_GLYPH[state]}
          </span>
        )}
      </p>
      <p className="text-xs text-muted-foreground/60 leading-relaxed mt-0.5">{vignette}</p>
      <AnimatePresence>
        {reaction && (
          <motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-xs leading-relaxed mt-1.5"
            style={{ color: state === "threaded" ? ACCENT : "rgba(255,255,255,0.65)" }}
          >
            {reaction.line}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------ Served panel ----------------------------- */

function ServedPanel({
  party,
  record,
  isLast,
  onAdvance,
}: {
  party: Party;
  record: PartyRecord;
  isLast: boolean;
  onAdvance: () => void;
}) {
  const modelAgreed = record.modelPick.id === record.served.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-6"
    >
      <div className="rounded-[4px] border bg-[oklch(0.12_0_0)] p-4" style={{ borderColor: `${ACCENT}55` }}>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: ACCENT }}>
          You served
        </p>
        <p className="text-base font-[family-name:var(--font-display)] font-bold">
          {record.served.t}{" "}
          <span className="text-muted-foreground/50 font-normal text-sm">({record.served.y})</span>
        </p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          {modelAgreed
            ? "The model would have served the same thing. Rare consensus."
            : `The model would have poured ${record.modelPick.t} instead.`}
        </p>
      </div>
      <button
        onClick={onAdvance}
        className="block mx-auto mt-5 rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: ACCENT }}
      >
        {isLast ? "Last call" : "Next party"}
      </button>
    </motion.div>
  );
}

/* -------------------------------- Result --------------------------------- */

function NightResult({
  records,
  movie,
  onPlayAgain,
  partiesReady,
}: {
  records: PartyRecord[];
  movie: SlimMoodMovie | null;
  onPlayAgain: () => void;
  partiesReady: boolean;
}) {
  const threadedTotal = records.reduce((a, r) => a + r.threaded, 0);
  const guestsTotal = records.reduce((a, r) => a + r.glyphs.length / 2, 0); // glyphs are 2-char emoji
  const totalSeats = records.length * 4;
  void guestsTotal;

  const tally = (
    <div className="mt-6">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
        The night&apos;s tally
      </p>
      <div className="space-y-2">
        {records.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-2.5"
          >
            <span className="shrink-0 text-sm tracking-wider" aria-hidden>
              {r.glyphs}
            </span>
            <span className="min-w-0 flex-1 text-sm text-foreground/75 truncate">
              {r.served.t}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">
              {r.modelPick.id === r.served.id ? "model agreed" : `model: ${r.modelPick.t}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!movie) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
        <p className="text-center text-2xl font-[family-name:var(--font-display)] font-bold">
          {threadedTotal} of {totalSeats} moods threaded.
        </p>
        {tally}
        <div className="flex justify-center mt-8">
          <button
            onClick={onPlayAgain}
            disabled={!partiesReady}
            className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            Host another night
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <ResultScreen
      game={GAME}
      movie={movie}
      eyebrow="Last call"
      headline={
        <>
          You threaded {threadedTotal} of {totalSeats} moods tonight. This
          was your best pour.
        </>
      }
      sharePayload={{
        game: "dinner-party",
        pickedMovieId: records.reduce((a, b) => (b.served.total > a.served.total ? b : a)).served.id,
        threaded: threadedTotal,
        seats: totalSeats,
        grid: records.map((r) => r.glyphs).join("·"),
      }}
      shareIntent={`The Dinner Party on Mooduel: I threaded ${threadedTotal} of ${totalSeats} moods. ${records.map((r) => r.glyphs).join("·")}`}
      onPlayAgain={onPlayAgain}
      playAgainLabel="Host another night"
    >
      {tally}
    </ResultScreen>
  );
}
