import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "../..");

const STUB_MODULES = [
  { slug: "teachers", minPlan: "core", owner: "admin" },
  { slug: "parents", minPlan: "core", owner: "admin" },
  { slug: "attendance", minPlan: "core", owner: "admin" },
  { slug: "notifications", minPlan: "core", owner: "admin" },
  { slug: "timetable", minPlan: "plus", owner: "admin" },
  { slug: "exams", minPlan: "plus", owner: "admin" },
  { slug: "fees", minPlan: "plus", owner: "admin" },
  { slug: "complaints", minPlan: "plus", owner: "admin" },
  { slug: "analytics", minPlan: "plus", owner: "nexus" },
  { slug: "admissions", minPlan: "plus", owner: "admin" },
  { slug: "careers", minPlan: "max", owner: "admin" },
  { slug: "certificates", minPlan: "max", owner: "admin" },
];

function writeStubModule({ slug, minPlan, owner }) {
  const dir = path.join(root, "packages", `module-${slug}`);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  const pkgName = `@lumenx/module-${slug}`;
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: pkgName,
        version: "0.1.0",
        private: true,
        type: "module",
        sideEffects: false,
        exports: { ".": "./src/index.ts" },
        dependencies: { "@lumenx/config": "*", "@lumenx/database": "*" },
        devDependencies: { typescript: "^5.8.3" },
      },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify(
      { extends: "../config/tsconfig.base.json", include: ["src/**/*.ts"] },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync(
    path.join(dir, "src", "index.ts"),
    `import { MODULE_IDS } from "@lumenx/config";

export const MODULE_ID = MODULE_IDS.${slug};
export const MIN_PLAN = "${minPlan}" as const;
export const OWNER_APP = "${owner}" as const;
export const MODULE_NAME = "${slug.charAt(0).toUpperCase() + slug.slice(1)}";
`,
  );
}

for (const mod of STUB_MODULES) writeStubModule(mod);

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, cb);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) cb(full);
  }
}

const replacements = [
  [/from "@\/components\/ui-kit"/g, 'from "@lumenx/ui-admin"'],
  [/from "@\/lib\/error-page"/g, 'from "@lumenx/utils"'],
  [/from "@\/lib\/error-capture"/g, 'from "@lumenx/utils"'],
  [/from "\.\/lib\/error-page"/g, 'from "@lumenx/utils"'],
  [/from "\.\/lib\/error-capture"/g, 'from "@lumenx/utils"'],
  [/from "\.\/types"/g, 'from "@lumenx/types"'],
  [/from "@\/lib\/types"/g, 'from "@lumenx/types"'],
];

for (const app of fs.readdirSync(path.join(root, "apps"))) {
  walkDir(path.join(root, "apps", app, "src"), (file) => {
    let content = fs.readFileSync(file, "utf8");
    const original = content;
    for (const [from, to] of replacements) content = content.replace(from, to);
    if (content !== original) fs.writeFileSync(file, content);
  });
}

for (const app of ["connect", "admin", "nexus", "transport"]) {
  const uiKit = path.join(root, "apps", app, "src", "components", "ui-kit.tsx");
  if (fs.existsSync(uiKit)) fs.unlinkSync(uiKit);
  for (const f of ["error-page.ts", "error-capture.ts", "utils.ts"]) {
    const p = path.join(root, "apps", app, "src", "lib", f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

const viteSnippet = `import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      noExternal: [/^@lumenx\\//],
    },
  },
});
`;

for (const app of ["connect", "admin", "nexus", "transport"]) {
  const cfg = path.join(root, "apps", app, "vite.config.ts");
  if (fs.existsSync(cfg)) fs.writeFileSync(cfg, viteSnippet);
}

console.log(`Phase 3-7 wiring: ${STUB_MODULES.length} stub modules, apps updated.`);
