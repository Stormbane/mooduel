"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { TOKENS } from "@/components/landing/landing-data";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

interface Correction {
  id: string;
  movie_id: number;
  author_id: string;
  status: string;
  proposed_values: Record<string, unknown>;
  original_values: Record<string, unknown>;
  justification: string;
  upvotes: number;
  downvotes: number;
  net_score: number;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

interface CorrectionListProps {
  movieId: number;
  refreshKey?: number;
}

export function CorrectionList({ movieId, refreshKey = 0 }: CorrectionListProps) {
  const { session, user } = useAuth();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchCorrections = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`/api/corrections?movie_id=${movieId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setCorrections(data.corrections || []);
      setUserVotes(data.userVotes || {});
    }
    setLoading(false);
  }, [movieId, session]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections, refreshKey]);

  const castVote = async (correctionId: string, value: 1 | -1) => {
    if (!session) return;
    setVoting(correctionId);

    const res = await fetch("/api/corrections/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ correction_id: correctionId, value }),
    });

    if (res.ok) {
      await fetchCorrections();
    }
    setVoting(null);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <span className="text-xs text-muted-foreground/40 animate-pulse">Loading corrections...</span>
      </div>
    );
  }

  if (corrections.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground/40">No pending corrections</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#F97316] mb-2">
        PENDING CORRECTIONS ({corrections.length})
      </p>
      {corrections.map((c) => {
        const fieldKey = Object.keys(c.proposed_values)[0];
        const proposed = c.proposed_values[fieldKey];
        const original = c.original_values[fieldKey];
        const myVote = userVotes[c.id];
        const isOwnCorrection = user?.id === c.author_id;

        return (
          <div
            key={c.id}
            className={cn("border p-3", SURFACE, BORDER, R)}
          >
            <div className="flex items-start gap-3">
              {/* Vote buttons */}
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                <button
                  onClick={() => castVote(c.id, 1)}
                  disabled={!user || isOwnCorrection || voting === c.id}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                    myVote === 1 ? "text-[#1ED760]" : "text-muted-foreground/40 hover:text-[#1ED760]",
                  )}
                  title={isOwnCorrection ? "Can't vote on your own correction" : "Upvote"}
                >
                  ▲
                </button>
                <span className={cn(
                  "text-xs font-[family-name:var(--font-geist-mono)] font-bold tabular-nums",
                  c.net_score > 0 ? "text-[#1ED760]" : c.net_score < 0 ? "text-[var(--color-pop-coral)]" : "text-muted-foreground/50",
                )}>
                  {c.net_score}
                </span>
                <button
                  onClick={() => castVote(c.id, -1)}
                  disabled={!user || isOwnCorrection || voting === c.id}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                    myVote === -1 ? "text-[var(--color-pop-coral)]" : "text-muted-foreground/40 hover:text-[var(--color-pop-coral)]",
                  )}
                  title={isOwnCorrection ? "Can't vote on your own correction" : "Downvote"}
                >
                  ▼
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-[#8B5CF6]">
                    {fieldKey}
                  </span>
                  <span className="text-[11px] font-[family-name:var(--font-geist-mono)] text-muted-foreground/50">
                    {String(original)} → <span className="text-foreground/80">{String(proposed)}</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  {c.justification}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground/40">
                    {c.profiles?.display_name || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/25">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
