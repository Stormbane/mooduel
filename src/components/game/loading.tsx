"use client";

export function GameLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in duration-300">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 w-16 rounded-lg bg-muted animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Finding movies...
      </p>
    </div>
  );
}
