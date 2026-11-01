import { defineConfig } from "astro/config";
import compress from "astro-compress";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Static site for Cloudflare Pages (`dist/` + repo-root `functions/`).
// Tailwind 3 via Vite PostCSS — @astrojs/tailwind is unsupported on Astro 6+.
export default defineConfig({
  // Preserve HTML-aware whitespace (Astro 7 default is 'jsx').
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
