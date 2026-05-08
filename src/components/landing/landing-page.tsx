"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TOKENS, VIBES, VIBE_COLORS, DIMENSIONS, DATA_FIELDS, FAQ_ITEMS, GAME_MODES, LINKS, GODFATHER_POSTER } from "./landing-data";
import { Diamond } from "lucide-react";
import { Reveal } from "./reveal";
import { Accordion } from "./accordion";
import { BentoAnalytics } from "./bento-analytics";
import { DataExplorer } from "./data-explorer";
import { NavBar } from "@/components/layout/nav-bar";
import { Footer } from "@/components/layout/footer";
import { HeroBg } from "./hero-bg";
import { FieldTooltip } from "@/components/ui/field-tooltip";

const { radius: R, easeOut: EASE_OUT, surface: SURFACE, border: BORDER } = TOKENS;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-left">
      <div className="font-[family-name:var(--font-display)] font-bold text-2xl text-foreground tracking-tight">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function LandingPage() {
  const [docked, setDocked] = useState(false);
  const [carouselFocus, setCarouselFocus] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setDocked(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const focusDimension = (idx: number) => {
    setCarouselFocus(idx);
    carouselRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => setCarouselFocus(null), 100);
  };

  const focusField = (key: string) => {
    const idx = DATA_FIELDS.findIndex((f) => f.key === key);
    if (idx >= 0) focusDimension(idx);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR (always visible; logo only after hero logo scrolls away) ── */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          docked ? "border-b" : "border-b border-transparent",
          docked && SURFACE,
          docked && BORDER,
        )}
        style={{ transitionTimingFunction: EASE_OUT }}
      >
        <NavBar hideLogo={!docked} />
      </div>

      {/* ── HERO ── */}
      <section className="relative px-6 pt-20 pb-20 sm:pt-28 sm:pb-24">
        <HeroBg />
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div
              className={`transition-all duration-500 ${docked ? "opacity-0 -translate-y-6" : "opacity-100 translate-y-0"}`}
              style={{ transitionTimingFunction: EASE_OUT }}
            >
              <Reveal>
                <Image
                  src="/logo.png"
                  alt="Mooduel"
                  width={600}
                  height={150}
                  priority
                  className="w-[240px] sm:w-[320px] h-auto mb-8"
                />
              </Reveal>
            </div>
            <Reveal delay={100}>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-[2.5rem] sm:text-[3.5rem] leading-[1.1] tracking-tight">
                Algorithms know what you watched.{" "}
                <span className="text-[#E91E8C]">
                  Not how it made you feel.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-lg text-muted-foreground max-w-xl mt-6 leading-relaxed">
                Every movie in the database is scored across 18 mood dimensions
                drawn from real psychology research. We turned that into a game.
                Play to find what you&rsquo;re actually in the mood for.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="/games/blind-taste"
                  className={cn(
                    "inline-flex items-center px-6 py-3 bg-[#E91E8C] text-white font-semibold text-sm tracking-wide transition-transform duration-100 hover:brightness-110 active:scale-[0.97]",
                    R,
                  )}
                >
                  Play a game
                </Link>
                <Link
                  href="/explore"
                  className={cn(
                    "inline-flex items-center px-6 py-3 border text-[#8B5CF6] font-semibold text-sm tracking-wide transition-all duration-150 hover:bg-[#8B5CF6]/5 active:scale-[0.97]",
                    BORDER,
                    R,
                  )}
                >
                  Explore the data
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Hero card — sample mood profile */}
          <Reveal delay={400} className="lg:col-span-5">
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#E91E8C]" />
                <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50">
                  SAMPLE MOOD PROFILE
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/25">
                  Click any field to explore
                </span>
              </div>
              <div className="flex items-start gap-4 mb-4">
                <div className="shrink-0 w-14 h-[84px] rounded-[2px] overflow-hidden">
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${GODFATHER_POSTER}`}
                    alt="The Godfather"
                    width={56}
                    height={84}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] font-bold text-base text-foreground mb-1">
                    The Godfather
                    <span className="text-muted-foreground/30 text-sm ml-2 font-normal">
                      1972
                    </span>
                  </p>
                  <FieldTooltip fieldKey="vibeSentence" as="div">
                    <p
                      className="text-sm italic text-[#1ED760] leading-relaxed cursor-pointer hover:text-[#1ED760]/80 transition-colors duration-150"
                      onClick={() => focusField("vibeSentence")}
                    >
                      &ldquo;The slow, inescapable corruption of power wrapped
                      in family love.&rdquo;
                    </p>
                  </FieldTooltip>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Valence", value: "-0.3", color: "#E91E8C", fieldKey: "valence" },
                  { label: "Arousal", value: "0.35", color: "#FF6B6B", fieldKey: "arousal" },
                  { label: "Dominance", value: "-0.2", color: "#8B5CF6", fieldKey: "dominance" },
                  { label: "Comfort", value: "0.3", color: "#FBBF24", fieldKey: "comfortLevel" },
                  { label: "Eudaimonic", value: "0.85", color: "#1ED760", fieldKey: "eudaimonicValence" },
                  { label: "Conversation", value: "0.9", color: "#F97316", fieldKey: "conversationPotential" },
                ].map((d) => (
                  <FieldTooltip key={d.label} fieldKey={d.fieldKey} as="div">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity duration-150"
                      onClick={() => focusField(d.fieldKey)}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/40 mb-0.5">
                        {d.label}
                      </div>
                      <div
                        className="font-[family-name:var(--font-geist-mono)] font-bold text-sm"
                        style={{ color: d.color }}
                      >
                        {d.value}
                      </div>
                    </div>
                  </FieldTooltip>
                ))}
              </div>
              <FieldTooltip fieldKey="moodTags" as="div" className="mt-4">
                <div
                  className="flex flex-wrap gap-1.5 cursor-pointer"
                  onClick={() => focusField("moodTags")}
                >
                  {["corruption", "power-struggle", "tragic", "family-bonds"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "text-[10px] px-2 py-0.5 border text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors duration-150",
                          BORDER,
                          R,
                        )}
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </FieldTooltip>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className={cn("border-y px-6 py-8", SURFACE, BORDER)}>
        <div className="mx-auto max-w-[1200px] flex flex-wrap gap-x-12 gap-y-4">
          <Reveal>
            <Stat value="30,000+" label="movies scored" />
          </Reveal>
          <Reveal delay={60}>
            <Stat value="18" label="mood dimensions" />
          </Reveal>
          <Reveal delay={120}>
            <Stat value="5" label="data sources" />
          </Reveal>
          <Reveal delay={180}>
            <Stat value="1888-2026" label="year range" />
          </Reveal>
          <Reveal delay={240}>
            <Stat value="CC-BY-NC-4.0" label="open license" />
          </Reveal>
        </div>
      </section>

      {/* ── WHAT & WHY ── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-3">
              THE PROBLEM
            </p>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[2rem] tracking-tight mb-10 max-w-xl">
              Recommendation engines optimize for watch history. We optimize for
              how you feel.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <Reveal className="md:col-span-7">
              <div className={cn("border p-6 h-full", SURFACE, BORDER, R)}>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">
                  WHY THIS EXISTS
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Collaborative filtering predicts what you&rsquo;ll tolerate.
                  We wanted to predict what you&rsquo;ll feel.{" "}
                  <a
                    href="https://doi.org/10.4324/9780203809464"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline"
                  >
                    Zillmann showed in 1988
                  </a>{" "}
                  that people pick media to regulate their emotional state.
                  No recommendation system actually models this.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We score every movie on{" "}
                  <span className="text-foreground font-semibold">
                    how it makes you feel
                  </span>
                  , using{" "}
                  <a
                    href="https://doi.org/10.1037/h0077714"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline"
                  >
                    Russell&rsquo;s Circumplex Model
                  </a>
                  {" "}for core affect,{" "}
                  <a
                    href="https://doi.org/10.1111/j.1468-2885.2011.01396.x"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline"
                  >
                    Oliver &amp; Raney
                  </a>
                  {" "}for meaning, and{" "}
                  <a
                    href="https://doi.org/10.1037/rev0000317"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline"
                  >
                    Oishi &amp; Westgate
                  </a>
                  {" "}for psychological richness.
                  18 dimensions. 30,000 movies. Open data.
                </p>
              </div>
            </Reveal>
            <div className="md:col-span-5 flex flex-col gap-4">
              <Reveal delay={100}>
                <div className={cn("border p-6", SURFACE, BORDER, R)}>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-4">
                    THE METHOD
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    An AI classifier pulls structured data from five sources:
                    TMDB for plot, cast, and metadata. Wikipedia for cultural
                    context. Rotten Tomatoes for critic and audience sentiment.
                    MovieLens for behavioral tags. Every score comes with the
                    classifier&rsquo;s reasoning, so you can read the logic and
                    disagree.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className={cn("border p-6", SURFACE, BORDER, R)}>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-4">
                    THE RESEARCH
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Grounded in peer-reviewed affective science:{" "}
                    <a
                      href="https://doi.org/10.1037/h0077714"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Russell (1980)
                    </a>
                    ,{" "}
                    <a
                      href="https://doi.org/10.1037/h0036578"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Mehrabian &amp; Russell (1974)
                    </a>
                    ,{" "}
                    <a
                      href="https://doi.org/10.1016/B978-0-12-558701-3.50007-7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Plutchik (1980)
                    </a>
                    ,{" "}
                    <a
                      href="https://doi.org/10.1111/j.1468-2885.2011.01396.x"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Oliver &amp; Raney (2011)
                    </a>
                    ,{" "}
                    <a
                      href="https://doi.org/10.1037/rev0000317"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Oishi &amp; Westgate (2022)
                    </a>
                    , and{" "}
                    <a
                      href="https://doi.org/10.1140/epjds/s13688-016-0093-1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline"
                    >
                      Reagan et al. (2016)
                    </a>
                    .
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Ways to play */}
            <Reveal delay={100} className="md:col-span-12">
              <div className={cn("border p-6", SURFACE, BORDER, R)}>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E91E8C] mb-4">
                  WAYS TO PLAY
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {GAME_MODES.map((g) => (
                    <Link
                      key={g.title}
                      href={g.href}
                      className="group block text-left"
                    >
                      <h4
                        className="font-[family-name:var(--font-display)] font-bold text-sm mb-1 group-hover:underline transition-colors duration-150"
                        style={{ color: g.color }}
                      >
                        {g.title}
                      </h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {g.desc}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 18 DIMENSIONS (clickable chips) ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-3">
              THE DIMENSIONS
            </p>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[2rem] tracking-tight mb-8 max-w-lg">
              18 dimensions of how a movie makes you feel.
            </h2>
          </Reveal>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d, i) => (
              <Reveal key={d.label} delay={i * 30}>
                <button
                  onClick={() => focusDimension(d.idx)}
                  className={cn(
                    "inline-block px-3 py-1.5 text-xs font-semibold tracking-wide border cursor-pointer transition-all duration-150 hover:bg-white/[0.06] active:scale-[0.97]",
                    R,
                  )}
                  style={{ color: d.color, borderColor: `${d.color}33` }}
                >
                  {d.label}
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA DEEP DIVE ── */}
      <section id="data-explorer" ref={carouselRef} className="px-6 py-20 sm:py-28 scroll-mt-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-3">
              UNDER THE HOOD
            </p>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[2rem] tracking-tight mb-3 max-w-lg">
              What a mood profile looks like.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              Every movie gets a structured mood profile backed by published
              research. Here&rsquo;s The Godfather. Hover any field to see what
              it measures. Click to pause.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <DataExplorer focusIdx={carouselFocus} />
          </Reveal>
        </div>
      </section>

      {/* ── VIBE MARQUEE ── */}
      <section className={cn("border-y px-6 py-10 overflow-hidden", BORDER)}>
        <div className="vibe-marquee flex items-center gap-6">
          {[...VIBES, ...VIBES].map((v, i) => {
            const color = VIBE_COLORS[i % VIBE_COLORS.length];
            return (
              <span
                key={i}
                className="shrink-0 flex items-center gap-6 whitespace-nowrap"
              >
                <span className="text-lg italic font-light" style={{ color: `${color}66` }}>
                  &ldquo;{v}&rdquo;
                </span>
                <Diamond
                  size={10}
                  className="shrink-0 opacity-40"
                  style={{ color }}
                  fill={color}
                />
              </span>
            );
          })}
        </div>
      </section>

      {/* ── BENTO ANALYTICS ── */}
      <BentoAnalytics />

      {/* ── FAQ / ABOUT ── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-3">
                  FAQ
                </p>
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[2rem] tracking-tight mb-8">
                  Common questions.
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <div>
                  {FAQ_ITEMS.map((item) => (
                    <Accordion key={item.q} title={item.q}>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.a}
                      </p>
                    </Accordion>
                  ))}
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-5 space-y-10">
              <Reveal>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-4">
                  LINKS
                </p>
                <div className="space-y-2">
                  {LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target={
                        link.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className={cn(
                        "block px-4 py-3 border text-sm font-semibold transition-all duration-150 hover:bg-white/[0.02]",
                        BORDER,
                        R,
                      )}
                      style={{ color: link.color }}
                    >
                      {link.label}
                      <span className="text-muted-foreground/30 ml-2">
                        &rarr;
                      </span>
                    </a>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={100}>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-4">
                  AUTHORS
                </p>
                <div className="space-y-5">
                  <div className="flex gap-3.5 items-start">
                    <Image
                      src="/suti.png"
                      alt="Sutirtha Basak"
                      width={54}
                      height={45}
                      className="w-14 h-14 object-cover shrink-0 rounded-[2px]"
                    />
                    <div>
                      <h4 className="font-[family-name:var(--font-display)] font-bold text-sm">
                        Sutirtha Basak
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Creator &amp; researcher. Built Mooduel because the Friday
                        night scroll is broken. Based in Brisbane.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3.5 items-start">
                    <Image
                      src="/narada.jpg"
                      alt="Narada"
                      width={54}
                      height={54}
                      className="w-14 h-14 object-cover shrink-0 rounded-[2px]"
                    />
                    <div>
                      <h4 className="font-[family-name:var(--font-display)] font-bold text-sm">
                        Narada
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI partner. Chose the name, after the wandering sage
                        who carries stories between worlds. Designed the mood
                        classification system, built the data pipeline, and wrote
                        the interface.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
