import fs from "node:fs";

let s = fs.readFileSync("src/lib/admin-queries/hooks.ts", "utf8");
const names = [
  "useInvalidateAdminQuery",
  "useNotificationsListQuery",
  "useCatalogClassesQuery",
  "useCatalogSubjectsQuery",
  "useCatalogYearsQuery",
  "useAcademicYearsListQuery",
  "useHomeSummaryQuery",
  "useHomeWidgetsQuery",
  "useHomeBirthdaysQuery",
  "useInstituteProfileQuery",
];

function cutExportFunction(source, name) {
  const token = `export function ${name}(`;
  const start = source.indexOf(token);
  if (start < 0) throw new Error(`missing ${name}`);
  let realStart = start;
  const lookBehind = source.slice(Math.max(0, start - 240), start);
  const doc = lookBehind.lastIndexOf("\n/**");
  if (doc >= 0) realStart = Math.max(0, start - 240) + doc + 1;
  let i = start;
  let depth = 0;
  let started = false;
  for (; i < source.length; i++) {
    if (source[i] === "{") {
      depth++;
      started = true;
    } else if (source[i] === "}") {
      depth--;
      if (started && depth === 0) {
        i++;
        break;
      }
    }
  }
  while (source[i] === "\n" || source[i] === "\r") i++;
  return source.slice(0, realStart) + source.slice(i);
}

function cutFunction(source, token) {
  const start = source.indexOf(token);
  if (start < 0) return source;
  let realStart = start;
  const lookBehind = source.slice(Math.max(0, start - 250), start);
  const doc = lookBehind.lastIndexOf("\n/**");
  if (doc >= 0) realStart = Math.max(0, start - 250) + doc + 1;
  let i = start;
  let depth = 0;
  let started = false;
  for (; i < source.length; i++) {
    if (source[i] === "{") {
      depth++;
      started = true;
    } else if (source[i] === "}") {
      depth--;
      if (started && depth === 0) {
        i++;
        break;
      }
    }
  }
  while (source[i] === "\n" || source[i] === "\r") i++;
  return source.slice(0, realStart) + source.slice(i);
}

for (const n of names) s = cutExportFunction(s, n);
s = cutFunction(s, "function instituteEnabled(");
s = cutFunction(s, "function useAdminQuery<");

s = s.replace(
  /import \{\n  keepPreviousData,\n  useInfiniteQuery,\n  useQuery,\n  useQueryClient,\n  type UseQueryOptions,\n  type QueryKey,\n\} from "@tanstack\/react-query";\n/,
  `import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { instituteEnabled, useAdminQuery } from "./hooks-shared";
`,
);
s = s.replace(/import \{ asAdminQueryResult \} from "\.\/query-result";\n/, "");
s = s.replace(
  /import \{ loadNotificationInboxList \} from "@\/lib\/notification-inbox";\n/,
  "",
);
s = s.replace(
  /import \{ loadAcademicYearsList \} from "@\/lib\/academic-years";\n/,
  "",
);
s = s.replace(
  /import \{ loadDashboardSummary, loadDashboardWidgets, loadHomeBirthdaysToday, localYmd \} from "@\/lib\/dashboard";\n/,
  "",
);
s = s.replace(
  /import \{\n  loadDashboardSummary,\n  loadDashboardWidgets,\n  loadHomeBirthdaysToday,\n  localYmd,\n\} from "@\/lib\/dashboard";\n/,
  "",
);
s = s.replace(/import \{ loadInstituteProfile \} from "@\/lib\/institutes";\n/, "");

fs.writeFileSync("src/lib/admin-queries/hooks.ts", s);
console.log("hooks.ts lines", s.split("\n").length);
for (const n of names) {
  if (s.includes(`export function ${n}`)) {
    throw new Error(`shell fn still in hooks.ts: ${n}`);
  }
}
if (!s.includes('from "./hooks-shared"')) {
  throw new Error("hooks-shared import missing");
}
console.log("ok");
