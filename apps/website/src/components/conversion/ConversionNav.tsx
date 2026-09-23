import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/get-started", label: "Get started" },
  { to: "/contact", label: "Book a Demo" },
] as const;

export function ConversionNav({
  active,
}: {
  active: (typeof LINKS)[number]["to"];
}) {
  return (
    <nav className="site-product-nav mb-10" aria-label="Start with LumenX">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          search={link.to === "/contact" ? { intent: "demo" } : {}}
          aria-current={link.to === active ? "page" : undefined}
          className="site-product-nav__item"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
