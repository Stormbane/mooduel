"use client";

import { useState } from "react";
import Image from "next/image";
import { profileUrl, posterUrl } from "@/lib/tmdb/client";
import type { TmdbPersonWithMovies } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PersonCardProps {
  person: TmdbPersonWithMovies;
  onPick: (person: TmdbPersonWithMovies) => void;
  label?: string;
}

export function PersonCard({ person, onPick, label }: PersonCardProps) {
  const [picked, setPicked] = useState(false);

  const handleClick = () => {
    setPicked(true);
    setTimeout(() => onPick(person), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl p-4 transition-all duration-300",
        "bg-card hover:bg-accent hover:shadow-xl hover:scale-[1.03]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "active:scale-95 border border-border",
        picked && "scale-105 ring-4 ring-primary shadow-2xl bg-accent",
        "w-full max-w-[200px]",
      )}
    >
      {/* Person photo */}
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-muted ring-2 ring-border">
        <Image
          src={profileUrl(person.profile_path)}
          alt={person.name}
          fill
          className="object-cover transition-all duration-300 group-hover:scale-110"
          sizes="112px"
        />
      </div>

      {/* Name */}
      <div className="text-center">
        {label && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {label}
          </p>
        )}
        <p className="text-sm font-semibold leading-tight">{person.name}</p>
      </div>

      {/* Filmography strip */}
      <div className="flex gap-1.5 mt-1">
        {person.topMovies.slice(0, 4).map((movie) => (
          <div
            key={movie.id}
            className="relative h-16 w-11 overflow-hidden rounded-md bg-muted"
            title={movie.title}
          >
            <Image
              src={posterUrl(movie.poster_path, "w185")}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="44px"
            />
          </div>
        ))}
      </div>
    </button>
  );
}
