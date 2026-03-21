import { BGPattern } from "@/components/ui/bg-pattern";
import { NavBar } from "./nav-bar";

interface PageLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  maxWidth?: string;
  navMaxWidth?: string;
  patternColor?: string;
}

export function PageLayout({
  children,
  currentPage,
  maxWidth = "max-w-6xl",
  navMaxWidth,
  patternColor = "rgba(139,92,246,0.15)",
}: PageLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <BGPattern variant="dots" mask="fade-edges" size={32} fill={patternColor} />
      <NavBar currentPage={currentPage} maxWidth={navMaxWidth || maxWidth} />
      <main className={`relative z-10 px-6 pb-24 ${maxWidth} mx-auto`}>
        {children}
      </main>
    </div>
  );
}
