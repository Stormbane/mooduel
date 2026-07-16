import { ImageResponse } from "next/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel Games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SLATE = [
  "hotter",
  "blind-taste",
  "shape-of-stories",
  "mood-bridge",
  "dinner-party",
  "card-game",
] as const;

/** The hub's link card: six costume hues on the dark stage. */
export default function Image() {
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
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#a3a3a3",
          }}
        >
          Mooduel
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, color: "#fafafa" }}>
            Games
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "#d4d4d4", maxWidth: 980 }}>
            Six ways to find what you&apos;re in the mood for. The model has
            opinions. Every round sharpens them.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {SLATE.map((id) => (
            <div
              key={id}
              style={{
                width: 44,
                height: 10,
                borderRadius: 2,
                backgroundColor: GAMES[id].accent.color,
                display: "flex",
              }}
            />
          ))}
          <div style={{ fontSize: 20, color: "#737373", marginLeft: 12 }}>
            games.mooduel.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
