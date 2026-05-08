import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

const PIPELINE_STEPS = [
  { label: "TMDB metadata", detail: "30,611 movies with genres, ratings, keywords, runtime, certifications." },
  { label: "Wikipedia plots", detail: "Plot summaries for 16,197 movies (52.9%)." },
  { label: "Rotten Tomatoes reviews", detail: "Critic reviews for 12,656 movies (from Kaggle)." },
  { label: "TMDB user reviews", detail: "Audience reviews for an additional 3,485 movies (~58% hit rate on the remainder)." },
  { label: "MovieLens Tag Genome", detail: "Crowd-sourced tags for 8,815 movies." },
  { label: "LLM classification", detail: "All sources joined per movie and passed to Claude Haiku 4.5 with structured JSON output." },
] as const;

const TECH_STACK = [
  { k: "Framework", v: "Next.js 16 (App Router), React 19" },
  { k: "Language", v: "TypeScript" },
  { k: "Styling", v: "Tailwind CSS v4" },
  { k: "Animation", v: "Framer Motion" },
  { k: "Database", v: "Supabase (Postgres)" },
  { k: "Auth", v: "Supabase OAuth (GitHub, Google)" },
  { k: "Charts", v: "Recharts" },
  { k: "Classifier", v: "Claude Haiku 4.5 via Anthropic Batch API" },
  { k: "Tests", v: "Playwright" },
] as const;

const HF_URL = "https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0";
const GH_URL = "https://github.com/Stormbane/mooduel";

function SectionEyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3"
      style={{ color }}
    >
      {children}
    </p>
  );
}

