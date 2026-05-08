"use client";

import { useEffect, useState } from "react";

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w45";

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface ProvidersResponse {
  country: string;
  providers: {
    flatrate: Provider[];
    rent: Provider[];
    buy: Provider[];
  };
  tmdbLink: string | null;
}

interface StreamingProvidersProps {
  movieId: number;
}

/**
 * Shows streaming availability for a movie in the user's country
 * (detected server-side via Vercel header, falls back to US).
 *
 * Data source: TMDB /watch/providers, sourced from JustWatch. Attribution
 * required. Logos link to provider homepage — no deep links in v1.
 */
export function StreamingProviders({ movieId }: StreamingProvidersProps) {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/watch-providers/${movieId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  if (loading) {
    return (
      <div className="mt-4 h-[52px] animate-pulse rounded-[4px] bg-white/[0.02]" />
    );
  }

  if (!data) return null;

  const { flatrate, rent, buy } = data.providers;
  const hasAny = flatrate.length + rent.length + buy.length > 0;

  if (!hasAny) {
    return (
      <div className="mt-4 rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
          Where to watch · {data.country}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Not available on streaming in your region right now.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[4px] border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
          Where to watch · {data.country}
        </p>
        <a
          href="https://www.justwatch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
        >
          data via JustWatch
        </a>
      </div>
      <div className="space-y-2">
        <ProviderRow label="Stream" list={flatrate} tmdbLink={data.tmdbLink} />
        <ProviderRow label="Rent" list={rent} tmdbLink={data.tmdbLink} />
        <ProviderRow label="Buy" list={buy} tmdbLink={data.tmdbLink} />
      </div>
    </div>
  );
}

function ProviderRow({
  label,
  list,
  tmdbLink,
}: {
  label: string;
  list: Provider[];
  tmdbLink: string | null;
}) {
  if (list.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 w-12 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((p) => {
          const href = tmdbLink || "#";
          return (
            <a
              key={p.provider_id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={p.provider_name}
              className="block rounded-[3px] overflow-hidden border border-white/5 hover:border-white/20 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${TMDB_LOGO_BASE}${p.logo_path}`}
                alt={p.provider_name}
                width={28}
                height={28}
                className="w-7 h-7 block"
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
