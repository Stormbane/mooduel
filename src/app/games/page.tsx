"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { GAMES } from "@/components/game-shell/types";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/**
 * Games that ship on the v1.0 landing. Vibe Tree and Mood Drift are in
 * build; they render a "coming soon" card until their page.tsx lands.
 */
const V1_GAMES = [
  {
    id: "blind-taste",
    status: "live" as const,
    blurb:
      "Five vibe sentences. No titles. No posters. Pick the one you'd watch tonight, then see what you chose.",
  },
  {
    id: "vibe-tree",
    status: "soon" as const,
    blurb:
      "Navigate a tree of mood clusters, each named by the dataset. Descend branch by branch until one movie remains.",
  },
  {
    id: "mood-drift",
    status: "soon" as const,
    blurb:
      "A daily puzzle. Guess today's hidden movie from its mood signature. Six tries. Wordle for vibes.",
  },
] as const;

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
        <motion.p variants={fadeUp} className="text-muted-foreground">
          Different ways to discover movies through mood.
        </motion.p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {V1_GAMES.map((g) => {
          const game = GAMES[g.id];
          const disabled = g.status === "soon";
          const inner = (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="font-[family-name:var(--font-display)] font-bold text-lg"
                  style={{ color: game.accent.color }}
                >
                  {game.title}
                </h2>
                {disabled && (
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {g.blurb}
              </p>
            </>
          );

          return (
            <motion.div key={game.id} variants={fadeUp}>
              {disabled ? (
                <div
                  className="block rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-6 opacity-60 cursor-not-allowed"
                  aria-disabled="true"
                >
                  {inner}
                </div>
              ) : (
                <Link
                  href={game.path}
                  className="block rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.12_0_0)] p-6 transition-colors duration-150 hover:border-[oklch(0.35_0_0)] hover:bg-[oklch(0.14_0_0)]"
                >
                  {inner}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      <p className="text-center text-xs text-muted-foreground/30 mt-16">
        More games on the way.
      </p>
    </PageLayout>
  );
}
