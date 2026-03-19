"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function DonatePage() {
  return (
    <div className="relative min-h-screen">
      {/* Warm ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[20%] left-[30%] h-[500px] w-[500px] rounded-full bg-[var(--color-pop-orange)]/[0.03] blur-[140px]" />
        <div className="absolute bottom-[30%] right-[20%] h-[400px] w-[400px] rounded-full bg-[var(--color-pop-yellow)]/[0.02] blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24">
        <div className="mx-auto max-w-xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="pt-20 pb-16"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-bold mb-4">
                Support{" "}
                <span className="gradient-text-orange">Mooduel</span>
              </h1>
              <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-[var(--color-pop-orange)]/30 to-transparent" />
            </motion.div>

            {/* Letter */}
            <motion.div variants={fadeUp} className="space-y-5 text-muted-foreground leading-[1.8] mb-16">
              <p>
                Mooduel is <strong className="text-foreground/80 font-medium">free, open source,
                and built by one person with one AI.</strong>
              </p>
              <p>
                There are no ads. No data harvesting. No premium tier.
                Just a game that reads your mood and helps you find something
                to watch — backed by the first open dataset of movie mood profiles.
              </p>
              <p>
                Your support keeps the project alive:
              </p>
              <ul className="space-y-2 ml-1">
                {[
                  "API costs for classifying 30,000+ movies with AI",
                  "Hosting and infrastructure",
                  "Growing the dataset with new releases",
                  "Keeping everything open and ad-free",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-[var(--color-pop-orange)]/60 mt-[2px] text-sm shrink-0">›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-foreground/60">
                Every contribution matters. Even a star on GitHub helps.
              </p>
            </motion.div>

            {/* Support cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
              <SupportCard
                icon="☕"
                title="Buy a Coffee"
                subtitle="One-time, any amount"
                href="https://buymeacoffee.com"
                color="orange"
              />
              <SupportCard
                icon="♡"
                title="GitHub Sponsors"
                subtitle="Monthly, from $5"
                href="https://github.com/sponsors/Stormbane"
                color="pink"
              />
              <SupportCard
                icon="★"
                title="Star on GitHub"
                subtitle="Free — helps visibility"
                href="https://github.com/Stormbane/mooduel"
                color="yellow"
              />
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-border/30 bg-card/30 px-6 py-2.5">
                <Stat value="30K+" label="movies" />
                <span className="text-muted-foreground/15">·</span>
                <Stat value="18" label="dimensions" />
                <span className="text-muted-foreground/15">·</span>
                <Stat value="100%" label="open source" />
              </div>
            </motion.div>

            {/* Thank you */}
            <motion.div variants={fadeUp} className="text-center mt-16">
              <p className="text-sm text-muted-foreground/30 italic">
                Thank you for believing in open science and open data.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-10 px-6">
        <div className="mx-auto max-w-xl flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground/40">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/15">·</span>
            <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
            <span className="text-muted-foreground/15">·</span>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>
          <span className="text-sm text-muted-foreground/30">Made with ♡</span>
        </div>
      </footer>
    </div>
  );
}

function SupportCard({ icon, title, subtitle, href, color }: {
  icon: string; title: string; subtitle: string; href: string; color: string;
}) {
  const borderColors: Record<string, string> = {
    orange: "hover:border-[var(--color-pop-orange)]/40",
    pink: "hover:border-[var(--color-pop-pink)]/40",
    yellow: "hover:border-[var(--color-pop-yellow)]/40",
  };
  const glows: Record<string, string> = {
    orange: "hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]",
    pink: "hover:shadow-[0_0_30px_rgba(233,30,140,0.08)]",
    yellow: "hover:shadow-[0_0_30px_rgba(251,191,36,0.08)]",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col items-center text-center rounded-2xl border border-border/30 bg-card/30 p-6 transition-all duration-300 ${borderColors[color]} ${glows[color]}`}
    >
      <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </span>
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-foreground/80 text-sm mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground/50">{subtitle}</p>
    </a>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="text-sm">
      <span className="font-[family-name:var(--font-display)] font-bold text-foreground/70">{value}</span>{" "}
      <span className="text-muted-foreground/40">{label}</span>
    </span>
  );
}
