import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const out = path.join(ROOT, "apps/connect/store-assets/feature-graphic-1024x500.png");
const logoPath = path.join(ROOT, "apps/connect/store-assets/play-icon-512.png");

const W = 1024;
const H = 500;

const bg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="55%" stop-color="#1D4ED8"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <ellipse cx="180" cy="-40" rx="320" ry="220" fill="url(#shine)"/>
  <ellipse cx="900" cy="520" rx="280" ry="180" fill="#0EA5E9" fill-opacity="0.18"/>
  <text x="520" y="210" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#FFFFFF">LumenX Connect</text>
  <text x="520" y="270" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#DBEAFE">School app for parents, teachers and students</text>
  <text x="520" y="330" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#BFDBFE">Attendance · Homework · Marks · Updates</text>
</svg>
`);

const logo = await sharp(logoPath)
  .resize(300, 300, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp(bg)
  .composite([{ input: logo, left: 120, top: 100 }])
  .png()
  .toFile(out);

const meta = await sharp(out).metadata();
console.log(`Wrote ${out} (${meta.width}x${meta.height})`);
