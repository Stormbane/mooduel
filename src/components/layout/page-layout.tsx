import { NavBar } from "./nav-bar";
import { Footer } from "./footer";

interface PageLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  maxWidth?: string;
  navMaxWidth?: string;
  hideFooter?: boolean;
  /** @deprecated No longer used — kept for backwards compatibility */
  patternColor?: string;
}

export function PageLayout({
  children,
  currentPage,
  maxWidth = "max-w-[1200px]",
  navMaxWidth,
  hideFooter = false,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar
        currentPage={currentPage}
        maxWidth={navMaxWidth || maxWidth}
      />
      <main className={`relative z-10 px-6 pb-24 ${maxWidth} mx-auto`}>
        {children}
      </main>
      {!hideFooter && <Footer maxWidth={maxWidth} />}
    </div>
  );
}
