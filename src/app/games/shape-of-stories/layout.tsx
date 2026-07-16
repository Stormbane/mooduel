import type { Metadata } from "next";
import { GAMES } from "@/components/game-shell/types";

const GAME = GAMES["shape-of-stories"];

export const metadata: Metadata = {
  title: `${GAME.title} · Mooduel`,
  description: GAME.tagline,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
