import { DOWNLOADS, marketingWebUrl } from "@/content/downloads";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";

export type LoginCta =
  | {
      kind: "external";
      label: string;
      href: string;
    }
  | {
      kind: "internal";
      label: string;
      to: "/resources/downloads";
      search: { product: ProductId };
    };

export type LoginAppLink = {
  id: ProductId;
  name: string;
  note: string;
  primary: LoginCta;
  secondary?: LoginCta;
};

const LOGIN_ORDER: ProductId[] = ["admin", "connect", "transport", "admissions", "careers", "nexus"];

/** Official Android applicationIds — used for Play Store listing links. */
const PLAY_PACKAGE: Record<ProductId, string> = {
  admin: "com.lumenx.app.admin",
  connect: "com.lumenx.app.connect",
  transport: "com.lumenx.app.transport",
  admissions: "com.lumenx.app.admissions",
  careers: "com.lumenx.app.careers",
  nexus: "com.lumenx.app.nexus",
};

export function playStoreUrlFor(id: ProductId): string {
  return DOWNLOADS[id].playStoreUrl ?? `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE[id]}`;
}

function playCta(id: ProductId, label = "Get on Google Play"): LoginCta {
  return { kind: "external", label, href: playStoreUrlFor(id) };
}

/** Public login destinations for the marketing /login page. */
export function getLoginAppLinks(): LoginAppLink[] {
  const admissionsWeb = marketingWebUrl(
    import.meta.env.VITE_ADMISSIONS_ORIGIN,
    "https://admissions.lumenxtech.in",
  );
  const careersWeb = marketingWebUrl(
    import.meta.env.VITE_CAREERS_ORIGIN,
    "https://careers.lumenxtech.in",
  );
  const nexusWeb = marketingWebUrl(import.meta.env.VITE_NEXUS_ORIGIN, "https://nexus.lumenxtech.in");

  const links: LoginAppLink[] = [
    {
      id: "admin",
      name: PRODUCT_FAMILY.admin.name,
      note: "Institute office console — web, Android, and Windows from the download center.",
      primary: {
        kind: "internal",
        label: "Go to downloads",
        to: "/resources/downloads",
        search: { product: "admin" },
      },
    },
    {
      id: "connect",
      name: PRODUCT_FAMILY.connect.name,
      note: "Parent, teacher, and student app — Android on Google Play.",
      primary: playCta("connect", "Open on Google Play"),
    },
    {
      id: "transport",
      name: PRODUCT_FAMILY.transport.name,
      note: "Driver and fleet app — Android on Google Play.",
      primary: playCta("transport", "Open on Google Play"),
    },
  ];

  if (admissionsWeb) {
    links.push({
      id: "admissions",
      name: PRODUCT_FAMILY.admissions.name,
      note: "Mobile web admissions portal. Prefer the app? Open the Play Store listing.",
      primary: { kind: "external", label: "Open Admissions (mobile web)", href: admissionsWeb },
      secondary: playCta("admissions", "Get on Google Play"),
    });
  }

  if (careersWeb) {
    links.push({
      id: "careers",
      name: PRODUCT_FAMILY.careers.name,
      note: "Mobile web careers portal. Prefer the app? Open the Play Store listing.",
      primary: { kind: "external", label: "Open Careers (mobile web)", href: careersWeb },
      secondary: playCta("careers", "Get on Google Play"),
    });
  }

  if (nexusWeb) {
    links.push({
      id: "nexus",
      name: PRODUCT_FAMILY.nexus.name,
      note: "Platform operations console.",
      primary: { kind: "external", label: "Open LumenX Nexus", href: nexusWeb },
      secondary: {
        kind: "internal",
        label: "Downloads",
        to: "/resources/downloads",
        search: { product: "nexus" },
      },
    });
  }

  return LOGIN_ORDER.flatMap((id) => {
    const row = links.find((item) => item.id === id);
    return row ? [row] : [];
  });
}
