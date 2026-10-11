import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hooksPath = path.join(root, "src/lib/connect-queries/hooks.ts");
console.log("hooksPath", hooksPath);

let src = fs.readFileSync(hooksPath, "utf8");
console.log("before has scoped", src.includes("scopedConnectKey"));

if (!src.includes('import { scopedConnectKey } from "./scope"')) {
  src = src.replace(
    'import { connectQueryKeys } from "./keys";',
    `import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { useConnectQueryUserId } from "./use-connect-query-user";`,
  );
}

src = src.replace(/export function (use\w+)\(([^)]*)\) \{(\r?\n)/g, (m, name, args, nl) => {
  if (name === "useConnectQueryUserId") return m;
  return `export function ${name}(${args}) {${nl}  const userId = useConnectQueryUserId();${nl}`;
});

src = src.replace(
  /const userId = useConnectQueryUserId\(\);\r?\n  const userId = useConnectQueryUserId\(\);/g,
  "const userId = useConnectQueryUserId();",
);

src = src.replace(
  /queryKey:\s*\[\.\.\.connectQueryKeys\.(\w+)\(([^)]*)\)([^\]]*)]/g,
  "queryKey: [...scopedConnectKey(userId, connectQueryKeys.$1($2))$3]",
);

src = src.replace(
  /queryKey:\s*connectQueryKeys\.(\w+)\(([^)]*)\)/g,
  "queryKey: scopedConnectKey(userId, connectQueryKeys.$1($2))",
);

src = src.replace(
  /queryKey:\s*\[connectQueryKeys\.marksParent\(([^)]*)\)\[0\],\s*"catalog",\s*instituteId,\s*teacherId\]/g,
  'queryKey: scopedConnectKey(userId, [connectQueryKeys.marksParent($1)[0], "catalog", instituteId, teacherId])',
);

fs.writeFileSync(hooksPath, src);
const after = fs.readFileSync(hooksPath, "utf8");
console.log("after has scoped", after.includes("scopedConnectKey"));
console.log("userId count", (after.match(/useConnectQueryUserId/g) || []).length);
console.log("unscoped queryKey connectQueryKeys", (after.match(/queryKey:\s*connectQueryKeys/g) || []).length);
console.log("unscoped spread", (after.match(/\[\.\.\.connectQueryKeys/g) || []).length);
