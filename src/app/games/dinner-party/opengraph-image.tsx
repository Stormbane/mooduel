import { renderGameOg, OG_SIZE } from "@/lib/games/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel: Dinner Party";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderGameOg(GAMES["dinner-party"], 'Four guests in four moods. Find the one film that works for the whole table.');
}
