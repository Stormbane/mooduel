/** Labeled dimension bar with numeric value */
export function DimBar({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  const pct = signed ? ((value + 1) / 2) * 100 : value * 100;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground/60 w-24 shrink-0 text-right font-mono">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/20 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-pop-purple)]" style={{ width: `${Math.max(2, pct)}%`, opacity: 0.7 }} />
      </div>
      <span className="text-muted-foreground/40 w-10 font-mono text-right">{value.toFixed(2)}</span>
    </div>
  );
}
