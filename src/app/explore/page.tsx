"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// ── Types ──
interface MoodMovie {
  tmdbId: number;
  title: string;
  year: number;
  genres: string[];
  runtime: number;
  tmdbRating: number;
  vibeSentence: string;
  valence: number;
  arousal: number;
  dominance: number;
  absorptionPotential: number;
  hedonicValence: number;
  eudaimonicValence: number;
  psychologicallyRichValence: number;
  emotionalArc: string;
  dominantEmotions: string[];
  moodTags: string[];
  watchContext: string[];
  pacing: string;
  endingType: string;
  comfortLevel: number;
  emotionalSafetyWarnings: string[];
  conversationPotential: number;
}

// ── Sample Data ──
const SAMPLE_DATA: MoodMovie[] = [
  {
    tmdbId: 278, title: "The Shawshank Redemption", year: 1994, genres: ["Drama", "Crime"], runtime: 142, tmdbRating: 8.7,
    vibeSentence: "Quiet resilience meeting hope; freedom earned through patient faith.",
    valence: 0.75, arousal: 0.3, dominance: 0.8, absorptionPotential: 0.85,
    hedonicValence: 0.55, eudaimonicValence: 0.88, psychologicallyRichValence: 0.65,
    emotionalArc: "man-in-a-hole", dominantEmotions: ["trust", "anticipation", "sadness"],
    moodTags: ["redemption", "hope", "friendship", "justice", "resilience"],
    watchContext: ["solo", "date", "family"], pacing: "slow-burn", endingType: "triumphant",
    comfortLevel: 0.7, emotionalSafetyWarnings: ["sudden-grief"], conversationPotential: 0.82,
  },
  {
    tmdbId: 8363, title: "Superbad", year: 2007, genres: ["Comedy"], runtime: 113, tmdbRating: 7.3,
    vibeSentence: "Sweaty panic and laughter wrapping around the ache of growing apart.",
    valence: 0.65, arousal: 0.45, dominance: 0.35, absorptionPotential: 0.55,
    hedonicValence: 0.8, eudaimonicValence: 0.65, psychologicallyRichValence: 0.35,
    emotionalArc: "man-in-a-hole", dominantEmotions: ["joy", "anticipation", "surprise"],
    moodTags: ["friendship", "coming-of-age", "awkward-humor", "separation-anxiety"],
    watchContext: ["friends", "solo"], pacing: "building", endingType: "bittersweet",
    comfortLevel: 0.65, emotionalSafetyWarnings: [], conversationPotential: 0.6,
  },
  {
    tmdbId: 76341, title: "Mad Max: Fury Road", year: 2015, genres: ["Action", "Adventure", "Sci-Fi"], runtime: 120, tmdbRating: 7.6,
    vibeSentence: "Two hours of white-knuckle momentum through apocalyptic desert fury.",
    valence: -0.12, arousal: 0.88, dominance: 0.42, absorptionPotential: 0.71,
    hedonicValence: 0.81, eudaimonicValence: 0.54, psychologicallyRichValence: 0.59,
    emotionalArc: "cinderella", dominantEmotions: ["fear", "anticipation", "anger"],
    moodTags: ["survival", "dystopia", "redemption", "adrenaline", "female-agency"],
    watchContext: ["friends", "solo"], pacing: "relentless", endingType: "triumphant",
    comfortLevel: 0.43, emotionalSafetyWarnings: [], conversationPotential: 0.67,
  },
  {
    tmdbId: 493922, title: "Hereditary", year: 2018, genres: ["Horror", "Mystery", "Thriller"], runtime: 127, tmdbRating: 7.3,
    vibeSentence: "Ancestral horror wearing family's face; descent into madness you cannot stop.",
    valence: -0.85, arousal: 0.65, dominance: -0.8, absorptionPotential: 0.88,
    hedonicValence: 0.08, eudaimonicValence: 0.82, psychologicallyRichValence: 0.78,
    emotionalArc: "oedipus", dominantEmotions: ["fear", "sadness", "disgust"],
    moodTags: ["intergenerational-trauma", "loss-and-grief", "familial-dysfunction", "dread"],
    watchContext: ["solo"], pacing: "building", endingType: "devastating",
    comfortLevel: 0.2, emotionalSafetyWarnings: ["child-harm", "graphic-violence", "sudden-grief"], conversationPotential: 0.87,
  },
  {
    tmdbId: 376867, title: "Moonlight", year: 2016, genres: ["Drama"], runtime: 111, tmdbRating: 7.4,
    vibeSentence: "Quiet grief and blue light; the tenderness of being finally, almost seen.",
    valence: -0.4, arousal: -0.45, dominance: -0.3, absorptionPotential: 0.82,
    hedonicValence: 0.12, eudaimonicValence: 0.91, psychologicallyRichValence: 0.78,
    emotionalArc: "man-in-a-hole", dominantEmotions: ["sadness", "anticipation", "trust"],
    moodTags: ["isolation", "coming-of-age", "melancholy", "tender", "identity", "longing"],
    watchContext: ["solo"], pacing: "slow-burn", endingType: "bittersweet",
    comfortLevel: 0.22, emotionalSafetyWarnings: ["child-harm", "domestic-abuse", "sudden-grief"], conversationPotential: 0.87,
  },
  {
    tmdbId: 496243, title: "Parasite", year: 2019, genres: ["Comedy", "Thriller", "Drama"], runtime: 133, tmdbRating: 8.5,
    vibeSentence: "Brilliant deception unraveling under the weight of impossible class structures.",
    valence: -0.35, arousal: 0.65, dominance: -0.4, absorptionPotential: 0.85,
    hedonicValence: 0.45, eudaimonicValence: 0.85, psychologicallyRichValence: 0.75,
    emotionalArc: "icarus", dominantEmotions: ["anticipation", "sadness", "anger"],
    moodTags: ["class-struggle", "systemic-injustice", "dark-humor", "desperation"],
    watchContext: ["solo", "friends"], pacing: "building", endingType: "devastating",
    comfortLevel: 0.3, emotionalSafetyWarnings: [], conversationPotential: 0.88,
  },
  {
    tmdbId: 120467, title: "The Grand Budapest Hotel", year: 2014, genres: ["Comedy", "Drama"], runtime: 99, tmdbRating: 8.0,
    vibeSentence: "Symmetrical beauty preserving friendship in amber as time dissolves it.",
    valence: 0.3, arousal: 0.4, dominance: 0.2, absorptionPotential: 0.85,
    hedonicValence: 0.75, eudaimonicValence: 0.8, psychologicallyRichValence: 0.7,
    emotionalArc: "oedipus", dominantEmotions: ["sadness", "joy", "trust"],
    moodTags: ["nostalgia", "bittersweet", "visual-beauty", "mentorship"],
    watchContext: ["solo", "date"], pacing: "steady", endingType: "bittersweet",
    comfortLevel: 0.7, emotionalSafetyWarnings: [], conversationPotential: 0.8,
  },
  {
    tmdbId: 14160, title: "Up", year: 2009, genres: ["Animation", "Comedy", "Family", "Adventure"], runtime: 96, tmdbRating: 8.0,
    vibeSentence: "Floating houses and broken hearts learning to soar together.",
    valence: 0.7, arousal: 0.45, dominance: 0.6, absorptionPotential: 0.55,
    hedonicValence: 0.85, eudaimonicValence: 0.8, psychologicallyRichValence: 0.55,
    emotionalArc: "man-in-a-hole", dominantEmotions: ["joy", "sadness", "trust"],
    moodTags: ["redemption", "found-family", "aging", "grief", "adventure", "nostalgia"],
    watchContext: ["family", "solo", "date"], pacing: "building", endingType: "bittersweet",
    comfortLevel: 0.75, emotionalSafetyWarnings: [], conversationPotential: 0.75,
  },
  {
    tmdbId: 37799, title: "The Social Network", year: 2010, genres: ["Drama"], runtime: 120, tmdbRating: 7.3,
    vibeSentence: "Genius without conscience, success without satisfaction.",
    valence: 0.35, arousal: 0.7, dominance: 0.45, absorptionPotential: 0.9,
    hedonicValence: 0.65, eudaimonicValence: 0.78, psychologicallyRichValence: 0.65,
    emotionalArc: "icarus", dominantEmotions: ["anger", "sadness", "disgust"],
    moodTags: ["ambition", "isolation", "betrayal", "intellectual", "cynicism"],
    watchContext: ["solo"], pacing: "building", endingType: "bittersweet",
    comfortLevel: 0.3, emotionalSafetyWarnings: [], conversationPotential: 0.88,
  },
  {
    tmdbId: 545611, title: "Everything Everywhere All at Once", year: 2022, genres: ["Action", "Adventure", "Sci-Fi"], runtime: 139, tmdbRating: 7.8,
    vibeSentence: "Sensory overload collapsing into quiet, hard-won grace.",
    valence: 0.65, arousal: 0.85, dominance: 0.55, absorptionPotential: 0.85,
    hedonicValence: 0.75, eudaimonicValence: 0.9, psychologicallyRichValence: 0.85,
    emotionalArc: "man-in-a-hole", dominantEmotions: ["sadness", "joy", "surprise"],
    moodTags: ["intergenerational-healing", "immigrant-grief", "absurdist-wonder", "chosen-love"],
    watchContext: ["solo", "friends"], pacing: "building", endingType: "uplifting",
    comfortLevel: 0.5, emotionalSafetyWarnings: ["self-harm", "sudden-grief"], conversationPotential: 0.95,
  },
];

