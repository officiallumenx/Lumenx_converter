/**
 * Frees the default Connect dev port before starting Vite.
 * Only targets LISTENING sockets — avoids killing unrelated PIDs from TIME_WAIT rows.
 */
import { execSync } from "node:child_process";

const PORT = process.env.VITE_DEV_PORT ?? "5174";

function killPortWindows(port) {
  let killed = 0;
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();

    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;
      if (!trimmed.includes(`:${port}`)) continue;
      const pid = trimmed.split(/\s+/).at(-1);
      if (!pid || !/^\d+$/.test(pid) || pid === "0") continue;
      pids.add(pid);
    }

    if (pids.size === 0) {
      console.log(`[dev:clean] Port ${port} is free`);
      return;
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`[dev:clean] Stopped PID ${pid} on port ${port}`);
        killed += 1;
      } catch {
        /* process already exited */
      }
    }
  } catch {
    console.log(`[dev:clean] Port ${port} is free`);
  }

  if (killed === 0) {
    console.log(`[dev:clean] Port ${port} is free`);
  }
}

killPortWindows(PORT);
