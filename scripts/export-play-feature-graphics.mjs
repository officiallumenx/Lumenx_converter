/**
 * Export Play Console feature graphics (1024x500) for Admin / Connect / Transport.
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
    fileName: "LumenX-Admin-feature-graphic-1024x500.png",
    src: path.join(ROOT, "apps/admin/store-assets/lumenx-admin-logo-source.png"),
    bg: "#6D28D9",
    bg2: "#4C1D95",
    title: "LumenX Admin",
    subtitle: "Institute operations console",
    tags: "Students  ·  Staff  ·  Attendance  ·  Fees",
  },
  {
    id: "connect",
    fileName: "LumenX-Connect-feature-graphic-1024x500.png",
    src: path.join(ROOT, "apps/connect/store-assets/lumenx-connect-logo-source.png"),
    bg: "#2563EB",
    bg2: "#1D4ED8",
    title: "LumenX Connect",
    subtitle: "School app for parents, teachers and students",
    tags: "Attendance  ·  Homework  ·  Marks  ·  Updates",
  },
  {
    id: "transport",
    fileName: "LumenX-Transport-feature-graphic-1024x500.png",
    src: path.join(ROOT, "apps/transport/store-assets/lumenx-transport-logo-source.png"),
    bg: "#F59E0B",
    bg2: "#D97706",
    title: "LumenX Transport",
    subtitle: "Driver app for trips and boarding",
    tags: "Routes  ·  Boarding  ·  Trip status",
  },
];

function svgBanner({ bg, bg2, title, subtitle, tags }) {
  const tagFill = bg.startsWith("#F") ? "#78350F" : "rgba(255,255,255,0.85)";
  const titleFill = bg.startsWith("#F") ? "#1C1917" : "#FFFFFF";
  const subFill = bg.startsWith("#F") ? "#44403C" : "rgba(255,255,255,0.88)";
  return Buffer.from(`<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <circle cx="980" cy="60" r="220" fill="rgba(255,255,255,0.08)"/>
  <circle cx="40" cy="480" r="180" fill="rgba(0,0,0,0.08)"/>
  <text x="500" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="52" font-weight="700" fill="${titleFill}">${title}</text>
  <text x="500" y="270" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="${subFill}">${subtitle}</text>
  <text x="500" y="330" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="${tagFill}">${tags}</text>
</svg>`);
}

for (const app of APPS) {
  const destDir = path.join(OUT, app.id);
  fs.mkdirSync(destDir, { recursive: true });
  const logo = await sharp(app.src)
    .flatten({ background: app.bg })
    .trim({ threshold: 24 })
    .resize(340, 340, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const dest = path.join(destDir, app.fileName);
  await sharp(svgBanner(app))
    .composite([{ input: logo, left: 80, top: 80 }])
    .png()
    .toFile(dest);
  await sharp(dest)
    .png()
    .toFile(path.join(ROOT, "apps", app.id, "store-assets", "feature-graphic-1024x500.png"));
  console.log("wrote", dest);
}
