"use client";

import { apiUrl } from "@/lib/games/client/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { IntroScreen } from "@/components/game-shell/intro-screen";
import { GAMES } from "@/components/game-shell/types";
import { CardFace, TableSlot, MatchResult } from "@/components/card-game/shared";
import { ensureSession } from "@/lib/games/client/signals";
import { knownIdsForDealing, KNOWN_SET_KEY } from "@/lib/games/seen-it";
import { useSyncExternalStore } from "react";
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
  botLeadLowball,
  botFollow,
  buildModifierSchedule,
  MODIFIER_COPY,
  type Card,
  type Category,
  type TrickRecord,
  type TrickModifier,
  type DeckMovieShape,
} from "@/lib/games/card-game";
import { houseLine, houseReaction, type HouseEvent } from "@/lib/games/house-voice";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["card-game"];
const ACCENT = GAME.accent.color;

type Phase = "intro" | "draft" | "tricks" | "result";

const BOT_MS = 750;

const emptySubscribe = () => () => {};
function readHasKnownSet(): boolean {
  try {
    return !!window.localStorage.getItem(KNOWN_SET_KEY);
  } catch {
    return false;
  }
}

export default function CardGamePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [challenging, setChallenging] = useState(false);
  const hasKnownSet = useSyncExternalStore(emptySubscribe, readHasKnownSet, () => false);
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
  const [modifiers, setModifiers] = useState<TrickModifier[]>([]);
  const [chat, setChat] = useState<{ id: number; text: string }[]>([]);
  const [floaters, setFloaters] = useState<{ id: number; emoji: string; side: "you" | "house" }[]>([]);
  const chatId = useRef(0);
  const floatId = useRef(0);
  const announcedTrick = useRef(-1);
  const matchPointSaid = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const react = useCallback((emoji: string, side: "you" | "house") => {
    const id = ++floatId.current;
    setFloaters((f) => [...f, { id, emoji, side }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1400);
  }, []);

  const say = useCallback(
    (e: HouseEvent) => {
      setChat((c) => [...c.slice(-2), { id: ++chatId.current, text: houseLine(e) }]);
      const r = houseReaction(e);
      if (r) react(r, "house");
    },
    [react],
  );

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
    setModifiers(buildModifierSchedule());
    setChat([{ id: ++chatId.current, text: houseLine("matchStart") }]);
    setFloaters([]);
    announcedTrick.current = -1;
    matchPointSaid.current = false;
    try {
      const prefer = knownIdsForDealing();
      const res = await fetch(
        apiUrl(`/api/games/deck?count=16${prefer.length ? `&prefer=${prefer.join(",")}` : ""}`),
      );
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
      say("draftDone");
    },
    [say],
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
      later(() => {
        draftPick(pick, true);
        if (draftIdx === 2) say("houseDraftGood");
      }, BOT_MS / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool, draftIdx]);

  /* ------------------------------- Tricks ------------------------------- */

  const applyTrick = useCallback(
    (record: TrickRecord, you: Card[], them: Card[]) => {
      setReveal(record);

      // the house has opinions about every outcome
      const big = record.margin >= 25;
      say(
        record.winner === "draw"
          ? "drawTrick"
          : record.winner === "you"
            ? big
              ? "youWinBig"
              : "youWinSmall"
            : big
              ? "houseWinBig"
              : "houseWinSmall",
      );

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
          const finalScore = tallyMatch(nextTricks);
          say(
            finalScore.you > finalScore.them
              ? "youWin"
              : finalScore.them > finalScore.you
                ? "houseWins"
                : "matchDraw",
          );
          const mvp = mvpCard(nextTricks) ?? record.yourCard;
          fetch(apiUrl(`/api/movies?ids=${mvp.id}`))
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setChampion(data?.movies?.[0] ?? null))
            .catch(() => setChampion(null));
        } else {
          setLeader(record.winner === "them" ? "them" : "you");
          const tail = nextTricks.slice(-3);
          if (tail.length === 3 && tail.every((t) => t.winner === "you")) say("youStreak");
          const sc = tallyMatch(nextTricks);
          if (!matchPointSaid.current && (sc.you >= 4 || sc.them >= 4)) {
            matchPointSaid.current = true;
            say(sc.you >= 4 ? "matchPointYou" : "matchPointHouse");
          }
        }
      }, 1900);
    },
    [tricks, later, say],
  );

  // Announce the round twist as each trick opens (once per trick —
  // effects double-fire in dev)
  useEffect(() => {
    if (phase !== "tricks" || tricks.length >= TRICKS) return;
    if (announcedTrick.current === tricks.length) return;
    announcedTrick.current = tricks.length;
    const m = modifiers[tricks.length];
    if (m && m !== "standard") say(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tricks.length]);

  // House leads when it holds the lead
  useEffect(() => {
    if (phase !== "tricks" || leader !== "them" || reveal || theirPlayed) return;
    if (tricks.length >= TRICKS || theirHand.length === 0) return;
    setHouseThinking(true);
    const mod = modifiers[tricks.length] ?? "standard";
    later(() => {
      const legal = legalLeads(tricks);
      const lead =
        mod === "lowball"
          ? botLeadLowball(theirHand, yourHand, legal)
          : botLead(theirHand, yourHand, legal);
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

      const mod = modifiers[tricks.length] ?? "standard";
      if (leader === "you") {
        setHouseThinking(true);
        later(() => {
          const theirs = botFollow(theirHand, yourHand, activeCategory, undefined, mod);
          setTheirPlayed(theirs);
          setHouseThinking(false);
          const record = scoreTrick(activeCategory, "you", card, theirs, mod);
          applyTrick(record, you, theirHand.filter((c) => c.id !== theirs.id));
        }, BOT_MS);
      } else {
        const theirs = theirPlayed!;
        const record = scoreTrick(activeCategory, "them", card, theirs, mod);
        applyTrick(record, you, theirHand.filter((c) => c.id !== theirs.id));
      }
    },
    [activeCategory, reveal, yourPlayed, yourHand, theirHand, theirPlayed, leader, applyTrick, later, modifiers, tricks.length],
  );

  const score = tallyMatch(tricks);
  const currentModifier: TrickModifier =
    phase === "tricks" ? (modifiers[tricks.length] ?? "standard") : "standard";
  // blind = the follower can't see the mood; when the house leads a blind
  // trick, that follower is you
  const youAreBlind =
    currentModifier === "blind" && leader === "them" && !reveal;

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
              {!hasKnownSet && (
                <p className="mt-4 text-xs text-muted-foreground/50">
                  New to the table?{" "}
                  <Link
                    href="/games/seen-it"
                    className="underline underline-offset-2 hover:text-muted-foreground"
                  >
                    Thirty seconds of Seen It
                  </Link>{" "}
                  tunes the deck to movies you know.
                </p>
              )}
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
                {currentModifier !== "standard" && (
                  <span
                    className="ml-2 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ borderColor: `${ACCENT}88`, color: ACCENT }}
                  >
                    {MODIFIER_COPY[currentModifier].name.toUpperCase()}
                  </span>
                )}
              </p>
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums">
                <span style={{ color: ACCENT }}>You {score.you}</span>
                <span className="text-muted-foreground/40"> · </span>
                <span className="text-foreground/60">House {score.them}</span>
              </p>
            </div>

            {/* The table */}
            <div className="relative rounded-[4px] border border-[oklch(0.22_0_0)] bg-[oklch(0.1_0_0)] p-4">
              {/* emoji reactions float up over their side of the table */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <AnimatePresence>
                  {floaters.map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 8, scale: 0.7 }}
                      animate={{ opacity: [0, 1, 1, 0], y: -64, scale: 1.15 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.3, ease: "easeOut" }}
                      className="absolute bottom-10 text-2xl"
                      style={{ left: f.side === "you" ? "22%" : "70%" }}
                    >
                      {f.emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
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
                        : `${reveal.winner === "you" ? "You take" : "The house takes"} ${reveal.modifier === "lowball" ? "the lowball on " : ""}${categoryLabel(reveal.category).toLowerCase()} by ${reveal.margin}${reveal.weight === 2 ? " — twice over" : ""}.`}
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
                        {youAreBlind ? "???" : categoryLabel(activeCategory)}
                      </span>
                      {leader === "them" &&
                        (youAreBlind
                          ? " — blind. Commit before the mood is revealed."
                          : " — answer with a card.")}
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
                  category={reveal ? reveal.category : youAreBlind ? null : activeCategory}
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
                        {activeCategory && !reveal && !youAreBlind && (
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

            {/* table talk */}
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-h-[3.5rem] flex-1 space-y-1" aria-live="polite">
                <AnimatePresence initial={false}>
                  {chat.map((m) => (
                    <motion.p
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="text-xs text-muted-foreground/70 leading-snug"
                    >
                      <span
                        className="mr-1.5 rounded-[2px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-black"
                        style={{ backgroundColor: `${ACCENT}CC` }}
                      >
                        House
                      </span>
                      <span className="italic">{m.text}</span>
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 gap-1">
                {["🔥", "😂", "😤", "👏", "🫠"].map((e) => (
                  <button
                    key={e}
                    onClick={() => react(e, "you")}
                    aria-label={`react ${e}`}
                    className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-[oklch(0.22_0_0)] text-base transition-colors hover:bg-white/[0.04] cursor-pointer"
                  >
                    {e}
                  </button>
                ))}
              </div>
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

