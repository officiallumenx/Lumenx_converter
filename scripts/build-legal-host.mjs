import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = path.join(ROOT, "apps/legal-host/src");
fs.mkdirSync(host, { recursive: true });

const files = {
  "/privacy": "apps/website/public/privacy.html",
  "/privacy-transport": "apps/website/public/privacy-transport.html",
  "/privacy-admin": "apps/website/public/privacy-admin.html",
  "/privacy-connect": "apps/website/public/privacy-connect.html",
};

const pages = {};
for (const [k, rel] of Object.entries(files)) {
  pages[k] = fs.readFileSync(path.join(ROOT, rel), "utf8");
}

fs.writeFileSync(
  path.join(host, "pages.js"),
  `export const PAGES = ${JSON.stringify(pages)};\n`,
);

fs.writeFileSync(
  path.join(host, "worker.js"),
  `import { PAGES } from "./pages.js";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathName = url.pathname.replace(/\\/+$/, "") || "/";
    if (pathName === "/") pathName = "/privacy";
    const html = PAGES[pathName];
    if (!html) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
`,
);

console.log("legal-host ready", fs.statSync(path.join(host, "pages.js")).size, "bytes");
