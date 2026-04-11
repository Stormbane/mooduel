"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";
import { useAuth } from "@/lib/supabase/auth-context";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

const STATUS_COLORS: Record<string, string> = {
  pending: "#FBBF24",
  accepted: "#1ED760",
  rejected: "#FF6B6B",
  superseded: "#8B5CF6",
};

interface ProfileData {
  profile: { display_name: string | null; reputation: number; avatar_url?: string };
  stats: { totalCorrections: number; acceptedCorrections: number; totalVotes: number; reputation: number };
  corrections: {
    id: string;
    movie_id: number;
    movieTitle: string;
    status: string;
    proposed_values: Record<string, unknown>;
    original_values: Record<string, unknown>;
    justification: string;
    net_score: number;
    created_at: string;
  }[];
  votes: {
    id: string;
    value: number;
    created_at: string;
    movieTitle: string;
    corrections: {
      movie_id: number;
      proposed_values: Record<string, unknown>;
      status: string;
      net_score: number;
    } | null;
  }[];
  repEvents: {
    id: string;
    event_type: string;
    points: number;
    created_at: string;
  }[];
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={cn("border p-4 text-center", SURFACE, BORDER, R)}>
      <p className="text-2xl font-[family-name:var(--font-display)] font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, session, loading: authLoading, signInWithGitHub } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"corrections" | "votes" | "reputation">("corrections");

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-2xl animate-pulse text-muted-foreground/30">&#9678;</div>
      </div>
    );
  }

  if (!user) {
    return (
      <PageLayout currentPage="/profile">
        <div className="pt-20 pb-12 text-center">
          <p className="text-4xl mb-4 text-muted-foreground/10">&#9678;</p>
          <p className="font-[family-name:var(--font-display)] font-bold text-xl text-muted-foreground/40 mb-3">
            Sign in to see your profile
          </p>
          <p className="text-sm text-muted-foreground/25 mb-6">
            Track your corrections, votes, and reputation.
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
      </PageLayout>
    );
  }

  const avatar = user.user_metadata?.avatar_url;
  const name = data?.profile?.display_name || user.user_metadata?.full_name || user.email;

  return (
    <PageLayout currentPage="/profile">
      {/* Header */}
      <div className="pt-12 pb-8">
        <Reveal>
          <div className="flex items-center gap-4 mb-6">
            {avatar ? (
              <Image src={avatar} alt="" width={56} height={56} className="w-14 h-14 rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-xl font-bold text-[#8B5CF6]">
                {(name || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl">
                {name}
              </h1>
              <p className="text-sm text-muted-foreground/50">{user.email}</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Stats */}
      {data?.stats && (
        <Reveal delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <StatCard value={String(data.stats.reputation)} label="Reputation" color="#FBBF24" />
            <StatCard value={String(data.stats.totalCorrections)} label="Corrections" color="#8B5CF6" />
            <StatCard value={String(data.stats.acceptedCorrections)} label="Accepted" color="#1ED760" />
            <StatCard value={String(data.stats.totalVotes)} label="Votes cast" color="#E91E8C" />
          </div>
        </Reveal>
      )}

      {/* Tabs */}
      <Reveal delay={150}>
        <div className="flex gap-1 mb-6">
          {(["corrections", "votes", "reputation"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer",
                R,
                tab === t
                  ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30"
                  : "text-muted-foreground/50 hover:text-muted-foreground border border-transparent",
              )}
            >
              {t === "corrections" ? "My Corrections" : t === "votes" ? "My Votes" : "Reputation"}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Tab content */}
      <Reveal delay={200}>
        {tab === "corrections" && (
          <div className="space-y-2">
            {!data?.corrections?.length ? (
              <p className="text-sm text-muted-foreground/40 py-8 text-center">
                No corrections yet. Open any movie card and click &ldquo;Suggest correction&rdquo;.
              </p>
            ) : (
              data.corrections.map((c) => {
                const fieldKey = Object.keys(c.proposed_values)[0];
                return (
                  <div key={c.id} className={cn("border p-4", SURFACE, BORDER, R)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-display)] font-bold text-sm text-foreground/90">
                          {c.movieTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold text-[#8B5CF6]">{fieldKey}</span>
                          <span className="text-[11px] font-[family-name:var(--font-geist-mono)] text-muted-foreground/50">
                            {String(c.original_values[fieldKey])} &rarr; {String(c.proposed_values[fieldKey])}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{c.justification}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            color: STATUS_COLORS[c.status] || "#999",
                            backgroundColor: `${STATUS_COLORS[c.status] || "#999"}15`,
                          }}
                        >
                          {c.status}
                        </span>
                        <p className="text-[10px] text-muted-foreground/40 mt-1">
                          Score: {c.net_score}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "votes" && (
          <div className="space-y-2">
            {!data?.votes?.length ? (
              <p className="text-sm text-muted-foreground/40 py-8 text-center">
                No votes yet. Browse movie corrections and vote on proposals.
              </p>
            ) : (
              data.votes.map((v) => (
                <div key={v.id} className={cn("border p-3 flex items-center gap-3", SURFACE, BORDER, R)}>
                  <span className={cn(
                    "text-sm font-bold shrink-0 w-6 text-center",
                    v.value === 1 ? "text-[#1ED760]" : "text-[var(--color-pop-coral)]",
                  )}>
                    {v.value === 1 ? "▲" : "▼"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground/80 truncate">{v.movieTitle}</p>
                    {v.corrections && (
                      <p className="text-[11px] text-muted-foreground/50">
                        {Object.keys(v.corrections.proposed_values)[0]} correction
                        <span className="ml-2" style={{ color: STATUS_COLORS[v.corrections.status] }}>
                          {v.corrections.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/30 shrink-0">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "reputation" && (
          <div className="space-y-2">
            {!data?.repEvents?.length ? (
              <p className="text-sm text-muted-foreground/40 py-8 text-center">
                No reputation events yet. Earn points by having corrections accepted.
              </p>
            ) : (
              data.repEvents.map((e) => (
                <div key={e.id} className={cn("border p-3 flex items-center justify-between", SURFACE, BORDER, R)}>
                  <div>
                    <p className="text-sm text-foreground/80">{e.event_type}</p>
                    <p className="text-[10px] text-muted-foreground/40">
                      {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={cn(
                    "font-[family-name:var(--font-geist-mono)] font-bold text-sm",
                    e.points > 0 ? "text-[#1ED760]" : "text-[var(--color-pop-coral)]",
                  )}>
                    {e.points > 0 ? "+" : ""}{e.points}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Reveal>
    </PageLayout>
  );
}
