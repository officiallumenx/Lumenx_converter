import fs from "fs";

const path = "apps/admin/src/routes/institute.tsx";
let s = fs.readFileSync(path, "utf8");

const startMarker =
  "  const display = editing ? form : normalizeInstituteProfile(instituteProfile);\n\n  return (\n    <AppShell";
const endMarker = "function InstitutePage()";
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}

const original = s.slice(start, end);
const afterHero = original.indexOf("/>\n      {saved &&");
if (afterHero < 0) {
  console.error("afterHero not found");
  process.exit(1);
}
const innerEnd = original.lastIndexOf("</AppShell>");
let inner = original.slice(afterHero + "/>\n      ".length, innerEnd).trimEnd();
const gridStart = inner.indexOf('<div className="grid');
if (gridStart < 0) {
  console.error("grid not found");
  process.exit(1);
}
const grid = inner.slice(gridStart);
const indentedGrid = grid
  .split("\n")
  .map((line) => (line.length ? `      ${line}` : line))
  .join("\n");

const replacement = `  const display = editing ? form : normalizeInstituteProfile(instituteProfile);

  const actions = editing ? (
    <>
      <Button onClick={cancelEdit}>
        <X className="size-3.5" /> Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        <Save className="size-3.5" /> Save profile
      </Button>
    </>
  ) : (
    <Button variant="primary" onClick={startEdit}>
      <Pencil className="size-3.5" /> Edit profile
    </Button>
  );

  const body = (
    <>
      {saved && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-success/30 bg-success/10 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="size-3.5" /> Profile saved successfully
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">{actions}</div>

${indentedGrid}
    </>
  );

  if (embedded) return <div className="space-y-4">{body}</div>;

  return (
    <AppShell
      title={M.institute}
      subtitle={\`\${profile.label} · Connect login, verify pages, and certificates\`}
      actions={actions}
    >
      <ModuleHero
        eyebrow="Settings"
        title="Institute profile"
        subtitle={\`\${profile.label} · Connect login, verify pages, and certificates\`}
      />
      {body}
    </AppShell>
  );
}

`;

s = s.slice(0, start) + replacement + "\n" + s.slice(end);
fs.writeFileSync(path, s);
console.log("ok");
