"use client";

import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/components/auth/auth-button";

const NAV_LINKS = [
  { href: "/games", label: "Games", color: "#8B5CF6" },
  { href: "/explore", label: "Explore", color: "#1ED760" },
  { href: "/dashboard", label: "Dashboard", color: "#38BDF8" },
];

interface NavBarProps {
  currentPage?: string;
  maxWidth?: string;
  logoHref?: string;
}

export function NavBar({
  currentPage,
  maxWidth = "max-w-[1200px]",
  logoHref = "/",
}: NavBarProps) {
  return (
    <nav
      className={`relative z-20 flex items-center justify-between px-0 py-4 ${maxWidth} mx-auto`}
    >
      <Link
        href={logoHref}
        className="shrink-0 opacity-80 hover:opacity-100 transition-opacity duration-150"
      >
        <Image
          src="/logo.png"
          alt="Mooduel"
          width={260}
          height={80}
          className="h-12 w-auto"
        />
      </Link>
      <div className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (

          <Link
            key={link.href}
            href={link.href}
            className="font-[family-name:var(--font-display)] font-bold text-base text-muted-foreground/80 transition-colors duration-150"
            style={
              currentPage === link.href
                ? { color: link.color }
                : undefined
            }
            onMouseEnter={(e) => {
              if (currentPage !== link.href) {
                e.currentTarget.style.color = link.color;
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== link.href) {
                e.currentTarget.style.color = "";
              }
            }}
          >
            {link.label}
          </Link>
        ))}
        <AuthButton />
      </div>
    </nav>
  );
}
