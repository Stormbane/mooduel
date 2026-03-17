"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface SplashScreenProps {
  onPlay: () => void;
}

export function SplashScreen({ onPlay }: SplashScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center gap-8 max-w-lg text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <Image
            src="/logo.svg"
            alt="Mooduel"
            width={360}
            height={72}
            priority
            className="w-[280px] sm:w-[360px] h-auto"
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-lg sm:text-xl text-muted-foreground font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Discover what you&rsquo;re in the mood for
        </motion.p>

        {/* Description */}
        <motion.div
          className="space-y-3 text-sm sm:text-base text-muted-foreground/80 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <p>
            We start with colors and vibes to read your mood. Then movies
            matched to how you feel. Your picks go head-to-head in a tournament
            — and one champion emerges.
          </p>
          <p>
            No ratings. No forms. Just vibes.
          </p>
        </motion.div>

        {/* Play button */}
        <motion.button
          onClick={onPlay}
          className="mt-4 cursor-pointer rounded-xl px-10 py-4 text-lg font-bold tracking-widest text-white gradient-bg-pink shadow-[0_0_30px_rgba(233,30,140,0.3)] transition-all hover:shadow-[0_0_50px_rgba(233,30,140,0.5)] hover:scale-105 active:scale-95"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          LET&rsquo;S PLAY
        </motion.button>

        {/* Subtle hint */}
        <motion.p
          className="text-xs text-muted-foreground/40 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          ~2 minutes &middot; no account needed
        </motion.p>
      </motion.div>
    </div>
  );
}
