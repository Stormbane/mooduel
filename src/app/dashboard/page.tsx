"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";
import { useMoodData } from "@/lib/mood-data/use-mood-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

// ── Color helpers ──
const GENRE_COLORS: Record<string, string> = {
  Action: "#E91E8C",
  Adventure: "#FF6B6B",
  Animation: "#FBBF24",
  Comedy: "#1ED760",
  Crime: "#8B5CF6",
  Documentary: "#38BDF8",
  Drama: "#F97316",
  Family: "#1ED760",
  Fantasy: "#8B5CF6",
  History: "#F97316",
  Horror: "#FF6B6B",
  Music: "#FBBF24",
  Mystery: "#38BDF8",
  Romance: "#E91E8C",
  "Science Fiction": "#38BDF8",
  "Sci-Fi": "#38BDF8",
  Thriller: "#FF6B6B",
  War: "#F97316",
  Western: "#FBBF24",
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
  private buckets: Map<string, { x: number; y: number; idx: number }[]> =
    new Map();
  private cellSize: number;

  constructor(cellSize = 20) {
    this.cellSize = cellSize;
  }

  clear() {
    this.buckets.clear();
  }

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
          if (d < bestDist) {
            bestDist = d;
            bestIdx = p.idx;
          }
        }
      }
    }
    return bestIdx;
  }
}

// ══════════════════════════════════════════════════════════
// MOOD MAP
// ══════════════════════════════════════════════════════════

