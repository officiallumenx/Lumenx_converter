import { Link } from "@tanstack/react-router";
import { NAV_LINKS } from "@/content/nav";

export function MobileNavbar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate?: () => void;
}) {
  if (!open) return null;
  return (
    <div
      id="mobile-nav"
      className="site-mobile-nav xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <nav aria-label="Primary">
        <ul className="site-container flex flex-col py-2">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="site-nav-link w-full"
                activeOptions={link.to === "/" ? { exact: true } : undefined}
                activeProps={{ className: "active", "aria-current": "page" }}
                onClick={onNavigate}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