export default function AboutPage() {
  return (
    <PageLayout currentPage="/about">
      {/* ── Hero ── */}
      <section className="pt-10 pb-16">
        <Reveal>
          <SectionEyebrow color="#E91E8C">ABOUT</SectionEyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[2.5rem] sm:text-[3.5rem] leading-[1.05] tracking-tight max-w-3xl">
            Movies scored by how they make you feel, not by what you&rsquo;ve already watched.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="text-lg text-muted-foreground max-w-2xl mt-6 leading-relaxed">
            Mooduel is a game and an open dataset. The game reads your mood
            through play. The dataset scores 30,611 movies across 18
            psychological dimensions drawn from affective science. Both ship
            under open licenses so anyone can build on either piece.
          </p>
        </Reveal>
      </section>

      {/* ── What it is ── */}
      <section className="py-10">
        <Reveal>
          <SectionEyebrow color="#1ED760">WHAT IT IS</SectionEyebrow>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Reveal>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-3">
                The game
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You play short rounds. Pick a poster, react to a synopsis,
                follow a vibe. The app builds a live mood profile from your
                choices and narrows 30,000 movies down through a tournament
                bracket until one title is left. The goal is to match what
                you&rsquo;re actually in the mood for, not what you feel you
                should be watching.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-3">
                The dataset
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every movie in the database has a structured mood profile:
                valence, arousal, dominance, a seven-step emotional arc, a
                one-sentence vibe, suggested watch contexts, and thirteen
                other dimensions. Scored once by an LLM and continuously
                refined by community corrections. Released under CC-BY-NC-4.0
                on HuggingFace.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Dimensions pointer ── */}
      <section className="py-10">
        <Reveal>
          <div className={cn("border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", SURFACE, BORDER, R)}>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-2">
                THE MOOD MODEL
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                All 18 dimensions, with research sources, ranges, and three
                example movies per dimension, live on the landing page.
              </p>
            </div>
            <Link
              href="/#data-explorer"
              className={cn(
                "shrink-0 inline-flex items-center px-4 py-2 border text-sm font-semibold text-[#8B5CF6] transition-colors duration-150 hover:bg-[#8B5CF6]/5",
                BORDER,
                R,
              )}
            >
              Explore the dimensions <span className="ml-2">&rarr;</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Methodology ── */}
      <section className="py-14">
        <Reveal>
          <SectionEyebrow color="#F97316">METHODOLOGY</SectionEyebrow>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.75rem] tracking-tight mb-10 max-w-2xl">
            How a movie becomes a mood profile.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className={cn("border p-6 mb-4", SURFACE, BORDER, R)}>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 text-[#38BDF8] tracking-[0.15em] uppercase">
              Data pipeline
            </h3>
            <ol className="space-y-3">
              {PIPELINE_STEPS.map((step, i) => (
                <li key={step.label} className="flex gap-4">
                  <span className="font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground/40 pt-0.5 w-6 shrink-0">
                    0{i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Reveal delay={120}>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3 text-[#8B5CF6] tracking-[0.15em] uppercase">
                Classifier
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Claude Haiku 4.5 (<code className="font-[family-name:var(--font-geist-mono)] text-xs">claude-haiku-4-5-20251001</code>){" "}
                via structured output. The prompt, schema, and full system
                message live in the repo at{" "}
                <code className="font-[family-name:var(--font-geist-mono)] text-xs">scripts/mood-classifier/</code>.
                Each movie gets a single classification pass. Ambiguous or
                low-data titles are flagged for review.
              </p>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3 text-[#1ED760] tracking-[0.15em] uppercase">
                Validation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ten-movie and hundred-movie held-out sets spot-checked for
                dimension sensibility and distribution sanity. The community
                calibration layer is how we intend to correct drift over
                time: any user can suggest a correction to any dimension, and
                corrections that pass a net +3 vote threshold are auto-applied.
              </p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={240}>
          <div className={cn("border p-6 mt-4", SURFACE, BORDER, R)}>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3 text-[#FF6B6B] tracking-[0.15em] uppercase">
              Known limitations
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>
                English-language focused. Non-English titles are classified
                from English-language descriptions where available.
              </li>
              <li>
                Popularity bias. The corpus is the top 30K by TMDB popularity,
                so long-tail arthouse and regional cinema are underrepresented.
              </li>
              <li>
                LLM scores reflect the model&rsquo;s aesthetic and emotional
                judgements. Community calibration is the mechanism for
                correcting those judgements over time.
              </li>
              <li>
                The emotional arc taxonomy follows Reagan et al. 2016 but is
                applied at whole-film granularity, which flattens episodic
                structure.
              </li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── The dataset ── */}
      <section className="py-14">
        <Reveal>
          <SectionEyebrow color="#FBBF24">THE DATASET</SectionEyebrow>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.75rem] tracking-tight mb-3 max-w-2xl">
            Open, attributed, free for non-commercial use.
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Released under CC-BY-NC-4.0 on HuggingFace. Free for research,
            education, and personal projects. Commercial use requires a
            separate license.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Reveal className="lg:col-span-3">
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 tracking-[0.15em] uppercase text-muted-foreground/70">
                Download
              </h3>
              <pre className="font-[family-name:var(--font-geist-mono)] text-[12px] leading-relaxed bg-black/30 border border-white/5 p-4 rounded-[2px] overflow-x-auto">
{`pip install huggingface-hub
huggingface-cli download \\
  fractalintelligence/mooduel-v1.0 \\
  mooduel-v1.0.jsonl \\
  --repo-type dataset --local-dir .`}
              </pre>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Or use the{" "}
                <code className="font-[family-name:var(--font-geist-mono)]">datasets</code> library:{" "}
                <code className="font-[family-name:var(--font-geist-mono)]">load_dataset(&quot;fractalintelligence/mooduel-v1.0&quot;)</code>.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-2">
            <div className={cn("border p-6 h-full flex flex-col", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 tracking-[0.15em] uppercase text-muted-foreground/70">
                Links
              </h3>
              <div className="space-y-2">
                <a
                  href={HF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block px-4 py-3 border text-sm font-semibold transition-colors duration-150 hover:bg-white/[0.03] text-[#FBBF24]",
                    BORDER,
                    R,
                  )}
                >
                  HuggingFace dataset <span className="text-muted-foreground/30 ml-2">&rarr;</span>
                </a>
                <a
                  href={GH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block px-4 py-3 border text-sm font-semibold transition-colors duration-150 hover:bg-white/[0.03] text-foreground",
                    BORDER,
                    R,
                  )}
                >
                  GitHub repository <span className="text-muted-foreground/30 ml-2">&rarr;</span>
                </a>
                <Link
                  href="/explore"
                  className={cn(
                    "block px-4 py-3 border text-sm font-semibold transition-colors duration-150 hover:bg-white/[0.03] text-[#1ED760]",
                    BORDER,
                    R,
                  )}
                >
                  Explore in browser <span className="text-muted-foreground/30 ml-2">&rarr;</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <div className={cn("border p-6 mt-4", SURFACE, BORDER, R)}>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 tracking-[0.15em] uppercase text-muted-foreground/70">
              Citation
            </h3>
            <pre className="font-[family-name:var(--font-geist-mono)] text-[12px] leading-relaxed bg-black/30 border border-white/5 p-4 rounded-[2px] overflow-x-auto">
{`@dataset{mooduel_2026,
  author    = {Basak, Sutirtha and Mooduel contributors},
  title     = {Mooduel: A Movie Mood Dataset Across 18 Psychological Dimensions},
  year      = {2026},
  publisher = {Fractal Intelligence},
  version   = {1.0},
  url       = {https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0}
}`}
            </pre>
          </div>
        </Reveal>
      </section>

      {/* ── Open source ── */}
      <section className="py-14">
        <Reveal>
          <SectionEyebrow color="#38BDF8">OPEN SOURCE</SectionEyebrow>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.75rem] tracking-tight mb-3 max-w-2xl">
            The code is MIT. Everything&rsquo;s on GitHub.
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            If you want to improve the classifier prompt, add dimensions,
            build a new game, or fix a bug, open an issue or PR.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Reveal>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 tracking-[0.15em] uppercase text-muted-foreground/70">
                Tech stack
              </h3>
              <dl className="divide-y divide-white/5">
                {TECH_STACK.map((row) => (
                  <div key={row.k} className="grid grid-cols-5 gap-4 py-2">
                    <dt className="col-span-2 text-xs text-muted-foreground/60 font-semibold tracking-wide">
                      {row.k}
                    </dt>
                    <dd className="col-span-3 text-xs text-foreground/90">
                      {row.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
              <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-4 tracking-[0.15em] uppercase text-muted-foreground/70">
                Licenses
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li>
                  <span className="text-foreground font-semibold">Code</span>:
                  MIT. Free to fork, modify, ship.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Dataset</span>:
                  CC-BY-NC-4.0. Free for research, education, and personal use
                  with attribution. Commercial licensing available on request.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Metadata</span>:
                  sourced from TMDB, Wikipedia, Rotten Tomatoes (Kaggle), and
                  MovieLens, subject to their respective licenses.
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

    </PageLayout>
  );
}
