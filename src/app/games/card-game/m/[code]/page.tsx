"use client";

import { apiUrl } from "@/lib/games/client/api";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { GamePage } from "@/components/game-shell/game-page";
import { GAMES } from "@/components/game-shell/types";
import { CardFace, TableSlot, MatchResult } from "@/components/card-game/shared";
import { ensureSession } from "@/lib/games/client/signals";
import {
  CATEGORIES,
  TRICKS,
  HAND_SIZE,
  categoryLabel,
  deckToCard,
  type Card,
  type Category,
  type TrickRecord,
  type DeckMovieShape,
} from "@/lib/games/card-game";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["card-game"];
const ACCENT = GAME.accent.color;

interface ResolvedTrick {
  category: Category;
  leaderSeat: 1 | 2;
  cardBySeat: Record<"1" | "2", number>;
  winnerSeat: 1 | 2 | 0;
  margin: number;
}

interface MatchState {
  code: string;
  status: string;
  stateVersion: number;
  currentTurn: number | null;
  turnDeadline: string | null;
  winnerSeat: number | null;
  deal: DeckMovieShape[];
  resolved: ResolvedTrick[];
  pendingCategory: Category | null;
  pendingLeaderSeat: number | null;
  seats: { seat: number; taken: boolean }[];
  yourSeat: number | null;
  yourSealed: number[] | null;
  yourHand: number[] | null;
  yourPending: number | null;
  handsSet: { 1: boolean; 2: boolean };
}

const POLL_MS = 8000;

