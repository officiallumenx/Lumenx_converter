import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { PRODUCT_PAGES } from "./product-pages";

function readUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readVersion(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** How this product is offered on a platform — not whether a public URL exists yet. */
export type PlatformOffer = "web" | "android" | "ios-later" | "via-connect" | "not-offered";

export type DownloadChannel = {
  id: ProductId;
  /** @deprecated use id — kept for existing call sites */
  slug: ProductId;
  description: string;
  webNote: string;
  webUrl: string | null;
  apkUrl: string | null;
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  iosUrl: string | null;
  version: string | null;
  platforms: {
    web: PlatformOffer;
    android: PlatformOffer;
    ios: PlatformOffer;
  };
};

const CONNECT_WEB = readUrl(import.meta.env.VITE_CONNECT_ORIGIN);

export const DOWNLOADS: Record<ProductId, DownloadChannel> = {
  connect: {
    id: "connect",
    slug: "connect",
    description: PRODUCT_PAGES.connect.purpose,
    webNote: "Parent, teacher, and student portal.",
    webUrl: CONNECT_WEB,
    apkUrl: readUrl(import.meta.env.VITE_CONNECT_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_CONNECT_PLAY_URL),
    appStoreUrl: readUrl(import.meta.env.VITE_CONNECT_APP_STORE_URL),
    iosUrl: readUrl(import.meta.env.VITE_CONNECT_IOS_URL),
    version: readVersion(import.meta.env.VITE_CONNECT_VERSION),
    platforms: { web: "web", android: "android", ios: "ios-later" },
  },
  transport: {
    id: "transport",
    slug: "transport",
    description: PRODUCT_PAGES.transport.purpose,
    webNote: "Driver and fleet operations.",
    webUrl: readUrl(import.meta.env.VITE_TRANSPORT_ORIGIN),
    apkUrl: readUrl(import.meta.env.VITE_TRANSPORT_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_TRANSPORT_PLAY_URL),
    appStoreUrl: readUrl(import.meta.env.VITE_TRANSPORT_APP_STORE_URL),
    iosUrl: readUrl(import.meta.env.VITE_TRANSPORT_IOS_URL),
    version: readVersion(import.meta.env.VITE_TRANSPORT_VERSION),
    platforms: { web: "web", android: "android", ios: "ios-later" },
  },
  admin: {
    id: "admin",
    slug: "admin",
    description: PRODUCT_PAGES.admin.purpose,
    webNote: "Browser console for the institute office.",
    webUrl: readUrl(import.meta.env.VITE_ADMIN_ORIGIN),
    apkUrl: readUrl(import.meta.env.VITE_ADMIN_APK_URL),
    playStoreUrl: readUrl(import.meta.env.VITE_ADMIN_PLAY_URL),
    appStoreUrl: readUrl(import.meta.env.VITE_ADMIN_APP_STORE_URL),
    iosUrl: readUrl(import.meta.env.VITE_ADMIN_IOS_URL),
    version: readVersion(import.meta.env.VITE_ADMIN_VERSION),
    platforms: { web: "web", android: "android", ios: "ios-later" },
  },
  admissions: {
    id: "admissions",
    slug: "admissions",
    description: PRODUCT_PAGES.admissions.purpose,
    webNote: "Connect portal. There is no separate APK or store listing.",
    webUrl: CONNECT_WEB,
    apkUrl: null,
    playStoreUrl: null,
    appStoreUrl: null,
    iosUrl: null,
    version: null,
    platforms: { web: "via-connect", android: "via-connect", ios: "via-connect" },
  },
  careers: {
    id: "careers",
    slug: "careers",
    description: PRODUCT_PAGES.careers.purpose,
    webNote: "Connect portal. There is no separate APK or store listing.",
    webUrl: CONNECT_WEB,
    apkUrl: null,
    playStoreUrl: null,
    appStoreUrl: null,
    iosUrl: null,
    version: null,
    platforms: { web: "via-connect", android: "via-connect", ios: "via-connect" },
  },
  nexus: {
    id: "nexus",
    slug: "nexus",
    description: PRODUCT_PAGES.nexus.purpose,
    webNote: "Service platform — web only in this release.",
    webUrl: readUrl(import.meta.env.VITE_NEXUS_ORIGIN),
    apkUrl: null,
    playStoreUrl: null,
    appStoreUrl: null,
    iosUrl: null,
    version: readVersion(import.meta.env.VITE_NEXUS_VERSION),
    platforms: { web: "web", android: "not-offered", ios: "not-offered" },
  },
};

export const DOWNLOAD_LIST = (["connect", "transport", "admin", "admissions", "careers"] as const).map(
  (id) => DOWNLOADS[id],
);

export function androidHref(channel: DownloadChannel): string | null {
  return channel.playStoreUrl ?? channel.apkUrl;
}

export function iosHref(channel: DownloadChannel): string | null {
  return channel.appStoreUrl ?? channel.iosUrl;
}

/** QR is only useful when a real URL exists — never encode a placeholder. */
export function qrHref(channel: DownloadChannel): string | null {
  return channel.webUrl ?? androidHref(channel) ?? iosHref(channel);
}

export function platformStateLabel(offer: PlatformOffer, href: string | null): string {
  if (offer === "not-offered") return "Not offered";
  if (offer === "via-connect") return href ? "Via Connect" : "Coming soon";
  if (href) return "Available";
  if (offer === "ios-later") return "Coming soon";
  return "Coming soon";
}

export function releaseLabel(channel: DownloadChannel): string {
  if (channel.platforms.web === "via-connect") {
    return channel.webUrl ? "Connect portal" : "Coming soon";
  }
  if (channel.webUrl) return "Web available";
  if (channel.platforms.android === "android") return "Coming soon";
  if (channel.platforms.android === "not-offered") return "Web only";
  return "Coming soon";
}

export function webButtonLabel(channel: DownloadChannel): string {
  if (channel.platforms.web === "via-connect") return "Open Connect";
  return "Open web app";
}

export function androidButtonLabel(channel: DownloadChannel): string {
  if (channel.playStoreUrl) return "Get on Google Play";
  if (channel.apkUrl) return "Download Android";
  if (channel.platforms.android === "via-connect") return "No separate app";
  if (channel.platforms.android === "not-offered") return "Not on Android";
  return "Coming soon";
}

export function iosButtonLabel(channel: DownloadChannel): string {
  if (channel.appStoreUrl || channel.iosUrl) return "Download on the App Store";
  if (channel.platforms.ios === "via-connect") return "No separate app";
  if (channel.platforms.ios === "not-offered") return "Not on iOS";
  return "Coming soon";
}

export function downloadTitle(id: ProductId): string {
  return PRODUCT_FAMILY[id].name;
}
