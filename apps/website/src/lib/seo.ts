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
    title: "LumenX — Institute operations, families, and transport",
    description:
      "LumenX is the institute platform for administration, families, and transport — from a single branch to a group of institutes. One record, six products.",
  },
  products: {
    path: "/products",
    title: "Products — LumenX",
    description:
      "Six LumenX products, one institute record: Admin, Connect, Transport, Admissions, Careers, and Nexus. Each has a job; none replace another role’s app.",
  },
  solutions: {
    path: "/solutions",
    title: "Solutions — LumenX",
    description:
      "What LumenX does for institutions, administrators, teachers, parents, students, drivers, applicants, and careers — each role in the right product.",
  },
  features: {
    path: "/features",
    title: "Features — LumenX",
    description:
      "LumenX capabilities across academics, administration, communication, operations, admissions, careers, and documents — explained clearly for institutes.",
  },
  modules: {
    path: "/modules",
    title: "Modules — LumenX",
    description:
      "Browse LumenX modules by app: Admin, Connect (Parent, Teacher, Student), Transport, Admissions, and Careers. Nexus service tooling is not listed — it is not a school module set.",
  },
  howItWorks: {
    path: "/how-it-works",
    title: "How it works — LumenX",
    description:
      "How LumenX is layered: the institute record in Admin, families in Connect, trips in Transport, intake and hiring as portals, Nexus as the service platform.",
  },
  demo: {
    path: "/demo",
    title: "Demo — LumenX",
    description:
      "Explore LumenX Admin, Connect, Transport, Admissions, and Careers with mock screens. No account, no live institute data, and no payment on this site.",
  },
  pricing: {
    path: "/pricing",
    title: "Pricing — LumenX",
    description:
      "LumenX for institutes: about ₹12 per student each month, campus from ₹8,000/month, and a 60-day trial after approval. One clear campus subscription.",
  },
  downloads: {
    path: "/downloads",
    title: "Downloads — LumenX",
    description:
      "Open LumenX web apps when they are public. Android and iOS stay Coming soon until a real store listing is configured. No invented APK or store URLs.",
  },
  getStarted: {
    path: "/get-started",
    title: "Get started — LumenX",
    description:
      "Explore LumenX, choose the product that matches the job, then start a 60-day trial, open a mock demo, or request a quote. This site does not take payment.",
  },
  contact: {
    path: "/contact",
    title: "Contact — LumenX",
    description:
      "Leave a message about LumenX, start a 60-day trial, or request a quote. Share your name, email, phone, and question — we’ll get back to you.",
  },
} as const satisfies Record<string, PageSeoInput>;

export const PRODUCT_SEO: Record<ProductId, PageSeoInput> = {
  admin: {
    path: "/products/admin",
    title: "LumenX Admin — Institute operations console",
    description:
      "LumenX Admin is the office console for people, classes, attendance, fees, and documents. It is the source of truth — not the family, driver, or student app.",
  },
  connect: {
    path: "/products/connect",
    title: "LumenX Connect — Parent, teacher, and student portal",
    description:
      "LumenX Connect is how families and teachers use the institute: attendance, fees, homework, and messages with strict role isolation. Not the office console.",
  },
  transport: {
    path: "/products/transport",
    title: "LumenX Transport — Driver app for trips and boarding",
    description:
      "LumenX Transport is the driver app for routes, boarding, and trip status. Families follow status in Connect — this site does not claim a live parent GPS map.",
  },
  admissions: {
    path: "/products/admissions",
    title: "LumenX Admissions — Applications as a Connect portal",
    description:
      "LumenX Admissions is a first-class product delivered as a Connect portal. Applications become student records in Admin. No separate admissions APK here.",
  },
  careers: {
    path: "/products/careers",
    title: "LumenX Careers — Hiring as a Connect portal",
    description:
      "LumenX Careers helps institutes hire — jobs and applications in one place; Admin turns an approved hire into a teacher record.",
  },
  nexus: {
    path: "/products/nexus",
    title: "LumenX Nexus — Service platform for quality and feedback",
    description:
      "LumenX Nexus is the service platform: licensing, support, institute feedback, and platform health. Not the school ERP — Admin still runs the day. Web only for groups and operators.",
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
  return `User-agent: *\nAllow: /\nDisallow: /download\nDisallow: /demos\n\n${sitemap}`;
}

export function sitemapXml(origin: string, paths: readonly string[] = ["/"]): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = paths
    .map((path) => {
      const loc = path === "/" ? `${origin}/` : `${origin}${path}`;
      const priority = path === "/" ? "1.0" : path.startsWith("/products/") ? "0.8" : "0.7";
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.w3.org/2000/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
