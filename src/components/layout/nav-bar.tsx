import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/play", label: "Play" },
  { href: "/games", label: "Games" },
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
];

interface NavBarProps {
  currentPage?: string;
  maxWidth?: string;
  logoHref?: string;
}

export function NavBar({ currentPage, maxWidth = "max-w-6xl", logoHref = "/" }: NavBarProps) {
  return (
    <nav className={`relative z-20 flex items-center justify-between px-6 py-4 ${maxWidth} mx-auto`}>
      <Link href={logoHref} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <Image src="/logo.svg" alt="Mooduel" width={120} height={24} className="h-6 w-auto" />
      </Link>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              currentPage === link.href
                ? "text-foreground font-medium"
                : "hover:text-foreground transition-colors"
            }
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
