"use client";

/**
 * Card-game table furniture shared by the solo and PvP pages: card faces,
 * table slots, and the match result screen.
 */
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ResultScreen } from "@/components/game-shell/result-screen";
import { GAMES } from "@/components/game-shell/types";
import {
  categoryLabel,
  tallyMatch,
  matchWinner,
  MODIFIER_COPY,
  type Card,
  type Category,
  type TrickRecord,
} from "@/lib/games/card-game";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const GAME = GAMES["card-game"];
const ACCENT = GAME.accent.color;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/* ------------------------------- Confetti ------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFETTI_HUES = ["#9F6EFF", "#FF4A1F", "#4CC2FF", "#FFB224", "#2EBD85", "#E91E8C"];
const confettiRand = mulberry32(1337);
const CONFETTI_PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: confettiRand() * 100,
  delay: confettiRand() * 0.5,
  duration: 1.7 + confettiRand() * 1.3,
  rotate: (confettiRand() - 0.5) * 720,
  drift: (confettiRand() - 0.5) * 120,
  size: 6 + confettiRand() * 6,
  color: CONFETTI_HUES[i % CONFETTI_HUES.length],
}));

/** One celebratory fall. Unmounts itself into stillness — no loops. */
export function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {CONFETTI_PIECES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -24, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "108vh", x: p.drift, opacity: [1, 1, 0.9, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            backgroundColor: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export function CardFace({ card, sizes }: { card: Card; sizes: string }) {
  if (card.pp) {
    return (
      <Image
        src={`${TMDB_IMAGE_BASE}/w185${card.pp}`}
        alt={`${card.t} poster`}
        fill
        sizes={sizes}
        className="object-cover"
      />
    );
  }
  return (
    <div className="flex h-full items-center justify-center p-1 bg-[oklch(0.14_0_0)]">
      <p className="text-center text-[9px] font-bold text-foreground/70 leading-tight">
        {card.t}
      </p>
    </div>
  );
}

export function TableSlot({
  label,
  card,
  category,
  highlight,
  faceDown,
  reduceMotion,
}: {
  label: string;
  card: Card | null;
  category: Category | null;
  highlight?: boolean;
  faceDown: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="w-24">
      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 mb-1 text-center">
        {label}
      </p>
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] border-2 transition-colors"
        style={{ borderColor: highlight ? ACCENT : "oklch(0.25 0 0)" }}
      >
        <AnimatePresence mode="wait">
          {card ? (
            faceDown ? (
              <motion.div
                key="back"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex h-full items-center justify-center"
                style={{
                  background: `repeating-linear-gradient(45deg, oklch(0.16 0 0), oklch(0.16 0 0) 6px, oklch(0.13 0 0) 6px, oklch(0.13 0 0) 12px)`,
                }}
              >
                <span className="text-lg" style={{ color: `${ACCENT}99` }} aria-hidden>
                  ?
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={`face-${card.id}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full"
              >
                <CardFace card={card} sizes="96px" />
                {category && (
                  <span
                    className="absolute bottom-1 right-1 rounded-[2px] px-1.5 py-0.5 text-xs font-bold tabular-nums text-black"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {card.scores[category]}
                  </span>
                )}
              </motion.div>
            )
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full bg-[oklch(0.12_0_0)]"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MatchResult({
  tricks,
  movie,
  opponent,
  mode,
  onPlayAgain,
  playAgainLabel,
}: {
  tricks: TrickRecord[];
  movie: SlimMoodMovie | null;
  /** "the house" or a friendlier noun for PvP. */
  opponent: string;
  mode: "solo" | "pvp";
  onPlayAgain: () => void;
  playAgainLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const score = tallyMatch(tricks);
  const winner = matchWinner(score);
  const grid = tricks
    .map((t) => (t.winner === "you" ? "🟪" : t.winner === "them" ? "⬛" : "🟨"))
    .join("");

  const eyebrow =
    winner === "you" ? "The night is yours" : winner === "them" ? `${opponent} wins` : "Dead heat";
  const headline =
    winner === "you" ? (
      <>
        {score.you} tricks to {score.them}. {opponent} wants a rematch, and
        this card carried you.
      </>
    ) : winner === "them" ? (
      <>
        {score.them} tricks to {score.you} for {opponent} — but this card
        fought for you.
      </>
    ) : (
      <>
        {score.you} all, and the margins couldn&apos;t split you. This card did
        its part.
      </>
    );

  const log = (
    <div className="mt-6">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
        The tricks
      </p>
      <div className="space-y-1.5">
        {tricks.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[4px] border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span
              className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: t.winner === "you" ? ACCENT : "rgba(255,255,255,0.45)" }}
            >
              {categoryLabel(t.category)}
              {t.modifier !== "standard" && (
                <span className="block text-[8px] font-normal text-muted-foreground/50">
                  {MODIFIER_COPY[t.modifier].name}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 text-xs text-foreground/70 truncate">
              {t.yourCard.t} {t.yourCard.scores[t.category]} · {t.theirCard.scores[t.category]}{" "}
              {t.theirCard.t}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">
              {t.winner === "you" ? "you" : t.winner === "them" ? "them" : "draw"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!movie) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
        {winner === "you" && !reduceMotion && <Confetti />}
        <p className="text-center text-2xl font-[family-name:var(--font-display)] font-bold">
          {eyebrow}. {score.you}–{score.them}.
        </p>
        {log}
        <div className="flex justify-center mt-8">
          <button
            onClick={onPlayAgain}
            className="rounded-[4px] px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: ACCENT }}
          >
            {playAgainLabel}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {winner === "you" && !reduceMotion && <Confetti />}
      <ResultScreen
      game={GAME}
      movie={movie}
      eyebrow={eyebrow}
      headline={headline}
      sharePayload={{
        game: "card-game",
        pickedMovieId: movie.id,
        won: winner,
        you: score.you,
        them: score.them,
        mode,
        grid,
      }}
      shareIntent={`Mooduel: The Card Game — ${winner === "you" ? "won" : winner === "them" ? "lost" : "drew"} ${score.you}–${score.them} ${mode === "solo" ? "against the house" : "against a friend"}. ${grid}`}
      onPlayAgain={onPlayAgain}
      playAgainLabel={playAgainLabel}
    >
      {log}
    </ResultScreen>
    </>
  );
}
