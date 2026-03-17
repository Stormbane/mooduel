"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { EmotionCard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EmotionCardComponentProps {
  card: EmotionCard;
  onPick: (card: EmotionCard) => void;
  index?: number;
}

/** Map VA position to a background gradient tint */
function cardStyle(card: EmotionCard): { background: string; glowColor: string } {
  const { valence, arousal } = card;

  // Yellow quadrant: high energy, pleasant
  if (valence > 0 && arousal > 0) {
    const intensity = Math.min(1, (valence + arousal) / 1.5);
    return {
      background: `linear-gradient(135deg, hsl(${40 + intensity * 15}, ${60 + intensity * 20}%, ${18 + intensity * 5}%), hsl(${25 + intensity * 10}, ${50 + intensity * 15}%, ${14 + intensity * 4}%))`,
      glowColor: "var(--color-pop-yellow)",
    };
  }
  // Red quadrant: high energy, unpleasant
  if (valence <= 0 && arousal > 0) {
    const intensity = Math.min(1, (Math.abs(valence) + arousal) / 1.5);
    return {
      background: `linear-gradient(135deg, hsl(${340 + intensity * 10}, ${55 + intensity * 25}%, ${16 + intensity * 4}%), hsl(${320 + intensity * 10}, ${45 + intensity * 20}%, ${12 + intensity * 3}%))`,
      glowColor: "var(--color-pop-coral)",
    };
  }
  // Green quadrant: low energy, pleasant
  if (valence > 0 && arousal <= 0) {
    const intensity = Math.min(1, (valence + Math.abs(arousal)) / 1.5);
    return {
      background: `linear-gradient(135deg, hsl(${160 + intensity * 20}, ${35 + intensity * 20}%, ${16 + intensity * 4}%), hsl(${180 + intensity * 15}, ${30 + intensity * 15}%, ${12 + intensity * 3}%))`,
      glowColor: "var(--color-pop-green)",
    };
  }
  // Blue quadrant: low energy, unpleasant
  const intensity = Math.min(1, (Math.abs(valence) + Math.abs(arousal)) / 1.5);
  return {
    background: `linear-gradient(135deg, hsl(${220 + intensity * 15}, ${25 + intensity * 20}%, ${14 + intensity * 3}%), hsl(${235 + intensity * 10}, ${20 + intensity * 15}%, ${11 + intensity * 2}%))`,
    glowColor: "var(--color-pop-blue)",
  };
}

export function EmotionCardComponent({ card, onPick, index = 0 }: EmotionCardComponentProps) {
  const [picked, setPicked] = useState(false);
  const style = cardStyle(card);

  const handlePick = () => {
    setPicked(true);
    setTimeout(() => onPick(card), 400);
  };

  return (
    <motion.button
      onClick={handlePick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2",
        "w-36 h-44 md:w-44 md:h-52 rounded-2xl overflow-hidden cursor-pointer p-4",
        "ring-2 ring-transparent transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-[var(--color-pop-purple)]",
        picked && "ring-[var(--color-pop-green)] shadow-lg shadow-[var(--color-pop-green)]/30 scale-105",
      )}
      style={{
        background: style.background,
        ...(picked ? {} : {}),
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 8px 24px ${style.glowColor}33`;
        el.style.borderColor = style.glowColor;
      }}
      onMouseLeave={(e) => {
        if (!picked) {
          const el = e.currentTarget;
          el.style.boxShadow = "";
          el.style.borderColor = "transparent";
        }
      }}
    >
      <span
        className="text-lg md:text-xl font-black tracking-wider text-white font-[family-name:var(--font-display)] uppercase text-center leading-tight"
        style={{
          textShadow: `0 0 20px ${style.glowColor}66`,
        }}
      >
        {card.label}
      </span>
    </motion.button>
  );
}
