import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "../..");
const srcUi = path.join(root, "apps/connect/src/components/ui");
const pkgUi = path.join(root, "packages/ui/src/components/ui");
const pkgLib = path.join(root, "packages/ui/src/lib");
const pkgHooks = path.join(root, "packages/ui/src/hooks");

fs.mkdirSync(pkgUi, { recursive: true });
fs.mkdirSync(pkgLib, { recursive: true });
fs.mkdirSync(pkgHooks, { recursive: true });

fs.copyFileSync(path.join(root, "apps/connect/src/lib/utils.ts"), path.join(pkgLib, "utils.ts"));
fs.copyFileSync(path.join(root, "apps/connect/src/hooks/use-mobile.tsx"), path.join(pkgHooks, "use-mobile.tsx"));

for (const file of fs.readdirSync(srcUi)) {
  if (!file.endsWith(".tsx")) continue;
  let content = fs.readFileSync(path.join(srcUi, file), "utf8");
  content = content.replace(/from "@\/lib\/utils"/g, 'from "../../lib/utils"');
  content = content.replace(/from "@\/hooks\/use-mobile"/g, 'from "../../hooks/use-mobile"');
  content = content.replace(/from "@\/components\/ui\/([^"]+)"/g, 'from "./$1"');
  fs.writeFileSync(path.join(pkgUi, file), content);
}

const components = fs
  .readdirSync(pkgUi)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(".tsx", ""))
  .sort();

let index = "// Auto-generated barrel exports for @lumenx/ui\n";
index += 'export { cn } from "./lib/utils";\n';
index += 'export { useIsMobile } from "./hooks/use-mobile";\n';
for (const c of components) {
  index += `export * from "./components/ui/${c}";\n`;
}
fs.writeFileSync(path.join(root, "packages/ui/src/index.ts"), index);

fs.mkdirSync(path.join(root, "packages/types/src"), { recursive: true });
fs.copyFileSync(path.join(root, "apps/connect/src/lib/types.ts"), path.join(root, "packages/types/src/index.ts"));

function walkDir(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, callback);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) callback(full);
  }
}

const appsDir = path.join(root, "apps");
for (const app of fs.readdirSync(appsDir)) {
  const appSrc = path.join(appsDir, app, "src");
  if (!fs.existsSync(appSrc)) continue;
  walkDir(appSrc, (file) => {
    let content = fs.readFileSync(file, "utf8");
    const original = content;
    content = content.replace(/from "@\/components\/ui\/([^"]+)"/g, 'from "@lumenx/ui"');
    content = content.replace(/from "@\/lib\/utils"/g, 'from "@lumenx/ui"');
    content = content.replace(/from "@\/lib\/types"/g, 'from "@lumenx/types"');
    content = content.replace(/from "@\/hooks\/use-mobile"/g, 'from "@lumenx/ui"');
    if (content !== original) fs.writeFileSync(file, content);
  });
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rmDir(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

for (const app of ["connect", "admin", "nexus"]) {
  rmDir(path.join(appsDir, app, "src/components/ui"));
  const hook = path.join(appsDir, app, "src/hooks/use-mobile.tsx");
  if (fs.existsSync(hook)) fs.unlinkSync(hook);
  const utils = path.join(appsDir, app, "src/lib/utils.ts");
  if (fs.existsSync(utils)) fs.unlinkSync(utils);
  const types = path.join(appsDir, app, "src/lib/types.ts");
  if (app === "connect" && fs.existsSync(types)) fs.unlinkSync(types);
}

console.log(`Phase 2 setup: ${components.length} UI components, apps rewired.`);
