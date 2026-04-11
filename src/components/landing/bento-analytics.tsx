"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TOKENS } from "./landing-data";
import { Reveal } from "./reveal";
import {
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ArrowUpRight } from "lucide-react";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

// ── Pre-computed data (from 30,611 movies) ──

const ARC_DATA = [
  { name: "Man in a Hole", value: 19745, color: "#8B5CF6", desc: "Fall then recovery" },
  { name: "Oedipus", value: 5307, color: "#E91E8C", desc: "Rise concealing a fall" },
  { name: "Riches to Rags", value: 1861, color: "#FF6B6B", desc: "Steady decline" },
  { name: "Icarus", value: 1192, color: "#F97316", desc: "Rise then collapse" },
  { name: "Rags to Riches", value: 933, color: "#1ED760", desc: "Steady ascent" },
  { name: "Steady", value: 773, color: "#38BDF8", desc: "Flat emotional line" },
  { name: "Cinderella", value: 396, color: "#FBBF24", desc: "Rise after long suffering" },
];

const ENDINGS_DATA = [
  { name: "Bittersweet", value: 8338, color: "#8B5CF6" },
  { name: "Triumphant", value: 6855, color: "#1ED760" },
  { name: "Devastating", value: 4155, color: "#E91E8C" },
  { name: "Unsettling", value: 3475, color: "#F97316" },
  { name: "Uplifting", value: 3426, color: "#38BDF8" },
  { name: "Ambiguous", value: 2637, color: "#FBBF24" },
  { name: "Twist", value: 1666, color: "#FF6B6B" },
];

const COMFORT_CONVERSATION = [
  { label: "Harrowing", conversation: 0.765 },
  { label: "Uneasy", conversation: 0.754 },
  { label: "Mixed", conversation: 0.687 },
  { label: "Comfortable", conversation: 0.596 },
  { label: "Cozy", conversation: 0.498 },
];

const GENRE_ENDINGS = [
  {
    genre: "Comedy",
    triumphant: 33,
    bittersweet: 25,
    uplifting: 24,
    unsettling: 5,
    devastating: 4,
    other: 9,
  },
  {
    genre: "Drama",
    bittersweet: 38,
    devastating: 21,
    triumphant: 12,
    unsettling: 11,
    uplifting: 8,
    other: 10,
  },
  {
    genre: "Horror",
    unsettling: 32,
    devastating: 18,
    ambiguous: 16,
    bittersweet: 11,
    triumphant: 11,
    other: 12,
  },
  {
    genre: "Action",
    triumphant: 43,
    bittersweet: 23,
    ambiguous: 12,
    devastating: 9,
    twist: 6,
    other: 7,
  },
  {
    genre: "Romance",
    bittersweet: 39,
    uplifting: 20,
    triumphant: 15,
    devastating: 14,
    unsettling: 4,
    other: 8,
  },
];

const RUNTIME_ABSORPTION = [
  { runtime: "<30m", absorption: 0.5 },
  { runtime: "30–60m", absorption: 0.55 },
  { runtime: "60–90m", absorption: 0.538 },
  { runtime: "90–120m", absorption: 0.589 },
  { runtime: "120–150m", absorption: 0.664 },
  { runtime: "150–180m", absorption: 0.662 },
  { runtime: "3h+", absorption: 0.711 },
];

// ── Shared tile components ──

function Tile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border p-5",
        SURFACE,
        BORDER,
        R,
        className
      )}
    >
      {children}
    </div>
  );
}

function TileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
      {children}
    </p>
  );
}

function TileTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight mb-4">
      {children}
    </p>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArcLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, name, percent } = props as {
    cx: number;
    cy: number;
    midAngle: number;
    outerRadius: number;
    name: string;
    percent: number;
  };
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#bbb"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "oklch(0.14 0 0)",
    border: "1px solid oklch(0.25 0 0)",
    borderRadius: 4,
    fontSize: 12,
  },
  labelStyle: { color: "#bbb" },
};

const ENDING_COLORS: Record<string, string> = {
  bittersweet: "#8B5CF6",
  triumphant: "#1ED760",
  devastating: "#E91E8C",
  unsettling: "#F97316",
  uplifting: "#38BDF8",
  ambiguous: "#FBBF24",
  twist: "#FF6B6B",
  other: "#444",
};

const ENDING_KEYS = [
  "triumphant",
  "bittersweet",
  "devastating",
  "unsettling",
  "uplifting",
  "ambiguous",
  "twist",
  "other",
] as const;

// ── Main component ──

