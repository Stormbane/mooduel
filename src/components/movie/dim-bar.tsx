import { FieldTooltip } from "@/components/ui/field-tooltip";

/** Labeled dimension bar with numeric value and hover tooltip */
export function DimBar({ label, value, fieldKey, signed = false }: { label: string; value: number; fieldKey?: string; signed?: boolean }) {
  const pct = signed ? ((value + 1) / 2) * 100 : value * 100;
  const labelEl = (
    <span className="text-muted-foreground/80 w-24 shrink-0 text-right font-mono cursor-help text-[11px]">{label}</span>
  );
  return (
    <div className="flex items-center gap-3 text-xs">
      {fieldKey ? <FieldTooltip fieldKey={fieldKey}>{labelEl}</FieldTooltip> : labelEl}
      <div className="flex-1 h-2 rounded-full bg-border/20 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-pop-purple)]" style={{ width: `${Math.max(2, pct)}%`, opacity: 0.8 }} />
      </div>
      <span className="text-muted-foreground/60 w-10 font-mono text-right text-[11px]">{value.toFixed(2)}</span>
    </div>
  );
}
