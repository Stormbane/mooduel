"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Reveal } from "@/components/landing/reveal";
import { TOKENS } from "@/components/landing/landing-data";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

interface Leader {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputation: number;
  corrections: number;
  accepted: number;
}

interface Stats {
  totalCorrections: number;
  totalVotes: number;
  contributors: number;
}

const RANK_COLORS = ["#FBBF24", "#C0C0C0", "#CD7F32"];

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={cn("border p-5 text-center", SURFACE, BORDER, R)}>
      <p className="text-3xl font-[family-name:var(--font-display)] font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[12px] text-muted-foreground/60 mt-1">{label}</p>
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setLeaders(data.leaders || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageLayout currentPage="/leaderboard">
      <div className="pt-12 pb-8">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FBBF24] mb-3">
            LEADERBOARD
          </p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[2rem] sm:text-[2.5rem] tracking-tight mb-3">
            Top Contributors
          </h1>
          <p className="text-muted-foreground max-w-lg">
            The people making the mood database more accurate, one correction at a time.
          </p>
        </Reveal>
      </div>

      {/* Global stats */}
      {stats && (
        <Reveal delay={100}>
          <div className="grid grid-cols-3 gap-3 mb-12">
            <StatCard
              value={stats.totalCorrections.toLocaleString()}
              label="Corrections submitted"
              color="#8B5CF6"
            />
            <StatCard
              value={stats.totalVotes.toLocaleString()}
              label="Votes cast"
              color="#1ED760"
            />
            <StatCard
              value={stats.contributors.toLocaleString()}
              label="Contributors"
              color="#E91E8C"
            />
          </div>
        </Reveal>
      )}

      {/* Leaderboard */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-2xl animate-pulse text-muted-foreground/30">&#9678;</div>
        </div>
      ) : leaders.length === 0 ? (
        <Reveal>
          <div className={cn("border p-12 text-center", SURFACE, BORDER, R)}>
            <p className="text-4xl mb-4 text-muted-foreground/10">&#9678;</p>
            <p className="font-[family-name:var(--font-display)] font-bold text-lg text-muted-foreground/40 mb-2">
              No contributors yet
            </p>
            <p className="text-sm text-muted-foreground/25">
              Be the first to suggest a correction on any movie card.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={150}>
          <div className={cn("border overflow-hidden", BORDER, R)}>
            {/* Header */}
            <div className={cn("grid grid-cols-12 gap-3 px-5 py-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/40 border-b", SURFACE, BORDER)}>
              <span className="col-span-1">#</span>
              <span className="col-span-5">Contributor</span>
              <span className="col-span-2 text-right">Reputation</span>
              <span className="col-span-2 text-right">Corrections</span>
              <span className="col-span-2 text-right">Accepted</span>
            </div>

            {/* Rows */}
            {leaders.map((leader) => (
              <div
                key={leader.userId}
                className={cn(
                  "grid grid-cols-12 gap-3 px-5 py-3 items-center border-b last:border-b-0 transition-colors hover:bg-white/[0.02]",
                  BORDER,
                )}
              >
                {/* Rank */}
                <span className="col-span-1">
                  <span
                    className="font-[family-name:var(--font-display)] font-bold text-sm"
                    style={{ color: RANK_COLORS[leader.rank - 1] || "inherit" }}
                  >
                    {leader.rank}
                  </span>
                </span>

                {/* User */}
                <div className="col-span-5 flex items-center gap-3">
                  {leader.avatarUrl ? (
                    <Image
                      src={leader.avatarUrl}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-xs font-bold text-[#8B5CF6] shrink-0">
                      {(leader.displayName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-foreground/90 truncate">
                    {leader.displayName || "Anonymous"}
                  </span>
                </div>

                {/* Reputation */}
                <span className="col-span-2 text-right font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[#FBBF24]">
                  {leader.reputation}
                </span>

                {/* Corrections */}
                <span className="col-span-2 text-right font-[family-name:var(--font-geist-mono)] text-sm text-muted-foreground/60">
                  {leader.corrections}
                </span>

                {/* Accepted */}
                <span className="col-span-2 text-right font-[family-name:var(--font-geist-mono)] text-sm text-[#1ED760]">
                  {leader.accepted}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </PageLayout>
  );
}