export function BentoAnalytics({ embedded = false }: { embedded?: boolean }) {
  const totalEndings = ENDINGS_DATA.reduce((s, d) => s + d.value, 0);

  const grid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* ── 1. Story Shapes — all 7 arcs ── */}
          <Reveal>
            <Tile className="h-full min-h-[280px]">
              <TileLabel>STORY SHAPES</TileLabel>
              <TileTitle>64% of films follow one arc.</TileTitle>
              <div className="h-[210px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ARC_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius="38%"
                      outerRadius="54%"
                      dataKey="value"
                      stroke="none"
                      label={ArcLabel}
                      isAnimationActive={false}
                    >
                      {ARC_DATA.map((d) => (
                        <Cell key={d.name} fill={d.color} fillOpacity={0.8} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof ARC_DATA)[number];
                        return (
                          <div
                            style={{
                              background: "oklch(0.14 0 0)",
                              border: "1px solid oklch(0.25 0 0)",
                              borderRadius: 4,
                              padding: "8px 10px",
                              fontSize: 12,
                            }}
                          >
                            <p style={{ color: d.color, fontWeight: 600, marginBottom: 2 }}>
                              {d.name}
                            </p>
                            <p style={{ color: "#bbb", marginBottom: 4 }}>
                              {d.desc}
                            </p>
                            <p style={{ color: "#999" }}>
                              {d.value.toLocaleString()} films
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Tile>
          </Reveal>

          {/* ── 2. How Movies End ── */}
          <Reveal delay={50}>
            <Tile className="h-full min-h-[280px]">
              <TileLabel>HOW MOVIES END</TileLabel>
              <TileTitle>Bittersweet wins. Always.</TileTitle>
              <div className="space-y-[10px] mt-2">
                {ENDINGS_DATA.map((d) => (
                  <div key={d.name} className="flex items-center gap-2.5">
                    <span className="text-[11px] text-muted-foreground/80 w-[76px] shrink-0 text-right">
                      {d.name}
                    </span>
                    <div className="flex-1 h-4 bg-[oklch(0.16_0_0)] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: `${(d.value / totalEndings) * 100}%`,
                          background: d.color,
                          opacity: 0.75,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 w-[34px] tabular-nums">
                      {((d.value / totalEndings) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </Tile>
          </Reveal>

          {/* ── 3. Discomfort vs Discussion ── */}
          <Reveal delay={100}>
            <Tile className="h-full min-h-[280px]">
              <TileLabel>DISCOMFORT vs DISCUSSION</TileLabel>
              <TileTitle>Uncomfortable films spark conversation.</TileTitle>
              <div className="space-y-3.5 mt-3">
                {COMFORT_CONVERSATION.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted-foreground/80">
                        {d.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                        {(d.conversation * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-[oklch(0.16_0_0)] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: `${d.conversation * 100}%`,
                          background: `linear-gradient(90deg, #E91E8C, #F97316)`,
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-4">
                Harrowing films average 53% more conversation potential than cozy ones.
              </p>
            </Tile>
          </Reveal>

          {/* ── 4. How Genres End (stacked bar) ── */}
          <Reveal delay={150}>
            <Tile className="h-full min-h-[280px]">
              <TileLabel>HOW GENRES END</TileLabel>
              <TileTitle>Every genre has a signature exit.</TileTitle>
              <div className="h-[170px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={GENRE_ENDINGS}
                    margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                  >
                    <XAxis
                      dataKey="genre"
                      tick={{ fontSize: 11, fill: "#999" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(value, name) => [
                        `${value}%`,
                        String(name).charAt(0).toUpperCase() +
                          String(name).slice(1),
                      ]}
                    />
                    {ENDING_KEYS.map((key) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="endings"
                        fill={ENDING_COLORS[key]}
                        fillOpacity={0.75}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {Object.entries(ENDING_COLORS)
                  .filter(([k]) => k !== "other")
                  .map(([name, color]) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 text-[9px] text-muted-foreground/60"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-[1px]"
                        style={{ background: color }}
                      />
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </span>
                  ))}
              </div>
            </Tile>
          </Reveal>

          {/* ── 5. Runtime vs Absorption ── */}
          <Reveal delay={200}>
            <Tile className="h-full min-h-[280px]">
              <TileLabel>RUNTIME vs ATTENTION</TileLabel>
              <TileTitle>Longer films earn your focus.</TileTitle>
              <div className="h-[170px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={RUNTIME_ABSORPTION}
                    margin={{ top: 4, right: 12, bottom: 0, left: 12 }}
                  >
                    <defs>
                      <linearGradient
                        id="gRuntime"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="runtime"
                      tick={{ fontSize: 10, fill: "#999" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0.45, 0.75]} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(value) => [
                        `${(Number(value) * 100).toFixed(0)}%`,
                        "Avg. Absorption",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="absorption"
                      stroke="url(#gRuntime)"
                      strokeWidth={2.5}
                      dot={{
                        fill: "#8B5CF6",
                        r: 3.5,
                        stroke: "none",
                      }}
                      activeDot={{
                        fill: "#8B5CF6",
                        r: 5,
                        stroke: "#fff",
                        strokeWidth: 1,
                      }}
                      name="Absorption"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                3+ hour films score 42% higher in absorption than shorts.
              </p>
            </Tile>
          </Reveal>

          {/* ── 6. CTA ── */}
          <Reveal delay={250}>
            <Tile className="h-full min-h-[280px] flex flex-col justify-between">
              <div>
                <TileLabel>EXPLORE</TileLabel>
                <TileTitle>Search by mood, not title.</TileTitle>
                <p className="text-[12px] text-muted-foreground/60 leading-relaxed mt-2">
                  Filter 30,611 movies by pacing, ending type, watch context,
                  and comfort level. Every card shows the full mood profile.
                </p>
              </div>
              <Link
                href="/explore"
                className={cn(
                  "mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-wide border transition-all duration-150",
                  "text-[#1ED760] hover:bg-[#1ED760]/5 active:scale-[0.97]",
                  BORDER,
                  R
                )}
              >
                Browse movies
                <ArrowUpRight size={14} />
              </Link>
            </Tile>
          </Reveal>
        </div>
  );

  if (embedded) {
    return (
      <Reveal>
        <div className="mb-16">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FF6B6B] mb-2">
            BY THE NUMBERS
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tracking-tight mb-6">
            Pre-computed mood insights.
          </h2>
          {grid}
        </div>
      </Reveal>
    );
  }

  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FF6B6B] mb-3">
            BY THE NUMBERS
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[2rem] tracking-tight mb-3 max-w-xl">
            What 30,611 movies feel like, by the numbers.
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl">
            Every film scored across valence, arousal, comfort, pacing, emotional
            arc, and more. Here&rsquo;s what the data looks like at scale.
          </p>
        </Reveal>
        {grid}
      </div>
    </section>
  );
}
