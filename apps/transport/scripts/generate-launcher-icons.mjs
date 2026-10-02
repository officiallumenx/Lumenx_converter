import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const STORE = path.join(ROOT, "store-assets");
const PUBLIC = path.join(ROOT, "public");
const SRC = path.join(STORE, "lumenx-transport-logo-source.png");

fs.mkdirSync(STORE, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });

/**
 * Trim excess white canvas, then place logo+wordmark inside Android adaptive
 * safe zone so circular / squircle launcher masks do not clip the mark.
 */
async function prepareSource() {
  return sharp(SRC)
    .trim({ threshold: 18 })
    .png()
    .toBuffer();
}

async function paddedSquare(
  size,
  sourceBuf,
  { contentRatio = 0.56, bg = "#FFFFFF" } = {},
) {
  const content = Math.max(1, Math.round(size * contentRatio));
  const logo = await sharp(sourceBuf)
    .resize(content, content, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function circular(size, sourceBuf) {
  const sq = await paddedSquare(size, sourceBuf, { contentRatio: 0.54 });
  const svg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(sq)
    .composite([{ input: svg, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const foregroundSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};
const legacySizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

if (!fs.existsSync(SRC)) {
  console.error("Source logo missing:", SRC);
  process.exit(1);
}

const sourceBuf = await prepareSource();

await sharp(await paddedSquare(1024, sourceBuf, { contentRatio: 0.72 }))
  .png()
  .toFile(path.join(STORE, "launcher-icon-master-1024.png"));
await sharp(await paddedSquare(512, sourceBuf, { contentRatio: 0.7 }))
  .png()
  .toFile(path.join(STORE, "play-icon-512.png"));
await sharp(sourceBuf)
  .resize(192, 192, { fit: "contain", background: "#fff" })
  .png()
  .toFile(path.join(PUBLIC, "favicon.png"));

for (const [dir, size] of Object.entries(foregroundSizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  // 0.52 keeps emblem + LumenX wordmark inside the adaptive safe zone.
  await sharp(await paddedSquare(size, sourceBuf, { contentRatio: 0.52 }))
    .png()
    .toFile(path.join(outDir, "ic_launcher_foreground.png"));
}

for (const [dir, size] of Object.entries(legacySizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(await paddedSquare(size, sourceBuf, { contentRatio: 0.78 }))
    .png()
    .toFile(path.join(outDir, "ic_launcher.png"));
  await sharp(await circular(size, sourceBuf))
    .png()
    .toFile(path.join(outDir, "ic_launcher_round.png"));
}

fs.writeFileSync(
  path.join(RES, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n`,
);

console.log(
  "Transport Android launcher icons regenerated with adaptive safe-zone padding.",
);
