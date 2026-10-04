import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const STORE = path.join(ROOT, "store-assets");
const PUBLIC = path.join(ROOT, "public");
const SRC = path.join(STORE, "lumenx-admin-logo-source.png");
const BG = "#6D28D9";

fs.mkdirSync(STORE, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });

/** Flatten + trim outer matte so only the real artwork is scaled. */
async function prepareSource() {
  return sharp(SRC)
    .flatten({ background: BG })
    .trim({ threshold: 24 })
    .png()
    .toBuffer();
}

/**
 * Place full logo + wordmark inside Android adaptive safe zone so squircle /
 * circular launcher masks do not clip LumenX / ADMIN.
 */
async function paddedSquare(
  size,
  sourceBuf,
  { contentRatio = 0.55, bg = BG } = {},
) {
  const content = Math.max(1, Math.round(size * contentRatio));
  const logo = await sharp(sourceBuf)
    .resize(content, content, {
      fit: "contain",
      background: bg,
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
  const sq = await paddedSquare(size, sourceBuf, { contentRatio: 0.52 });
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

await sharp(await paddedSquare(1024, sourceBuf, { contentRatio: 0.7 }))
  .png()
  .toFile(path.join(STORE, "launcher-icon-master-1024.png"));
await sharp(await paddedSquare(512, sourceBuf, { contentRatio: 0.68 }))
  .png()
  .toFile(path.join(STORE, "play-icon-512.png"));
await sharp(sourceBuf)
  .resize(192, 192, { fit: "contain", background: BG })
  .png()
  .toFile(path.join(PUBLIC, "favicon.png"));

for (const [dir, size] of Object.entries(foregroundSizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(await paddedSquare(size, sourceBuf, { contentRatio: 0.55 }))
    .png()
    .toFile(path.join(outDir, "ic_launcher_foreground.png"));
}

for (const [dir, size] of Object.entries(legacySizes)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(await paddedSquare(size, sourceBuf, { contentRatio: 0.72 }))
    .png()
    .toFile(path.join(outDir, "ic_launcher.png"));
  await sharp(await circular(size, sourceBuf))
    .png()
    .toFile(path.join(outDir, "ic_launcher_round.png"));
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

console.log("Admin Android launcher icons regenerated with safe-zone padding.");
