import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SkipLink } from "./SkipLink";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { enableSiteMotion } from "@/motion/enable";
import { useMenuFocusTrap } from "./navigation/useMenuFocusTrap";

function PageMotion({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const skipEntrance = useRef(true);
  useEffect(() => {
    skipEntrance.current = false;
  }, []);
  return (
    <div key={pathname} className={skipEntrance.current ? undefined : "site-page"}>
      {children}
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const chromeRef = useRef<HTMLDivElement>(null);
  useEffect(() => enableSiteMotion(), []);
  useMenuFocusTrap(menuOpen, chromeRef);

  return (
    <div className="site-shell flex min-h-svh flex-col">
      <div className="site-atmosphere" aria-hidden>
        <div className="site-atmosphere__mesh" />
        <div className="site-atmosphere__blob site-atmosphere__blob--a" />
        <div className="site-atmosphere__blob site-atmosphere__blob--b" />
        <div className="site-atmosphere__blob site-atmosphere__blob--c" />
      </div>
      <div className="site-chrome" ref={chromeRef}>
        <SkipLink />
        <SiteHeader menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />
      </div>
      <main id="main" className="flex-1" inert={menuOpen || undefined}>
        <PageMotion>{children}</PageMotion>
      </main>
      <div inert={menuOpen || undefined}>
        <SiteFooter />
      </div>
    </div>
  );
}
