"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { GAMES, type GameConfig, type GameId } from "@/components/game-shell/types";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

interface HubTile {
  id: GameId;
  status: "live" | "soon";
  /** One-line hook. Lives here, not in the registry — the hub sells, the intro explains. */
  blurb: string;
  flagship?: boolean;
}

/**
 * The select screen. Live games up top, the rest of the slate as coming
 * attractions in their own costume hues — a marquee, not a directory.
 */
const HUB_TILES: HubTile[] = [
  {
    id: "hotter",
    status: "live",
    blurb:
      "Two posters, one question, and a model with opinions. Stay in sync as long as you can, or go down swinging with a hot take.",
  },
  {
    id: "blind-taste",
    status: "live",
    blurb:
      "Five vibe sentences. No titles. No posters. Pick the one you'd watch tonight, then see what you chose.",
  },
  {
    id: "shape-of-stories",
    status: "soon",
    blurb:
      "Six curves a story can take. Pick the shape of a movie you know and teach the model its arc.",
  },
  {
    id: "mood-bridge",
    status: "soon",
    blurb:
      "Start at one movie, land on another. Five hops, and every hop has to stay within reach in mood. New bridge daily.",
  },
  {
    id: "dinner-party",
    status: "soon",
    blurb:
      "Your four guests arrived in four different moods. Find the one film that works for the whole table.",
  },
  {
    id: "card-game",
    status: "soon",
    flagship: true,
    blurb:
      "Draft eight movies into a hand and play them trick by trick, mood against mood. Take on the house, then challenge a friend.",
  },
];

export default function GamesPage() {
  return (
    <PageLayout currentPage="/games" maxWidth="max-w-4xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="pt-16 pb-12 text-center"
      >
        <motion.h1
          variants={fadeUp}
          className="text-4xl font-[family-name:var(--font-display)] font-bold mb-3"
        >
          Games
        </motion.h1>
        <motion.p variants={fadeUp} className="text-muted-foreground max-w-md mx-auto">
          Ways to find what you&apos;re in the mood for. The model has
          opinions. Every round you play sharpens them.
        </motion.p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16"
      >
        {HUB_TILES.map((t) => (
          <motion.div
            key={t.id}
            variants={fadeUp}
            className={t.flagship ? "sm:col-span-2" : undefined}
          >
            <GameTile tile={t} game={GAMES[t.id]} />
          </motion.div>
        ))}
      </motion.div>
    </PageLayout>
  );
}

function GameTile({ tile, game }: { tile: HubTile; game: GameConfig }) {
  const accent = game.accent.color;
  const live = tile.status === "live";

  const inner = (
    <div
      className="relative h-full rounded-[4px] border p-6 transition-colors duration-150"
      style={{
        borderColor: `${accent}33`,
        background: `radial-gradient(120% 130% at 0% 0%, ${accent}${live ? "14" : "0A"}, oklch(0.12 0 0) 62%)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: accent }}
        >
          {live ? "Now playing" : tile.flagship ? "The flagship · soon" : "Soon"}
        </span>
        {live && (
          <span
            className="text-[11px] font-semibold tracking-wide transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: accent }}
            aria-hidden
          >
            Play →
          </span>
        )}
      </div>
      <h2
        className="font-[family-name:var(--font-display)] font-bold text-xl leading-snug"
        style={{ color: accent }}
      >
        {game.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
        {tile.blurb}
      </p>
    </div>
  );

  if (!live) return <div className="h-full">{inner}</div>;

  return (
    <Link
      href={game.path}
      className="group block h-full transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {inner}
    </Link>
  );
}
