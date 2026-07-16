"use client";

import { apiUrl } from "@/lib/games/client/api";
import { useCallback, useState } from "react";
import { accentTextColor, type SharePayload } from "@/components/game-shell/types";

interface ShareButtonProps {
  game: string;
  payload: SharePayload;
  /** Accent colour for the button. */
  accent: string;
  /** Default: "Share". */
  label?: string;
  /** Intent text prefilled into share dialogs ("I got ... on Mooduel"). */
  intent: string;
}

type Phase = "idle" | "creating" | "copied" | "error";

/**
 * Generates a share URL via /api/share and copies it to the clipboard.
 * Falls back to the Web Share API on mobile if available.
 */
export function ShareButton({
  game,
  payload,
  accent,
  label = "Share",
  intent,
}: ShareButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  const handleShare = useCallback(async () => {
    setPhase("creating");
    try {
      const res = await fetch(apiUrl("/api/share"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, payload }),
      });
      if (!res.ok) throw new Error(`share failed: ${res.status}`);
      const { url } = (await res.json()) as { url: string };
      const fullUrl = `${window.location.origin}${url}`;

      // Prefer native share on mobile
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Mooduel", text: intent, url: fullUrl });
          setPhase("idle");
          return;
        } catch {
          // User cancelled — fall through to clipboard
        }
      }

      await navigator.clipboard.writeText(`${intent} ${fullUrl}`);
      setPhase("copied");
      setTimeout(() => setPhase("idle"), 2200);
    } catch (err) {
      console.error("[share] failed", err);
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2200);
    }
  }, [game, payload, intent]);

  const text =
    phase === "creating" ? "Creating..." :
    phase === "copied" ? "Link copied" :
    phase === "error" ? "Something went wrong" :
    label;

  return (
    <button
      onClick={handleShare}
      disabled={phase === "creating"}
      className="rounded-[4px] px-5 py-2.5 text-sm font-semibold tracking-wide transition-transform duration-100 hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
      style={{ backgroundColor: accent, color: accentTextColor(accent) }}
    >
      {text}
    </button>
  );
}
