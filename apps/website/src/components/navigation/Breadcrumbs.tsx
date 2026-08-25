import { Link } from "@tanstack/react-router";

export type Crumb = {
  label: string;
  to?:
    | "/"
    | "/products"
    | "/solutions"
    | "/features"
    | "/modules"
    | "/how-it-works"
    | "/demo"
    | "/demos"
    | "/pricing"
    | "/download"
    | "/downloads"
    | "/contact"
    | "/get-started";
};

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="site-crumbs">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`}>
              {i > 0 ? (
                <span className="site-crumbs__sep" aria-hidden>
                  /
                </span>
              ) : null}
              {last || !item.to ? (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
