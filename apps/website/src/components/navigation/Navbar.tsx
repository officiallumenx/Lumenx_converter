import { Link } from "@tanstack/react-router";
import { NAV_LINKS } from "@/content/nav";

export function Navbar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="site-nav-link"
          activeOptions={link.to === "/" ? { exact: true } : undefined}
          activeProps={{ className: "active", "aria-current": "page" }}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
