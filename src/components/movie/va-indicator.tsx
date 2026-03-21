/** Tiny 2D dot showing a movie's position in valence × arousal space */
export function VAIndicator({ valence, arousal, size = 32 }: { valence: number; arousal: number; size?: number }) {
  const x = ((valence + 1) / 2) * 100;
  const y = ((1 - (arousal + 1) / 2)) * 100;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`Valence: ${valence.toFixed(2)}, Arousal: ${arousal.toFixed(2)}`}
    >
      <div className="absolute inset-0 border border-border/20 rounded-sm">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/10" />
      </div>
      <div
        className="absolute w-2 h-2 rounded-full bg-[var(--color-pop-pink)] shadow-[0_0_6px_rgba(233,30,140,0.6)]"
        style={{ left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)` }}
      />
    </div>
  );
}
