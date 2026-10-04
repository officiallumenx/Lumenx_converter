/**
 * Export Play Console / home-screen 512x512 icons with extra padding so
 * wordmarks are not clipped by Android squircle/circle masks.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(process.env.USERPROFILE ?? "", "Desktop", "aab files");

const APPS = [
  {
    id: "admin",
    fileName: "LumenX-Admin-play-icon-512.png",
    src: path.join(ROOT, "apps/admin/store-assets/lumenx-admin-logo-source.png"),
    bg: "#6D28D9",
  },
  {
    id: "connect",
    fileName: "LumenX-Connect-play-icon-512.png",
    src: path.join(ROOT, "apps/connect/store-assets/lumenx-connect-logo-source.png"),
    bg: "#1D4ED8",
  },
  {
    id: "transport",
    fileName: "LumenX-Transport-play-icon-512.png",
    src: path.join(ROOT, "apps/transport/store-assets/lumenx-transport-logo-source.png"),
    bg: "#F59E0B",
  },
];

const SIZE = 512;
/** Keep artwork in the inner ~52% so OEM rounded masks don't clip text. */
const CONTENT_RATIO = 0.52;

async function prepareSource(src, bg) {
  return sharp(src).flatten({ background: bg }).trim({ threshold: 24 }).png().toBuffer();
}

async function paddedIcon(sourceBuf, bg) {
  const content = Math.round(SIZE * CONTENT_RATIO);
  const logo = await sharp(sourceBuf)
    .resize(content, content, { fit: "contain", background: bg })
    .png()
    .toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

for (const app of APPS) {
  if (!fs.existsSync(app.src)) {
    console.error("Missing source:", app.src);
    process.exit(1);
  }
  const destDir = path.join(OUT, app.id);
  fs.mkdirSync(destDir, { recursive: true });
  const buf = await paddedIcon(await prepareSource(app.src, app.bg), app.bg);
  const dest = path.join(destDir, app.fileName);
  await sharp(buf).png().toFile(dest);
  await sharp(buf)
    .png()
    .toFile(path.join(ROOT, "apps", app.id, "store-assets", "play-icon-512.png"));
  console.log("wrote", dest);
}
