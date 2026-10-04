/**
 * Apply logos as Android launcher icons (+ favicons) with adaptive safe-zone
 * padding so wordmarks are not clipped by squircle/circular masks.
 * Usage: node scripts/apply-app-icons.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS =
  "C:/Users/Lokesh vella/.cursor/projects/c-Users-Lokesh-vella-Desktop-lumenx-converter/assets";

const APPS = [
  {
    id: "admin",
    src: path.join(
      ASSETS,
      "c__Users_Lokesh_vella_AppData_Roaming_Cursor_User_workspaceStorage_f2c01a1143f83da1b4ccaa398ee2d404_images_admin-3756db03-1b30-4b92-b9a8-ef374da92d78.jpg",
    ),
    appDir: path.join(ROOT, "apps/admin"),
    sourceName: "lumenx-admin-logo-source.png",
    bg: "#6D28D9",
    hasAndroid: true,
  },
  {
    id: "connect",
    src: path.join(
      ASSETS,
      "c__Users_Lokesh_vella_AppData_Roaming_Cursor_User_workspaceStorage_f2c01a1143f83da1b4ccaa398ee2d404_images_connect-33e7c3fa-578a-41aa-b6d3-fb29f73a0ce2.jpg",
    ),
    appDir: path.join(ROOT, "apps/connect"),
    sourceName: "lumenx-connect-logo-source.png",
    bg: "#1D4ED8",
    hasAndroid: true,
  },
  {
    id: "transport",
    src: path.join(
      ASSETS,
      "c__Users_Lokesh_vella_AppData_Roaming_Cursor_User_workspaceStorage_f2c01a1143f83da1b4ccaa398ee2d404_images_transport-1077a993-b39f-4e45-b93a-9579eef1c09e.jpg",
    ),
    appDir: path.join(ROOT, "apps/transport"),
    sourceName: "lumenx-transport-logo-source.png",
    bg: "#F59E0B",
    hasAndroid: true,
  },
  {
    id: "careers",
    src: path.join(
      ASSETS,
      "c__Users_Lokesh_vella_AppData_Roaming_Cursor_User_workspaceStorage_f2c01a1143f83da1b4ccaa398ee2d404_images_careers-459a6387-1d65-477e-a612-59fa65516d85.jpg",
    ),
    appDir: path.join(ROOT, "apps/careers"),
    sourceName: "lumenx-careers-logo-source.png",
    bg: "#15803D",
    hasAndroid: true,
  },
  {
    id: "admissions",
    src: path.join(
      ASSETS,
      "c__Users_Lokesh_vella_AppData_Roaming_Cursor_User_workspaceStorage_f2c01a1143f83da1b4ccaa398ee2d404_images_admissions-d83f6b4d-ac77-47d0-b2c8-d832069915dd.jpg",
    ),
    appDir: path.join(ROOT, "apps/admissions"),
    sourceName: "lumenx-admissions-logo-source.png",
    bg: "#EA580C",
    hasAndroid: false,
  },
];

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

async function toMasterPng(srcPath) {
  // Normalize to square PNG (cover) so JPG sources become clean masters.
  const meta = await sharp(srcPath).metadata();
  const side = Math.min(meta.width ?? 1024, meta.height ?? 1024);
  return sharp(srcPath)
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function paddedSquare(masterBuf, size, { contentRatio = 0.55, bg = "#FFFFFF" } = {}) {
  const content = Math.max(1, Math.round(size * contentRatio));
  const logo = await sharp(masterBuf)
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

async function fillSquare(masterBuf, size) {
  return sharp(masterBuf)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function circular(masterBuf, size, bg) {
  const sq = await paddedSquare(masterBuf, size, { contentRatio: 0.52, bg });
  const svg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(sq)
    .composite([{ input: svg, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function applyApp(app) {
  if (!fs.existsSync(app.src)) {
    throw new Error(`Missing source for ${app.id}: ${app.src}`);
  }
  const store = path.join(app.appDir, "store-assets");
  const publicDir = path.join(app.appDir, "public");
  fs.mkdirSync(store, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const master = await toMasterPng(app.src);
  const sourcePath = path.join(store, app.sourceName);
  // Keep full-bleed master for in-app / store marketing; launcher uses padded copies.
  await sharp(master).png().toFile(sourcePath);
  await sharp(await paddedSquare(master, 1024, { contentRatio: 0.7, bg: app.bg }))
    .png()
    .toFile(path.join(store, "launcher-icon-master-1024.png"));
  await sharp(await paddedSquare(master, 512, { contentRatio: 0.68, bg: app.bg }))
    .png()
    .toFile(path.join(store, "play-icon-512.png"));
  await sharp(await paddedSquare(master, 192, { contentRatio: 0.72, bg: app.bg }))
    .png()
    .toFile(path.join(publicDir, "favicon.png"));

  // Web/PWA logo copy when used by the app
  await sharp(master)
    .png()
    .toFile(path.join(publicDir, app.sourceName.replace("-source", "")));

  if (!app.hasAndroid) {
    console.log(`[${app.id}] favicon + store-assets only (no Android project)`);
    return;
  }

  const res = path.join(app.appDir, "android/app/src/main/res");
  if (!fs.existsSync(res)) {
    console.warn(`[${app.id}] android res missing — skipped mipmaps`);
    return;
  }

  for (const [dir, size] of Object.entries(foregroundSizes)) {
    const outDir = path.join(res, dir);
    fs.mkdirSync(outDir, { recursive: true });
    // Keep artwork inside adaptive safe zone (center ~55%) so masks don't clip text.
    await sharp(await paddedSquare(master, size, { contentRatio: 0.55, bg: app.bg }))
      .png()
      .toFile(path.join(outDir, "ic_launcher_foreground.png"));
  }

  for (const [dir, size] of Object.entries(legacySizes)) {
    const outDir = path.join(res, dir);
    fs.mkdirSync(outDir, { recursive: true });
    await sharp(await paddedSquare(master, size, { contentRatio: 0.72, bg: app.bg }))
      .png()
      .toFile(path.join(outDir, "ic_launcher.png"));
    await sharp(await circular(master, size, app.bg))
      .png()
      .toFile(path.join(outDir, "ic_launcher_round.png"));
  }

  const valuesDir = path.join(res, "values");
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(
    path.join(valuesDir, "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${app.bg}</color>\n</resources>\n`,
  );

  // Ensure adaptive XML points at mipmap foreground + color background.
  const anydpi = path.join(res, "mipmap-anydpi-v26");
  fs.mkdirSync(anydpi, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpi, "ic_launcher.xml"), adaptive);
  fs.writeFileSync(path.join(anydpi, "ic_launcher_round.xml"), adaptive);

  console.log(`[${app.id}] Android launcher icons updated`);
}

for (const app of APPS) {
  await applyApp(app);
}
console.log("Done — all app icons applied.");
