"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TOKENS } from "./landing-data";

export function Accordion({
  title,
  children,
  defaultOpen = false,
  small = false,
  titleClassName,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  small?: boolean;
  titleClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0,
  );

  // Recalculate when toggled
  useEffect(() => {
    if (contentRef.current)
      setHeight(open ? contentRef.current.scrollHeight : 0);
  }, [open]);

  // Recalculate when content resizes (e.g. carousel field change)
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    const obs = new ResizeObserver(() => {
      setHeight(el.scrollHeight);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [open]);

  return (
    <div className={cn(!small && "border-b", !small && TOKENS.border)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between text-left group",
          small ? "py-2" : "py-4",
        )}
      >
        <span
          className={cn(
            "font-semibold group-hover:text-foreground transition-colors duration-150",
            titleClassName
              ? titleClassName
              : small
                ? "text-xs text-muted-foreground/50"
                : "font-[family-name:var(--font-display)] text-sm text-foreground/90",
          )}
        >
          {title}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-muted-foreground/40 shrink-0 transition-transform duration-200"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[height] duration-250"
        style={{
          height: height !== undefined ? `${height}px` : "auto",
          transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
        }}
      >
        <div ref={contentRef} className={small ? "pb-2" : "pb-4"}>
          {children}
        </div>
      </div>
    </div>
  );
}
