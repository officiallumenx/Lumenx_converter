import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { SiteLogo } from "./SiteLogo";
import { CTAButton } from "./conversion/CTAButton";
import { Navbar } from "./navigation/Navbar";
import { MobileNavbar } from "./navigation/MobileNavbar";
import { Container } from "./layout/Container";

export function SiteHeader({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenuOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, onMenuOpenChange]);

  return (
    <header className="site-header">
      <Container className="site-header-bar">
        <Link
          to="/"
          aria-label="LumenX home"
          className="inline-flex min-h-11 min-w-11 items-center rounded-md"
          onClick={() => onMenuOpenChange(false)}
        >
          <SiteLogo />
        </Link>
        <Navbar onNavigate={() => onMenuOpenChange(false)} />
        <div className="flex items-center gap-2">
          <CTAButton asChild size="md">
            <Link to="/get-started" search={{}} onClick={() => onMenuOpenChange(false)}>
              Get started
            </Link>
          </CTAButton>
          <div className="xl:hidden">
            <CTAButton
              type="button"
              variant="secondary"
              size="icon"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-haspopup="dialog"
              onClick={() => onMenuOpenChange(!menuOpen)}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            </CTAButton>
          </div>
        </div>
      </Container>
      <MobileNavbar open={menuOpen} onNavigate={() => onMenuOpenChange(false)} />
    </header>
  );
}
