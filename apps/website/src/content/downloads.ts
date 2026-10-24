import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { PRODUCT_PAGES } from "./product-pages";

function readUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Ignore Cloudflare preview hosts so the marketing site never links to workers.dev. */
export function marketingWebUrl(value: string | undefined, fallback: string | null): string | null {
  const trimmed = value?.trim().replace(/\/$/, "") ?? "";
  if (!trimmed) return fallback;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === "workers.dev" || host.endsWith(".workers.dev")) return fallback;
    return trimmed;
  } catch {
    return fallback;
  }
}

function readVersion(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type PlatformOffer = "web" | "android" | "desktop" | "via-connect" | "not-offered";

export type DownloadChannel = {
  id: ProductId;
  slug: ProductId;
  description: string;
  webNote: string;
  webUrl: string | null;
  apkUrl: string | null;
  playStoreUrl: string | null;
  desktopUrl: string | null;
  version: string | null;
  platforms: {
    web: PlatformOffer;
    android: PlatformOffer;
    desktop: PlatformOffer;
  };
};

const CONNECT_WEB = marketingWebUrl(import.meta.env.VITE_CONNECT_ORIGIN, "https://connect.lumenxtech.in");
const CAREERS_STANDALONE = marketingWebUrl(
  import.meta.env.VITE_CAREERS_ORIGIN,
  "https://careers.lumenxtech.in",
);
const ADMISSIONS_STANDALONE = marketingWebUrl(
  import.meta.env.VITE_ADMISSIONS_ORIGIN,
  "https://admissions.lumenxtech.in",
);
const TRANSPORT_WEB = marketingWebUrl(
  import.meta.env.VITE_TRANSPORT_ORIGIN,
  "https://transport.lumenxtech.in",
);
const ADMIN_WEB = marketingWebUrl(import.meta.env.VITE_ADMIN_ORIGIN, "https://admin.lumenxtech.in");
const NEXUS_WEB = marketingWebUrl(import.meta.env.VITE_NEXUS_ORIGIN, "https://nexus.lumenxtech.in");

/**
 * Exact product/platform matrix for the marketing download center.
 * Download CTAs must use androidHref / desktopHref (null until a real HTTPS artifact URL is set).
 */
export const DOWNLOADS: Record<ProductId, DownloadChannel> = {
  admin: {
    id: "admin",
    slug: "admin",
    description: PRODUCT_PAGES.admin.purpose,
    webNote: "Institute office console — web app, Android APK, and Windows installer when published.",
    webUrl: ADMIN_WEB,
    apkUrl: readUrl(import.meta.env.VITE_ADMIN_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_ADMIN_PLAY_URL),
    desktopUrl: readUrl(import.meta.env.VITE_ADMIN_DESKTOP_URL),
    version: readVersion(import.meta.env.VITE_ADMIN_VERSION),
    platforms: { web: "web", android: "android", desktop: "desktop" },
  },
  nexus: {
    id: "nexus",
    slug: "nexus",
    description: PRODUCT_PAGES.nexus.purpose,
    webNote: "Service platform — web app, Android APK, and Windows installer when published.",
    webUrl: NEXUS_WEB,
    apkUrl: readUrl(import.meta.env.VITE_NEXUS_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_NEXUS_PLAY_URL),
    desktopUrl: readUrl(import.meta.env.VITE_NEXUS_DESKTOP_URL),
    version: readVersion(import.meta.env.VITE_NEXUS_VERSION),
    platforms: { web: "web", android: "android", desktop: "desktop" },
  },
  connect: {
    id: "connect",
    slug: "connect",
    description: PRODUCT_PAGES.connect.purpose,
    webNote: "Parent, teacher, and student app — Android APK download only on this site.",
    webUrl: null,
    apkUrl: readUrl(import.meta.env.VITE_CONNECT_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_CONNECT_PLAY_URL),
    desktopUrl: null,
    version: readVersion(import.meta.env.VITE_CONNECT_VERSION),
    platforms: { web: "not-offered", android: "android", desktop: "not-offered" },
  },
  transport: {
    id: "transport",
    slug: "transport",
    description: PRODUCT_PAGES.transport.purpose,
    webNote: "Driver and fleet app — Android APK download only on this site.",
    webUrl: null,
    apkUrl: readUrl(import.meta.env.VITE_TRANSPORT_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_TRANSPORT_PLAY_URL),
    desktopUrl: null,
    version: readVersion(import.meta.env.VITE_TRANSPORT_VERSION),
    platforms: { web: "not-offered", android: "android", desktop: "not-offered" },
  },
  admissions: {
    id: "admissions",
    slug: "admissions",
    description: PRODUCT_PAGES.admissions.purpose,
    webNote: ADMISSIONS_STANDALONE
      ? "Admissions portal — web and Android APK when published."
      : "Admissions web opens via Connect until a standalone origin is public. Android APK when published.",
    webUrl: ADMISSIONS_STANDALONE ?? CONNECT_WEB,
    apkUrl: readUrl(import.meta.env.VITE_ADMISSIONS_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_ADMISSIONS_PLAY_URL),
    desktopUrl: null,
    version: null,
    platforms: {
      web: ADMISSIONS_STANDALONE ? "web" : "via-connect",
      android: "android",
      desktop: "not-offered",
    },
  },
  careers: {
    id: "careers",
    slug: "careers",
    description: PRODUCT_PAGES.careers.purpose,
    webNote: CAREERS_STANDALONE
      ? "Careers portal — web and Android APK when published."
      : "Careers web opens via Connect until a standalone origin is public. Android APK when published.",
    webUrl: CAREERS_STANDALONE ?? CONNECT_WEB,
    apkUrl: readUrl(import.meta.env.VITE_CAREERS_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_CAREERS_PLAY_URL),
    desktopUrl: null,
    version: null,
    platforms: {
      web: CAREERS_STANDALONE ? "web" : "via-connect",
      android: "android",
      desktop: "not-offered",
    },
  },
};

export const DOWNLOAD_LIST = (
  ["admin", "nexus", "connect", "transport", "admissions", "careers"] as const
).map((id) => DOWNLOADS[id]);

/** Real Play / APK URL only — never fall back to web for a download CTA. */
export function androidHref(channel: DownloadChannel): string | null {
  if (channel.platforms.android === "not-offered") return null;
  return channel.playStoreUrl ?? channel.apkUrl;
}

/** Real Windows installer URL only. */
export function desktopHref(channel: DownloadChannel): string | null {
  if (channel.platforms.desktop === "not-offered") return null;
  return channel.desktopUrl;
}

export function qrHref(channel: DownloadChannel): string | null {
  return channel.webUrl ?? androidHref(channel) ?? desktopHref(channel);
}

export function platformStateLabel(offer: PlatformOffer, href: string | null): string {
  if (offer === "not-offered") return "Not offered";
  if (offer === "via-connect") return href ? "Via Connect" : "Not published";
  if (href) return "Live";
  return "Not published";
}

export function releaseLabel(channel: DownloadChannel): string {
  const hasWeb = Boolean(channel.webUrl);
  const hasApk = Boolean(androidHref(channel));
  const hasDesktop = Boolean(desktopHref(channel));
  if (hasApk || hasDesktop) return "Downloads live";
  if (hasWeb) return "Web live";
  return "Not published";
}

export function webButtonLabel(channel: DownloadChannel): string {
  if (channel.platforms.web === "via-connect") return "Open via Connect";
  return "Open Web App";
}

export function androidButtonLabel(channel: DownloadChannel): string {
  if (channel.playStoreUrl) return "Get on Google Play";
  if (channel.apkUrl) return "Download for Android";
  if (channel.platforms.android === "not-offered") return "Not on Android";
  return "Android not published";
}

export function desktopButtonLabel(channel: DownloadChannel): string {
  if (channel.desktopUrl) return "Download for Windows";
  if (channel.platforms.desktop === "not-offered") return "Not on Windows";
  return "Windows not published";
}

/** @deprecated iOS not in the approved matrix — kept for older call sites. */
export function iosHref(_channel: DownloadChannel): string | null {
  return null;
}

/** @deprecated */
export function iosButtonLabel(_channel: DownloadChannel): string {
  return "Not on iOS";
}

export function downloadTitle(id: ProductId): string {
  return PRODUCT_FAMILY[id].name;
}

/** Stable CDN paths once R2 is live (set via VITE_* env; do not invent live URLs). */
export const DOWNLOADS_CDN_BASE = "https://downloads.lumenxtech.in";

export function expectedApkPath(product: ProductId): string {
  return `${DOWNLOADS_CDN_BASE}/android/${product}.apk`;
}

export function expectedDesktopPath(product: "admin" | "nexus"): string {
  return `${DOWNLOADS_CDN_BASE}/windows/${product}-setup.exe`;
}

/** Unused transport web helper retained for login-apps if needed. */
export { TRANSPORT_WEB };
