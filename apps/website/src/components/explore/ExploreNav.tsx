import { Link } from "@tanstack/react-router";
import { EXPLORE_LINKS } from "@/content/nav";

export function ExploreNav({
  active,
}: {
  active: (typeof EXPLORE_LINKS)[number]["to"];
}) {
  return (
    <nav className="site-product-nav mb-10" aria-label="Explore LumenX">
      {EXPLORE_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          search={{}}
          aria-current={link.to === active ? "page" : undefined}
          className="site-product-nav__item"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
