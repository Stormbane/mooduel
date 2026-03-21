"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieRatingsCompact } from "@/components/ui/ratings";

const PRESETS = [
  { name: "Rainy Sunday", desc: "Calm → contemplative → warm", trajectory: [
    { va: 0.3, ar: -0.3, label: "Something gentle" },
    { va: -0.2, ar: -0.2, label: "Go deeper" },
    { va: 0.5, ar: 0.1, label: "End warm" },
  ]},
  { name: "Adrenaline Night", desc: "Building → relentless → triumphant", trajectory: [
    { va: 0.2, ar: 0.5, label: "Build tension" },
    { va: -0.1, ar: 0.85, label: "Peak intensity" },
    { va: 0.6, ar: 0.6, label: "Victory lap" },
  ]},
  { name: "The Gauntlet", desc: "Devastating → devastating → uplifting", trajectory: [
    { va: -0.6, ar: 0.5, label: "Hit hard" },
    { va: -0.7, ar: 0.3, label: "Hit harder" },
    { va: 0.7, ar: 0.3, label: "Catharsis" },
  ]},
  { name: "Date Night", desc: "Light → engaging → warm", trajectory: [
    { va: 0.5, ar: 0.3, label: "Light start", ctx: "date" },
    { va: 0.2, ar: 0.5, label: "Get engaged", ctx: "date" },
    { va: 0.6, ar: 0.1, label: "End together", ctx: "date" },
  ]},
  { name: "Mind Melt", desc: "Cerebral → strange → stranger", trajectory: [
    { va: 0.1, ar: 0.4, label: "Start thinking" },
    { va: -0.2, ar: 0.3, label: "Get weird" },
    { va: -0.3, ar: 0.5, label: "Lose your mind" },
  ]},
];

type Phase = "preset" | "building" | "complete";

interface Slot {
  target: { va: number; ar: number; label: string; ctx?: string };
  movie: SlimMoodMovie | null;
}

