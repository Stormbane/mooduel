"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth, PROVIDER_ENABLED } from "@/lib/supabase/auth-context";
import { TOKENS } from "@/components/landing/landing-data";

const { radius: R, surface: SURFACE, border: BORDER } = TOKENS;

export function AuthButton() {
  const { user, loading, signInWithGitHub, signInWithGoogle, signInWithFacebook, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-border/20 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer",
            "text-[#1ED760] border-[#1ED760]/30 hover:bg-[#1ED760]/5",
            R,
          )}
        >
          Sign in
        </button>

        {open && (
          <div
            className={cn(
              "absolute right-0 top-full mt-2 w-56 border p-3 space-y-2 z-50 shadow-xl",
              SURFACE,
              BORDER,
              R,
            )}
          >
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-2">
              SIGN IN TO CONTRIBUTE
            </p>
            <button
              onClick={() => { if (PROVIDER_ENABLED.github) { signInWithGitHub(); setOpen(false); } }}
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
              <span>GitHub</span>
              {!PROVIDER_ENABLED.github && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
            </button>
            <button
              onClick={() => { if (PROVIDER_ENABLED.google) { signInWithGoogle(); setOpen(false); } }}
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
              <span>Google</span>
              {!PROVIDER_ENABLED.google && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
            </button>
            <button
              onClick={() => { if (PROVIDER_ENABLED.facebook) { signInWithFacebook(); setOpen(false); } }}
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
              <span>Facebook</span>
              {!PROVIDER_ENABLED.facebook && <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed in — show avatar + dropdown
  const avatar = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer"
      >
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-xs font-bold text-[#8B5CF6]">
            {(name || "?")[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-48 border p-3 z-50 shadow-xl",
            SURFACE,
            BORDER,
            R,
          )}
        >
          <p className="text-sm font-semibold text-foreground/90 truncate">
            {name}
          </p>
          <p className="text-[11px] text-muted-foreground/50 truncate mb-3">
            {user.email}
          </p>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block text-xs text-muted-foreground/60 hover:text-foreground transition-colors duration-150 mb-2"
          >
            Profile &amp; corrections
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="block text-xs text-muted-foreground/60 hover:text-foreground transition-colors duration-150 mb-3"
          >
            Leaderboard
          </Link>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full text-left text-xs text-muted-foreground/60 hover:text-foreground transition-colors duration-150 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
