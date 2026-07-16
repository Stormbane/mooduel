import { ImageResponse } from "next/og";
import type { GameConfig } from "@/components/game-shell/types";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Link-preview card for a game page: dark stage, the game's costume hue
 * doing the talking. Matches the share-page OG style.
 */
export function renderGameOg(game: GameConfig, hook: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          borderLeft: `16px solid ${game.accent.color}`,
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: game.accent.color,
            }}
          >
            A Mooduel game
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>Mooduel</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: game.title.length > 20 ? 72 : 92,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: "#fafafa",
            }}
          >
            {game.title}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "#d4d4d4", maxWidth: 1020 }}>
            {hook}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 80, height: 4, backgroundColor: game.accent.color, display: "flex" }} />
          <div style={{ fontSize: 20, color: "#737373" }}>
            Movies scored by how they make you feel.
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
