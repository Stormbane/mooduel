"use client";

import { motion } from "framer-motion";

export function GameLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0.3, 0.7, 0.3], y: 0 }}
            transition={{
              opacity: { repeat: Infinity, duration: 1.2, delay: i * 0.15 },
              y: { duration: 0.3, delay: i * 0.1 },
            }}
            className="h-28 w-20 rounded-lg border border-[var(--color-neon-cyan)]/20 bg-card"
          />
        ))}
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-xs uppercase tracking-[0.3em] neon-text-cyan font-[family-name:var(--font-display)] font-bold"
      >
        LOADING CONTENDERS...
      </motion.p>
    </div>
  );
}
