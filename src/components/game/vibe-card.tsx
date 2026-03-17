"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { VibeSwatch } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VibeCardProps {
  swatch: VibeSwatch;
  onPick: (swatch: VibeSwatch) => void;
  index?: number;
}

export function VibeCard({ swatch, onPick, index = 0 }: VibeCardProps) {
  const [picked, setPicked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handlePick = () => {
    setPicked(true);
    setTimeout(() => onPick(swatch), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center gap-2"
    >
      <motion.button
        onClick={handlePick}
        whileHover={{ y: -6, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-36 h-48 md:w-44 md:h-56 rounded-2xl overflow-hidden cursor-pointer",
          "ring-2 ring-transparent transition-all duration-300",
          "hover:ring-[var(--color-pop-pink)] hover:shadow-lg hover:shadow-[var(--color-pop-pink)]/20",
          "focus-visible:outline-none focus-visible:ring-[var(--color-pop-purple)]",
          picked && "ring-[var(--color-pop-green)] shadow-lg shadow-[var(--color-pop-green)]/30 scale-105",
        )}
      >
        {/* Shimmer placeholder while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={swatch.imageUrl}
          alt={swatch.title}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImgLoaded(true)}
        />
      </motion.button>

      {/* Painting attribution — subtle, no mood hint */}
      <div className="text-center px-1 max-w-[176px]">
        <p className="text-[10px] text-muted-foreground/50 leading-tight line-clamp-1">
          {swatch.title}
        </p>
      </div>
    </motion.div>
  );
}
