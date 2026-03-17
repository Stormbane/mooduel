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
        "mt-2 rounded-full px-5 py-2 text-xs uppercase tracking-widest font-semibold",
        "font-[family-name:var(--font-display)]",
        "border border-border text-muted-foreground",
        "hover:border-[var(--color-pop-purple)] hover:text-[var(--color-pop-purple)]",
        "hover:shadow-md hover:shadow-[var(--color-pop-purple)]/10",
        "transition-all active:scale-95",
      )}
    >
      {text}
    </motion.button>
  );
}
