"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const SCHEMA_FIELDS = [
  { field: "valence", type: "number", range: "-1 to +1", desc: "Pleasure–displeasure of viewing experience" },
  { field: "arousal", type: "number", range: "-1 to +1", desc: "Calm–intense activation level" },
  { field: "dominance", type: "number", range: "-1 to +1", desc: "Overwhelming–empowering viewer agency" },
  { field: "absorptionPotential", type: "number", range: "0 to 1", desc: "How cognitively consuming (Zillmann)" },
  { field: "hedonicValence", type: "number", range: "0 to 1", desc: "Fun, pleasure, entertainment value" },
  { field: "eudaimonicValence", type: "number", range: "0 to 1", desc: "Meaning, insight, being moved" },
  { field: "psychologicallyRichValence", type: "number", range: "0 to 1", desc: "Novelty, complexity, perspective-broadening" },
  { field: "emotionalArc", type: "enum", range: "6 types", desc: "Reagan et al. story shape (man-in-a-hole, icarus, etc.)" },
  { field: "dominantEmotions", type: "string[]", range: "2–3", desc: "Top emotions from Plutchik's wheel" },
  { field: "moodTags", type: "string[]", range: "3–6", desc: "Thematic tags for semantic matching" },
  { field: "watchContext", type: "enum[]", range: "1–3", desc: "Best viewing setting: solo, date, friends, family" },
  { field: "vibeSentence", type: "string", range: "≤12 words", desc: "Evocative one-liner — what watching feels like" },
  { field: "pacing", type: "enum", range: "5 types", desc: "slow-burn, building, steady, relentless, episodic" },
  { field: "endingType", type: "enum", range: "7 types", desc: "triumphant, bittersweet, devastating, ambiguous, twist, uplifting, unsettling" },
  { field: "comfortLevel", type: "number", range: "0 to 1", desc: "Emotional safety — cozy vs. transgressive" },
  { field: "emotionalSafetyWarnings", type: "string[]", range: "0–3", desc: "Surprising content that could blindside viewers" },
  { field: "conversationPotential", type: "number", range: "0 to 1", desc: "How much people want to discuss it after" },
];