function MoodMap({
  movies,
  colorMode,
}: {
  movies: SlimMoodMovie[];
  colorMode: ColorMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    movie: SlimMoodMovie;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  const transformRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const qtRef = useRef(new Quadtree(15));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      setDimensions({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getColor = useCallback(
    (m: SlimMoodMovie) => {
      if (colorMode === "genre") return getGenreColor(m.g);
      if (colorMode === "decade") return getDecadeColor(m.y);
      if (colorMode === "comfort") return getComfortColor(m.co);
      const arcColors: Record<string, string> = {
        "man-in-a-hole": "#1ED760",
        oedipus: "#FF6B6B",
        icarus: "#FBBF24",
        cinderella: "#E91E8C",
        "rags-to-riches": "#38BDF8",
        "riches-to-rags": "#8B5CF6",
      };
      return arcColors[m.arc] || "#666";
    },
    [colorMode],
  );

  const vaToPixel = useCallback(
    (valence: number, arousal: number) => {
      const { w, h } = dimensions;
      const { offsetX, offsetY, scale } = transformRef.current;
      const px = ((valence + 1) / 2) * w * scale + offsetX;
      const py = (1 - (arousal + 1) / 2) * h * scale + offsetY;
      return { px, py };
    },
    [dimensions],
  );

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

    ctx.fillStyle = "oklch(0.09 0 0)";
    ctx.fillRect(0, 0, w, h);

    const { offsetX, offsetY, scale } = transformRef.current;

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const cx = 0.5 * w * scale + offsetX;
    const cy = 0.5 * h * scale + offsetY;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    ctx.font = "11px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.textAlign = "center";
    const qLabelY = cy - h * scale * 0.35;
    const qLabelY2 = cy + h * scale * 0.35;
    const qLabelX = cx - w * scale * 0.35;
    const qLabelX2 = cx + w * scale * 0.35;
    if (qLabelX2 > 0 && qLabelX2 < w && qLabelY > 0 && qLabelY < h)
      ctx.fillText("Thrilling", qLabelX2, qLabelY);
    if (qLabelX > 0 && qLabelX < w && qLabelY > 0 && qLabelY < h)
      ctx.fillText("Terrifying", qLabelX, qLabelY);
    if (qLabelX > 0 && qLabelX < w && qLabelY2 > 0 && qLabelY2 < h)
      ctx.fillText("Meditative", qLabelX, qLabelY2);
    if (qLabelX2 > 0 && qLabelX2 < w && qLabelY2 > 0 && qLabelY2 < h)
      ctx.fillText("Comforting", qLabelX2, qLabelY2);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("\u2190 unpleasant", 8, cy + 15);
    ctx.textAlign = "right";
    ctx.fillText("pleasant \u2192", w - 8, cy + 15);
    ctx.textAlign = "center";
    ctx.fillText("intense \u2191", cx, 16);
    ctx.fillText("\u2193 calm", cx, h - 8);

    qtRef.current.clear();

    for (let i = 0; i < movies.length; i++) {
      const m = movies[i];
      const { px, py } = vaToPixel(m.va, m.ar);

      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;

      qtRef.current.insert(px, py, i);

      const color = getColor(m);
      const dotSize = 2 + (m.r || 5) / 5;

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, dotSize * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(px, py, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [movies, dimensions, colorMode, getColor, vaToPixel]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
        setDimensions((d) => ({ ...d }));
        return;
      }

      const idx = qtRef.current.nearest(mx, my, 15);
      if (idx !== null) {
        setTooltip({ x: mx, y: my, movie: movies[idx] });
      } else {
        setTooltip(null);
      }
    },
    [movies],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const t = transformRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(10, t.scale * zoomFactor));

    t.offsetX = mx - (mx - t.offsetX) * (newScale / t.scale);
    t.offsetY = my - (my - t.offsetY) * (newScale / t.scale);
    t.scale = newScale;

    setDimensions((d) => ({ ...d }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const resetView = useCallback(() => {
    transformRef.current = { offsetX: 0, offsetY: 0, scale: 1 };
    setDimensions((d) => ({ ...d }));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[500px] md:h-[600px] overflow-hidden border bg-[oklch(0.09_0_0)]",
        BORDER,
        R,
      )}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: draggingRef.current ? "grabbing" : "crosshair",
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          draggingRef.current = false;
          setTooltip(null);
        }}
        onWheel={handleWheel}
      />

      <button
        onClick={resetView}
        className={cn(
          "absolute top-3 right-3 border px-2.5 py-1 text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors duration-150 cursor-pointer",
          SURFACE,
          BORDER,
          R,
        )}
      >
        Reset view
      </button>

      {tooltip && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 max-w-xs border p-3 shadow-xl",
            SURFACE,
            BORDER,
            R,
          )}
          style={{
            left: Math.min(tooltip.x + 12, dimensions.w - 260),
            top: tooltip.y + 12,
          }}
        >
          <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
            {tooltip.movie.t}{" "}
            <span className="text-muted-foreground/40 font-normal">
              ({tooltip.movie.y})
            </span>
          </p>
          <p className="text-xs italic text-foreground/50 mt-1 leading-relaxed">
            &ldquo;{tooltip.movie.v}&rdquo;
          </p>
          <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground/30 font-[family-name:var(--font-geist-mono)]">
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

// ── Bar chart ──
function BarChart({
  data,
  color = "#8B5CF6",
}: {
  data: { label: string; value: number; pct: number }[];
  color?: string;
}) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground/50 w-28 shrink-0 text-right truncate">
            {d.label}
          </span>
          <div
            className="flex-1 h-2.5 overflow-hidden bg-white/[0.03]"
            style={{ borderRadius: 2 }}
          >
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${d.pct}%`,
                backgroundColor: color,
                opacity: 0.6,
                borderRadius: 2,
              }}
            />
          </div>
          <span className="text-muted-foreground/25 w-12 text-right font-[family-name:var(--font-geist-mono)]">
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ──
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={cn("border px-5 py-4 text-center", SURFACE, BORDER, R)}>
      <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-foreground/80">
        {value}
      </p>
      <p className="text-xs text-muted-foreground/40 mt-0.5">{label}</p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/25 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ── Superlative card ──
function Superlative({
  label,
  movie,
  stat,
  color,
}: {
  label: string;
  movie: SlimMoodMovie;
  stat: string;
  color: string;
}) {
  return (
    <div
      className={cn("border p-4", SURFACE, R)}
      style={{ borderColor: `${color}33` }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
        style={{ color }}
      >
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] font-bold text-foreground/80 text-sm">
        {movie.t}{" "}
        <span className="text-muted-foreground/30 font-normal">
          ({movie.y})
        </span>
      </p>
      <p className="text-xs italic text-muted-foreground/40 mt-1 line-clamp-2">
        &ldquo;{movie.v}&rdquo;
      </p>
      <p className="text-xs text-muted-foreground/25 mt-1 font-[family-name:var(--font-geist-mono)]">
        {stat}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { data: movies, loading } = useMoodData();
  const [colorMode, setColorMode] = useState<ColorMode>("genre");

  const stats = useMemo(() => {
    if (movies.length === 0) return null;

    const n = movies.length;

    const avgV = movies.reduce((s, m) => s + m.va, 0) / n;
    const avgA = movies.reduce((s, m) => s + m.ar, 0) / n;
    const avgComfort = movies.reduce((s, m) => s + m.co, 0) / n;
    const avgConv = movies.reduce((s, m) => s + m.conv, 0) / n;

    const arcs: Record<string, number> = {};
    movies.forEach((m) => {
      arcs[m.arc] = (arcs[m.arc] || 0) + 1;
    });

    const pacings: Record<string, number> = {};
    movies.forEach((m) => {
      pacings[m.pa] = (pacings[m.pa] || 0) + 1;
    });

    const endings: Record<string, number> = {};
    movies.forEach((m) => {
      endings[m.end] = (endings[m.end] || 0) + 1;
    });

    const genres: Record<string, number> = {};
    movies.forEach((m) =>
      m.g.forEach((g) => {
        genres[g] = (genres[g] || 0) + 1;
      }),
    );

    const decades: Record<string, number> = {};
    movies.forEach((m) => {
      const d = Math.floor(m.y / 10) * 10 + "s";
      decades[d] = (decades[d] || 0) + 1;
    });

    const decadeMoods: Record<
      string,
      { v: number; a: number; count: number }
    > = {};
    movies.forEach((m) => {
      const d = Math.floor(m.y / 10) * 10 + "s";
      if (!decadeMoods[d]) decadeMoods[d] = { v: 0, a: 0, count: 0 };
      decadeMoods[d].v += m.va;
      decadeMoods[d].a += m.ar;
      decadeMoods[d].count++;
    });
    const decadeAvgs = Object.entries(decadeMoods)
      .map(([d, s]) => ({
        decade: d,
        v: s.v / s.count,
        a: s.a / s.count,
        count: s.count,
      }))
      .filter((d) => d.count >= 20)
      .sort((a, b) => a.decade.localeCompare(b.decade));

    const mostComfortable = [...movies].sort((a, b) => b.co - a.co)[0];
    const leastComfortable = [...movies].sort((a, b) => a.co - b.co)[0];
    const highestConvo = [...movies].sort((a, b) => b.conv - a.conv)[0];
    const mostAbsorbing = [...movies].sort((a, b) => b.ab - a.ab)[0];
    const mostPleasant = [...movies].sort((a, b) => b.va - a.va)[0];
    const mostUnpleasant = [...movies].sort((a, b) => a.va - b.va)[0];

    const horrors = movies.filter((m) => m.g.includes("Horror"));
    const comfyHorror =
      horrors.length > 0
        ? [...horrors].sort((a, b) => b.co - a.co)[0]
        : null;

    const comedies = movies.filter((m) => m.g.includes("Comedy"));
    const uncomfyComedy =
      comedies.length > 0
        ? [...comedies].sort((a, b) => a.co - b.co)[0]
        : null;

    const toBar = (obj: Record<string, number>) => {
      const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
      const max = entries[0]?.[1] || 1;
      return entries
        .slice(0, 10)
        .map(([label, value]) => ({
          label,
          value,
          pct: (value / max) * 100,
        }));
    };

    return {
      n,
      avgV,
      avgA,
      avgComfort,
      avgConv,
      arcs: toBar(arcs),
      pacings: toBar(pacings),
      endings: toBar(endings),
      genres: toBar(genres),
      decades: toBar(decades),
      decadeAvgs,
      mostComfortable,
      leastComfortable,
      highestConvo,
      mostAbsorbing,
      mostPleasant,
      mostUnpleasant,
      comfyHorror,
      uncomfyComedy,
    };
  }, [movies]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse text-muted-foreground/30">
            {"\u25CE"}
          </div>
          <p className="text-sm text-muted-foreground/50">
            Loading 30,000+ movies...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout currentPage="/dashboard">
      {/* Header */}
      <div className="pt-12 pb-8">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E91E8C] mb-3">
            DATA DASHBOARD
          </p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[2rem] sm:text-[2.5rem] tracking-tight mb-3">
            The Emotional Landscape of Cinema
          </h1>
          <p className="text-muted-foreground">
            {stats.n.toLocaleString()} movies &middot; 18 mood dimensions
            &middot; 1888&ndash;2026
          </p>
        </Reveal>
      </div>

      {/* Stat cards */}
      <Reveal delay={100}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <StatCard
            label="Avg Valence"
            value={stats.avgV.toFixed(2)}
            sub="slightly positive \u2014 cinema trends toward hope"
          />
          <StatCard
            label="Avg Arousal"
            value={stats.avgA.toFixed(2)}
            sub="moderate-high \u2014 movies are engaging"
          />
          <StatCard
            label="Avg Comfort"
            value={stats.avgComfort.toFixed(2)}
            sub="moderate \u2014 cinema challenges as much as comforts"
          />
          <StatCard
            label="Avg Conversation"
            value={stats.avgConv.toFixed(2)}
            sub="people want to talk about movies"
          />
        </div>
      </Reveal>

      {/* Mood Map */}
      <Reveal delay={150}>
        <div className="mb-16">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-2">
                MOOD MAP
              </p>
              <p className="text-xs text-muted-foreground/35">
                Every movie as a point in valence &times; arousal space. Scroll
                to zoom. Drag to pan.
              </p>
            </div>
            <div className="flex gap-1">
              {(["genre", "decade", "comfort", "arc"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColorMode(mode)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-semibold tracking-wide transition-all duration-150 cursor-pointer",
                    R,
                    colorMode === mode
                      ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/40"
                      : "border border-[oklch(0.25_0_0)] text-muted-foreground/35 hover:text-muted-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <MoodMap movies={movies} colorMode={colorMode} />
        </div>
      </Reveal>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Reveal>
          <div className={cn("border p-5", SURFACE, BORDER, R)}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-4">
              EMOTIONAL ARCS
            </p>
            <BarChart data={stats.arcs} color="#1ED760" />
          </div>
        </Reveal>
        <Reveal delay={50}>
          <div className={cn("border p-5", SURFACE, BORDER, R)}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-4">
              PACING
            </p>
            <BarChart data={stats.pacings} color="#38BDF8" />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className={cn("border p-5", SURFACE, BORDER, R)}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E91E8C] mb-4">
              ENDING TYPES
            </p>
            <BarChart data={stats.endings} color="#E91E8C" />
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className={cn("border p-5", SURFACE, BORDER, R)}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">
              TOP GENRES
            </p>
            <BarChart data={stats.genres} color="#F97316" />
          </div>
        </Reveal>
      </div>

      {/* Decade mood shifts */}
      <Reveal>
        <div className={cn("border p-6 mb-16", SURFACE, BORDER, R)}>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FBBF24] mb-2">
            CINEMA&rsquo;S EMOTIONAL SHIFT
          </p>
          <p className="text-xs text-muted-foreground/35 mb-6">
            Average valence and arousal by decade
          </p>
          <div className="flex items-end gap-1 h-40">
            {stats.decadeAvgs.map((d) => {
              const vHeight = ((d.v + 1) / 2) * 100;
              const aHeight = ((d.a + 1) / 2) * 100;
              return (
                <div
                  key={d.decade}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${d.decade}: V=${d.v.toFixed(2)} A=${d.a.toFixed(2)} (${d.count} movies)`}
                >
                  <div className="w-full flex gap-0.5 items-end h-28">
                    <div
                      className="flex-1"
                      style={{
                        height: `${vHeight}%`,
                        backgroundColor: "#1ED760",
                        opacity: 0.5,
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                    <div
                      className="flex-1"
                      style={{
                        height: `${aHeight}%`,
                        backgroundColor: "#E91E8C",
                        opacity: 0.5,
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground/30">
                    {d.decade}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground/35">
            <span>
              <span
                className="inline-block w-2 h-2 mr-1"
                style={{
                  backgroundColor: "#1ED760",
                  opacity: 0.5,
                  borderRadius: 1,
                }}
              />
              Valence
            </span>
            <span>
              <span
                className="inline-block w-2 h-2 mr-1"
                style={{
                  backgroundColor: "#E91E8C",
                  opacity: 0.5,
                  borderRadius: 1,
                }}
              />
              Arousal
            </span>
          </div>
        </div>
      </Reveal>

      {/* Superlatives */}
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FF6B6B] mb-2">
            EXTREMES
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            Notable outliers in the dataset.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Superlative
              label="Most Pleasant"
              movie={stats.mostPleasant}
              stat={`V: ${stats.mostPleasant.va}`}
              color="#1ED760"
            />
            <Superlative
              label="Most Unpleasant"
              movie={stats.mostUnpleasant}
              stat={`V: ${stats.mostUnpleasant.va}`}
              color="#FF6B6B"
            />
            <Superlative
              label="Highest Conversation"
              movie={stats.highestConvo}
              stat={`${stats.highestConvo.conv}`}
              color="#8B5CF6"
            />
            <Superlative
              label="Most Absorbing"
              movie={stats.mostAbsorbing}
              stat={`${stats.mostAbsorbing.ab}`}
              color="#38BDF8"
            />
            {stats.comfyHorror && (
              <Superlative
                label="Most Comfortable Horror"
                movie={stats.comfyHorror}
                stat={`Comfort: ${stats.comfyHorror.co}`}
                color="#F97316"
              />
            )}
            {stats.uncomfyComedy && (
              <Superlative
                label="Most Uncomfortable Comedy"
                movie={stats.uncomfyComedy}
                stat={`Comfort: ${stats.uncomfyComedy.co}`}
                color="#E91E8C"
              />
            )}
          </div>
        </div>
      </Reveal>
    </PageLayout>
  );
}
