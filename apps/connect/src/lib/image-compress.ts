/**
 * Client-side avatar compression for profile uploads (no extra deps).
 * Returns a JPEG data URL suitable for localStorage-backed avatars.
 */
export function compressImageToDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 512;
  const quality = opts?.quality ?? 0.82;
  const maxBytes = opts?.maxBytes ?? 450_000;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let data = canvas.toDataURL("image/jpeg", q);
        while (data.length > maxBytes && q > 0.45) {
          q -= 0.07;
          data = canvas.toDataURL("image/jpeg", q);
        }
        URL.revokeObjectURL(url);
        resolve(data);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
