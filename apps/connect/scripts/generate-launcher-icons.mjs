import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const STORE = path.join(ROOT, "store-assets");
const PUBLIC = path.join(ROOT, "public");
const SRC = path.join(STORE, "lumenx-connect-logo-source.png");
const BG = "#1D4ED8";

fs.mkdirSync(STORE, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });

/**
 * Source is already a finished rounded app tile. Strip the outer squircle
 * frame so we do not nest a small icon inside another blue square, then
 * fill the Android adaptive layer. Android applies the launcher mask.
 */
async function extractArtwork(sourcePath) {
  const meta = await sharp(sourcePath).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const inset = Math.round(Math.min(w, h) * 0.08);
  return sharp(sourcePath)
    .extract({
      left: inset,
      top: inset,
      width: w - inset * 2,
      height: h - inset * 2,
    })
    .flatten({ background: BG })
    .png()
    .toBuffer();
}

async function fillSquare(size, artworkBuf) {
  return sharp(artworkBuf)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function circular(size, artworkBuf) {
  const sq = await fillSquare(size, artworkBuf);
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

const artwork = await extractArtwork(SRC);

await sharp(SRC)
  .resize(1024, 1024, { fit: "cover" })
  .png()
  .toFile(path.join(STORE, "launcher-icon-master-1024.png"));
await sharp(SRC)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(path.join(STORE, "play-icon-512.png"));
await fillSquare(192, artwork).then((buf) =>
  sharp(buf).toFile(path.join(PUBLIC, "favicon.png")),
);
await sharp(SRC)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(path.join(ROOT, "src", "assets", "lumenx-connect-logo.png"));

for (const [dir, size] of Object.entries(foregroundSizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(await fillSquare(size, artwork)).toFile(
    path.join(outDir, "ic_launcher_foreground.png"),
  );
}

for (const [dir, size] of Object.entries(legacySizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(await fillSquare(size, artwork)).toFile(
    path.join(outDir, "ic_launcher.png"),
  );
  await sharp(await circular(size, artwork)).toFile(
    path.join(outDir, "ic_launcher_round.png"),
  );
}

const valuesDir = path.join(RES, "values");
fs.mkdirSync(valuesDir, { recursive: true });
fs.writeFileSync(
  path.join(valuesDir, "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
);

const anydpi = path.join(RES, "mipmap-anydpi-v26");
fs.mkdirSync(anydpi, { recursive: true });
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
fs.writeFileSync(path.join(anydpi, "ic_launcher.xml"), adaptive);
fs.writeFileSync(path.join(anydpi, "ic_launcher_round.xml"), adaptive);

console.log("Connect Android launcher icons regenerated from full brand artwork.");
