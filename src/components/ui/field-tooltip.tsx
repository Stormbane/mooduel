"use client";

import { DATA_FIELDS } from "@/components/landing/landing-data";

const fieldMap = new Map(DATA_FIELDS.map((f) => [f.key, f]));

export function FieldTooltip({
  fieldKey,
  children,
  as: Tag = "span",
  className,
}: {
  fieldKey: string;
  children: React.ReactNode;
  as?: "span" | "div";
  className?: string;
}) {
  const field = fieldMap.get(fieldKey);
  if (!field) return <>{children}</>;

  const rangeText =
    field.rangeType === "scale"
      ? `${field.rangeMin} to ${field.rangeMax}`
      : field.rangeType === "enum" && field.enumValues
        ? field.enumValues.map((v) => v.value).join(", ")
        : "free-form";

  return (
    <Tag className={`relative group/tip ${Tag === "span" ? "inline-flex" : ""} ${className || ""}`}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[280px] rounded-[4px] border border-[oklch(0.25_0_0)] bg-[oklch(0.08_0_0)] px-3 py-2.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg">
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
      </span>
    </Tag>
  );
}
