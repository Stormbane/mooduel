"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const GAMES = [
  {
    href: "/games/blind-taste",
    title: "Blind Taste Test",
    desc: "Five vibe sentences. No titles. No posters. Pick the movie you'd watch tonight — then see what you chose.",
    color: "pink",
    status: "play",
  },
  {
    href: "/games/roulette",
    title: "Mood Roulette",
    desc: "Spin three reels — emotional arc, watch context, wild card. See what movies land. Pull again if you dare.",
    color: "purple",
    status: "play",
  },
  {
    href: "/games/mirror",
    title: "Mood Mirror",
    desc: "Twelve rapid choices. No right answers. At the end: your emotional fingerprint and the movies that match it.",
    color: "green",
    status: "play",
  },
  {
    href: "/play",
    title: "Mooduel",
    desc: "The full game — mood detection through color, art, and emotion, then movie picks and a tournament bracket.",
    color: "orange",
    status: "play",
  },
];

const colorMap: Record<string, { border: string; text: string; glow: string }> = {
  pink: { border: "border-[var(--color-pop-pink)]/30", text: "text-[var(--color-pop-pink)]", glow: "hover:shadow-[0_0_40px_rgba(233,30,140,0.1)]" },
  purple: { border: "border-[var(--color-pop-purple)]/30", text: "text-[var(--color-pop-purple)]", glow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.1)]" },
  green: { border: "border-[var(--color-pop-green)]/30", text: "text-[var(--color-pop-green)]", glow: "hover:shadow-[0_0_40px_rgba(30,215,96,0.1)]" },
  orange: { border: "border-[var(--color-pop-orange)]/30", text: "text-[var(--color-pop-orange)]", glow: "hover:shadow-[0_0_40px_rgba(249,115,22,0.1)]" },
};

export default function GamesPage() {
  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.15)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-4xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="pt-16 pb-12 text-center">
          <motion.h1 variants={fadeUp} className="text-4xl font-[family-name:var(--font-display)] font-bold mb-3">
            Games
          </motion.h1>
          <motion.p variants={fadeUp} className="text-muted-foreground">
            Different ways to discover movies through mood.
          </motion.p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {GAMES.map((game) => {
            const c = colorMap[game.color];
            return (
              <motion.div key={game.href} variants={fadeUp}>
                <Link
                  href={game.href}
                  className={`block rounded-2xl border ${c.border} bg-card/30 p-6 transition-all duration-300 hover:border-opacity-60 ${c.glow} hover:bg-card/50`}
                >
                  <h2 className={`font-[family-name:var(--font-display)] font-bold text-lg ${c.text} mb-2`}>
                    {game.title}
                  </h2>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    {game.desc}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
