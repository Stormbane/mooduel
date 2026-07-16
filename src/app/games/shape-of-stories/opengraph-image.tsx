import { renderGameOg, OG_SIZE } from "@/lib/games/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel: Shape Of Stories";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderGameOg(GAMES["shape-of-stories"], 'Six curves a story can take. Pick the shape of a movie you know.');
}
