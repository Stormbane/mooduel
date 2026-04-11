"use client";

import { cn } from "@/lib/utils";
import { TOKENS } from "@/components/landing/landing-data";
import {
  XAxis,
  YAxis,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

// ── Pre-computed data (from 30,611 movies) ──

const DECADE_DOMINANCE = [
  { decade: "'50s", dominance: 0.165, absorption: 0.624 },
  { decade: "'60s", dominance: 0.159, absorption: 0.631 },
  { decade: "'70s", dominance: 0.151, absorption: 0.602 },
  { decade: "'80s", dominance: 0.224, absorption: 0.567 },
  { decade: "'90s", dominance: 0.270, absorption: 0.575 },
  { decade: "'00s", dominance: 0.224, absorption: 0.585 },
  { decade: "'10s", dominance: 0.233, absorption: 0.589 },
  { decade: "'20s", dominance: 0.248, absorption: 0.613 },
];

const EMOTIONS_DATA = [
  { name: "Anticipation", value: 16198, color: "#F97316" },
  { name: "Sadness", value: 14141, color: "#8B5CF6" },
  { name: "Fear", value: 10727, color: "#E91E8C" },
  { name: "Joy", value: 10559, color: "#FBBF24" },
  { name: "Anger", value: 9407, color: "#FF6B6B" },
  { name: "Trust", value: 7266, color: "#1ED760" },
  { name: "Surprise", value: 6578, color: "#38BDF8" },
  { name: "Disgust", value: 4228, color: "#F97316" },
];

const DECADE_TRENDS = [
  { decade: "'60s", valence: 0.03, arousal: 0.53 },
  { decade: "'70s", valence: -0.02, arousal: 0.57 },
  { decade: "'80s", valence: 0.08, arousal: 0.58 },
  { decade: "'90s", valence: 0.13, arousal: 0.58 },
  { decade: "'00s", valence: 0.08, arousal: 0.56 },
  { decade: "'10s", valence: 0.08, arousal: 0.55 },
  { decade: "'20s", valence: 0.10, arousal: 0.57 },
];

const RATING_MEANING = [
  { label: "2–3", meaning: 0.304 },
  { label: "3–4", meaning: 0.375 },
  { label: "4–5", meaning: 0.431 },
  { label: "5–6", meaning: 0.496 },
  { label: "6–7", meaning: 0.584 },
  { label: "7–8", meaning: 0.683 },
  { label: "8–9", meaning: 0.736 },
];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "oklch(0.14 0 0)",
    border: "1px solid oklch(0.25 0 0)",
    borderRadius: 4,
    fontSize: 12,
  },
  labelStyle: { color: "#bbb" },
};

const MAX_EMOTION = EMOTIONS_DATA[0].value;

export function InsightCharts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Control & Immersion ── */}
      <div className={cn("border p-5", SURFACE, BORDER, R)}>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
          CONTROL & IMMERSION
        </p>
        <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight mb-4">
          The &rsquo;70s left audiences powerless.
        </p>
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={DECADE_DOMINANCE}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
            >
              <defs>
                <linearGradient id="gDom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAbs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="decade"
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0.1, 0.7]} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="dominance"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#gDom)"
                name="Dominance"
              />
              <Area
                type="monotone"
                dataKey="absorption"
                stroke="#FBBF24"
                strokeWidth={2}
                fill="url(#gAbs)"
                name="Absorption"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <span className="inline-block w-3 h-0.5 bg-[#8B5CF6]" />
            Dominance
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <span className="inline-block w-3 h-0.5 bg-[#FBBF24]" />
            Absorption
          </span>
        </div>
      </div>

      {/* ── Emotional Climate ── */}
      <div className={cn("border p-5", SURFACE, BORDER, R)}>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
          EMOTIONAL CLIMATE
        </p>
        <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight mb-4">
          Peak feel-good: the &rsquo;90s.
        </p>
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={DECADE_TRENDS}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
            >
              <defs>
                <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E91E8C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#E91E8C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="decade"
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[-0.1, 0.7]} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="valence"
                stroke="#E91E8C"
                strokeWidth={2}
                fill="url(#gVal)"
                name="Valence"
              />
              <Area
                type="monotone"
                dataKey="arousal"
                stroke="#38BDF8"
                strokeWidth={2}
                fill="url(#gAr)"
                name="Arousal"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <span className="inline-block w-3 h-0.5 bg-[#E91E8C]" />
            Valence
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <span className="inline-block w-3 h-0.5 bg-[#38BDF8]" />
            Arousal
          </span>
        </div>
      </div>

      {/* ── Dominant Emotions ── */}
      <div className={cn("border p-5", SURFACE, BORDER, R)}>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
          DOMINANT EMOTIONS
        </p>
        <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight mb-4">
          Anticipation runs cinema.
        </p>
        <div className="space-y-[9px]">
          {EMOTIONS_DATA.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span className="text-[12px] text-muted-foreground/80 w-[86px] shrink-0 text-right">
                {d.name}
              </span>
              <div className="flex-1 h-4 bg-[oklch(0.16_0_0)] rounded-[2px] overflow-hidden">
                <div
                  className="h-full rounded-[2px]"
                  style={{
                    width: `${(d.value / MAX_EMOTION) * 100}%`,
                    background: d.color,
                    opacity: 0.75,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground/60 w-[40px] tabular-nums">
                {(d.value / 1000).toFixed(1)}k
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rating vs Meaning ── */}
      <div className={cn("border p-5", SURFACE, BORDER, R)}>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
          RATING vs MEANING
        </p>
        <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight mb-4">
          Great movies mean something.
        </p>
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={RATING_MEANING}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
            >
              <defs>
                <linearGradient id="gMeaning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ED760" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#1ED760" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 0.85]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value) => [
                  `${(Number(value) * 100).toFixed(0)}%`,
                  "Eudaimonic",
                ]}
                labelFormatter={(label) => `TMDB Rating: ${label}`}
              />
              <Bar
                dataKey="meaning"
                fill="url(#gMeaning)"
                radius={[2, 2, 0, 0]}
                name="Meaning"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-2">
          Eudaimonic value by TMDB rating. 8-9 rated films score 2.4x higher
          than 2-3 rated.
        </p>
      </div>
    </div>
  );
}
