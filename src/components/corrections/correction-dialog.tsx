"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { TOKENS } from "@/components/landing/landing-data";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

interface CorrectionField {
  key: string;
  label: string;
  type: "numeric" | "enum" | "text";
  range?: { min: number; max: number; step: number };
  enumValues?: string[];
  getValue: (m: SlimMoodMovie) => string | number;
}

const CORRECTABLE_FIELDS: CorrectionField[] = [
  { key: "valence", label: "Valence", type: "numeric", range: { min: -1, max: 1, step: 0.05 }, getValue: (m) => m.va },
  { key: "arousal", label: "Arousal", type: "numeric", range: { min: -1, max: 1, step: 0.05 }, getValue: (m) => m.ar },
  { key: "dominance", label: "Dominance", type: "numeric", range: { min: -1, max: 1, step: 0.05 }, getValue: (m) => m.do },
  { key: "comfort_level", label: "Comfort", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.co },
  { key: "absorption", label: "Absorption", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.ab },
  { key: "hedonic", label: "Hedonic", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.he },
  { key: "eudaimonic", label: "Eudaimonic", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.eu },
  { key: "psych_rich", label: "Psych. Rich", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.pr },
  { key: "conversation_potential", label: "Conversation", type: "numeric", range: { min: 0, max: 1, step: 0.05 }, getValue: (m) => m.conv },
  { key: "pacing", label: "Pacing", type: "enum", enumValues: ["slow-burn", "building", "steady", "relentless", "episodic"], getValue: (m) => m.pa },
  { key: "ending_type", label: "Ending", type: "enum", enumValues: ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"], getValue: (m) => m.end },
  { key: "emotional_arc", label: "Arc", type: "enum", enumValues: ["man-in-a-hole", "oedipus", "riches-to-rags", "icarus", "rags-to-riches", "steady", "cinderella"], getValue: (m) => m.arc },
  { key: "vibe_sentence", label: "Vibe Sentence", type: "text", getValue: (m) => m.v },
];

interface CorrectionDialogProps {
  movie: SlimMoodMovie;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function CorrectionDialog({ movie, onClose, onSubmitted }: CorrectionDialogProps) {
  const { user, session, signInWithGitHub } = useAuth();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [proposedValue, setProposedValue] = useState<string>("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const field = CORRECTABLE_FIELDS.find((f) => f.key === selectedField);
  const originalValue = field ? field.getValue(movie) : null;

  const canSubmit = selectedField && proposedValue && justification.length >= 10 &&
    String(originalValue) !== proposedValue;

  const handleSubmit = async () => {
    if (!canSubmit || !session) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          movie_id: movie.id,
          proposed_values: { [selectedField!]: field?.type === "numeric" ? parseFloat(proposedValue) : proposedValue },
          original_values: { [selectedField!]: originalValue },
          justification,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className={cn("relative w-full max-w-lg border shadow-2xl", SURFACE, BORDER, R)}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[oklch(0.25_0_0)]">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#8B5CF6] mb-1">
              SUGGEST CORRECTION
            </p>
            <p className="font-[family-name:var(--font-display)] font-bold text-foreground/90">
              {movie.t} <span className="text-muted-foreground/50 font-normal">({movie.y})</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer text-lg">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!user ? (
            /* Not signed in */
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground/70 mb-4">
                Sign in to suggest corrections to mood scores.
              </p>
              <button
                onClick={signInWithGitHub}
                className={cn(
                  "px-5 py-2.5 text-sm font-semibold border transition-colors cursor-pointer",
                  "text-[#1ED760] border-[#1ED760]/30 hover:bg-[#1ED760]/5",
                  R,
                )}
              >
                Sign in with GitHub
              </button>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center py-8">
              <p className="text-2xl mb-2">&#10003;</p>
              <p className="font-[family-name:var(--font-display)] font-bold text-foreground/90 mb-1">
                Correction submitted
              </p>
              <p className="text-sm text-muted-foreground/60">
                Other users can now vote on your suggestion.
              </p>
              <button
                onClick={onClose}
                className={cn(
                  "mt-4 px-5 py-2 text-sm border transition-colors cursor-pointer",
                  "text-muted-foreground hover:text-foreground",
                  BORDER, R,
                )}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Field picker */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-2">
                  WHICH FIELD IS WRONG?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CORRECTABLE_FIELDS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setSelectedField(f.key);
                        setProposedValue(String(f.getValue(movie)));
                      }}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-medium border transition-all duration-150 cursor-pointer",
                        R,
                        selectedField === f.key
                          ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/10 text-[#8B5CF6]"
                          : "border-[oklch(0.25_0_0)] text-muted-foreground/50 hover:border-[oklch(0.35_0_0)]",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value editor */}
              {field && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50">
                      CURRENT → PROPOSED
                    </p>
                    <span className="text-[11px] font-[family-name:var(--font-geist-mono)] text-muted-foreground/50">
                      {String(originalValue)}
                    </span>
                  </div>

                  {field.type === "numeric" && field.range ? (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={field.range.min}
                        max={field.range.max}
                        step={field.range.step}
                        value={proposedValue}
                        onChange={(e) => setProposedValue(e.target.value)}
                        className="w-full accent-[#8B5CF6]"
                      />
                      <div className="flex justify-between text-[11px] font-[family-name:var(--font-geist-mono)]">
                        <span className="text-muted-foreground/40">{field.range.min}</span>
                        <span className={cn(
                          "font-bold",
                          proposedValue !== String(originalValue) ? "text-[#8B5CF6]" : "text-muted-foreground/60",
                        )}>
                          {parseFloat(proposedValue).toFixed(2)}
                        </span>
                        <span className="text-muted-foreground/40">{field.range.max}</span>
                      </div>
                    </div>
                  ) : field.type === "enum" && field.enumValues ? (
                    <div className="flex flex-wrap gap-1.5">
                      {field.enumValues.map((v) => (
                        <button
                          key={v}
                          onClick={() => setProposedValue(v)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] border transition-all duration-150 cursor-pointer",
                            R,
                            proposedValue === v
                              ? "border-[#1ED760]/50 bg-[#1ED760]/10 text-[#1ED760]"
                              : "border-[oklch(0.25_0_0)] text-muted-foreground/50 hover:border-[oklch(0.35_0_0)]",
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      rows={3}
                      className={cn(
                        "w-full border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[oklch(0.35_0_0)] resize-none",
                        SURFACE, BORDER, R,
                      )}
                    />
                  )}
                </div>
              )}

              {/* Justification */}
              {selectedField && (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-2">
                    WHY? <span className="text-muted-foreground/30">(min 10 chars)</span>
                  </p>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Explain why this value should change..."
                    className={cn(
                      "w-full border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[oklch(0.35_0_0)] resize-none",
                      SURFACE, BORDER, R,
                    )}
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-[var(--color-pop-coral)]">{error}</p>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className={cn(
                    "px-5 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                    "bg-[#8B5CF6] text-white hover:brightness-110",
                    R,
                  )}
                >
                  {submitting ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
