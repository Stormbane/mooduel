"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DATA_FIELDS, POSTER_MAP, GODFATHER_POSTER, TOKENS } from "./landing-data";
import { Accordion } from "./accordion";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

// ── JSON line (single field row in the right panel) ──
function JsonLine({
  fieldKey,
  value,
  color,
  isActive,
  isLast,
  onClick,
}: {
  fieldKey: string;
  value: string;
  color: string;
  isActive: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "px-3 py-[2px] cursor-pointer transition-colors duration-150 border-l-2",
        isActive
          ? "bg-white/[0.04] border-l-current"
          : "border-l-transparent hover:bg-white/[0.02]",
      )}
      style={isActive ? { borderLeftColor: color } : undefined}
      onClick={onClick}
    >
      <span className="text-[#38BDF8]/70">&quot;{fieldKey}&quot;</span>
      <span className="text-muted-foreground/30">: </span>
      <span
        style={{ color: isActive ? color : undefined, wordBreak: "break-word" }}
        className={!isActive ? "text-muted-foreground/60" : undefined}
      >
        {value}
      </span>
      {!isLast && <span className="text-muted-foreground/20">,</span>}
    </div>
  );
}

// ── Main data explorer ──
export function DataExplorer({ focusIdx }: { focusIdx: number | null }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const active = DATA_FIELDS[activeIdx];
  const duration = 8000;

  // External focus from dimension chips
  useEffect(() => {
    if (focusIdx !== null && focusIdx >= 0 && focusIdx < DATA_FIELDS.length) {
      setActiveIdx(focusIdx);
      setPaused(true);
      setProgressKey((k) => k + 1);
    }
  }, [focusIdx]);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setActiveIdx((i) => (i + 1) % DATA_FIELDS.length);
      setProgressKey((k) => k + 1);
    }, duration);
    return () => clearTimeout(t);
  }, [activeIdx, paused, progressKey]);

  const goTo = useCallback((idx: number, pause: boolean) => {
    setActiveIdx(idx);
    setProgressKey((k) => k + 1);
    if (pause) setPaused(true);
  }, []);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      setProgressKey((k) => k + 1);
    } else {
      setPaused(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-stretch">
      {/* Left panel — explanation */}
      <div className={cn("border p-6 flex flex-col", SURFACE, BORDER, R)}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <p
            className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3"
            style={{ color: active.color }}
          >
            {active.label}
          </p>
          <div className="mb-1">
            <span className="font-[family-name:var(--font-display)] font-bold text-xl text-foreground">
              <span className="font-[family-name:var(--font-geist-mono)]">
                {active.key}
              </span>
              <span className="text-muted-foreground/40 mx-2">:</span>
            </span>
            <span
              className="font-[family-name:var(--font-geist-mono)] font-bold text-sm"
              style={{ color: active.color, wordBreak: "break-word" }}
            >
              {active.value}
            </span>
          </div>
          {/* Description */}
          <p className="text-sm text-muted-foreground/70 leading-relaxed mt-4">
            {active.descShort}
          </p>

          {/* Range */}
          <div className="mt-3">
            {active.rangeType === "scale" && (
              <div className="text-xs">
                <span className="text-muted-foreground/40">Range: </span>
                <span
                  className="font-[family-name:var(--font-geist-mono)] font-bold"
                  style={{ color: active.color }}
                >
                  {active.rangeMin}
                </span>
                <span className="text-muted-foreground/30 mx-1">
                  ({active.rangeMinLabel})
                </span>
                <span className="text-muted-foreground/40"> to </span>
                <span
                  className="font-[family-name:var(--font-geist-mono)] font-bold"
                  style={{ color: active.color }}
                >
                  {active.rangeMax}
                </span>
                <span className="text-muted-foreground/30 mx-1">
                  ({active.rangeMaxLabel})
                </span>
              </div>
            )}
            {active.rangeType === "enum" && active.enumValues && (
              <div>
                <p className="text-xs text-muted-foreground/40 mb-1.5">
                  Possible values:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {active.enumValues.map((ev) => (
                    <div key={ev.value} className="text-[11px] flex items-baseline gap-1.5">
                      <span
                        className="font-[family-name:var(--font-geist-mono)] font-bold shrink-0"
                        style={{
                          color:
                            ev.value ===
                            active.value.replace(/"/g, "")
                              ? active.color
                              : undefined,
                        }}
                      >
                        {ev.value}
                      </span>
                      <span className="text-muted-foreground/30">
                        {ev.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {active.rangeType === "freeform" && (
              <p className="text-xs text-muted-foreground/30 italic">
                Free-form {active.value.startsWith("[") ? "array" : "text"}, no
                fixed vocabulary
              </p>
            )}
          </div>

          {/* Godfather justification */}
          <p className="text-sm text-foreground/60 leading-relaxed mt-3">
            {active.justification}
          </p>

          {/* Research */}
          <div className="mt-4">
            <Accordion title="Research" small defaultOpen titleClassName="text-sm text-[#FBBF24]/70">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground/70">
                  {active.source}
                </p>
                <p className="text-xs text-muted-foreground/50 leading-relaxed">
                  {active.sourceDetail}
                </p>
                {active.sourceUrl && (
                  <a
                    href={active.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] text-[#38BDF8]/70 hover:text-[#38BDF8] hover:underline mt-1 transition-colors duration-150"
                  >
                    Source &rarr;
                  </a>
                )}
              </div>
            </Accordion>
          </div>

          {/* Examples */}
          {active.examples.length > 0 && (
            <div className="mt-1">
              <Accordion title="Examples" small defaultOpen titleClassName="text-sm text-[#38BDF8]/70">
                {active.comparison && (
                  <p className="text-[11px] text-muted-foreground/50 leading-relaxed mb-3 italic">
                    {active.comparison}
                  </p>
                )}
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {active.examples.map((ex) => {
                      const poster = POSTER_MAP[ex.movie];
                      return (
                        <tr key={ex.movie} className="align-top">
                          {/* Poster */}
                          <td className="w-8 pr-2.5 py-1.5">
                            <div className="w-8 h-12 rounded-[2px] overflow-hidden bg-white/[0.03]">
                              {poster && (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${poster}`}
                                  alt={ex.movie}
                                  width={32}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          </td>
                          {/* Movie */}
                          <td className="py-1.5 pr-3">
                            <p className="font-medium text-foreground/80 leading-tight">
                              {ex.movie}{" "}
                              <span className="text-[10px] text-muted-foreground/50">
                                {ex.year}
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/45 mt-0.5 leading-relaxed">
                              {ex.note}
                            </p>
                          </td>
                          {/* Value */}
                          <td
                            className="py-1.5 text-right font-[family-name:var(--font-geist-mono)] font-bold"
                            style={{ color: active.color }}
                          >
                            {ex.value}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Accordion>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4">
          <div
            className="h-[2px] w-full bg-white/5 overflow-hidden"
            style={{ borderRadius: 1 }}
          >
            <div
              key={`${activeIdx}-${progressKey}`}
              className="h-full carousel-progress"
              style={
                {
                  "--progress-duration": `${duration}ms`,
                  animationPlayState: paused ? "paused" : "running",
                  backgroundColor: active.color,
                } as React.CSSProperties
              }
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground/30">
            <span className="font-[family-name:var(--font-geist-mono)]">
              {activeIdx + 1}/{DATA_FIELDS.length}
            </span>
            <button
              onClick={togglePause}
              className="hover:text-muted-foreground transition-colors duration-150 p-1"
            >
              {paused ? "\u25B6" : "\u275A\u275A"}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — JSON */}
      <div
        className={cn(
          "border font-[family-name:var(--font-geist-mono)] text-[13px] leading-relaxed overflow-hidden flex flex-col",
          SURFACE,
          BORDER,
          R,
        )}
      >
        <div
          className={cn(
            "px-4 py-3 border-b flex items-center justify-between",
            BORDER,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-8 h-12 rounded-[2px] overflow-hidden">
              <Image
                src={`https://image.tmdb.org/t/p/w92${GODFATHER_POSTER}`}
                alt="The Godfather"
                width={32}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-[family-name:var(--font-display)] font-bold text-sm">
                The Godfather
              </span>
              <span className="text-muted-foreground/30 text-xs ml-2">
                1972
              </span>
            </div>
          </div>
          {paused && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase text-[#FBBF24]/60">
                PAUSED
              </span>
              <button
                onClick={togglePause}
                className="text-[#FBBF24]/60 hover:text-[#FBBF24] transition-colors duration-150 text-xs"
              >
                {"\u25B6"}
              </button>
            </div>
          )}
        </div>
        <div className="py-2 overflow-y-auto flex-1" data-json-panel>
          <div className="px-3 text-muted-foreground/20">{"{"}</div>
          {DATA_FIELDS.map((f, i) => (
            <JsonLine
              key={f.key}
              fieldKey={f.key}
              value={f.value}
              color={f.color}
              isActive={i === activeIdx}
              isLast={i === DATA_FIELDS.length - 1}
              onClick={() => {
                if (paused && activeIdx === i) {
                  setPaused(false);
                  setProgressKey((k) => k + 1);
                } else {
                  goTo(i, true);
                }
              }}
            />
          ))}
          <div className="px-3 text-muted-foreground/20">{"}"}</div>
        </div>
      </div>
    </div>
  );
}
