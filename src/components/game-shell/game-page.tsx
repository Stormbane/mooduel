"use client";

import { PageLayout } from "@/components/layout/page-layout";
import type { GameConfig } from "./types";

interface GamePageProps {
  game: GameConfig;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shell wrapper for every v1 game page. Sets up the PageLayout with the
 * correct nav highlight and constrains content to a readable column.
 */
export function GamePage({ game, maxWidth = "max-w-2xl", children }: GamePageProps) {
  return (
    <PageLayout currentPage={game.path} maxWidth={maxWidth}>
      {children}
    </PageLayout>
  );
}
