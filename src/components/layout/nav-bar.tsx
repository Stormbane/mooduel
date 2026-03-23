import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/play", label: "Play", color: "hover:text-[var(--color-pop-pink)]" },
  { href: "/games", label: "Games", color: "hover:text-[var(--color-pop-purple)]" },
  { href: "/explore", label: "Explore", color: "hover:text-[var(--color-pop-green)]" },
  { href: "/dashboard", label: "Dashboard", color: "hover:text-[var(--color-pop-blue)]" },
  { href: "/about", label: "About", color: "hover:text-[var(--color-pop-orange)]" },
];

interface NavBarProps {
  currentPage?: string;
  maxWidth?: string;
  logoHref?: string;
}

export function NavBar({ currentPage, maxWidth = "max-w-6xl", logoHref = "/" }: NavBarProps) {
  return (
    <nav className={`relative z-20 flex items-center justify-between px-6 py-4 ${maxWidth} mx-auto`}>
      <Link href={logoHref} className="flex items-center gap-2 opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-200">
        <Image src="/logo.png" alt="Mooduel" width={160} height={40} className="h-8 w-auto" />
      </Link>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              currentPage === link.href
                ? "text-foreground font-medium"
                : `${link.color} hover:scale-110 transition-all duration-200 origin-center`
            }
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
