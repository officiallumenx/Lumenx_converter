/**
 * LumenX Downloads matrix for the Play Astro marketing site.
 *
 * Platform offers follow the approved matrix (do not expand casually).
 * Artifact / web URLs come from PUBLIC_* env overrides when set; otherwise
 * from the verified defaults below (probed during implementation).
 *
 * Never invent package IDs or unverified hosts. Prefer
 * downloads.lumenxtech.in once DNS is live; workers.dev host is currently
 * the verified artifact host.
 */

import { PRODUCTS } from "./lumenx.js";

const DOWNLOAD_HOST =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.PUBLIC_DOWNLOADS_HOST?.trim().replace(/\/$/, "")) ||
  "https://lumenx-downloads.official-lumenx.workers.dev";

function envUrl(key) {
  try {
    const value = import.meta.env?.[key];
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed || null;
  } catch {
    return null;
  }
}

function rejectPreviewHost(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    // Keep workers.dev only when it is an explicit artifact host (download CTAs).
    // Web app origins must not be workers.dev preview shells.
    if (host === "workers.dev" || host.endsWith(".workers.dev")) return null;
    return url.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function productMeta(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * @typedef {"web"|"android"|"windows"} PlatformId
 * @typedef {{
 *   id: string,
 *   name: string,
 *   shortName: string,
 *   description: string,
 *   href: string,
 *   image: string | null,
 *   imageAlt: string,
 *   platforms: {
 *     web?: { offered: true, url: string | null, label: string },
 *     android?: { offered: true, url: string | null, playStoreUrl: string | null, label: string },
 *     windows?: { offered: true, url: string | null, label: string },
 *   }
 * }} DownloadProduct
 */

/** @type {DownloadProduct[]} */
export const DOWNLOAD_PRODUCTS = [
  (() => {
    const p = productMeta("admin");
    return {
      id: "admin",
      name: p?.name || "LumenX Admin",
      shortName: "Admin",
      description:
        p?.body ||
        "Institute office console for academics, attendance, fees, and day-to-day operations.",
      href: "/platform/admin",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Admin",
      platforms: {
        web: {
          offered: true,
          url: rejectPreviewHost(envUrl("PUBLIC_ADMIN_WEB_URL")) || "https://admin.lumenxtech.in",
          label: "Open Web App",
        },
        android: {
          offered: true,
          url: envUrl("PUBLIC_ADMIN_APK_URL") || `${DOWNLOAD_HOST}/android/admin.apk`,
          playStoreUrl: envUrl("PUBLIC_ADMIN_PLAY_URL"),
          label: "Download for Android",
        },
        windows: {
          offered: true,
          url: envUrl("PUBLIC_ADMIN_DESKTOP_URL") || `${DOWNLOAD_HOST}/windows/admin-setup.exe`,
          label: "Download for Windows",
        },
      },
    };
  })(),
  (() => {
    const p = productMeta("connect");
    return {
      id: "connect",
      name: p?.name || "LumenX Connect",
      shortName: "Connect",
      description:
        p?.body ||
        "Role-based campus app for teachers, parents, and students.",
      href: "/platform/connect",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Connect",
      platforms: {
        android: {
          offered: true,
          url: envUrl("PUBLIC_CONNECT_APK_URL") || `${DOWNLOAD_HOST}/android/connect.apk`,
          playStoreUrl: envUrl("PUBLIC_CONNECT_PLAY_URL"),
          label: "Download for Android",
        },
      },
    };
  })(),
  (() => {
    const p = productMeta("transport");
    return {
      id: "transport",
      name: p?.name || "LumenX Transport",
      shortName: "Transport",
      description:
        p?.body ||
        "Driver and fleet app for routes, trips, and boarding workflows.",
      href: "/platform/transport",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Transport",
      platforms: {
        android: {
          offered: true,
          url: envUrl("PUBLIC_TRANSPORT_APK_URL") || `${DOWNLOAD_HOST}/android/transport.apk`,
          playStoreUrl: envUrl("PUBLIC_TRANSPORT_PLAY_URL"),
          label: "Download for Android",
        },
      },
    };
  })(),
  (() => {
    const p = productMeta("careers");
    return {
      id: "careers",
      name: p?.name || "LumenX Careers",
      shortName: "Careers",
      description:
        p?.body ||
        "Hiring portal for jobs, applications, profiles, and interviews.",
      href: "/platform/careers",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Careers",
      platforms: {
        web: {
          offered: true,
          url: rejectPreviewHost(envUrl("PUBLIC_CAREERS_WEB_URL")) || "https://careers.lumenxtech.in",
          label: "Open Web App",
        },
        android: {
          offered: true,
          url: envUrl("PUBLIC_CAREERS_APK_URL") || `${DOWNLOAD_HOST}/android/careers.apk`,
          playStoreUrl: envUrl("PUBLIC_CAREERS_PLAY_URL"),
          label: "Download for Android",
        },
      },
    };
  })(),
  (() => {
    const p = productMeta("admissions");
    return {
      id: "admissions",
      name: p?.name || "LumenX Admissions",
      shortName: "Admissions",
      description:
        p?.body ||
        "Admissions portal for programs, applications, and documents.",
      href: "/platform/admissions",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Admissions",
      platforms: {
        web: {
          offered: true,
          url:
            rejectPreviewHost(envUrl("PUBLIC_ADMISSIONS_WEB_URL")) ||
            "https://admissions.lumenxtech.in",
          label: "Open Web App",
        },
        android: {
          offered: true,
          url: envUrl("PUBLIC_ADMISSIONS_APK_URL") || `${DOWNLOAD_HOST}/android/admissions.apk`,
          playStoreUrl: envUrl("PUBLIC_ADMISSIONS_PLAY_URL"),
          label: "Download for Android",
        },
      },
    };
  })(),
  (() => {
    const p = productMeta("nexus");
    return {
      id: "nexus",
      name: p?.name || "LumenX Nexus",
      shortName: "Nexus",
      description:
        p?.body ||
        "Platform services for licensing, modules, renewals, and operator support.",
      href: "/platform/nexus",
      image: p?.image || null,
      imageAlt: p?.imageAlt || "LumenX Nexus",
      // Approved matrix: Android + Windows only — no web download option.
      platforms: {
        android: {
          offered: true,
          url: envUrl("PUBLIC_NEXUS_APK_URL") || `${DOWNLOAD_HOST}/android/nexus.apk`,
          playStoreUrl: envUrl("PUBLIC_NEXUS_PLAY_URL"),
          label: "Download for Android",
        },
        windows: {
          offered: true,
          url: envUrl("PUBLIC_NEXUS_DESKTOP_URL") || `${DOWNLOAD_HOST}/windows/nexus-setup.exe`,
          label: "Download for Windows",
        },
      },
    };
  })(),
];

export const ENQUIRY_INBOX = "lumenxtech.official@gmail.com";

export function androidAction(platform) {
  if (!platform?.offered) return { available: false, href: null, label: "Not offered" };
  if (platform.playStoreUrl) {
    return { available: true, href: platform.playStoreUrl, label: "Get on Google Play" };
  }
  if (platform.url) {
    return { available: true, href: platform.url, label: platform.label || "Download for Android" };
  }
  return { available: false, href: null, label: "Coming soon" };
}

export function webAction(platform) {
  if (!platform?.offered) return { available: false, href: null, label: "Not offered" };
  if (platform.url) {
    return { available: true, href: platform.url, label: platform.label || "Open Web App" };
  }
  return { available: false, href: null, label: "Coming soon" };
}

export function windowsAction(platform) {
  if (!platform?.offered) return { available: false, href: null, label: "Not offered" };
  if (platform.url) {
    return { available: true, href: platform.url, label: platform.label || "Download for Windows" };
  }
  return { available: false, href: null, label: "Coming soon" };
}

export function platformStatus(action) {
  return action.available ? "Available" : "Not yet available";
}
