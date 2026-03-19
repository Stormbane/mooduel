"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// ── Vibe sentences from the v2 test run ──
const VIBE_SENTENCES = [
  "Quiet resilience meeting hope; freedom earned through patient faith.",
  "Sweaty panic and laughter wrapping around the ache of growing apart.",
  "Two hours of white-knuckle momentum through apocalyptic desert fury.",
  "Ancestral horror wearing family's face; descent into madness you cannot stop.",
  "Quiet grief and blue light; the tenderness of being finally, almost seen.",
  "Brilliant deception unraveling under the weight of impossible class structures.",
  "Symmetrical beauty preserving friendship in amber as time dissolves it.",
  "Floating houses and broken hearts learning to soar together.",
  "Genius without conscience, success without satisfaction.",
  "Sensory overload collapsing into quiet, hard-won grace.",
  "Neon-drenched loneliness in a city that never stops raining.",
  "A father's lullaby echoing across decades of silence.",
  "Dancing through the apocalypse because what else is there.",
  "The weight of a crown nobody asked to wear.",
];

const DIMENSIONS = [
  { label: "Valence", color: "pink" },
  { label: "Arousal", color: "coral" },
  { label: "Dominance", color: "purple" },
  { label: "Absorption", color: "blue" },
  { label: "Hedonic", color: "yellow" },
  { label: "Eudaimonic", color: "green" },
  { label: "Vibe Sentence", color: "pink" },
  { label: "Watch Context", color: "orange" },
  { label: "Comfort Level", color: "blue" },
  { label: "Pacing", color: "purple" },
  { label: "Ending Type", color: "coral" },
  { label: "Emotional Arc", color: "green" },
  { label: "Mood Tags", color: "yellow" },
  { label: "Safety Warnings", color: "orange" },
  { label: "Conversation Potential", color: "pink" },
  { label: "Psych. Richness", color: "purple" },
  { label: "Dominant Emotions", color: "blue" },
  { label: "Certification", color: "coral" },
];

const PILL_COLORS: Record<string, string> = {
  pink: "border-[var(--color-pop-pink)]/40 text-[var(--color-pop-pink)] shadow-[0_0_12px_rgba(233,30,140,0.15)]",
  coral: "border-[var(--color-pop-coral)]/40 text-[var(--color-pop-coral)] shadow-[0_0_12px_rgba(255,107,107,0.15)]",
  purple: "border-[var(--color-pop-purple)]/40 text-[var(--color-pop-purple)] shadow-[0_0_12px_rgba(139,92,246,0.15)]",
  green: "border-[var(--color-pop-green)]/40 text-[var(--color-pop-green)] shadow-[0_0_12px_rgba(30,215,96,0.15)]",
  orange: "border-[var(--color-pop-orange)]/40 text-[var(--color-pop-orange)] shadow-[0_0_12px_rgba(249,115,22,0.15)]",
  yellow: "border-[var(--color-pop-yellow)]/40 text-[var(--color-pop-yellow)] shadow-[0_0_12px_rgba(251,191,36,0.15)]",
  blue: "border-[var(--color-pop-blue)]/40 text-[var(--color-pop-blue)] shadow-[0_0_12px_rgba(56,189,248,0.15)]",
};

