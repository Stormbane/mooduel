"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { profileUrl, posterUrl } from "@/lib/tmdb/client";
import type { TmdbPersonWithMovies } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PersonCardProps {
  person: TmdbPersonWithMovies;
  onPick: (person: TmdbPersonWithMovies) => void;
  label?: string;
  index?: number;
}

export function PersonCard({ person, onPick, label, index = 0 }: PersonCardProps) {
  const [picked, setPicked] = useState(false);

  const handleClick = () => {
    setPicked(true);
    setTimeout(() => onPick(person), 400);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-lg p-3 transition-all duration-300",
        "glass hover:border-[var(--color-neon-cyan)] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]",
        "focus-visible:outline-none focus-visible:border-[var(--color-neon-pink)]",
        "active:scale-95",
        picked && "border-[var(--color-neon-pink)] neon-glow-pink scale-105",
        "w-full max-w-[160px]",
      )}
    >
      {/* Person photo */}
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted ring-1 ring-[var(--color-neon-cyan)]/30 group-hover:ring-[var(--color-neon-cyan)] transition-all">
        <Image
          src={profileUrl(person.profile_path)}
          alt={person.name}
          fill
          className="object-cover transition-all duration-300 group-hover:scale-110"
          sizes="80px"
        />
      </div>

      {/* Name */}
      <div className="text-center">
        {label && (
          <p className="text-[8px] uppercase tracking-[0.2em] neon-text-cyan mb-0.5 font-bold">
            {label}
          </p>
        )}
        <p className="text-xs font-bold font-[family-name:var(--font-display)] uppercase tracking-wide leading-tight">
          {person.name}
        </p>
      </div>

      {/* Filmography strip */}
      <div className="flex gap-1 mt-1">
        {person.topMovies.slice(0, 4).map((movie) => (
          <div
            key={movie.id}
            className="relative h-14 w-9 overflow-hidden rounded bg-muted border border-border/50"
            title={movie.title}
          >
            <Image
              src={posterUrl(movie.poster_path, "w185")}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
        ))}
      </div>
    </motion.button>
  );
}
