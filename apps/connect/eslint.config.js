import baseConfig from "@lumenx/config/eslint";

/** Connect-scoped ignores so lint stays fast and skips generated/native trees. */
export default [
  {
    ignores: [
      "android/**",
      ".screenshots/**",
      ".wrangler/**",
      ".tanstack/**",
      "dist/**",
      "dist-ssr/**",
      ".output/**",
      "src/routeTree.gen.ts",
    ],
  },
  ...baseConfig,
];
