"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "./client";

export const PROVIDER_ENABLED = {
  github: true,
  google: true,
  facebook: false,
} as const;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGitHub: (next?: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signInWithFacebook: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signInWithGitHub: async () => {},
  signInWithGoogle: async () => {},
  signInWithFacebook: async () => {},
  signOut: async () => {},
});

/**
 * Build an OAuth callback URL that preserves the user's location.
 * If `next` is omitted, defaults to current `pathname + search`.
 */
function buildRedirectTo(next?: string): string {
  const target = next ?? `${window.location.pathname}${window.location.search}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGitHub = async (next?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: buildRedirectTo(next) },
    });
  };

  const signInWithGoogle = async (next?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildRedirectTo(next) },
    });
  };

  const signInWithFacebook = async (next?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: buildRedirectTo(next) },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGitHub, signInWithGoogle, signInWithFacebook, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