const WATCH_ICONS: Record<string, string> = { solo: "◉", date: "♡", friends: "⚑", family: "☆" };
const ENDING_COLORS: Record<string, string> = {
  triumphant: "text-[var(--color-pop-green)]", bittersweet: "text-[var(--color-pop-yellow)]",
  devastating: "text-[var(--color-pop-coral)]", ambiguous: "text-[var(--color-pop-blue)]",
  twist: "text-[var(--color-pop-purple)]", uplifting: "text-[var(--color-pop-green)]",
  unsettling: "text-[var(--color-pop-orange)]",
};
const PACING_OPTIONS = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDING_OPTIONS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const CONTEXT_OPTIONS = ["solo", "date", "friends", "family"];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [contextFilter, setContextFilter] = useState<string[]>([]);
  const [endingFilter, setEndingFilter] = useState<string[]>([]);
  const [pacingFilter, setPacingFilter] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return SAMPLE_DATA.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inVibe = m.vibeSentence.toLowerCase().includes(q);
        const inTags = m.moodTags.some((t) => t.includes(q));
        const inGenres = m.genres.some((g) => g.toLowerCase().includes(q));
        if (!inTitle && !inVibe && !inTags && !inGenres) return false;
      }
      if (contextFilter.length > 0 && !contextFilter.some((c) => m.watchContext.includes(c))) return false;
      if (endingFilter.length > 0 && !endingFilter.includes(m.endingType)) return false;
      if (pacingFilter.length > 0 && !pacingFilter.includes(m.pacing)) return false;
      return true;
    });
  }, [search, contextFilter, endingFilter, pacingFilter]);

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const activeFilterCount = contextFilter.length + endingFilter.length + pacingFilter.length;

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[5%] left-[50%] -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[var(--color-pop-purple)]/[0.025] blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/explore" className="text-foreground font-medium">Explore</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        {/* ── Search ── */}
        <div className="pt-12 pb-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold text-center mb-8">
              Explore the <span className="gradient-text-purple">Mood Database</span>
            </h1>
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[var(--color-pop-purple)]/20 via-[var(--color-pop-pink)]/10 to-[var(--color-pop-blue)]/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, vibe, tag, or genre..."
                className="relative w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-4 text-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[var(--color-pop-purple)]/40 transition-colors"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-sm">
                {filtered.length}/{SAMPLE_DATA.length}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Filters ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="pb-8 space-y-3"
        >
          {/* Context */}
          <FilterRow label="Watch with">
            {CONTEXT_OPTIONS.map((c) => (
              <Chip key={c} label={`${WATCH_ICONS[c]} ${c}`} active={contextFilter.includes(c)} onClick={() => toggleFilter(contextFilter, c, setContextFilter)} />
            ))}
          </FilterRow>

          {/* Ending */}
          <FilterRow label="Ending">
            {ENDING_OPTIONS.map((e) => (
              <Chip key={e} label={e} active={endingFilter.includes(e)} onClick={() => toggleFilter(endingFilter, e, setEndingFilter)} />
            ))}
          </FilterRow>

          {/* Pacing */}
          <FilterRow label="Pacing">
            {PACING_OPTIONS.map((p) => (
              <Chip key={p} label={p} active={pacingFilter.includes(p)} onClick={() => toggleFilter(pacingFilter, p, setPacingFilter)} />
            ))}
          </FilterRow>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setContextFilter([]); setEndingFilter([]); setPacingFilter([]); }}
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors ml-1"
            >
              Clear all filters
            </button>
          )}
        </motion.div>

        {/* ── Movie Grid ── */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="text-5xl mb-4 opacity-20">◎</div>
              <p className="text-xl font-[family-name:var(--font-display)] text-muted-foreground/60 mb-2">
                No movies match your mood
              </p>
              <p className="text-sm text-muted-foreground/30">Try adjusting your filters or search terms</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              layout
            >
              {filtered.map((movie) => (
                <MovieCard
                  key={movie.tmdbId}
                  movie={movie}
                  expanded={expandedId === movie.tmdbId}
                  onToggle={() => setExpandedId(expandedId === movie.tmdbId ? null : movie.tmdbId)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dataset note */}
        <div className="text-center pt-16 text-sm text-muted-foreground/30">
          Showing {filtered.length} of {SAMPLE_DATA.length} sample movies &middot;{" "}
          <span className="text-muted-foreground/50">Full dataset: 30,000+ movies</span>
          {" · "}
          <Link href="/about/dataset" className="text-[var(--color-pop-purple)]/60 hover:text-[var(--color-pop-purple)] transition-colors underline underline-offset-2">
            Download
          </Link>
        </div>
      </main>
    </div>
  );
}

// ── Filter Row ──
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 shrink-0 w-20">
        {label}
      </span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

// ── Chip ──
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
        active
          ? "border-[var(--color-pop-purple)]/60 bg-[var(--color-pop-purple)]/10 text-[var(--color-pop-purple)]"
          : "border-border/40 text-muted-foreground/50 hover:border-border hover:text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ── VA Indicator (tiny mood position dot on a 2D grid) ──
function VAIndicator({ valence, arousal }: { valence: number; arousal: number }) {
  // Map -1..1 to 0..100%
  const x = ((valence + 1) / 2) * 100;
  const y = ((1 - (arousal + 1) / 2)) * 100;

  return (
    <div className="relative w-8 h-8 shrink-0" title={`V: ${valence.toFixed(2)}, A: ${arousal.toFixed(2)}`}>
      {/* Grid lines */}
      <div className="absolute inset-0 border border-border/20 rounded-sm">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/10" />
      </div>
      {/* Dot */}
      <div
        className="absolute w-2 h-2 rounded-full bg-[var(--color-pop-pink)] shadow-[0_0_6px_rgba(233,30,140,0.6)]"
        style={{ left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)` }}
      />
    </div>
  );
}

// ── Comfort Bar ──
function ComfortBar({ level }: { level: number }) {
  const hue = level * 120; // 0=red, 120=green
  return (
    <div className="w-full h-1 rounded-full bg-border/20 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${level * 100}%`,
          backgroundColor: `hsl(${hue}, 70%, 50%)`,
          boxShadow: `0 0 8px hsla(${hue}, 70%, 50%, 0.4)`,
        }}
      />
    </div>
  );
}

// ── Dimension Bar (for expanded view) ──
function DimBar({ label, value, max = 1, signed = false }: { label: string; value: number; max?: number; signed?: boolean }) {
  const pct = signed ? ((value + 1) / 2) * 100 : (value / max) * 100;
  const displayVal = signed ? value.toFixed(2) : value.toFixed(2);
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground/60 w-24 shrink-0 text-right font-mono">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-pop-purple)]"
          style={{ width: `${Math.max(2, pct)}%`, opacity: 0.7 }}
        />
      </div>
      <span className="text-muted-foreground/40 w-10 font-mono text-right">{displayVal}</span>
    </div>
  );
}

