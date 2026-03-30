import Link from "next/link";

interface FooterProps {
  maxWidth?: string;
}

export function Footer({ maxWidth = "max-w-[1200px]" }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-[oklch(0.25_0_0)] px-6 py-8">
      <div
        className={`${maxWidth} mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted-foreground/40`}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/games"
            className="hover:text-[#8B5CF6] transition-colors duration-150"
          >
            Games
          </Link>
          <Link
            href="/explore"
            className="hover:text-[#1ED760] transition-colors duration-150"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-[#38BDF8] transition-colors duration-150"
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/Stormbane/mooduel"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors duration-150"
          >
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://buymeacoffee.com/stormbane"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#FBBF24] transition-colors duration-150"
          >
            Support
          </a>
          <span>CC-BY-NC-4.0</span>
        </div>
      </div>
    </footer>
  );
}
