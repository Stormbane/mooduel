import type { SlimMoodMovie } from "@/lib/mood-data/types";

/** Compact inline rating display: IMDb + RT 🍅 */
export function MovieRatings({ movie, className = "" }: { movie: SlimMoodMovie; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs text-muted-foreground/50 ${className}`}>
      {movie.imdb && (
        <span title="IMDb rating" className="text-[var(--color-pop-yellow)]/70">IMDb {movie.imdb}</span>
      )}
      {movie.rtc != null && (
        <span title="Rotten Tomatoes critics" className={movie.rtc >= 60 ? "text-[var(--color-pop-green)]/70" : "text-[var(--color-pop-coral)]/70"}>
          🍅 {movie.rtc}%
        </span>
      )}
      {movie.rta != null && (
        <span title="Rotten Tomatoes audience">
          🍿 {movie.rta}%
        </span>
      )}
      {!movie.imdb && !movie.rtc && movie.r && (
        <span title="TMDB rating">★ {movie.r}</span>
      )}
    </span>
  );
}

/** Even more compact — just key scores */
export function MovieRatingsCompact({ movie }: { movie: SlimMoodMovie }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/40 ml-1.5">
      {movie.imdb && (
        <span className="text-[var(--color-pop-yellow)]/60">IMDb {movie.imdb}</span>
      )}
      {movie.rtc != null && (
        <span className={movie.rtc >= 60 ? "text-[var(--color-pop-green)]/60" : "text-[var(--color-pop-coral)]/60"}>
          🍅{movie.rtc}%
        </span>
      )}
      {!movie.imdb && !movie.rtc && movie.r && (
        <span>★{movie.r}</span>
      )}
    </span>
  );
}
