"use client";

import { useEffect, useRef } from "react";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MovieCard } from "./movie-card";

interface MovieDialogProps {
  movie: SlimMoodMovie | null;
  open: boolean;
  onClose: () => void;
}

export function MovieDialog({ movie, open, onClose }: MovieDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-4 sm:p-8 backdrop:bg-black/60 open:flex open:items-center open:justify-center"
    >
      {movie && (
        <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-background border border-border/30">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 rounded-lg bg-card/80 border border-border/30 px-2 py-1 text-xs text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            ✕
          </button>
          <MovieCard movie={movie} variant="expanded" />
        </div>
      )}
    </dialog>
  );
}
