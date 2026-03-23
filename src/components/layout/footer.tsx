import Link from "next/link";

interface FooterProps {
  maxWidth?: string;
}

export function Footer({ maxWidth = "max-w-6xl" }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-border/20 py-10 px-6">
      <div className={`${maxWidth} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <span className="text-muted-foreground/20">·</span>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="text-muted-foreground/20">·</span>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <span className="text-muted-foreground/20">·</span>
          <a href="https://github.com/Stormbane/mooduel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
          <a href="https://buymeacoffee.com/stormbane" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-pop-yellow)] transition-colors">☕ Support</a>
          <span className="text-muted-foreground/20">·</span>
          <span className="text-muted-foreground/30">CC-BY-NC-4.0</span>
        </div>
      </div>
    </footer>
  );
}
