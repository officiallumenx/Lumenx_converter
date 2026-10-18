import { marketingWebUrl } from "@/content/downloads";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";

export type LoginAppLink = {
  id: ProductId;
  name: string;
  href: string;
  note: string;
};

const LOGIN_ORDER: ProductId[] = ["admin", "connect", "transport", "admissions", "careers", "nexus"];

const LOGIN_NOTES: Partial<Record<ProductId, string>> = {
  admin: "Institute office console.",
  connect: "Parent, teacher, and student portal.",
  transport: "Driver and fleet portal.",
  admissions: "Admissions experience (Connect entry until standalone).",
  careers: "Careers experience (Connect entry until standalone).",
  nexus: "Platform operations console.",
};

/** Public web login origins — independent of the download-center APK/desktop matrix. */
export function getLoginAppLinks(): LoginAppLink[] {
  const connect = marketingWebUrl(import.meta.env.VITE_CONNECT_ORIGIN, "https://connect.lumenxtech.in");
  const origins: Partial<Record<ProductId, string | null>> = {
    admin: marketingWebUrl(import.meta.env.VITE_ADMIN_ORIGIN, "https://admin.lumenxtech.in"),
    connect,
    transport: marketingWebUrl(import.meta.env.VITE_TRANSPORT_ORIGIN, "https://transport.lumenxtech.in"),
    nexus: marketingWebUrl(import.meta.env.VITE_NEXUS_ORIGIN, "https://nexus.lumenxtech.in"),
    admissions: marketingWebUrl(import.meta.env.VITE_ADMISSIONS_ORIGIN, null) ?? connect,
    careers: marketingWebUrl(import.meta.env.VITE_CAREERS_ORIGIN, null) ?? connect,
  };

  return LOGIN_ORDER.flatMap((id) => {
    const href = origins[id];
    if (!href) return [];
    return [
      {
        id,
        name: PRODUCT_FAMILY[id].name,
        href,
        note: LOGIN_NOTES[id] ?? "",
      },
    ];
  });
}
