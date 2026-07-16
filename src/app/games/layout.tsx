import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games · Mooduel",
  description:
    "Ways to find what you're in the mood for. The model has opinions. Every round you play sharpens them.",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
