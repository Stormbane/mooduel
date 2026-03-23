import Link from "next/link";

interface FooterProps {
  maxWidth?: string;
}

const footerLink = "hover:scale-110 transition-all duration-200 origin-center inline-block";

export function Footer({ maxWidth = "max-w-6xl" }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-border/20 py-10 px-6">
      <div className={`${maxWidth} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
          <Link href="/explore" className={`${footerLink} hover:text-[var(--color-pop-green)]`}>Explore</Link>
          <span className="text-muted-foreground/20">·</span>
          <Link href="/dashboard" className={`${footerLink} hover:text-[var(--color-pop-blue)]`}>Dashboard</Link>
          <span className="text-muted-foreground/20">·</span>
          <Link href="/about" className={`${footerLink} hover:text-[var(--color-pop-orange)]`}>About</Link>
          <span className="text-muted-foreground/20">·</span>
          <a href="https://github.com/Stormbane/mooduel" target="_blank" rel="noopener noreferrer" className={`${footerLink} hover:text-[var(--color-pop-purple)]`}>GitHub</a>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground/50">
          <a href="https://buymeacoffee.com/stormbane" target="_blank" rel="noopener noreferrer" className={`${footerLink} hover:text-[var(--color-pop-yellow)]`}>☕ Support</a>
          <span className="text-muted-foreground/20">·</span>
          <span className="text-muted-foreground/30">CC-BY-NC-4.0</span>
        </div>
      </div>
    </footer>
  );
}
