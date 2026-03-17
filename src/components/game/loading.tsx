"use client";

import { motion } from "framer-motion";

export function GameLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0.3, 0.6, 0.3], y: 0 }}
            transition={{
              opacity: { repeat: Infinity, duration: 1.2, delay: i * 0.15 },
              y: { duration: 0.3, delay: i * 0.1 },
            }}
            className="h-32 w-22 rounded-2xl bg-secondary"
          />
        ))}
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-sm uppercase tracking-widest text-muted-foreground font-[family-name:var(--font-display)] font-medium"
      >
        Loading contenders...
      </motion.p>
    </div>
  );
}