import type { Variants } from "framer-motion";

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.8], [0, -60]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[10%] h-[600px] w-[600px] rounded-full bg-[var(--color-pop-pink)]/[0.03] blur-[120px]" />
        <div className="absolute top-[30%] right-[5%] h-[500px] w-[500px] rounded-full bg-[var(--color-pop-purple)]/[0.04] blur-[120px]" />
        <div className="absolute bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-[var(--color-pop-blue)]/[0.03] blur-[120px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 opacity-70">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <a href="https://github.com/Stormbane/mooduel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════ */}
      {/* HERO                                               */}
      {/* ══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="flex flex-col items-center gap-8 max-w-3xl text-center"
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <motion.div variants={fadeUp}>
              <Image
                src="/logo.svg"
                alt="Mooduel"
                width={420}
                height={84}
                priority
                className="w-[300px] sm:w-[420px] h-auto"
              />
            </motion.div>

            {/* Tagline */}
            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-5xl md:text-6xl font-[family-name:var(--font-display)] font-bold leading-[1.1] tracking-tight"
            >
              Find your movie through{" "}
              <span className="gradient-text-pink">mood</span>
              , not search
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground font-light max-w-xl leading-relaxed"
            >
              An open-source game that reads your mood through play and matches you
              to movies using psychology — backed by the first open dataset of movie
              mood profiles.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <Link
                href="/play"
                className="group relative rounded-xl px-10 py-4 text-lg font-bold tracking-widest text-white gradient-bg-pink shadow-[0_0_40px_rgba(233,30,140,0.25)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(233,30,140,0.4)] hover:scale-105 active:scale-95"
              >
                PLAY MOODUEL
                <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              </Link>
              <Link
                href="/explore"
                className="rounded-xl border border-[var(--color-pop-purple)]/40 px-10 py-4 text-lg font-semibold tracking-wide text-[var(--color-pop-purple)] transition-all duration-300 hover:border-[var(--color-pop-purple)]/70 hover:bg-[var(--color-pop-purple)]/5 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] active:scale-95"
              >
                Explore the Dataset
              </Link>
            </motion.div>

            {/* Hint */}
            <motion.p
              variants={fadeUp}
              className="text-sm text-muted-foreground/40 tracking-wide"
            >
              ~2 minutes &middot; no account needed &middot; open source
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-10 w-6 rounded-full border border-muted-foreground/20 flex items-start justify-center pt-2"
          >
            <div className="h-2 w-1 rounded-full bg-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                       */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col items-center gap-16"
          >
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-green)] mb-3">
                How It Works
              </p>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold">
                Three rounds. One perfect movie.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {[
                {
                  step: "01",
                  title: "Pick Your Vibes",
                  desc: "Colors, paintings, and emotions — we read your mood without asking a single question.",
                  color: "pink",
                  glow: "rgba(233,30,140,0.08)",
                },
                {
                  step: "02",
                  title: "Choose Movies",
                  desc: "Five mood-matched movies per round. Your picks teach us what you're craving tonight.",
                  color: "purple",
                  glow: "rgba(139,92,246,0.08)",
                },
                {
                  step: "03",
                  title: "Tournament",
                  desc: "Your favorites go head-to-head. Eight enter, one champion emerges.",
                  color: "green",
                  glow: "rgba(30,215,96,0.08)",
                },
              ].map((card) => (
                <motion.div
                  key={card.step}
                  variants={fadeUp}
                  className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 transition-all duration-500 hover:border-border"
                  style={{ boxShadow: `0 0 60px ${card.glow}` }}
                >
                  <span
                    className={`text-6xl font-[family-name:var(--font-display)] font-black gradient-text-${card.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500 absolute top-4 right-6`}
                  >
                    {card.step}
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-xl font-[family-name:var(--font-display)] font-bold mb-3 mt-8">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {card.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* THE SCIENCE                                        */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col items-center gap-12"
          >
            <motion.div variants={fadeUp} className="text-center max-w-2xl">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-purple)] mb-3">
                The Science
              </p>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold mb-4">
                <span className="gradient-text-purple">18</span> psychological
                dimensions per movie
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Built on Russell&rsquo;s Circumplex Model, Zillmann&rsquo;s Mood Management
                Theory, and modern media psychology. Every movie scored by AI using
                plot data, critic reviews, and crowd-sourced tags.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-2.5 max-w-3xl">
              {DIMENSIONS.map((dim, i) => (
                <motion.span
                  key={dim.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium tracking-wide ${PILL_COLORS[dim.color]}`}
                >
                  {dim.label}
                </motion.span>
              ))}
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground/50"
              >
                Read the methodology →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* THE DATASET                                        */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col items-center gap-12"
          >
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-orange)] mb-3">
                Open Data
              </p>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold mb-8">
                The Mooduel Movie Database
              </h2>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg">
                <Stat value="30,000+" label="movies" />
                <span className="text-muted-foreground/20 hidden sm:inline">·</span>
                <Stat value="18" label="mood dimensions" />
                <span className="text-muted-foreground/20 hidden sm:inline">·</span>
                <Stat value="5" label="data sources" />
                <span className="text-muted-foreground/20 hidden sm:inline">·</span>
                <Stat value="1888–2026" label="year range" />
              </div>
            </motion.div>

            {/* Vibe sentence marquee */}
            <motion.div variants={fadeIn} className="w-full overflow-hidden py-8">
              <div className="vibe-marquee flex gap-8">
                {[...VIBE_SENTENCES, ...VIBE_SENTENCES].map((sentence, i) => (
                  <span
                    key={i}
                    className="shrink-0 text-lg sm:text-xl italic text-muted-foreground/50 font-light whitespace-nowrap"
                  >
                    &ldquo;{sentence}&rdquo;
                    <span className="mx-8 text-muted-foreground/15">✦</span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Download CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
              <a
                href="https://github.com/Stormbane/mooduel"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border px-8 py-3 text-sm font-semibold tracking-wide text-foreground/80 transition-all duration-300 hover:border-foreground/30 hover:text-foreground hover:bg-white/[0.02]"
              >
                <span className="mr-2">⬡</span> View on GitHub
              </a>
              <a
                href="#"
                className="rounded-xl border border-[var(--color-pop-yellow)]/30 px-8 py-3 text-sm font-semibold tracking-wide text-[var(--color-pop-yellow)] transition-all duration-300 hover:border-[var(--color-pop-yellow)]/60 hover:bg-[var(--color-pop-yellow)]/5"
              >
                <span className="mr-2">🤗</span> Download on HuggingFace
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-xs text-muted-foreground/40 tracking-wide">
              CC-BY-NC-4.0 · Free for research &amp; personal use
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* FOOTER                                             */}
      {/* ══════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-border/30 py-12 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
            <span>Open source</span>
            <span className="text-muted-foreground/20">·</span>
            <span>CC-BY-NC-4.0</span>
            <span className="text-muted-foreground/20">·</span>
            <a
              href="https://github.com/Stormbane/mooduel"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
            <a
              href="/donate"
              className="hover:text-[var(--color-pop-yellow)] transition-colors"
            >
              ☕ Buy us a coffee
            </a>
            <span className="text-muted-foreground/20">·</span>
            <span>Made with ♡</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <span className="font-[family-name:var(--font-display)] font-bold text-foreground">
        {value}
      </span>{" "}
      <span className="text-muted-foreground text-base">{label}</span>
    </span>
  );
}
