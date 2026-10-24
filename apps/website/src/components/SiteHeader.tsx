import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lumenx/ui";
import { SiteLogo } from "./SiteLogo";
import { SiteButton } from "./SiteButton";
import { CTAButton } from "./conversion/CTAButton";
import { Navbar } from "./navigation/Navbar";
import { MobileNavbar } from "./navigation/MobileNavbar";
import { Container } from "./layout/Container";
import { contactSearch } from "@/lib/search";

export function SiteHeader({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
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
        <div className="site-header-actions">
          <CTAButton asChild variant="ghost" size="md" className="site-header-login">
            <Link to="/login" onClick={() => onMenuOpenChange(false)}>
              Login
            </Link>
          </CTAButton>
          <CTAButton asChild size="md">
            <Link
              to="/contact"
              search={contactSearch("demo")}
              onClick={() => onMenuOpenChange(false)}
            >
              Book a Demo
            </Link>
          </CTAButton>
          <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
            <SheetTrigger asChild>
              <SiteButton
                type="button"
                variant="secondary"
                size="icon"
                className="site-header-menu-trigger"
                aria-controls="mobile-nav"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open menu</span>
              </SiteButton>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <MobileNavbar onNavigate={() => onMenuOpenChange(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
