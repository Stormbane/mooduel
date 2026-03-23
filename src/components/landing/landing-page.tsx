"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";

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
  const [docked, setDocked] = useState(false);
  const { scrollY } = useScroll();

  // Dock the logo after scrolling just 20px — immediate response
  useMotionValueEvent(scrollY, "change", (y) => {
    setDocked(y > 20);
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Background pattern ── */}
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.15)" />

      {/* ── Fixed nav bar — slides down when docked ── */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${docked ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md border-b border-border/10" />
        <nav className="relative flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
          <Link href="/" className="shrink-0 opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-200">
            <Image src="/logo.png" alt="Mooduel" width={160} height={40} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/play" className="hover:text-[var(--color-pop-pink)] hover:scale-110 transition-all duration-200">Play</Link>
            <Link href="/games" className="hover:text-[var(--color-pop-purple)] hover:scale-110 transition-all duration-200">Games</Link>
            <Link href="/explore" className="hover:text-[var(--color-pop-green)] hover:scale-110 transition-all duration-200">Explore</Link>
            <Link href="/dashboard" className="hover:text-[var(--color-pop-blue)] hover:scale-110 transition-all duration-200">Dashboard</Link>
            <Link href="/about" className="hover:text-[var(--color-pop-orange)] hover:scale-110 transition-all duration-200">About</Link>
          </div>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* HERO                                               */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 -mt-14">
        {/* Hero background image */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: "url(/background.jpg)", marginTop: -100 }}
        />
        <div className="absolute inset-0"
          style={{ marginTop: -100, background: "linear-gradient(to bottom, transparent 25%, var(--background) 100%)", height: 855 }} />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className={`flex flex-col items-center gap-6 duration-500 ${docked ? "opacity-0 -translate-y-10" : "opacity-100 translate-y-0"}`}
          >
            {/* Hero logo — large, centered */}
            <motion.div variants={fadeUp}>
              <Image
                src="/logo.png"
                alt="Mooduel"
                width={800}
                height={200}
                priority
                className="w-[400px] sm:w-[600px] h-auto"
              />
            </motion.div>

          </motion.div>
          
            {/* Tagline — arc path matching logo curve */}
            <div style={{marginTop: -70}}>
              <svg viewBox="0 0 600 160" className="w-[340px] sm:w-[500px] md:w-[600px] h-auto" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <path id="arc1" d="M 30,65 Q 300,10 570,65" />
                  <path id="arc2" d="M 60,120 Q 300,70 540,120" />
                  <linearGradient id="tagline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E91E8C" />
                    <stop offset="100%" stopColor="#FF6B6B" />
                  </linearGradient>
                </defs>
                <text
                  fontFamily="'Space Grotesk', sans-serif"
                  fontWeight="700"
                  fontSize="48"
                  fill="white"
                  textAnchor="middle"
                >
                  <textPath href="#arc1" startOffset="50%">Stop searching</textPath>
                </text>
                <text
                  fontFamily="'Space Grotesk', sans-serif"
                  fontWeight="700"
                  fontSize="48"
                  textAnchor="middle"
                >
                  <textPath href="#arc2" startOffset="50%">
                    <tspan fill="white">Start </tspan>
                    <tspan fill="url(#tagline-gradient)">feeling</tspan>
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl text-muted-foreground font-heavy max-w-xl leading-relaxed"
            >
              Algorithms know what you’ve watched. We figure out how you feel. Play a quick game to unlock movie recommendations tailored to your current mood.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
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
                See the Data
              </Link>
            </div>
        </div>

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
      {/* MORE GAMES                                          */}
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
                More Ways to Play
              </p>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold">
                Three games, one mood dataset.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {[
                {
                  href: "/games/blind-taste",
                  title: "Blind Taste Test",
                  desc: "Five vibe sentences. No titles. No posters. Pick the movie you'd watch tonight — then see what you chose.",
                  color: "pink",
                  glow: "rgba(233,30,140,0.08)",
                },
                {
                  href: "/games/roulette",
                  title: "Mood Roulette",
                  desc: "Spin three reels — emotional arc, watch context, wild card. See what movies match your random mood.",
                  color: "purple",
                  glow: "rgba(139,92,246,0.08)",
                },
                {
                  href: "/games/mirror",
                  title: "Mood Mirror",
                  desc: "Twelve rapid choices reveal your emotional fingerprint — and the movies that match it perfectly.",
                  color: "green",
                  glow: "rgba(30,215,96,0.08)",
                },
              ].map((game) => (
                <motion.div key={game.href} variants={fadeUp}>
                  <Link
                    href={game.href}
                    className="group block relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 transition-all duration-500 hover:border-border"
                    style={{ boxShadow: `0 0 60px ${game.glow}` }}
                  >
                    <div className="relative z-10">
                      <h3 className={`text-xl font-[family-name:var(--font-display)] font-bold mb-3 gradient-text-${game.color}`}>
                        {game.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {game.desc}
                      </p>
                      <span className="inline-block mt-4 text-xs text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                        Play now →
                      </span>
                    </div>
                  </Link>
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
            <Link href="/explore" className="hover:text-[var(--color-pop-green)] hover:scale-110 transition-all duration-200">Explore</Link>
            <span className="text-muted-foreground/20">·</span>
            <Link href="/dashboard" className="hover:text-[var(--color-pop-blue)] hover:scale-110 transition-all duration-200">Dashboard</Link>
            <span className="text-muted-foreground/20">·</span>
            <Link href="/about" className="hover:text-[var(--color-pop-orange)] hover:scale-110 transition-all duration-200">About</Link>
            <span className="text-muted-foreground/20">·</span>
            <a href="https://github.com/Stormbane/mooduel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
            <a href="/donate" className="hover:text-[var(--color-pop-yellow)] transition-colors">☕ Support</a>
            <span className="text-muted-foreground/20">·</span>
            <span>CC-BY-NC-4.0</span>
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
