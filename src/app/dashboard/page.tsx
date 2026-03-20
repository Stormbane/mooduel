"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ── Color helpers ──
const GENRE_COLORS: Record<string, string> = {
  Action: "#E91E8C", Adventure: "#FF6B6B", Animation: "#FBBF24", Comedy: "#1ED760",
  Crime: "#8B5CF6", Documentary: "#38BDF8", Drama: "#F97316", Family: "#1ED760",
  Fantasy: "#8B5CF6", History: "#F97316", Horror: "#FF6B6B", Music: "#FBBF24",
  Mystery: "#38BDF8", Romance: "#E91E8C", "Science Fiction": "#38BDF8", "Sci-Fi": "#38BDF8",
  Thriller: "#FF6B6B", War: "#F97316", Western: "#FBBF24",
};

function getGenreColor(genres: string[]): string {
  for (const g of genres) {
    if (GENRE_COLORS[g]) return GENRE_COLORS[g];
  }
  return "#8B5CF6";
}

function getDecadeColor(year: number): string {
  if (year < 1960) return "#F97316";
  if (year < 1970) return "#FBBF24";
  if (year < 1980) return "#FF6B6B";
  if (year < 1990) return "#E91E8C";
  if (year < 2000) return "#8B5CF6";
  if (year < 2010) return "#38BDF8";
  if (year < 2020) return "#1ED760";
  return "#E91E8C";
}

function getComfortColor(comfort: number): string {
  const r = Math.round(255 * (1 - comfort));
  const g = Math.round(200 * comfort);
  return `rgb(${r}, ${g}, 80)`;
}

type ColorMode = "genre" | "decade" | "comfort" | "arc";

// ── Quadtree for hover detection ──
class Quadtree {
  private buckets: Map<string, { x: number; y: number; idx: number }[]> = new Map();
  private cellSize: number;

  constructor(cellSize = 20) {
    this.cellSize = cellSize;
  }

  clear() { this.buckets.clear(); }

