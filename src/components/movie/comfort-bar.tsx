/** Colored comfort level bar — green (high) to red (low) */
export function ComfortBar({ level }: { level: number }) {
  const hue = level * 120; // 0=red, 120=green
  return (
    <div className="w-full h-1 rounded-full bg-border/20 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${level * 100}%`,
          backgroundColor: `hsl(${hue}, 70%, 50%)`,
          boxShadow: `0 0 8px hsla(${hue}, 70%, 50%, 0.4)`,
        }}
      />
    </div>
  );
}