export default function MoodDJPage() {
  const { data: movies, loading } = useMoodData();
  const [phase, setPhase] = useState<Phase>("preset");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [search, setSearch] = useState("");
  const [presetName, setPresetName] = useState("");

  const goodMovies = useMemo(() => movies.filter((m) => m.v.length > 10 && (m.r || 0) >= 5), [movies]);

  const selectPreset = useCallback((preset: typeof PRESETS[0]) => {
    setSlots(preset.trajectory.map((t) => ({ target: t, movie: null })));
    setActiveSlot(0);
    setPresetName(preset.name);
    setPhase("building");
    setSearch("");
  }, []);

  // Suggest movies for the active slot
  const suggestions = useMemo(() => {
    if (phase !== "building" || !slots[activeSlot]) return [];
    const target = slots[activeSlot].target;
    const usedIds = new Set(slots.filter((s) => s.movie).map((s) => s.movie!.id));

    let pool = goodMovies.filter((m) => !usedIds.has(m.id));

    // Apply context filter if specified
    if (target.ctx) {
      pool = pool.filter((m) => m.wc.includes(target.ctx!));
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      pool = pool.filter((m) =>
        m.t.toLowerCase().includes(q) || m.v.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q))
      );
    }

    // Score by VA distance to target
    return pool
      .map((m) => ({
        movie: m,
        dist: Math.sqrt((m.va - target.va) ** 2 + (m.ar - target.ar) ** 2),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8)
      .map((r) => r.movie);
  }, [goodMovies, phase, slots, activeSlot, search]);

  const pickMovie = useCallback((movie: SlimMoodMovie) => {
    setSlots((s) => s.map((slot, i) => i === activeSlot ? { ...slot, movie } : slot));
    // Auto-advance to next empty slot
    const nextEmpty = slots.findIndex((s, i) => i > activeSlot && !s.movie);
    if (nextEmpty >= 0) {
      setActiveSlot(nextEmpty);
      setSearch("");
    } else if (slots.every((s, i) => i === activeSlot || s.movie)) {
      setPhase("complete");
    }
  }, [activeSlot, slots]);

  const clearSlot = useCallback((idx: number) => {
    setSlots((s) => s.map((slot, i) => i === idx ? { ...slot, movie: null } : slot));
    setActiveSlot(idx);
    setSearch("");
    if (phase === "complete") setPhase("building");
  }, [phase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(251,191,36,0.08)" />

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/games" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">All Games</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-4xl mx-auto">
        <div className="pt-12 text-center mb-8">
          <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mb-2">
            Movie Mood <span className="gradient-text-orange">DJ</span>
          </h1>
          <p className="text-sm text-muted-foreground/60">Build a movie marathon with a designed emotional arc.</p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "preset" && (
            <motion.div key="preset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground/40 mb-4">Choose an emotional arc</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => selectPreset(p)}
                    className="text-left rounded-xl border border-border/30 bg-card/30 p-5 hover:border-[var(--color-pop-yellow)]/40 hover:bg-card/50 transition-all cursor-pointer group"
                  >
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-foreground/80 group-hover:text-foreground mb-1">{p.name}</h3>
                    <p className="text-xs text-muted-foreground/50">{p.desc}</p>
                    <div className="flex gap-1 mt-3">
                      {p.trajectory.map((t, i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full" style={{
                          backgroundColor: `hsl(${((t.va + 1) / 2) * 120}, 70%, 50%)`,
                          opacity: 0.6,
                        }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {(phase === "building" || phase === "complete") && (
            <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-yellow)] mb-4">{presetName}</p>

              {/* Playlist timeline */}
              <div className="flex gap-3 mb-8">
                {slots.map((slot, i) => (
                  <div key={i} className="flex-1">
                    <button
                      onClick={() => { if (slot.movie) clearSlot(i); else { setActiveSlot(i); setSearch(""); } }}
                      className={`w-full rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        i === activeSlot && phase === "building"
                          ? "border-[var(--color-pop-yellow)]/60 bg-[var(--color-pop-yellow)]/5"
                          : slot.movie ? "border-border/40 bg-card/30" : "border-border/20 bg-card/10"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 mb-1">
                        {i + 1}. {slot.target.label}
                      </p>
                      {slot.movie ? (
                        <>
                          <p className="font-[family-name:var(--font-display)] font-bold text-xs text-foreground/80 truncate">{slot.movie.t}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5">({slot.movie.y})</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground/30 italic">Empty</p>
                      )}
                    </button>
                    {i < slots.length - 1 && (
                      <div className="text-center text-muted-foreground/15 text-lg mt-1">→</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Suggestions for active slot */}
              {phase === "building" && (
                <>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search for slot ${activeSlot + 1}: "${slots[activeSlot]?.target.label}"...`}
                      className="w-full rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[var(--color-pop-yellow)]/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestions.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => pickMovie(m)}
                        className="text-left rounded-xl border border-border/20 bg-card/20 p-3 hover:border-border/50 transition-all cursor-pointer group"
                      >
                        <p className="font-[family-name:var(--font-display)] font-bold text-xs text-foreground/70 group-hover:text-foreground">
                          {m.t} <span className="text-muted-foreground/30 font-normal">({m.y})</span>
                          <MovieRatingsCompact movie={m} />
                        </p>
                        <p className="text-[10px] italic text-muted-foreground/50 mt-1 line-clamp-2">&ldquo;{m.v}&rdquo;</p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Complete state */}
              {phase === "complete" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="rounded-xl border border-[var(--color-pop-yellow)]/30 bg-card/30 p-6 mb-6">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-yellow)] mb-4">Your Marathon</p>
                    <div className="space-y-4 text-left">
                      {slots.map((slot, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-lg font-[family-name:var(--font-display)] font-black text-muted-foreground/20 w-6 shrink-0">{i + 1}</span>
                          <div>
                            <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/80">
                              {slot.movie?.t} ({slot.movie?.y})
                            </p>
                            <p className="text-xs italic text-muted-foreground/50">&ldquo;{slot.movie?.v}&rdquo;</p>
                            <div className="flex gap-1.5 mt-1">
                              <span className="text-[9px] text-muted-foreground/30">{slot.movie?.pa}</span>
                              <span className="text-[9px] text-muted-foreground/30">·</span>
                              <span className="text-[9px] text-muted-foreground/30">{slot.movie?.end}</span>
                              <span className="text-[9px] text-muted-foreground/30">·</span>
                              <span className="text-[9px] text-muted-foreground/30">{slot.movie?.rt}m</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/20 text-xs text-muted-foreground/40">
                      Total runtime: {slots.reduce((s, sl) => s + (sl.movie?.rt || 0), 0)} minutes
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button onClick={() => setPhase("preset")} className="rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white bg-[var(--color-pop-yellow)] text-black hover:scale-105 active:scale-95 transition-all cursor-pointer">
                      NEW MARATHON
                    </button>
                    <Link href="/games" className="rounded-xl border border-border/40 px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      More games
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
