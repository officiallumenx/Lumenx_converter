import { spawnSync } from "node:child_process";
import { join } from "node:path";

const apps = ["admin", "nexus", "connect", "transport", "admissions", "careers"];
const cli = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");

for (const app of apps) {
  console.log(`\nRunning safe ${app} browser journeys...`);
  const result = spawnSync(
    process.execPath,
    [cli, "test", `--project=${app}`],
    {
      cwd: process.cwd(),
      env: { ...process.env, E2E_APP: app },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
