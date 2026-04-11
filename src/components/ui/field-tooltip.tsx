"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { DATA_FIELDS } from "@/components/landing/landing-data";

const fieldMap = new Map(DATA_FIELDS.map((f) => [f.key, f]));

export function FieldTooltip({
  fieldKey,
  children,
  value,
  as = "span",
  className,
}: {
  fieldKey: string;
  children: React.ReactNode;
  /** Actual value to show at the top of the tooltip (e.g. "building", "0.42") */
  value?: string;
  as?: "span" | "div";
  className?: string;
}) {
  const field = fieldMap.get(fieldKey);
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleEnter = useCallback(() => {
    if (!ref.current || !field) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShow(true);
  }, [field]);

  const handleLeave = useCallback(() => setShow(false), []);

  if (!field) return <>{children}</>;

  const rangeText =
    field.rangeType === "scale"
      ? `${field.rangeMin} to ${field.rangeMax}`
      : field.rangeType === "enum" && field.enumValues
        ? field.enumValues.map((v) => v.value).join(", ")
        : "free-form";

  // Resolve enum label if value matches an enum entry
  let displayValue = value;
  if (value && field.rangeType === "enum" && field.enumValues) {
    const match = field.enumValues.find((v) => v.value === value);
    if (match) displayValue = `${value}: ${match.label}`;
  }

  return (
    <div
      ref={ref}
      className={`${as === "span" ? "inline-flex" : ""} ${className || ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="mb-2 w-max max-w-[300px] rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.08_0_0)] px-3 py-2.5 shadow-lg">
              {/* Actual value */}
              {displayValue && (
                <span className="block text-[11px] font-semibold mb-1.5 leading-snug" style={{ color: field.color }}>
                  {field.label}: {displayValue}
                </span>
              )}

              {/* Description */}
              <span className="block text-[11px] text-foreground/80 leading-snug">
                {field.descShort}
              </span>

              {/* Range */}
              <span className="block text-[10px] mt-1.5 font-[family-name:var(--font-geist-mono)]">
                <span className="text-muted-foreground/35">Range: </span>
                <span style={{ color: field.color }}>{rangeText}</span>
              </span>

              {/* Divider + Source */}
              <span className="block h-px bg-[oklch(0.2_0_0)] my-1.5" />
              <span className="block text-[9px] text-muted-foreground/40 italic leading-snug">
                {field.source}
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
