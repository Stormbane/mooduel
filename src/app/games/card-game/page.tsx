"use client";

import { apiUrl } from "@/lib/games/client/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { GAMES } from "@/components/game-shell/types";
import { CardFace, TableSlot, MatchResult } from "@/components/card-game/shared";
import { ensureSession } from "@/lib/games/client/signals";
import {
  TRICKS,
  categoryLabel,
  deckToCard,
  scoreTrick,
  tallyMatch,
  legalLeads,
  draftOrder,
  mvpCard,
  botDraftPick,
  botLead,
  botFollow,
  type Card,
  type Category,
  type TrickRecord,
  type DeckMovieShape,
} from "@/lib/games/card-game";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["card-game"];
const ACCENT = GAME.accent.color;

type Phase = "intro" | "draft" | "tricks" | "result";

const BOT_MS = 750;

export default function CardGamePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [challenging, setChallenging] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [deckError, setDeckError] = useState(false);

  // draft state
  const [pool, setPool] = useState<Card[]>([]);
  const [owners, setOwners] = useState<Map<number, "you" | "them">>(new Map());
  const [draftIdx, setDraftIdx] = useState(0);

  // trick state
  const [yourHand, setYourHand] = useState<Card[]>([]);
  const [theirHand, setTheirHand] = useState<Card[]>([]);
  const [tricks, setTricks] = useState<TrickRecord[]>([]);
  const [leader, setLeader] = useState<"you" | "them">("you");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [theirPlayed, setTheirPlayed] = useState<Card | null>(null);
  const [yourPlayed, setYourPlayed] = useState<Card | null>(null);
  const [reveal, setReveal] = useState<TrickRecord | null>(null);
  const [houseThinking, setHouseThinking] = useState(false);

  const [champion, setChampion] = useState<SlimMoodMovie | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const order = draftOrder();

  const startMatch = useCallback(async () => {
    setDeckError(false);
    setPhase("draft");
    setPool([]);
    setOwners(new Map());
    setDraftIdx(0);
    setTricks([]);
    setReveal(null);
    setActiveCategory(null);
    setYourPlayed(null);
    setTheirPlayed(null);
    setChampion(null);
    try {
      const res = await fetch(apiUrl("/api/games/deck?count=16"));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPool((data.deck as DeckMovieShape[]).map(deckToCard));
    } catch {
      setDeckError(true);
    }
  }, []);

  /* ------------------------------- Draft -------------------------------- */

  const finishDraft = useCallback(
    (finalOwners: Map<number, "you" | "them">, cards: Card[]) => {
      const you = cards.filter((c) => finalOwners.get(c.id) === "you");
      const them = cards.filter((c) => finalOwners.get(c.id) === "them");
      setYourHand(you);
      setTheirHand(them);
      setLeader("you");
      setPhase("tricks");
    },
    [],
  );

  const draftPick = useCallback(
    (card: Card, byBot: boolean) => {
      setOwners((prev) => {
        const next = new Map(prev);
        next.set(card.id, byBot ? "them" : "you");
        return next;
      });
      setDraftIdx((i) => i + 1);
    },
    [],
  );

  // Bot draft turns + draft completion
  useEffect(() => {
    if (phase !== "draft" || pool.length === 0) return;
    if (draftIdx >= order.length) {
      finishDraft(owners, pool);
      return;
    }
    if (order[draftIdx] === "them") {
      const remaining = pool.filter((c) => !owners.has(c.id));
      const botHand = pool.filter((c) => owners.get(c.id) === "them");
      const pick = botDraftPick(remaining, botHand);
      later(() => draftPick(pick, true), BOT_MS / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool, draftIdx]);

  /* ------------------------------- Tricks ------------------------------- */

  const applyTrick = useCallback(
    (record: TrickRecord, you: Card[], them: Card[]) => {
      setReveal(record);
      later(() => {
        const nextTricks = [...tricks, record];
        setTricks(nextTricks);
        setYourHand(you);
        setTheirHand(them);
        setReveal(null);
        setActiveCategory(null);
        setYourPlayed(null);
        setTheirPlayed(null);
        if (nextTricks.length >= TRICKS) {
          setPhase("result");
          const mvp = mvpCard(nextTricks) ?? record.yourCard;
          fetch(apiUrl(`/api/movies?ids=${mvp.id}`))
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setChampion(data?.movies?.[0] ?? null))
            .catch(() => setChampion(null));
        } else {
          setLeader(record.winner === "them" ? "them" : "you");
        }
      }, 1900);
    },
    [tricks, later],
  );

  // House leads when it holds the lead
  useEffect(() => {
    if (phase !== "tricks" || leader !== "them" || reveal || theirPlayed) return;
    if (tricks.length >= TRICKS || theirHand.length === 0) return;
    setHouseThinking(true);
    later(() => {
      const lead = botLead(theirHand, yourHand, legalLeads(tricks));
      setActiveCategory(lead.category);
      setTheirPlayed(lead.card);
      setHouseThinking(false);
    }, BOT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leader, tricks.length, reveal]);

  const commitYourCard = useCallback(
    (card: Card) => {
      if (!activeCategory || reveal || yourPlayed) return;
      setYourPlayed(card);
      const you = yourHand.filter((c) => c.id !== card.id);

      if (leader === "you") {
        setHouseThinking(true);
        later(() => {
          const theirs = botFollow(theirHand, yourHand, activeCategory);
          setTheirPlayed(theirs);
          setHouseThinking(false);
          const record = scoreTrick(activeCategory, "you", card, theirs);
          applyTrick(record, you, theirHand.filter((c) => c.id !== theirs.id));
        }, BOT_MS);
      } else {
        const theirs = theirPlayed!;
        const record = scoreTrick(activeCategory, "them", card, theirs);
        applyTrick(record, you, theirHand.filter((c) => c.id !== theirs.id));
      }
    },
    [activeCategory, reveal, yourPlayed, yourHand, theirHand, theirPlayed, leader, applyTrick, later],
  );

  const score = tallyMatch(tricks);

  const createChallenge = useCallback(async () => {
    setChallenging(true);
    try {
      await ensureSession();
      const res = await fetch(apiUrl("/api/games/match"), { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(data.url);
    } catch {
      setChallenging(false);
    }
  }, [router]);

  return (
    <GamePage game={GAME} maxWidth="max-w-3xl">
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroScreen
              game={GAME}
              subtitle="Draft eight movies. Play them like a hand of cards."
              description={
                <>
                  Sixteen movies on the table, drafted one by one against the
                  house. Then eight tricks: the leader calls a mood — adrenaline,
                  comfort, swagger — both sides commit a card blind, and the
                  stronger score takes it. Each mood can only be called once.
                  Most tricks wins the night.
                </>
              }
              ctaLabel="SHUFFLE UP"
              onStart={startMatch}
            />
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground/40 mb-2">or</p>
              <button
                onClick={createChallenge}
                disabled={challenging}
                className="min-h-[44px] rounded-[4px] border border-[oklch(0.28_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors disabled:opacity-60"
              >
                {challenging ? "Setting the table…" : "Deal a challenge link for a friend"}
              </button>
            </div>
          </motion.div>
        )}

        {phase === "draft" && (
          <motion.div
            key="draft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8"
          >
            {deckError ? (
              <div className="pt-12 text-center">
                <p className="text-sm text-muted-foreground mb-5">
                  The deck slipped off the table. Bad connection, probably.
                </p>
                <button
                  onClick={startMatch}
                  className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
                  style={{ backgroundColor: ACCENT }}
                >
                  Re-deal
                </button>
              </div>
            ) : pool.length === 0 ? (
              <DraftSkeleton />
            ) : (
              <>
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
                    The draft · pick {Math.min(draftIdx + 1, order.length)} of {order.length}
                  </p>
                  <p
                    className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase"
                    style={{ color: ACCENT }}
                  >
                    {order[draftIdx] === "you" ? "Your pick" : "The house is picking…"}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {pool.map((card) => {
                    const owner = owners.get(card.id);
                    const yourTurn = order[draftIdx] === "you";
                    return (
                      <motion.button
                        key={card.id}
                        data-testid="pool-card"
                        onClick={() => yourTurn && !owner && draftPick(card, false)}
                        disabled={!yourTurn || !!owner}
                        whileTap={!owner && yourTurn && !reduceMotion ? { scale: 0.95 } : undefined}
                        animate={{ opacity: owner === "them" ? 0.35 : 1 }}
                        className="text-left cursor-pointer disabled:cursor-default"
                      >
                        <div
                          className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border-2 transition-colors"
                          style={{
                            borderColor:
                              owner === "you"
                                ? ACCENT
                                : owner === "them"
                                  ? "rgba(255,255,255,0.3)"
                                  : "oklch(0.25 0 0)",
                          }}
                        >
                          <CardFace card={card} sizes="(max-width: 640px) 25vw, 176px" />
                          {owner && (
                            <span
                              className="absolute top-1 right-1 rounded-[2px] px-1 text-[8px] font-bold uppercase"
                              style={{
                                backgroundColor: owner === "you" ? ACCENT : "rgba(255,255,255,0.75)",
                                color: "black",
                              }}
                            >
                              {owner === "you" ? "You" : "House"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground/60 leading-tight line-clamp-1">
                          {card.t}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {phase === "tricks" && (
          <motion.div
            key="tricks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-8"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
                Trick {Math.min(tricks.length + 1, TRICKS)} of {TRICKS}
              </p>
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums">
                <span style={{ color: ACCENT }}>You {score.you}</span>
                <span className="text-muted-foreground/40"> · </span>
                <span className="text-foreground/60">House {score.them}</span>
              </p>
            </div>

            {/* The table */}
            <div className="rounded-[4px] border border-[oklch(0.22_0_0)] bg-[oklch(0.1_0_0)] p-4">
              <div className="min-h-[1.75rem] text-center mb-3" aria-live="polite">
                <AnimatePresence mode="wait">
                  {reveal ? (
                    <motion.p
                      key="verdict"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm font-semibold"
                      style={{
                        color:
                          reveal.winner === "you"
                            ? ACCENT
                            : reveal.winner === "them"
                              ? "rgba(255,255,255,0.85)"
                              : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {reveal.winner === "draw"
                        ? `Dead even on ${categoryLabel(reveal.category).toLowerCase()}.`
                        : `${reveal.winner === "you" ? "You take" : "The house takes"} ${categoryLabel(reveal.category).toLowerCase()} by ${reveal.margin}.`}
                    </motion.p>
                  ) : activeCategory ? (
                    <motion.p
                      key="cat"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-foreground/80"
                    >
                      {leader === "you" ? "You lead" : "The house leads"}{" "}
                      <span className="font-bold" style={{ color: ACCENT }}>
                        {categoryLabel(activeCategory)}
                      </span>
                      {leader === "them" && " — answer with a card."}
                    </motion.p>
                  ) : (
                    <motion.p
                      key="pick"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-foreground/80"
                    >
                      {leader === "you" ? "Your lead. Call the mood." : houseThinking ? "The house considers its lead…" : ""}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center gap-6">
                <TableSlot
                  label="You"
                  card={yourPlayed ?? (reveal?.yourCard ?? null)}
                  category={reveal ? reveal.category : activeCategory}
                  highlight={reveal?.winner === "you"}
                  faceDown={false}
                  reduceMotion={!!reduceMotion}
                />
                <span className="text-muted-foreground/30 text-xs uppercase tracking-widest">vs</span>
                <TableSlot
                  label="The house"
                  card={reveal ? reveal.theirCard : theirPlayed}
                  category={reveal ? reveal.category : null}
                  highlight={reveal?.winner === "them"}
                  faceDown={!reveal && !!theirPlayed}
                  reduceMotion={!!reduceMotion}
                />
              </div>
            </div>

            {/* Category chips when you lead */}
            {leader === "you" && !activeCategory && !reveal && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {legalLeads(tricks).map((c) => {
                  const yourBest = Math.max(...yourHand.map((h) => h.scores[c]));
                  return (
                    <button
                      key={c}
                      data-testid="category-chip"
                      onClick={() => setActiveCategory(c)}
                      className="rounded-[4px] border border-[oklch(0.28_0_0)] bg-[oklch(0.13_0_0)] px-3 py-2 text-left transition-colors hover:border-[oklch(0.4_0_0)] cursor-pointer min-h-[44px]"
                    >
                      <span className="block text-xs font-semibold text-foreground/85">
                        {categoryLabel(c)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground/50 tabular-nums">
                        your best {yourBest}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Your hand */}
            <div className="mt-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
                Your hand{activeCategory && !yourPlayed && !reveal ? " — play one" : ""}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {yourHand.map((card) => {
                  const playable = !!activeCategory && !yourPlayed && !reveal;
                  return (
                    <motion.button
                      key={card.id}
                      data-testid="hand-card"
                      onClick={() => playable && commitYourCard(card)}
                      disabled={!playable}
                      whileTap={playable && !reduceMotion ? { scale: 0.95, y: -4 } : undefined}
                      className="shrink-0 w-[72px] text-left cursor-pointer disabled:cursor-default"
                    >
                      <div
                        className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border transition-colors"
                        style={{ borderColor: playable ? `${ACCENT}66` : "oklch(0.25 0 0)" }}
                      >
                        <CardFace card={card} sizes="72px" />
                        {activeCategory && !reveal && (
                          <span
                            className="absolute top-1 right-1 rounded-[2px] px-1 py-0.5 text-[10px] font-bold tabular-nums text-black"
                            style={{ backgroundColor: ACCENT }}
                          >
                            {card.scores[activeCategory]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[9px] text-muted-foreground/60 leading-tight line-clamp-1">
                        {card.t}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/40 mt-1">
                The house holds {theirHand.length} card{theirHand.length === 1 ? "" : "s"}.
              </p>
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <MatchResult
            key="result"
            tricks={tricks}
            movie={champion}
            opponent="the house"
            mode="solo"
            onPlayAgain={startMatch}
            playAgainLabel="Rematch"
          />
        )}
      </AnimatePresence>
    </GamePage>
  );
}

/* ------------------------------ Skeleton -------------------------------- */

function DraftSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] w-full animate-pulse rounded-[4px] border border-[oklch(0.2_0_0)] bg-[oklch(0.13_0_0)]" />
          <div className="mt-1 h-3 w-3/4 animate-pulse rounded-[2px] bg-[oklch(0.15_0_0)]" />
        </div>
      ))}
    </div>
  );
}