  insert(x: number, y: number, idx: number) {
    const key = `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key)!.push({ x, y, idx });
  }

  nearest(x: number, y: number, radius: number): number | null {
    const cr = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    let bestDist = radius * radius;
    let bestIdx: number | null = null;

    for (let dx = -cr; dx <= cr; dx++) {
      for (let dy = -cr; dy <= cr; dy++) {
        const pts = this.buckets.get(`${cx + dx},${cy + dy}`);
        if (!pts) continue;
        for (const p of pts) {
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestDist) { bestDist = d; bestIdx = p.idx; }
        }
      }
    }
    return bestIdx;
  }
}

// ══════════════════════════════════════════════════════════
// MOOD MAP — Canvas scatter of all movies in VA space
// ══════════════════════════════════════════════════════════

function MoodMap({ movies, colorMode }: { movies: SlimMoodMovie[]; colorMode: ColorMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; movie: SlimMoodMovie } | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  // Transform state
  const transformRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const qtRef = useRef(new Quadtree(15));

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      setDimensions({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Get color for a movie
  const getColor = useCallback((m: SlimMoodMovie) => {
    if (colorMode === "genre") return getGenreColor(m.g);
    if (colorMode === "decade") return getDecadeColor(m.y);
    if (colorMode === "comfort") return getComfortColor(m.co);
    // arc
    const arcColors: Record<string, string> = {
      "man-in-a-hole": "#1ED760", "oedipus": "#FF6B6B", "icarus": "#FBBF24",
      "cinderella": "#E91E8C", "rags-to-riches": "#38BDF8", "riches-to-rags": "#8B5CF6",
    };
    return arcColors[m.arc] || "#666";
  }, [colorMode]);

  // Map VA coordinates to canvas pixel coordinates
  const vaToPixel = useCallback((valence: number, arousal: number) => {
    const { w, h } = dimensions;
    const { offsetX, offsetY, scale } = transformRef.current;
    const px = (valence + 1) / 2 * w * scale + offsetX;
    const py = (1 - (arousal + 1) / 2) * h * scale + offsetY;
    return { px, py };
  }, [dimensions]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || movies.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "rgb(10, 10, 14)";
    ctx.fillRect(0, 0, w, h);

    const { offsetX, offsetY, scale } = transformRef.current;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    // Vertical center (valence = 0)
    const cx = 0.5 * w * scale + offsetX;
    const cy = 0.5 * h * scale + offsetY;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Quadrant labels
    ctx.font = "11px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.textAlign = "center";
    const qLabelY = cy - (h * scale * 0.35);
    const qLabelY2 = cy + (h * scale * 0.35);
    const qLabelX = cx - (w * scale * 0.35);
    const qLabelX2 = cx + (w * scale * 0.35);
    if (qLabelX2 > 0 && qLabelX2 < w && qLabelY > 0 && qLabelY < h)
      ctx.fillText("Thrilling", qLabelX2, qLabelY);
    if (qLabelX > 0 && qLabelX < w && qLabelY > 0 && qLabelY < h)
      ctx.fillText("Terrifying", qLabelX, qLabelY);
    if (qLabelX > 0 && qLabelX < w && qLabelY2 > 0 && qLabelY2 < h)
      ctx.fillText("Meditative", qLabelX, qLabelY2);
    if (qLabelX2 > 0 && qLabelX2 < w && qLabelY2 > 0 && qLabelY2 < h)
      ctx.fillText("Comforting", qLabelX2, qLabelY2);

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("← unpleasant", 8, cy + 15);
    ctx.textAlign = "right";
    ctx.fillText("pleasant →", w - 8, cy + 15);
    ctx.textAlign = "center";
    ctx.fillText("intense ↑", cx, 16);
    ctx.fillText("↓ calm", cx, h - 8);

    // Build quadtree and draw dots
    qtRef.current.clear();

    for (let i = 0; i < movies.length; i++) {
      const m = movies[i];
      const { px, py } = vaToPixel(m.va, m.ar);

      // Cull offscreen
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;

      qtRef.current.insert(px, py, i);

      const color = getColor(m);
      const dotSize = 2 + (m.r || 5) / 5; // bigger dots for higher-rated

      // Glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, dotSize * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(px, py, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  }, [movies, dimensions, colorMode, getColor, vaToPixel]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      transformRef.current.offsetX += dx;
      transformRef.current.offsetY += dy;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setTooltip(null);
      // Force re-render
      setDimensions((d) => ({ ...d }));
      return;
    }

    const idx = qtRef.current.nearest(mx, my, 15);
    if (idx !== null) {
      const m = movies[idx];
      setTooltip({ x: mx, y: my, movie: m });
    } else {
      setTooltip(null);
    }
  }, [movies]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const t = transformRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(10, t.scale * zoomFactor));

    // Zoom toward mouse position
    t.offsetX = mx - (mx - t.offsetX) * (newScale / t.scale);
    t.offsetY = my - (my - t.offsetY) * (newScale / t.scale);
    t.scale = newScale;

    setDimensions((d) => ({ ...d }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => { draggingRef.current = false; }, []);

  const resetView = useCallback(() => {
    transformRef.current = { offsetX: 0, offsetY: 0, scale: 1 };
    setDimensions((d) => ({ ...d }));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-border/30 bg-[rgb(10,10,14)]">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", cursor: draggingRef.current ? "grabbing" : "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingRef.current = false; setTooltip(null); }}
        onWheel={handleWheel}
      />

      {/* Reset zoom button */}
      <button
        onClick={resetView}
        className="absolute top-3 right-3 rounded-lg bg-card/80 border border-border/30 px-2.5 py-1 text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
      >
        Reset view
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-xl border border-border/40 bg-card/95 backdrop-blur-md p-3 shadow-xl"
          style={{ left: Math.min(tooltip.x + 12, dimensions.w - 260), top: tooltip.y + 12 }}
        >
          <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
            {tooltip.movie.t} <span className="text-muted-foreground/50 font-normal">({tooltip.movie.y})</span>
          </p>
          <p className="text-xs italic text-foreground/60 mt-1 leading-relaxed">
            &ldquo;{tooltip.movie.v}&rdquo;
          </p>
          <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground/40">
            <span>V:{tooltip.movie.va}</span>
            <span>A:{tooltip.movie.ar}</span>
            <span>{tooltip.movie.pa}</span>
            <span>{tooltip.movie.end}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STAT BAR CHARTS (pure CSS)
// ══════════════════════════════════════════════════════════

function BarChart({ data, color = "var(--color-pop-purple)" }: { data: { label: string; value: number; pct: number }[]; color?: string }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground/60 w-28 shrink-0 text-right truncate">{d.label}</span>
          <div className="flex-1 h-3 rounded-full bg-border/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${d.pct}%`, backgroundColor: color, opacity: 0.7 }}
            />
          </div>
          <span className="text-muted-foreground/30 w-12 text-right font-mono">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/20 px-5 py-4 text-center">
      <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-foreground/80">{value}</p>
      <p className="text-xs text-muted-foreground/50 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/30 mt-0.5">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { data: movies, loading } = useMoodData();
  const [colorMode, setColorMode] = useState<ColorMode>("genre");

  // Computed stats
  const stats = useMemo(() => {
    if (movies.length === 0) return null;

    const n = movies.length;

    // Averages
    const avgV = movies.reduce((s, m) => s + m.va, 0) / n;
    const avgA = movies.reduce((s, m) => s + m.ar, 0) / n;
    const avgComfort = movies.reduce((s, m) => s + m.co, 0) / n;
    const avgConv = movies.reduce((s, m) => s + m.conv, 0) / n;

    // Arc distribution
    const arcs: Record<string, number> = {};
    movies.forEach((m) => { arcs[m.arc] = (arcs[m.arc] || 0) + 1; });

    // Pacing distribution
    const pacings: Record<string, number> = {};
    movies.forEach((m) => { pacings[m.pa] = (pacings[m.pa] || 0) + 1; });

    // Ending distribution
    const endings: Record<string, number> = {};
    movies.forEach((m) => { endings[m.end] = (endings[m.end] || 0) + 1; });

    // Genre distribution
    const genres: Record<string, number> = {};
    movies.forEach((m) => m.g.forEach((g) => { genres[g] = (genres[g] || 0) + 1; }));

    // Decade distribution
    const decades: Record<string, number> = {};
    movies.forEach((m) => {
      const d = Math.floor(m.y / 10) * 10 + "s";
      decades[d] = (decades[d] || 0) + 1;
    });

    // Decade mood averages
    const decadeMoods: Record<string, { v: number; a: number; count: number }> = {};
    movies.forEach((m) => {
      const d = Math.floor(m.y / 10) * 10 + "s";
      if (!decadeMoods[d]) decadeMoods[d] = { v: 0, a: 0, count: 0 };
      decadeMoods[d].v += m.va;
      decadeMoods[d].a += m.ar;
      decadeMoods[d].count++;
    });
    const decadeAvgs = Object.entries(decadeMoods)
      .map(([d, s]) => ({ decade: d, v: s.v / s.count, a: s.a / s.count, count: s.count }))
      .filter((d) => d.count >= 20)
      .sort((a, b) => a.decade.localeCompare(b.decade));

    // Superlatives
    const mostComfortable = [...movies].sort((a, b) => b.co - a.co)[0];
    const leastComfortable = [...movies].sort((a, b) => a.co - b.co)[0];
    const highestConvo = [...movies].sort((a, b) => b.conv - a.conv)[0];
    const mostAbsorbing = [...movies].sort((a, b) => b.ab - a.ab)[0];
    const mostPleasant = [...movies].sort((a, b) => b.va - a.va)[0];
    const mostUnpleasant = [...movies].sort((a, b) => a.va - b.va)[0];

    // Surprising: most comfortable horror
    const horrors = movies.filter((m) => m.g.includes("Horror"));
    const comfyHorror = horrors.length > 0 ? [...horrors].sort((a, b) => b.co - a.co)[0] : null;

    // Most uncomfortable comedy
    const comedies = movies.filter((m) => m.g.includes("Comedy"));
    const uncomfyComedy = comedies.length > 0 ? [...comedies].sort((a, b) => a.co - b.co)[0] : null;

    const toBar = (obj: Record<string, number>) => {
      const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
      const max = entries[0]?.[1] || 1;
      return entries.slice(0, 10).map(([label, value]) => ({ label, value, pct: (value / max) * 100 }));
    };

    return {
      n, avgV, avgA, avgComfort, avgConv,
      arcs: toBar(arcs), pacings: toBar(pacings), endings: toBar(endings),
      genres: toBar(genres), decades: toBar(decades), decadeAvgs,
      mostComfortable, leastComfortable, highestConvo, mostAbsorbing,
      mostPleasant, mostUnpleasant, comfyHorror, uncomfyComedy,
    };
  }, [movies]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">◎</div>
          <p className="text-sm text-muted-foreground/50">Loading 30,000+ movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill="rgba(139,92,246,0.15)" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/play" className="hover:text-foreground transition-colors">Play</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/dashboard" className="text-foreground font-medium">Dashboard</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="pt-12 pb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--color-pop-pink)] mb-3">
            Data Dashboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] font-bold">
            The Emotional Landscape of <span className="gradient-text-purple">Cinema</span>
          </h1>
          <p className="text-muted-foreground mt-3">
            {stats.n.toLocaleString()} movies &middot; 18 mood dimensions &middot; 1888–2026
          </p>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <StatCard label="Avg Valence" value={stats.avgV.toFixed(2)} sub="slightly positive — cinema trends toward hope" />
          <StatCard label="Avg Arousal" value={stats.avgA.toFixed(2)} sub="moderate-high — movies are engaging" />
          <StatCard label="Avg Comfort" value={stats.avgComfort.toFixed(2)} sub="moderate — cinema challenges as much as comforts" />
          <StatCard label="Avg Conversation" value={stats.avgConv.toFixed(2)} sub="people want to talk about movies" />
        </motion.div>

        {/* ── MOOD MAP ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-16">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-[family-name:var(--font-display)] font-bold">Mood Map</h2>
              <p className="text-xs text-muted-foreground/40 mt-1">
                Every movie as a point in valence × arousal space. Scroll to zoom. Drag to pan.
              </p>
            </div>
            <div className="flex gap-1">
              {(["genre", "decade", "comfort", "arc"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColorMode(mode)}
                  className={`rounded-full px-3 py-1 text-[10px] font-medium tracking-wide transition-all cursor-pointer ${
                    colorMode === mode
                      ? "bg-[var(--color-pop-purple)]/20 text-[var(--color-pop-purple)] border border-[var(--color-pop-purple)]/40"
                      : "border border-border/30 text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <MoodMap movies={movies} colorMode={colorMode} />
        </motion.div>

        {/* ── DISTRIBUTIONS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold mb-4 text-foreground/70">Emotional Arcs</h3>
            <BarChart data={stats.arcs} color="var(--color-pop-green)" />
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold mb-4 text-foreground/70">Pacing</h3>
            <BarChart data={stats.pacings} color="var(--color-pop-blue)" />
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold mb-4 text-foreground/70">Ending Types</h3>
            <BarChart data={stats.endings} color="var(--color-pop-pink)" />
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold mb-4 text-foreground/70">Top Genres</h3>
            <BarChart data={stats.genres} color="var(--color-pop-orange)" />
          </motion.div>
        </div>

        {/* ── DECADE MOOD SHIFTS ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-16">
          <h2 className="text-xl font-[family-name:var(--font-display)] font-bold mb-2">Cinema&rsquo;s Emotional Shift</h2>
          <p className="text-xs text-muted-foreground/40 mb-6">Average valence and arousal by decade</p>
          <div className="flex items-end gap-1 h-40">
            {stats.decadeAvgs.map((d) => {
              const vHeight = ((d.v + 1) / 2) * 100; // 0-100
              const aHeight = ((d.a + 1) / 2) * 100;
              return (
                <div key={d.decade} className="flex-1 flex flex-col items-center gap-1" title={`${d.decade}: V=${d.v.toFixed(2)} A=${d.a.toFixed(2)} (${d.count} movies)`}>
                  <div className="w-full flex gap-0.5 items-end h-28">
                    <div className="flex-1 rounded-t-sm bg-[var(--color-pop-green)]" style={{ height: `${vHeight}%`, opacity: 0.6 }} />
                    <div className="flex-1 rounded-t-sm bg-[var(--color-pop-pink)]" style={{ height: `${aHeight}%`, opacity: 0.6 }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground/40">{d.decade}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground/40">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[var(--color-pop-green)] opacity-60 mr-1" />Valence</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[var(--color-pop-pink)] opacity-60 mr-1" />Arousal</span>
          </div>
        </motion.div>

        {/* ── SUPERLATIVES ── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-16">
          <h2 className="text-xl font-[family-name:var(--font-display)] font-bold mb-6">Extremes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Superlative label="Most Pleasant" movie={stats.mostPleasant} stat={`V: ${stats.mostPleasant.va}`} color="green" />
            <Superlative label="Most Unpleasant" movie={stats.mostUnpleasant} stat={`V: ${stats.mostUnpleasant.va}`} color="coral" />
            <Superlative label="Highest Conversation" movie={stats.highestConvo} stat={`${stats.highestConvo.conv}`} color="purple" />
            <Superlative label="Most Absorbing" movie={stats.mostAbsorbing} stat={`${stats.mostAbsorbing.ab}`} color="blue" />
            {stats.comfyHorror && (
              <Superlative label="Most Comfortable Horror" movie={stats.comfyHorror} stat={`Comfort: ${stats.comfyHorror.co}`} color="orange" />
            )}
            {stats.uncomfyComedy && (
              <Superlative label="Most Uncomfortable Comedy" movie={stats.uncomfyComedy} stat={`Comfort: ${stats.uncomfyComedy.co}`} color="pink" />
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-10 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground/40">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/15">·</span>
            <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
            <span className="text-muted-foreground/15">·</span>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>
          <span className="text-sm text-muted-foreground/30">Mooduel Movie Database · {stats.n.toLocaleString()} movies</span>
        </div>
      </footer>
    </div>
  );
}

function Superlative({ label, movie, stat, color }: {
  label: string; movie: SlimMoodMovie; stat: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    green: "border-[var(--color-pop-green)]/20", coral: "border-[var(--color-pop-coral)]/20",
    purple: "border-[var(--color-pop-purple)]/20", blue: "border-[var(--color-pop-blue)]/20",
    orange: "border-[var(--color-pop-orange)]/20", pink: "border-[var(--color-pop-pink)]/20",
  };
  const textMap: Record<string, string> = {
    green: "text-[var(--color-pop-green)]", coral: "text-[var(--color-pop-coral)]",
    purple: "text-[var(--color-pop-purple)]", blue: "text-[var(--color-pop-blue)]",
    orange: "text-[var(--color-pop-orange)]", pink: "text-[var(--color-pop-pink)]",
  };

  return (
    <div className={`rounded-xl border ${colorMap[color]} bg-card/20 p-4`}>
      <p className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${textMap[color]} mb-2`}>{label}</p>
      <p className="font-[family-name:var(--font-display)] font-bold text-foreground/80 text-sm">{movie.t} <span className="text-muted-foreground/40 font-normal">({movie.y})</span></p>
      <p className="text-xs italic text-muted-foreground/50 mt-1 line-clamp-2">&ldquo;{movie.v}&rdquo;</p>
      <p className="text-xs text-muted-foreground/30 mt-1 font-mono">{stat}</p>
    </div>
  );
}
