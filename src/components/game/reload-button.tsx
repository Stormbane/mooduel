"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { RELOAD_TEXTS, getRandomCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface ReloadButtonProps {
  onReload: () => void;
}

export function ReloadButton({ onReload }: ReloadButtonProps) {
  const text = useMemo(() => getRandomCopy(RELOAD_TEXTS), []);

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      onClick={onReload}
      className={cn(
        "mt-2 rounded-md px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold",
        "font-[family-name:var(--font-display)]",
        "border border-muted-foreground/30 text-muted-foreground",
        "hover:border-[var(--color-neon-yellow)] hover:text-[var(--color-neon-yellow)]",
        "hover:shadow-[0_0_10px_rgba(255,230,0,0.2)]",
        "transition-all active:scale-95",
      )}
    >
      {text}
    </motion.button>
  );
}
