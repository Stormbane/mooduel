import { renderGameOg, OG_SIZE } from "@/lib/games/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel: Card Game";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderGameOg(GAMES["card-game"], 'Draft eight movies and play them like a hand of cards, mood against mood.');
}
