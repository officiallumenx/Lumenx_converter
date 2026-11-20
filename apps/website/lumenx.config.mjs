import { defineConfig } from "astro/config";
import compress from "astro-compress";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Static site for Cloudflare Pages (`dist/` + repo-root `functions/`).
// Tailwind 3 via Vite PostCSS.
export default defineConfig({
  site: "https://lumenxtech.in",
  trailingSlash: "never",
  build: {
    format: "file",
    assets: "_lumenx",
  },
  // Preserve HTML-aware whitespace.
  compressHTML: true,
  integrations: [compress()],
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
  },
});
