import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/content/nav";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";
import { canonicalUrl, getSiteOrigin, isNoIndex } from "./site";

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
};

export type PageHead = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
};

function clampDescription(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157).trimEnd()}…`;
}

export function pageHead(seo: PageSeoInput): PageHead {
  const url = canonicalUrl(seo.path);
  const origin = getSiteOrigin();
  const image = origin ? `${origin}/og.png` : undefined;
  const title = seo.title;
  const description = clampDescription(seo.description);
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = clampDescription(seo.ogDescription ?? description);

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_IN" },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
  ];

  if (url) {
    meta.push({ property: "og:url", content: url });
  }
  if (image) {
    meta.push(
      { property: "og:image", content: image },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { name: "twitter:image", content: image },
    );
  }
  if (isNoIndex()) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: Array<Record<string, string>> = [];
  if (url) links.push({ rel: "canonical", href: url });

  return { meta, links };
}

export const PAGE_SEO = {
  home: {
    path: "/",
    title: "LumenX | Smart Institute Management Platform",
    description:
      "Run your entire institution from one connected platform. LumenX brings administration, academics, communication, transport, admissions and careers together.",
  },
  platform: {
    path: "/platform",
    title: "LumenX Platform | Connected Institution Management",
    description:
      "See how Admin, Connect, Transport, Admissions, and Careers work as one LumenX platform — not a pile of unrelated products.",
  },
  solutions: {
    path: "/solutions",
    title: "LumenX Solutions | Tools for Institutions, Teachers & Parents",
    description:
      "All LumenX solutions on one page — institutions, administrators, teachers, parents, students, and drivers.",
  },
  modules: {
    path: "/modules",
    title: "LumenX Modules | Institute Management Modules",
    description:
      "All LumenX modules in one place — Admin, Connect (parent, teacher, student), Transport, Admissions, and Careers.",
  },
  pricing: {
    path: "/pricing",
    title: "LumenX Pricing | Simple Institute Management Pricing",
    description:
      "Per-student rate set for your campus (often ₹12–₹15). One monthly bill: higher of students × rate, or ₹8,000 minimum. 60-day trial.",
  },
  resources: {
    path: "/resources",
    title: "LumenX Resources | Help, FAQs & Downloads",
    description:
      "Explore LumenX help, FAQs, and downloads. Store links appear only when real.",
  },
  help: {
    path: "/resources/help",
    title: "Help — LumenX",
    description:
      "How to get started with LumenX, where login credentials come from, and how to contact us for trials and privacy requests.",
  },
  faq: {
    path: "/resources/faq",
    title: "FAQs — LumenX",
    description:
      "Answers about LumenX products, pricing, trial, transport status, and getting started — without invented metrics.",
  },
  downloads: {
    path: "/resources/downloads",
    title: "Downloads — LumenX",
    description:
      "Get LumenX Connect and Transport on mobile. Open Admin and Careers on the web when configured. Store links appear only when real.",
  },
  about: {
    path: "/about",
    title: "About LumenX | Connected Institute Platform",
    description:
      "Why LumenX exists, how one connected platform replaces fragmented institute tools, and the principles behind Admin, Connect, Transport, Admissions, and Careers.",
  },
  getStarted: {
    path: "/get-started",
    title: "Get started — LumenX",
    description:
      "Start with LumenX — tell us about your institute and interests. A 60-day trial begins after approval. This site does not take payment.",
  },
  contact: {
    path: "/contact",
    title: "Contact — LumenX",
    description:
      "Leave a message, book a demo, start a trial, request a quote, or talk partnership. We only confirm receipt when delivery is configured.",
  },
  login: {
    path: "/login",
    title: "Login — LumenX",
    description:
      "Open LumenX web apps when public origins are configured. Institute offices issue login credentials — this site does not publish passwords.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy — LumenX",
    description: "How LumenX collects, uses, and protects personal data across the platform, with India DPDP-focused rights and contacts.",
  },
  terms: {
    path: "/terms",
    title: "Terms & Conditions — LumenX",
    description: "Terms governing use of the LumenX education technology platform and related applications.",
  },
  cookies: {
    path: "/cookies",
    title: "Cookie Policy — LumenX",
    description: "How LumenX uses cookies and similar technologies for authentication, preferences, and service reliability.",
  },
  dataRequest: {
    path: "/data-request",
    title: "Data Request — LumenX",
    description:
      "Request access, correction, or erasure of personal data, or ask about account deletion. Routed through published privacy contacts.",
  },
  /** Legacy paths kept for redirects / old bookmarks */
  products: {
    path: "/platform",
    title: "LumenX Platform | Connected Institution Management",
    description:
      "Six surfaces, one institute record: Admin, Connect, Transport, Admissions, and Careers — presented as one platform.",
  },
  features: {
    path: "/modules",
    title: "LumenX Modules | Institute Management Modules",
    description:
      "LumenX capabilities across academics, administration, communication, operations, admissions, careers, and documents.",
  },
  howItWorks: {
    path: "/platform",
    title: "LumenX Platform | Connected Institution Management",
    description:
      "How LumenX is layered: the institute record in Admin, families in Connect, trips in Transport, intake and hiring in Admissions and Careers.",
  },
} as const satisfies Record<string, PageSeoInput>;

export const PRODUCT_SEO: Record<ProductId, PageSeoInput> = {
  admin: {
    path: "/platform/admin",
    title: "LumenX Admin — Institute operations console",
    description:
      "LumenX Admin is the office console for people, classes, attendance, fees, and documents. It is the source of truth — not the family, driver, or student app.",
  },
  connect: {
    path: "/platform/connect",
    title: "LumenX Connect — Parent, teacher, and student portal",
    description:
      "LumenX Connect is how families and teachers use the institute: attendance, fees, homework, and messages with strict role isolation.",
  },
  transport: {
    path: "/platform/transport",
    title: "LumenX Transport — Driver app for trips and boarding",
    description:
      "LumenX Transport is the driver app for routes, boarding, and trip status. Families follow status in Connect — this site does not claim a live parent GPS map.",
  },
  admissions: {
    path: "/platform/admissions",
    title: "LumenX Admissions — Applications and intake",
    description:
      "LumenX Admissions helps applicants apply and the office review intake. Applications become student records in Admin.",
  },
  careers: {
    path: "/platform/careers",
    title: "LumenX Careers — Hiring for institutes",
    description:
      "LumenX Careers helps institutes hire — jobs and applications in one place; Admin turns an approved hire into a teacher record.",
  },
  nexus: {
    path: "/about",
    title: "About LumenX",
    description:
      "Nexus is an operator and group service surface. Public marketing focuses on Admin, Connect, Transport, Admissions, and Careers.",
  },
};

export function organizationJsonLd() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    ...(origin
      ? {
          url: `${origin}/`,
          logo: `${origin}/brand/lumenx-logo.png`,
        }
      : {}),
  };
}

export function websiteJsonLd() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    ...(origin ? { url: `${origin}/` } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

export function productJsonLd(id: ProductId) {
  const seo = PRODUCT_SEO[id];
  const family = PRODUCT_FAMILY[id];
  const url = canonicalUrl(seo.path);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: family.name,
    applicationCategory: "BusinessApplication",
    description: seo.description,
    ...(url ? { url } : {}),
    isPartOf: {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path?: string }[]) {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(origin && item.path ? { item: canonicalUrl(item.path) } : {}),
    })),
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function robotsTxt(origin: string): string {
  if (isNoIndex()) {
    return "User-agent: *\nDisallow: /\n";
  }
  const sitemap = origin ? `Sitemap: ${origin}/sitemap.xml\n` : "";
  return `User-agent: *\nAllow: /\nDisallow: /download\nDisallow: /demos\nDisallow: /products\nDisallow: /features\nDisallow: /how-it-works\nDisallow: /demo\nDisallow: /downloads\n\n${sitemap}`;
}

export function sitemapXml(origin: string, paths: readonly string[] = ["/"]): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = paths
    .map((path) => {
      const loc = path === "/" ? `${origin}/` : `${origin}${path}`;
      const priority =
        path === "/"
          ? "1.0"
          : path.startsWith("/platform/")
            ? "0.8"
            : path.startsWith("/solutions/")
              ? "0.8"
              : "0.7";
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.w3.org/2000/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
