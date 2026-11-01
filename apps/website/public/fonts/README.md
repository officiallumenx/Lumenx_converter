# LumenX website fonts

## Prata (body)

Self-hosted via the npm package `@fontsource/prata` (SIL Open Font License 1.1).

- Source: [Google Fonts — Prata](https://fonts.google.com/specimen/Prata) / [Fontsource Prata](https://fontsource.org/fonts/prata)
- Available weight: **400 Regular** only
- Loaded from `node_modules` by Astro/Vite (WOFF2 + `font-display: swap`)

## Luma Studio (headings)

**Not present in this project.** No local `.woff` / `.woff2` / `.ttf` / `.otf` files named Luma Studio were found under the Play Astro project, the LumenX monorepo, or the machine font folders searched during setup.

Luma Studio appears to be a commercial/display face and is **not** available as a free Google Font. Do not add copies from unauthorized “free font” sites.

### How to enable Luma Studio when you have a web license

1. Obtain a **web font license** from the official foundry / marketplace that sold Luma Studio.
2. Place licensed WOFF2 files in this folder using these exact names (or update `src/styles/luma-studio.css` to match):

   ```text
   public/fonts/luma-studio/LumaStudio-Regular.woff2
   public/fonts/luma-studio/LumaStudio-Bold.woff2
   ```

3. Uncomment / enable the `@font-face` rules in `src/styles/luma-studio.css`.
4. Rebuild (`npm run build`).

Until those files exist, CSS uses:

```css
--font-heading: "Luma Studio", "Segoe UI", system-ui, sans-serif;
```

Browsers fall back to Segoe UI / system UI for headings so the site remains readable.
