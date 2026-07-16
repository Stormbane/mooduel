import { renderGameOg, OG_SIZE } from "@/lib/games/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel: Mood Bridge";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderGameOg(GAMES["mood-bridge"], 'From one movie to another in five mood-sized hops. New bridge daily.');
}
