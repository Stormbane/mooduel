"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { TmdbMovie, TournamentState } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb/client";
import { cn } from "@/lib/utils";

interface VerticalBracketProps {
  tournament: TournamentState;
  allMovies: TmdbMovie[];
}

type SlotStatus = "winner" | "loser" | "active" | "pending" | "tbd";

function deriveSlotStatus(
  roundIndex: number,
  slotIndex: number,
  movieId: number | null,
  tournament: TournamentState,
): SlotStatus {
  if (movieId == null) return "tbd";
  if (roundIndex === 3) return "winner";

  const matchupIndex = Math.floor(slotIndex / 2);
  const roundWinners = tournament.bracketRounds[roundIndex] ?? [];
  const winnerId = roundWinners[matchupIndex];

  if (winnerId != null) {
    return winnerId === movieId ? "winner" : "loser";
  }

  if (tournament.currentBracketRound === roundIndex && tournament.currentMatchup === matchupIndex) {
    return "active";
  }

  return "pending";
}

function BracketSlot({ movie, status }: { movie: TmdbMovie | null; status: SlotStatus }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center gap-0.5 w-14",
        status === "loser" && "opacity-30",
        status === "pending" && "opacity-50",
        status === "tbd" && "opacity-20",
      )}
    >
      {/* Poster thumbnail */}
      <div
        className={cn(
          "relative h-9 w-6 rounded-sm overflow-hidden border",
          status === "winner" && "border-[var(--color-pop-green)] shadow-[0_0_6px_var(--color-pop-green)]",
          status === "active" && "border-[var(--color-pop-pink)] shadow-[0_0_6px_var(--color-pop-pink)]",
          status === "loser" && "border-transparent grayscale",
          status === "pending" && "border-muted-foreground/20",
          status === "tbd" && "border-dashed border-muted-foreground/20",
        )}
      >
        {movie?.poster_path ? (
          <Image
            src={posterUrl(movie.poster_path, "w185")}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="24px"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-[6px] text-muted-foreground">?</span>
          </div>
        )}
      </div>

      {/* Title */}
      <span
        className={cn(
          "text-[7px] leading-tight text-center line-clamp-1 w-full font-semibold",
          status === "winner" && "text-[var(--color-pop-green)]",
          status === "active" && "text-[var(--color-pop-pink)]",
          status === "loser" && "text-muted-foreground line-through",
          status === "pending" && "text-muted-foreground",
          status === "tbd" && "text-muted-foreground/50",
        )}
      >
        {movie?.title ?? "TBD"}
      </span>
    </motion.div>
  );
}

/**
 * Connector lines between bracket rounds.
 * For each pair of slots, draws:
 *   - vertical lines down from each slot
 *   - horizontal bar connecting them
 *   - single vertical line down from the midpoint
 */
