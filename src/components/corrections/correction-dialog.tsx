"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, PROVIDER_ENABLED } from "@/lib/supabase/auth-context";
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
  const { user, session, signInWithGitHub, signInWithGoogle, signInWithFacebook } = useAuth();
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
            <div className="py-6">
              <p className="text-sm text-muted-foreground/70 mb-4 text-center">
                Sign in to suggest corrections to mood scores.
              </p>
              <div className="max-w-xs mx-auto space-y-2">
                <button
                  onClick={() => PROVIDER_ENABLED.github && signInWithGitHub()}
                  disabled={!PROVIDER_ENABLED.github}
                  title={PROVIDER_ENABLED.github ? undefined : "Coming soon"}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm border transition-colors duration-150",
                    PROVIDER_ENABLED.github ? "cursor-pointer hover:bg-white/[0.03]" : "opacity-40 cursor-not-allowed",
                    BORDER,
                    R,
                  )}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Continue with GitHub</span>
                  {!PROVIDER_ENABLED.github && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
                </button>
                <button
                  onClick={() => PROVIDER_ENABLED.google && signInWithGoogle()}
                  disabled={!PROVIDER_ENABLED.google}
                  title={PROVIDER_ENABLED.google ? undefined : "Coming soon"}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm border transition-colors duration-150",
                    PROVIDER_ENABLED.google ? "cursor-pointer hover:bg-white/[0.03]" : "opacity-40 cursor-not-allowed",
                    BORDER,
                    R,
                  )}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                  {!PROVIDER_ENABLED.google && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
                </button>
                <button
                  onClick={() => PROVIDER_ENABLED.facebook && signInWithFacebook()}
                  disabled={!PROVIDER_ENABLED.facebook}
                  title={PROVIDER_ENABLED.facebook ? undefined : "Coming soon"}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm border transition-colors duration-150",
                    PROVIDER_ENABLED.facebook ? "cursor-pointer hover:bg-white/[0.03]" : "opacity-40 cursor-not-allowed",
                    BORDER,
                    R,
                  )}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                    <path fill="#1877F2" d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.384C19.612 22.954 24 17.99 24 12z" />
                  </svg>
                  <span>Continue with Facebook</span>
                  {!PROVIDER_ENABLED.facebook && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
                </button>
              </div>
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