// ── Movie Card ──
function MovieCard({ movie, expanded, onToggle }: { movie: MoodMovie; expanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      layout
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-border/60 transition-colors duration-300"
    >
      <button onClick={onToggle} className="w-full text-left p-5 cursor-pointer">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-foreground/90 leading-tight">
              {movie.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/50">
              <span>{movie.year}</span>
              <span>·</span>
              <span>{movie.runtime}m</span>
              <span>·</span>
              <span>★ {movie.tmdbRating}</span>
            </div>
          </div>
          <VAIndicator valence={movie.valence} arousal={movie.arousal} />
        </div>

        {/* Vibe sentence — the hero */}
        <p className="text-sm italic text-foreground/70 leading-relaxed mb-4 font-light">
          &ldquo;{movie.vibeSentence}&rdquo;
        </p>

        {/* Genre + context row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {movie.genres.map((g) => (
              <span key={g} className="rounded-md bg-border/20 px-2 py-0.5 text-[10px] text-muted-foreground/60 font-medium">
                {g}
              </span>
            ))}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {movie.watchContext.map((c) => (
              <span key={c} className="text-xs text-muted-foreground/40" title={c}>
                {WATCH_ICONS[c]}
              </span>
            ))}
          </div>
        </div>

        {/* Pacing · ending · arc */}
        <div className="flex items-center gap-2 text-[10px] mb-3">
          <span className="text-muted-foreground/40">{movie.pacing}</span>
          <span className="text-muted-foreground/15">·</span>
          <span className={ENDING_COLORS[movie.endingType] || "text-muted-foreground/40"}>
            {movie.endingType}
          </span>
          <span className="text-muted-foreground/15">·</span>
          <span className="text-muted-foreground/40">{movie.emotionalArc}</span>
        </div>

        {/* Comfort bar */}
        <ComfortBar level={movie.comfortLevel} />

        {/* Safety warnings */}
        {movie.emotionalSafetyWarnings.length > 0 && (
          <div className="flex gap-1 mt-2">
            {movie.emotionalSafetyWarnings.map((w) => (
              <span key={w} className="rounded-md bg-[var(--color-pop-coral)]/10 px-1.5 py-0.5 text-[9px] text-[var(--color-pop-coral)]/70 font-medium">
                {w}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* ── Expanded view ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-border/20 space-y-4">
              {/* Mood tags */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Mood Tags</p>
                <div className="flex flex-wrap gap-1">
                  {movie.moodTags.map((t) => (
                    <span key={t} className="rounded-full border border-[var(--color-pop-purple)]/20 px-2 py-0.5 text-[10px] text-[var(--color-pop-purple)]/70">{t}</span>
                  ))}
                </div>
              </div>

              {/* Emotions */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Dominant Emotions</p>
                <div className="flex gap-1.5">
                  {movie.dominantEmotions.map((e) => (
                    <span key={e} className="rounded-full bg-[var(--color-pop-pink)]/10 border border-[var(--color-pop-pink)]/20 px-2.5 py-0.5 text-[10px] text-[var(--color-pop-pink)]/70 font-medium">{e}</span>
                  ))}
                </div>
              </div>

              {/* Dimension bars */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">Mood Profile</p>
                <div className="space-y-1.5">
                  <DimBar label="valence" value={movie.valence} signed />
                  <DimBar label="arousal" value={movie.arousal} signed />
                  <DimBar label="dominance" value={movie.dominance} signed />
                  <DimBar label="absorption" value={movie.absorptionPotential} />
                  <DimBar label="hedonic" value={movie.hedonicValence} />
                  <DimBar label="eudaimonic" value={movie.eudaimonicValence} />
                  <DimBar label="psych. rich" value={movie.psychologicallyRichValence} />
                  <DimBar label="comfort" value={movie.comfortLevel} />
                  <DimBar label="conversation" value={movie.conversationPotential} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