function ConnectorRow({ pairCount, statuses }: { pairCount: number; statuses: SlotStatus[] }) {
  // Each pair's connector status: decided (green), active (pink), or pending (gray)
  const pairStatuses = Array.from({ length: pairCount }, (_, i) => {
    const s1 = statuses[i * 2];
    const s2 = statuses[i * 2 + 1];
    if (s1 === "winner" || s1 === "loser") return "decided";
    if (s1 === "active" || s2 === "active") return "active";
    return "pending";
  });

  return (
    <div className="flex justify-around w-full" style={{ height: 20 }}>
      {pairStatuses.map((status, i) => {
        const color = status === "decided"
          ? "var(--color-pop-green)"
          : status === "active"
          ? "var(--color-pop-pink)"
          : "rgba(255,255,255,0.1)";

        return (
          <div key={i} className="flex-1 flex justify-center">
            <svg width="100%" height="20" className="overflow-visible">
              {/* Left vertical line down */}
              <line x1="33%" y1="0" x2="33%" y2="10" stroke={color} strokeWidth="1" />
              {/* Right vertical line down */}
              <line x1="67%" y1="0" x2="67%" y2="10" stroke={color} strokeWidth="1" />
              {/* Horizontal bar connecting */}
              <line x1="33%" y1="10" x2="67%" y2="10" stroke={color} strokeWidth="1" />
              {/* Center vertical line descending */}
              <line x1="50%" y1="10" x2="50%" y2="20" stroke={color} strokeWidth="1" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export function VerticalBracket({ tournament, allMovies }: VerticalBracketProps) {
  const findMovie = (id: number | null) => id != null ? allMovies.find((m) => m.id === id) ?? null : null;

  // Build rows
  const row0 = tournament.entrants.map((id) => ({ id, movie: findMovie(id) }));
  const row1 = Array.from({ length: 4 }, (_, i) => {
    const id = tournament.bracketRounds[0]?.[i] ?? null;
    return { id, movie: findMovie(id) };
  });
  const row2 = Array.from({ length: 2 }, (_, i) => {
    const id = tournament.bracketRounds[1]?.[i] ?? null;
    return { id, movie: findMovie(id) };
  });
  const row3 = (() => {
    const id = tournament.bracketRounds[2]?.[0] ?? null;
    return [{ id, movie: findMovie(id) }];
  })();

  // Derive statuses
  const row0Statuses = row0.map((s, i) => deriveSlotStatus(0, i, s.id, tournament));
  const row1Statuses = row1.map((s, i) => deriveSlotStatus(1, i, s.id, tournament));
  const row2Statuses = row2.map((s, i) => deriveSlotStatus(2, i, s.id, tournament));
  const row3Statuses = row3.map((_, i) => deriveSlotStatus(3, i, row3[i].id, tournament));

  // Round labels
  const roundLabels = ["Quarter-Finals", "Semi-Finals", "Final", "Champion"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center w-full max-w-lg"
    >
      {/* QF label */}
      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold font-[family-name:var(--font-display)] mb-1">
        {roundLabels[0]}
      </p>

      {/* Row 0: 8 QF entrants */}
      <div className="flex justify-around w-full">
        {row0.map((slot, i) => (
          <BracketSlot key={`r0-${i}`} movie={slot.movie} status={row0Statuses[i]} />
        ))}
      </div>

      {/* Connector QF → SF */}
      <ConnectorRow pairCount={4} statuses={row0Statuses} />

      {/* SF label */}
      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold font-[family-name:var(--font-display)] mb-1">
        {roundLabels[1]}
      </p>

      {/* Row 1: 4 SF slots */}
      <div className="flex justify-around w-full px-[12.5%]">
        {row1.map((slot, i) => (
          <BracketSlot key={`r1-${i}`} movie={slot.movie} status={row1Statuses[i]} />
        ))}
      </div>

      {/* Connector SF → Final */}
      <div className="w-[75%]">
        <ConnectorRow pairCount={2} statuses={row1Statuses} />
      </div>

      {/* Final label */}
      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold font-[family-name:var(--font-display)] mb-1">
        {roundLabels[2]}
      </p>

      {/* Row 2: 2 Final slots */}
      <div className="flex justify-around w-full px-[25%]">
        {row2.map((slot, i) => (
          <BracketSlot key={`r2-${i}`} movie={slot.movie} status={row2Statuses[i]} />
        ))}
      </div>

      {/* Connector Final → Winner */}
      <div className="w-[50%]">
        <ConnectorRow pairCount={1} statuses={row2Statuses} />
      </div>

      {/* Champion label */}
      <p className="text-[8px] uppercase tracking-widest text-[var(--color-pop-yellow)] font-bold font-[family-name:var(--font-display)] mb-1">
        {roundLabels[3]}
      </p>

      {/* Row 3: Winner */}
      <div className="flex justify-center">
        <BracketSlot movie={row3[0].movie} status={row3Statuses[0]} />
      </div>
    </motion.div>
  );
}
