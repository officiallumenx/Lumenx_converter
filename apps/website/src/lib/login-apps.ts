import { DOWNLOADS } from "@/content/downloads";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";

export type LoginAppLink = {
  id: ProductId;
  name: string;
  href: string;
  note: string;
};

const LOGIN_ORDER: ProductId[] = ["admin", "connect", "transport", "admissions", "careers"];

/** Public web origins only — never invent URLs or passwords. */
export function getLoginAppLinks(): LoginAppLink[] {
  return LOGIN_ORDER.flatMap((id) => {
    const channel = DOWNLOADS[id];
    if (!channel.webUrl) return [];
    return [
      {
        id,
        name: PRODUCT_FAMILY[id].name,
        href: channel.webUrl,
        note: channel.webNote,
      },
    ];
  });
}