export default function PvpMatchPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [champion, setChampion] = useState<SlimMoodMovie | null>(null);
  const sessionReady = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    sessionReady.current = ensureSession();
  }, []);

  const refresh = useCallback(async () => {
    try {
      await sessionReady.current;
      const res = await fetch(apiUrl(`/api/games/match/${code}`));
      if (res.status === 404) {
        setError("This table doesn't exist. Check the link.");
        return;
      }
      if (!res.ok) throw new Error();
      setState(await res.json());
      setError(null);
    } catch {
      setError((prev) => prev ?? "Couldn't reach the table. Refresh to retry.");
    }
  }, [code]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cardById = useMemo(() => {
    const map = new Map<number, Card>();
    for (const m of state?.deal ?? []) map.set(m.tmdb_id, deckToCard(m));
    return map;
  }, [state?.deal]);

  const yourSeat = state?.yourSeat ?? null;
  const yourTurn = !!state && state.status === "active" && state.currentTurn === yourSeat;
  const bothHandsSet = !!state && state.handsSet[1] && state.handsSet[2];
  const needsPick = !!state && yourSeat !== null && (state.yourSealed?.length ?? 0) > 0;

  // poll while something is pending on the other side
  useEffect(() => {
    if (!state || yourSeat === null) return;
    const waiting =
      state.status === "open" ||
      (state.status === "active" && (!yourTurn || !bothHandsSet));
    if (!waiting) return;
    const t = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(t);
  }, [state, yourSeat, yourTurn, bothHandsSet, refresh]);

  // finished → fetch MVP movie for the result screen
  useEffect(() => {
    if (!state || yourSeat === null || champion) return;
    if (state.status !== "finished" && state.status !== "forfeit") return;
    const relative = toRelativeTricks(state, yourSeat, cardById);
    const mvp =
      relative.filter((t) => t.winner === "you").sort((a, b) => b.margin - a.margin)[0]?.yourCard ??
      relative[0]?.yourCard;
    if (!mvp) return;
    fetch(apiUrl(`/api/movies?ids=${mvp.id}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setChampion(data?.movies?.[0] ?? null))
      .catch(() => setChampion(null));
  }, [state, yourSeat, champion, cardById]);

  const join = useCallback(async () => {
    setBusy(true);
    try {
      await sessionReady.current;
      const res = await fetch(apiUrl(`/api/games/match/${code}/join`), { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice(data?.error ?? "Couldn't take the seat.");
      } else {
        setState(await res.json());
        setNotice(null);
      }
    } finally {
      setBusy(false);
    }
  }, [code]);

  const pickHand = useCallback(
    async (ids: number[]) => {
      setBusy(true);
      try {
        const res = await fetch(apiUrl(`/api/games/match/${code}/hand`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cardIds: ids }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setNotice(data?.error ?? "Pick failed.");
        } else {
          setState(await res.json());
          setNotice(null);
        }
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  const submitTurn = useCallback(
    async (input: { follow?: { cardId: number }; lead?: { category: Category; cardId: number } }) => {
      if (!state) return;
      setBusy(true);
      try {
        const res = await fetch(apiUrl(`/api/games/match/${code}/move`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedVersion: state.stateVersion,
            idempotencyKey: crypto.randomUUID(),
            ...input,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.state) {
          setState(data.state);
          setNotice(null);
        } else {
          setNotice(
            data?.status === "version-conflict"
              ? "The table moved on — refreshed it for you."
              : `Move refused: ${data?.status ?? data?.error ?? "unknown"}`,
          );
          void refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [state, code, refresh],
  );

  const forfeit = useCallback(async () => {
    if (!window.confirm("Concede the table?")) return;
    await fetch(apiUrl(`/api/games/match/${code}/forfeit`), { method: "POST" });
    void refresh();
  }, [code, refresh]);

  /* ------------------------------ rendering ------------------------------ */

  if (error) {
    return (
      <GamePage game={GAME} maxWidth="max-w-2xl">
        <div className="pt-20 text-center">
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link
            href="/games/card-game"
            className="rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
          >
            Back to the card room
          </Link>
        </div>
      </GamePage>
    );
  }

  if (!state) {
    return (
      <GamePage game={GAME} maxWidth="max-w-2xl">
        <p className="pt-24 text-center text-sm text-muted-foreground/50 animate-pulse">
          Finding the table…
        </p>
      </GamePage>
    );
  }

  const seat2Free = !state.seats.find((s) => s.seat === 2)?.taken;

  // A stranger with the link
  if (yourSeat === null) {
    return (
      <GamePage game={GAME} maxWidth="max-w-2xl">
        <div className="pt-20 text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: ACCENT }}
          >
            You&apos;ve been challenged
          </p>
          <h1 className="text-3xl font-[family-name:var(--font-display)] font-bold mb-3">
            Mooduel: The Card Game
          </h1>
          {state.status === "open" && seat2Free ? (
            <>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                Someone wants to know whose taste wins. Twelve sealed movies,
                pick eight, play them trick by trick. Take the seat.
              </p>
              {notice && <p className="text-xs text-foreground/60 mb-3">{notice}</p>}
              <button
                onClick={join}
                disabled={busy}
                className="rounded-[4px] px-8 py-3 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {busy ? "TAKING THE SEAT…" : "ACCEPT THE CHALLENGE"}
              </button>
            </>
          ) : (
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              This table is already playing. Start your own from the card room.
            </p>
          )}
        </div>
      </GamePage>
    );
  }

  // Sealed draft
  if (needsPick) {
    return (
      <GamePage game={GAME} maxWidth="max-w-3xl">
        <SealedDraft
          sealed={state.yourSealed!.map((id) => cardById.get(id)!).filter(Boolean)}
          busy={busy}
          notice={notice}
          onConfirm={pickHand}
        />
      </GamePage>
    );
  }

  // Finished / forfeit
  if (state.status === "finished" || state.status === "forfeit") {
    const relative = toRelativeTricks(state, yourSeat, cardById);
    if (state.status === "forfeit") {
      const youWin = state.winnerSeat === yourSeat;
      return (
        <GamePage game={GAME} maxWidth="max-w-2xl">
          <div className="pt-20 text-center">
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold mb-3">
              {youWin ? "They folded. The table is yours." : "You conceded the table."}
            </p>
            <Link
              href="/games/card-game"
              className="inline-block mt-4 rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
            >
              Back to the card room
            </Link>
          </div>
        </GamePage>
      );
    }
    return (
      <GamePage game={GAME} maxWidth="max-w-2xl">
        <AnimatePresence>
          <MatchResult
            key="result"
            tricks={relative}
            movie={champion}
            opponent="your opponent"
            mode="pvp"
            onPlayAgain={() => (window.location.href = "/games/card-game")}
            playAgainLabel="New match"
          />
        </AnimatePresence>
      </GamePage>
    );
  }

  // Waiting for the second seat
  if (state.status === "open") {
    return (
      <GamePage game={GAME} maxWidth="max-w-2xl">
        <ShareLinkPanel code={code} handPicked={(state.yourHand?.length ?? 0) > 0} />
      </GamePage>
    );
  }

  // Active play
  return (
    <GamePage game={GAME} maxWidth="max-w-2xl">
      <ActiveTable
        state={state}
        cardById={cardById}
        yourSeat={yourSeat as 1 | 2}
        yourTurn={yourTurn}
        bothHandsSet={bothHandsSet}
        busy={busy}
        notice={notice}
        reduceMotion={!!reduceMotion}
        onSubmit={submitTurn}
        onForfeit={forfeit}
        onRefresh={() => void refresh()}
      />
    </GamePage>
  );
}

/* ----------------------------- helper mapping ----------------------------- */

function toRelativeTricks(
  state: MatchState,
  yourSeat: number,
  cardById: Map<number, Card>,
): TrickRecord[] {
  const theirSeat = yourSeat === 1 ? 2 : 1;
  return state.resolved.map((r) => {
    const yourCard = cardById.get(r.cardBySeat[String(yourSeat) as "1" | "2"])!;
    const theirCard = cardById.get(r.cardBySeat[String(theirSeat) as "1" | "2"])!;
    return {
      category: r.category,
      leader: r.leaderSeat === yourSeat ? ("you" as const) : ("them" as const),
      yourCard,
      theirCard,
      winner:
        r.winnerSeat === 0 ? ("draw" as const) : r.winnerSeat === yourSeat ? ("you" as const) : ("them" as const),
      margin: r.margin,
      modifier: "standard" as const,
      weight: 1,
    };
  });
}

/* ------------------------------ Sealed draft ------------------------------ */

function SealedDraft({
  sealed,
  busy,
  notice,
  onConfirm,
}: {
  sealed: Card[];
  busy: boolean;
  notice: string | null;
  onConfirm: (ids: number[]) => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < HAND_SIZE) next.add(id);
      return next;
    });

  return (
    <div className="pt-8">
      <div className="mb-4 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-2"
          style={{ color: ACCENT }}
        >
          Your sealed twelve
        </p>
        <h2 className="text-xl font-[family-name:var(--font-display)] font-bold">
          Keep eight. Nobody sees your hand.
        </h2>
        <p className="text-sm text-muted-foreground/60 mt-1 tabular-nums">
          {picked.size} of {HAND_SIZE} chosen
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {sealed.map((card) => {
          const on = picked.has(card.id);
          return (
            <button
              key={card.id}
              data-testid="sealed-card"
              onClick={() => toggle(card.id)}
              className="text-left cursor-pointer"
            >
              <div
                className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border-2 transition-colors"
                style={{ borderColor: on ? ACCENT : "oklch(0.25 0 0)", opacity: on ? 1 : 0.75 }}
              >
                <CardFace card={card} sizes="(max-width: 640px) 33vw, 176px" />
                {on && (
                  <span
                    className="absolute top-1 right-1 rounded-[2px] px-1 text-[9px] font-bold text-black"
                    style={{ backgroundColor: ACCENT }}
                  >
                    IN
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/60 leading-tight line-clamp-1">
                {card.t}
              </p>
            </button>
          );
        })}
      </div>

      {notice && <p className="mt-3 text-center text-xs text-foreground/60">{notice}</p>}
      <button
        onClick={() => onConfirm([...picked])}
        disabled={picked.size !== HAND_SIZE || busy}
        className="block mx-auto mt-5 rounded-[4px] px-8 py-3 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
        style={{ backgroundColor: ACCENT }}
      >
        {busy ? "SEALING…" : "LOCK IN THESE EIGHT"}
      </button>
    </div>
  );
}

/* ------------------------------- Share panel ------------------------------ */

function ShareLinkPanel({ code, handPicked }: { code: string; handPicked: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/games/card-game/m/${code}` : "";

  return (
    <div className="pt-20 text-center">
      <p
        className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4"
        style={{ color: ACCENT }}
      >
        Challenge dealt
      </p>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold mb-3">
        {handPicked ? "Your eight are locked in." : "The table is set."}
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
        Send this link to your opponent. They get their own sealed twelve, and
        the tricks start when both hands are locked. Moves keep for 48 hours.
      </p>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
          } catch {
            /* clipboard unavailable — the url is visible below */
          }
        }}
        className="rounded-[4px] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: ACCENT }}
      >
        {copied ? "Link copied" : "Copy challenge link"}
      </button>
      <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground/50 break-all px-6">
        {url}
      </p>
      <p className="mt-6 text-xs text-muted-foreground/40 animate-pulse">
        Waiting for them to sit down…
      </p>
    </div>
  );
}

/* ------------------------------ Active table ------------------------------ */

function ActiveTable({
  state,
  cardById,
  yourSeat,
  yourTurn,
  bothHandsSet,
  busy,
  notice,
  reduceMotion,
  onSubmit,
  onForfeit,
  onRefresh,
}: {
  state: MatchState;
  cardById: Map<number, Card>;
  yourSeat: 1 | 2;
  yourTurn: boolean;
  bothHandsSet: boolean;
  busy: boolean;
  notice: string | null;
  reduceMotion: boolean;
  onSubmit: (input: { follow?: { cardId: number }; lead?: { category: Category; cardId: number } }) => void;
  onForfeit: () => void;
  onRefresh: () => void;
}) {
  const [followId, setFollowId] = useState<number | null>(null);
  const [leadCategory, setLeadCategory] = useState<Category | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);

  const relative = toRelativeTricks(state, yourSeat, cardById);
  const yourWins = relative.filter((t) => t.winner === "you").length;
  const theirWins = relative.filter((t) => t.winner === "them").length;
  const hand = (state.yourHand ?? []).map((id) => cardById.get(id)!).filter(Boolean);
  const lastTrick = relative[relative.length - 1] ?? null;

  const mustFollow = state.pendingCategory !== null && state.pendingLeaderSeat !== yourSeat;
  const resolvedAfterFollow = state.resolved.length + (mustFollow ? 1 : 0);
  const mustLead = resolvedAfterFollow < TRICKS;
  const usedCategories = new Set<Category>([
    ...state.resolved.map((r) => r.category),
    ...(state.pendingCategory ? [state.pendingCategory] : []),
  ]);
  const legal = CATEGORIES.filter((c) => !usedCategories.has(c));

  const deadline = state.turnDeadline ? new Date(state.turnDeadline) : null;
  const deadlineText = deadline
    ? deadline.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })
    : null;

  const ready =
    (!mustFollow || followId !== null) && (!mustLead || (leadCategory !== null && leadId !== null));

  const submit = () => {
    if (!ready) return;
    onSubmit({
      follow: mustFollow && followId !== null ? { cardId: followId } : undefined,
      lead: mustLead && leadCategory && leadId !== null ? { category: leadCategory, cardId: leadId } : undefined,
    });
    setFollowId(null);
    setLeadCategory(null);
    setLeadId(null);
  };

  return (
    <div className="pt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] text-muted-foreground/60 uppercase tabular-nums">
          Trick {Math.min(state.resolved.length + 1, TRICKS)} of {TRICKS}
        </p>
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.2em] uppercase tabular-nums">
          <span style={{ color: ACCENT }}>You {yourWins}</span>
          <span className="text-muted-foreground/40"> · </span>
          <span className="text-foreground/60">Them {theirWins}</span>
        </p>
      </div>

      {!bothHandsSet ? (
        <div className="rounded-[4px] border border-[oklch(0.22_0_0)] bg-[oklch(0.1_0_0)] p-8 text-center">
          <p className="text-sm text-foreground/80 mb-1">They&apos;re still picking their eight.</p>
          <p className="text-xs text-muted-foreground/50">
            This page checks the table every few seconds.
          </p>
        </div>
      ) : (
        <>
          {/* last resolved trick */}
          {lastTrick && (
            <div className="mb-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
              <p className="text-xs text-foreground/70">
                Last trick — {categoryLabel(lastTrick.category)}:{" "}
                <span className="text-foreground/90">{lastTrick.yourCard.t}</span>{" "}
                {lastTrick.yourCard.scores[lastTrick.category]} ·{" "}
                {lastTrick.theirCard.scores[lastTrick.category]}{" "}
                <span className="text-foreground/90">{lastTrick.theirCard.t}</span>{" "}
                <span
                  className="font-semibold"
                  style={{ color: lastTrick.winner === "you" ? ACCENT : "rgba(255,255,255,0.6)" }}
                >
                  {lastTrick.winner === "you" ? "— yours" : lastTrick.winner === "them" ? "— theirs" : "— drawn"}
                </span>
              </p>
            </div>
          )}

          {yourTurn ? (
            <div className="rounded-[4px] border border-[oklch(0.22_0_0)] bg-[oklch(0.1_0_0)] p-4">
              {mustFollow && (
                <div className="mb-4">
                  <p className="text-sm text-center text-foreground/85 mb-3">
                    They led{" "}
                    <span className="font-bold" style={{ color: ACCENT }}>
                      {categoryLabel(state.pendingCategory!)}
                    </span>{" "}
                    with a face-down card. Answer it.
                  </p>
                  <HandRow
                    hand={hand.filter((c) => c.id !== leadId)}
                    category={state.pendingCategory}
                    selectedId={followId}
                    onPick={(id) => setFollowId(id)}
                    testid="follow-card"
                  />
                </div>
              )}

              {mustLead && (
                <div>
                  <p className="text-sm text-center text-foreground/85 mb-2">
                    {mustFollow ? "Then call the next mood:" : "Your lead. Call the mood:"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                    {legal.map((c) => (
                      <button
                        key={c}
                        data-testid="lead-category"
                        onClick={() => setLeadCategory(c)}
                        className="rounded-[4px] border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
                        style={{
                          borderColor: leadCategory === c ? ACCENT : "oklch(0.28 0 0)",
                          color: leadCategory === c ? ACCENT : "rgba(255,255,255,0.75)",
                        }}
                      >
                        {categoryLabel(c)}
                      </button>
                    ))}
                  </div>
                  {leadCategory && (
                    <HandRow
                      hand={hand.filter((c) => c.id !== followId)}
                      category={leadCategory}
                      selectedId={leadId}
                      onPick={(id) => setLeadId(id)}
                      testid="lead-card"
                    />
                  )}
                </div>
              )}

              {notice && <p className="mt-3 text-center text-xs text-foreground/60">{notice}</p>}
              <button
                onClick={submit}
                disabled={!ready || busy}
                data-testid="submit-turn"
                className="block mx-auto mt-4 rounded-[4px] px-8 py-3 text-sm font-bold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
              >
                {busy ? "PLAYING…" : mustFollow && mustLead ? "ANSWER + LEAD" : mustFollow ? "ANSWER" : "LEAD"}
              </button>
            </div>
          ) : (
            <div className="rounded-[4px] border border-[oklch(0.22_0_0)] bg-[oklch(0.1_0_0)] p-6 text-center">
              <div className="flex items-center justify-center gap-6 mb-4">
                <TableSlot
                  label="You"
                  card={state.yourPending ? (cardById.get(state.yourPending) ?? null) : null}
                  category={state.yourPending && state.pendingCategory ? state.pendingCategory : null}
                  faceDown={false}
                  reduceMotion={reduceMotion}
                />
                <span className="text-muted-foreground/30 text-xs uppercase tracking-widest">vs</span>
                <TableSlot
                  label="Them"
                  card={state.pendingCategory && state.pendingLeaderSeat !== yourSeat ? ({ id: -1, t: "?", y: 0, pp: null, scores: {} as Card["scores"] }) : null}
                  category={null}
                  faceDown
                  reduceMotion={reduceMotion}
                />
              </div>
              <p className="text-sm text-foreground/80 mb-1">
                {state.pendingCategory
                  ? `${categoryLabel(state.pendingCategory)} is on the table. Their move.`
                  : "Their move."}
              </p>
              <p className="text-xs text-muted-foreground/50">
                {deadlineText ? `They have until ${deadlineText} before the table calls it. ` : ""}
                This page checks every few seconds.
              </p>
              <button
                onClick={onRefresh}
                className="mt-3 min-h-[44px] px-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Check now
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/40">
          Your hand: {hand.length} card{hand.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={onForfeit}
          className="min-h-[44px] px-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          Concede
        </button>
      </div>
    </div>
  );
}

function HandRow({
  hand,
  category,
  selectedId,
  onPick,
  testid,
}: {
  hand: Card[];
  category: Category | null;
  selectedId: number | null;
  onPick: (id: number) => void;
  testid: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {hand.map((card) => (
        <button
          key={card.id}
          data-testid={testid}
          onClick={() => onPick(card.id)}
          className="shrink-0 w-[64px] text-left cursor-pointer"
        >
          <div
            className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border-2 transition-colors"
            style={{ borderColor: selectedId === card.id ? ACCENT : "oklch(0.25 0 0)" }}
          >
            <CardFace card={card} sizes="64px" />
            {category && (
              <span
                className="absolute top-1 right-1 rounded-[2px] px-1 py-0.5 text-[10px] font-bold tabular-nums text-black"
                style={{ backgroundColor: ACCENT }}
              >
                {card.scores[category]}
              </span>
            )}
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground/60 leading-tight line-clamp-1">{card.t}</p>
        </button>
      ))}
    </div>
  );
}