const PIPELINE_STEPS = [
  { step: "01", title: "TMDB Metadata", desc: "30,611 movies with genres, keywords, ratings, popularity, runtime from The Movie Database.", color: "pink" },
  { step: "02", title: "Wikipedia Plots", desc: "Plot summaries joined via Wikidata IDs for 16,197 movies (52.9% coverage).", color: "purple" },
  { step: "03", title: "Rotten Tomatoes", desc: "Critic reviews from Kaggle dataset — top 3 reviews per movie with sentiment mix. 12,656 movies.", color: "coral" },
  { step: "04", title: "TMDB Reviews", desc: "User reviews as fallback for movies without RT coverage. 3,485 additional movies.", color: "blue" },
  { step: "05", title: "MovieLens Tags", desc: "1,128 crowd-sourced tags with relevance scores from the Tag Genome. 8,815 movies.", color: "green" },
  { step: "06", title: "Certifications", desc: "MPAA/BBFC ratings from TMDB release dates endpoint. 21,610 movies (70.6%).", color: "orange" },
  { step: "07", title: "LLM Classification", desc: "All sources fed to Claude Haiku with structured output schema. 18 mood dimensions extracted per movie.", color: "yellow" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.15)" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/about" className="text-foreground font-medium">About</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24">
        <div className="mx-auto max-w-4xl">

          {/* ── Header ── */}
          <motion.section
            variants={stagger} initial="hidden" animate="visible"
            className="pt-16 pb-20 text-center"
          >
            <motion.p variants={fadeUp} className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-purple)] mb-4">
              About Mooduel
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-bold leading-tight mb-6">
              Movie discovery through{" "}
              <span className="gradient-text-pink">psychology</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Mooduel is an open-source game and dataset project. The game reads your mood
              through visual play and matches you to movies. The dataset is the first open
              collection of structured mood profiles for 30,000+ films.
            </motion.p>
          </motion.section>

          {/* ── The Mood Model ── */}
          <Section label="The Mood Model" title="How we measure movie mood">
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Every movie in our dataset is scored across <strong className="text-foreground">18 psychological dimensions</strong> drawn
                from established media psychology research:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModelCard
                  title="Core Affect"
                  source="Russell's Circumplex + PAD Model"
                  desc="Three continuous dimensions — valence (pleasure), arousal (intensity), and dominance (empowerment) — that describe the emotional experience of watching a film."
                  color="pink"
                />
                <ModelCard
                  title="Absorption Potential"
                  source="Zillmann's Mood Management Theory"
                  desc="How cognitively consuming a film is. High absorption prevents rumination — a key mechanism in mood regulation through media."
                  color="purple"
                />
                <ModelCard
                  title="Three Experience Valences"
                  source="Oliver & Bartsch 2010"
                  desc="Hedonic (fun), eudaimonic (meaning), and psychologically rich (novelty). Independent dimensions — a film can score high on all three."
                  color="green"
                />
                <ModelCard
                  title="Emotional Arc"
                  source="Reagan et al. 2016"
                  desc="Six fundamental story shapes: rags-to-riches, riches-to-rags, man-in-a-hole, icarus, cinderella, oedipus."
                  color="blue"
                />
              </div>
              <p>
                We also capture <strong className="text-foreground">novel dimensions</strong> that no existing dataset provides:
                watch context (who to watch with), vibe sentences (evocative one-liners),
                pacing, ending type, comfort level, emotional safety warnings, and conversation potential.
              </p>
            </div>
          </Section>

          {/* ── Schema ── */}
          <Section label="Dataset Schema" title="18 dimensions per movie">
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="px-4 py-3 font-semibold text-foreground/80 font-mono text-xs">Field</th>
                    <th className="px-4 py-3 font-semibold text-foreground/80 text-xs">Type</th>
                    <th className="px-4 py-3 font-semibold text-foreground/80 text-xs">Range</th>
                    <th className="px-4 py-3 font-semibold text-foreground/80 text-xs">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMA_FIELDS.map((f, i) => (
                    <tr key={f.field} className={i % 2 === 0 ? "bg-card/30" : ""}>
                      <td className="px-4 py-2.5 font-mono text-[var(--color-pop-green)] text-xs">{f.field}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{f.type}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{f.range}</td>
                      <td className="px-4 py-2.5 text-muted-foreground/80 text-xs">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Methodology ── */}
          <Section label="Methodology" title="Data pipeline">
            <p className="text-muted-foreground leading-relaxed mb-8">
              The dataset is built from 5 public data sources, joined by TMDB ID and
              title+year matching, then classified by an LLM with structured output validation.
            </p>
            <div className="space-y-4">
              {PIPELINE_STEPS.map((step) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="flex gap-4 items-start"
                >
                  <span className={`text-2xl font-[family-name:var(--font-display)] font-black gradient-text-${step.color} shrink-0 w-10`}>
                    {step.step}
                  </span>
                  <div>
                    <h4 className="font-semibold text-foreground/90 text-sm">{step.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ── Download ── */}
          <Section label="Download" title="Get the dataset">
            <div className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                The Mooduel Movie Database is available in JSON, CSV, and Parquet formats.
                Free for research and personal use under CC-BY-NC-4.0.
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="https://github.com/Stormbane/mooduel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-border px-6 py-3 text-sm font-semibold tracking-wide text-foreground/80 transition-all duration-300 hover:border-foreground/30 hover:text-foreground hover:bg-white/[0.02]"
                >
                  <span className="mr-2">⬡</span> GitHub
                </a>
                <a
                  href="#"
                  className="rounded-xl border border-[var(--color-pop-yellow)]/30 px-6 py-3 text-sm font-semibold tracking-wide text-[var(--color-pop-yellow)] transition-all duration-300 hover:border-[var(--color-pop-yellow)]/60 hover:bg-[var(--color-pop-yellow)]/5"
                >
                  <span className="mr-2">🤗</span> HuggingFace
                </a>
              </div>

              {/* Citation */}
              <div className="rounded-xl border border-border/50 bg-card/50 p-5">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">Citation</p>
                <pre className="text-xs text-muted-foreground font-mono overflow-x-auto leading-relaxed">{`@dataset{mooduel2026,
  title   = {Mooduel Movie Database: Structured Mood Profiles for 30K Films},
  author  = {Basak, Sutirtha},
  year    = {2026},
  url     = {https://github.com/Stormbane/mooduel},
  license = {CC-BY-NC-4.0}
}`}</pre>
              </div>
            </div>
          </Section>

          {/* ── Open Source ── */}
          <Section label="Open Source" title="Built in the open">
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Mooduel is fully open source. The game, the data pipeline, the classifier
                prompts, and the dataset — everything is on GitHub.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Framework", value: "Next.js 16" },
                  { label: "Language", value: "TypeScript" },
                  { label: "Styling", value: "Tailwind v4" },
                  { label: "Classifier", value: "Claude Haiku" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/30 bg-card/30 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground/60 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-foreground/80">{item.value}</p>
                  </div>
                ))}
              </div>
              <p>
                Contributions welcome — whether it&rsquo;s improving the classifier prompt,
                adding new dimensions, or building new games on top of the dataset.
              </p>
            </div>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-10 px-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/20">·</span>
            <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
            <span className="text-muted-foreground/20">·</span>
            <a href="https://github.com/Stormbane/mooduel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <div className="text-sm text-muted-foreground/40">
            CC-BY-NC-4.0 · Made with ♡
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="py-16 border-t border-border/20"
    >
      <motion.p variants={fadeUp} className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground/60 mb-2">
        {label}
      </motion.p>
      <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold mb-8">
        {title}
      </motion.h2>
      <motion.div variants={fadeUp}>
        {children}
      </motion.div>
    </motion.section>
  );
}

function ModelCard({ title, source, desc, color }: { title: string; source: string; desc: string; color: string }) {
  return (
    <div className={`rounded-xl border border-border/40 bg-card/30 p-5`}>
      <h4 className={`font-semibold text-foreground/90 mb-1`}>{title}</h4>
      <p className={`text-xs gradient-text-${color} font-medium mb-2`}>{source}</p>
      <p className="text-sm text-muted-foreground/80 leading-relaxed">{desc}</p>
    </div>
  );
}
