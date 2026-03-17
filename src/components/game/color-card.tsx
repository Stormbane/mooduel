"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ColorSwatch } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColorCardProps {
  swatch: ColorSwatch;
  onPick: (swatch: ColorSwatch) => void;
  index?: number;
}

export function ColorCard({ swatch, onPick, index = 0 }: ColorCardProps) {
  const [picked, setPicked] = useState(false);

  const handlePick = () => {
    setPicked(true);
    setTimeout(() => onPick(swatch), 400);
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
        "relative w-32 h-44 md:w-40 md:h-52 rounded-2xl overflow-hidden cursor-pointer",
        "ring-2 ring-transparent transition-all duration-300",
        "hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-[var(--color-pop-purple)]",
        picked && "ring-[var(--color-pop-green)] scale-105",
      )}
      style={{
        backgroundColor: swatch.color,
        boxShadow: picked
          ? `0 0 30px ${swatch.color}60`
          : undefined,
      }}
    />
  );
}
