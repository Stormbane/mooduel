"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { GAMES, type GameConfig, type GameId } from "@/components/game-shell/types";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
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
 * The select screen. Focus decision 2026-07-17: the card game is the
 * product; earlier slate games stay route-live but off the marquee
 * (same convention as the pre-replatform experiments). Seen It joins
 * as onboarding when it ships.
 */
const HUB_TILES: HubTile[] = [
  {
    id: "seen-it",
    status: "live",
    blurb:
      "Thirty seconds of posters: seen it, heard of it, or never met it. Teaches the table what you know, so every deal fits your brain.",
  },
  {
    id: "card-game",
    status: "live",
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
          {live
            ? tile.flagship
              ? "The flagship · now playing"
              : "Now playing"
            : tile.flagship
              ? "The flagship · soon"
              : "Soon"}
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
