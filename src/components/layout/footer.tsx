"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/games", label: "Games", color: "#8B5CF6" },
  { href: "/explore", label: "Explore", color: "#1ED760" },
  { href: "/dashboard", label: "Dashboard", color: "#38BDF8" },
];

interface FooterProps {
  maxWidth?: string;
}

export function Footer({ maxWidth = "max-w-[1200px]" }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-[oklch(0.25_0_0)] px-6 py-8">
      <div
        className={`${maxWidth} mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-[family-name:var(--font-display)] font-bold text-sm text-muted-foreground/60 transition-colors duration-150"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = link.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "";
              }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/Stormbane/mooduel"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-display)] font-bold text-sm text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
          >
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://buymeacoffee.com/stormbane"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-display)] font-bold text-sm text-muted-foreground/60 transition-colors duration-150"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FBBF24";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "";
            }}
          >
            Support
          </a>
          <span className="text-sm text-muted-foreground/30">CC-BY-NC-4.0</span>
        </div>
      </div>
    </footer>
  );
}
