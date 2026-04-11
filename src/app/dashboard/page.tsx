"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";
import { useScatterData, useDashboardStats } from "@/lib/mood-data/use-movies";
import type { ScatterPoint, DashboardStats } from "@/lib/mood-data/use-movies";
import { InsightCharts } from "@/components/dashboard/insight-charts";
import { BentoAnalytics } from "@/components/landing/bento-analytics";

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

  nearest(x: number, y: number, maxDist: number): number | null {
    let best: number | null = null;
    let bestD = maxDist * maxDist;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = this.buckets.get(key);
        if (!bucket) continue;
        for (const p of bucket) {
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = p.idx;
          }
        }
      }
    }
    return best;
  }
}

// ── Mood Map ──
function MoodMap({ movies }: { movies: ScatterPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    movie: ScatterPoint;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
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

    // Crosshairs
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Quadrant labels
    ctx.font = "12px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.textAlign = "center";
    ctx.fillText("Thrilling", cx + w * 0.25, cy - h * 0.35);
    ctx.fillText("Terrifying", cx - w * 0.25, cy - h * 0.35);
    ctx.fillText("Meditative", cx - w * 0.25, cy + h * 0.35);
    ctx.fillText("Comforting", cx + w * 0.25, cy + h * 0.35);

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("\u2190 unpleasant", 8, cy + 16);
    ctx.textAlign = "right";
    ctx.fillText("pleasant \u2192", w - 8, cy + 16);
    ctx.textAlign = "center";
    ctx.fillText("intense \u2191", cx, 18);
    ctx.fillText("\u2193 calm", cx, h - 8);

    // Plot dots
    qtRef.current.clear();

    for (let i = 0; i < movies.length; i++) {
      const m = movies[i];
      const px = ((m.va + 1) / 2) * w;
      const py = (1 - (m.ar + 1) / 2) * h;

      qtRef.current.insert(px, py, i);

      const color = getGenreColor(m.g);
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
  }, [movies, dimensions]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const idx = qtRef.current.nearest(mx, my, 15);
      if (idx !== null) {
        setTooltip({ x: mx, y: my, movie: movies[idx] });
      } else {
        setTooltip(null);
      }
    },
    [movies],
  );

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
        style={{ width: "100%", height: "100%", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />

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
            <span className="text-muted-foreground/50 font-normal">
              ({tooltip.movie.y})
            </span>
          </p>
          <p className="text-xs italic text-foreground/60 mt-1 leading-relaxed">
            &ldquo;{tooltip.movie.v}&rdquo;
          </p>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground/50 font-[family-name:var(--font-geist-mono)]">
            <span>V: {tooltip.movie.va}</span>
            <span>A: {tooltip.movie.ar}</span>
            <span>{tooltip.movie.pa}</span>
            <span>{tooltip.movie.end}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bar chart (distribution) ──
function BarChart({
  data,
  color = "#8B5CF6",
}: {
  data: { label: string; value: number; pct: number }[];
  color?: string;
}) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2.5 text-[12px]">
          <span className="text-muted-foreground/70 w-28 shrink-0 text-right truncate">
            {d.label}
          </span>
          <div
            className="flex-1 h-3 overflow-hidden bg-white/[0.03]"
            style={{ borderRadius: 2 }}
          >
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${d.pct}%`,
                backgroundColor: color,
                opacity: 0.65,
                borderRadius: 2,
              }}
            />
          </div>
          <span className="text-muted-foreground/50 w-14 text-right font-[family-name:var(--font-geist-mono)] text-[11px]">
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
      <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-foreground/90">
        {value}
      </p>
      <p className="text-[12px] text-muted-foreground/60 mt-0.5">{label}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground/40 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ── Superlative card ──
interface SuperlativeMovie {
  t: string;
  y: number;
  v: string;
  va: number;
  co: number;
  conv: number;
  ab: number;
}

function Superlative({
  label,
  movie,
  stat,
  color,
}: {
  label: string;
  movie: SuperlativeMovie;
  stat: string;
  color: string;
}) {
  return (
    <div
      className={cn("border p-4", SURFACE, R)}
      style={{ borderColor: `${color}33` }}
    >
      <p
        className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-2"
        style={{ color }}
      >
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] font-bold text-foreground/90 text-sm">
        {movie.t}{" "}
        <span className="text-muted-foreground/50 font-normal">
          ({movie.y})
        </span>
      </p>
      <p className="text-xs italic text-muted-foreground/60 mt-1 line-clamp-2">
        &ldquo;{movie.v}&rdquo;
      </p>
      <p className="text-[11px] text-muted-foreground/50 mt-1 font-[family-name:var(--font-geist-mono)]">
        {stat}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { data: scatterMovies, loading: scatterLoading } = useScatterData();
  const { stats, loading: statsLoading } = useDashboardStats();

  const loading = scatterLoading || statsLoading;

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse text-muted-foreground/30">
            {"◎"}
          </div>
          <p className="text-sm text-muted-foreground/60">
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
            {stats.n.toLocaleString()} movies across 18 mood dimensions,
            1888 to 2026.
          </p>
        </Reveal>
      </div>

      {/* Mood Map */}
      <Reveal delay={100}>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-2">
            MOOD MAP
          </p>
          <p className="text-[13px] text-muted-foreground/60 mb-4">
            Every movie as a point in valence x arousal space. Colored by primary genre. Hover for details.
          </p>
          <MoodMap movies={scatterMovies} />
        </div>
      </Reveal>

      {/* Fun facts */}
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FBBF24] mb-2">
            DID YOU KNOW
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            Patterns hiding in 30,000 movies.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E91E8C] mb-3">THE SOLO GAP</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">0.71</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Valence gap between solo and friends movies. Films meant for watching alone
                average negative valence (-0.18). Friends movies average +0.53. Solitude seeks darkness.
              </p>
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B5CF6] mb-3">THE SADNESS PARADOX</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">1,250</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Movies that are both deeply unpleasant (valence below -0.3) and deeply
                meaningful (eudaimonic above 0.8). People seek suffering for meaning.
              </p>
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-3">HOLLYWOOD GOT SOFTER</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">19% to 10%</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Devastating endings in the 1970s vs 2020s. Meanwhile bittersweet endings
                rose from 21% to 27%. Cinema learned to hurt gently.
              </p>
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-3">MASTERPIECES THAT HURT</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">103</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Films rated 8+ on TMDB with comfort below 0.3. Se7en, Schindler&rsquo;s List,
                Whiplash, Alien. The best movies often aren&rsquo;t the easiest to watch.
              </p>
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-3">MOST ABSORBING GENRE</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">Mystery</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Not action, not thriller. Mystery films score highest average absorption (0.69).
                The need to solve keeps you locked in more than any explosion.
              </p>
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FF6B6B] mb-3">BAD DATE PICKS</p>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">659</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Movies tagged as good for date night that end devastatingly.
                Somebody&rsquo;s evening went sideways.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Bento: Distributions */}
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-2">
            DISTRIBUTIONS
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            How movies break down.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={cn("border p-5 lg:col-span-2", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1ED760] mb-4">
                EMOTIONAL ARCS
              </p>
              <BarChart data={stats.arcs} color="#1ED760" />
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-4">
                PACING
              </p>
              <BarChart data={stats.pacings} color="#38BDF8" />
            </div>
            <div className={cn("border p-5", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E91E8C] mb-4">
                ENDING TYPES
              </p>
              <BarChart data={stats.endings} color="#E91E8C" />
            </div>
            <div className={cn("border p-5 lg:col-span-2", SURFACE, BORDER, R)}>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">
                TOP GENRES
              </p>
              <BarChart data={stats.genres} color="#F97316" />
            </div>
          </div>
        </div>
      </Reveal>

      {/* Insight Charts (recharts-based, pre-computed) */}
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#38BDF8] mb-2">
            INSIGHTS
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            Cross-dimensional analysis.
          </h2>
          <InsightCharts />
        </div>
      </Reveal>

      {/* Landing page charts (pre-computed) */}
      <BentoAnalytics embedded />

      {/* Dataset averages */}
      <Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <StatCard
            label="Avg Valence"
            value={stats.avgV.toFixed(2)}
            sub="Slightly positive; cinema trends toward hope"
          />
          <StatCard
            label="Avg Arousal"
            value={stats.avgA.toFixed(2)}
            sub="Moderate-high; movies are engaging"
          />
          <StatCard
            label="Avg Comfort"
            value={stats.avgComfort.toFixed(2)}
            sub="Moderate; cinema challenges as much as it comforts"
          />
          <StatCard
            label="Avg Conversation"
            value={stats.avgConv.toFixed(2)}
            sub="People want to talk about movies"
          />
        </div>
      </Reveal>

      {/* Extremes */}
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FF6B6B] mb-2">
            EXTREMES
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            Notable outliers in the dataset.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
