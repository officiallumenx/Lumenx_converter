import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "src/hooks/use-connect-api-inbox.ts",
  "src/hooks/use-connect-announcements.ts",
  "src/teacher-portal/features/attendance/TeacherAttendanceApiPanel.tsx",
  "src/teacher-portal/features/timetable/TeacherTimetableApiPanel.tsx",
  "src/teacher-portal/features/exams/TeacherExamsApiPanel.tsx",
  "src/teacher-portal/features/events/TeacherEventsPage.tsx",
  "src/teacher-portal/features/assignments/ApiTeacherAssignmentsPage.tsx",
  "src/components/app/events/LearnerEventsApiPanel.tsx",
];

for (const rel of files) {
  const full = path.join(root, rel);
  let src = fs.readFileSync(full, "utf8");
  let changed = false;

  if (!src.includes("scopedConnectKey")) {
    if (src.includes('from "@/lib/connect-queries/keys"')) {
      src = src.replace(
        'from "@/lib/connect-queries/keys"',
        'from "@/lib/connect-queries/keys";\nimport { scopedConnectKey } from "@/lib/connect-queries/scope";\nimport { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user"',
      );
      changed = true;
    } else if (src.includes('from "@/lib/connect-queries"')) {
      src = src.replace(
        /import \{([^}]+)\} from "@\/lib\/connect-queries"/,
        (m, inner) => {
          if (inner.includes("scopedConnectKey")) return m;
          return `import {${inner}, scopedConnectKey } from "@/lib/connect-queries";\nimport { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user"`;
        },
      );
      changed = true;
    } else if (src.includes("connectQueryKeys")) {
      src = `import { scopedConnectKey } from "@/lib/connect-queries/scope";\nimport { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";\n` + src;
      changed = true;
    }
  }

  // Ensure hook has userId near top of component/function that uses connectQueryKeys
  if (src.includes("connectQueryKeys") && !src.includes("useConnectQueryUserId()")) {
    // Insert after first function/component opening that contains connectQueryKeys usage
    src = src.replace(
      /(export function \w+[^{]*\{\r?\n)/,
      `$1  const userId = useConnectQueryUserId();\n`,
    );
    changed = true;
  }

  const before = src;
  src = src.replace(
    /queryKey:\s*connectQueryKeys\.(\w+)\(([^)]*)\)/g,
    "queryKey: scopedConnectKey(userId, connectQueryKeys.$1($2))",
  );
  src = src.replace(
    /connectQueryKeys\.inbox\(([^)]*)\)/g,
    "scopedConnectKey(userId, connectQueryKeys.inbox($1))",
  );
  src = src.replace(
    /const key = connectQueryKeys\.(\w+)\(([^)]*)\)/g,
    "const key = scopedConnectKey(userId, connectQueryKeys.$1($2))",
  );
  if (src !== before) changed = true;

  if (changed) {
    fs.writeFileSync(full, src);
    console.log("updated", rel);
  } else {
    console.log("skip", rel);
  }
}
