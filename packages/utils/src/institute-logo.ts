/**
 * Institute logo helpers — compress uploads for cookie-safe Admin↔Nexus sync,
 * and build monogram SVG fallbacks when no photo logo exists.
 */

export type CompressLogoOptions = {
  maxEdge?: number;
  quality?: number;
  /** Drop result if still larger (chars) — caller should omit logo from cookie. */
  maxDataUrlChars?: number;
};

/** Resize + JPEG-compress a data URL for shared registration cookie sync. */
export async function compressInstituteLogoDataUrl(
  dataUrl: string,
  opts: CompressLogoOptions = {},
): Promise<string | null> {
  const maxEdge = opts.maxEdge ?? 96;
  const quality = opts.quality ?? 0.62;
  const maxChars = opts.maxDataUrlChars ?? 5500;
  const src = dataUrl.trim();
  if (!src.startsWith("data:image/")) return null;

  // Already a tiny SVG — keep as-is if under budget.
  if (src.startsWith("data:image/svg+xml") && src.length <= maxChars) return src;

  if (typeof document === "undefined") {
    return src.length <= maxChars ? src : null;
  }

  try {
    const img = await loadImage(src);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let out = canvas.toDataURL("image/jpeg", quality);
    if (out.length > maxChars) {
      out = canvas.toDataURL("image/jpeg", 0.45);
    }
    if (out.length > maxChars) return null;
    return out;
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = src;
  });
}

/** Deterministic monogram SVG data URL used when an institute has no uploaded logo. */
export function buildInstituteMonogramLogoUrl(mark: string, hue: number): string {
  const letters = (mark.trim().slice(0, 3) || "LX").toUpperCase();
  const c1 = `oklch(0.58 0.13 ${hue})`;
  const c2 = `oklch(0.42 0.11 ${(hue + 42) % 360})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <text x="64" y="72" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="42" font-weight="700" fill="white">${escapeXml(letters)}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
