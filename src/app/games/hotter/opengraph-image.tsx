import { renderGameOg, OG_SIZE } from "@/lib/games/og";
import { GAMES } from "@/components/game-shell/types";

export const alt = "Mooduel: Hotter";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderGameOg(GAMES["hotter"], 'Two posters, one question, and a model with opinions. Stay in sync or go down swinging.');
}
