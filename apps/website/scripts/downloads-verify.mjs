/**
 * Verify Downloads matrix destinations (HEAD requests).
 * Does not invent URLs — uses the same defaults as src/data/downloads.js.
 */
import {
  DOWNLOAD_PRODUCTS,
  androidAction,
  webAction,
  windowsAction,
} from "../src/data/downloads.js";

async function probe(url) {
  const headers = { "user-agent": "LumenX-Downloads-Verify/1.0" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    if (!res.ok) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { ...headers, Range: "bytes=0-0" },
      });
    }
    return { ok: res.ok || res.status === 206, status: res.status, type: res.headers.get("content-type") };
  } catch (error) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { ...headers, Range: "bytes=0-0" },
      });
      return { ok: res.ok || res.status === 206, status: res.status, type: res.headers.get("content-type") };
    } catch (err2) {
      return { ok: false, status: 0, error: err2.message || error.message };
    }
  } finally {
    clearTimeout(timer);
  }
}

const expected = {
  admin: ["web", "android", "windows"],
  connect: ["android"],
  transport: ["android"],
  careers: ["web", "android"],
  admissions: ["web", "android"],
  nexus: ["android", "windows"],
};

let failed = 0;

console.log("Matrix shape");
for (const product of DOWNLOAD_PRODUCTS) {
  const keys = Object.keys(product.platforms).sort();
  const want = (expected[product.id] || []).slice().sort();
  const shapeOk =
    want.length === keys.length && want.every((k, i) => k === keys[i]);
  if (product.id === "nexus" && product.platforms.web) {
    console.log("  FAIL nexus must not offer web");
    failed += 1;
  } else if (!shapeOk) {
    console.log("  FAIL", product.id, "platforms", keys, "expected", want);
    failed += 1;
  } else {
    console.log("  ok ", product.id, keys.join(", "));
  }
}

console.log("\nDestination HEAD checks");
for (const product of DOWNLOAD_PRODUCTS) {
  const checks = [];
  if (product.platforms.web) checks.push(["web", webAction(product.platforms.web)]);
  if (product.platforms.android) checks.push(["android", androidAction(product.platforms.android)]);
  if (product.platforms.windows) checks.push(["windows", windowsAction(product.platforms.windows)]);

  for (const [label, action] of checks) {
    if (!action.available || !action.href) {
      console.log(`  SKIP ${product.id}/${label} — not available`);
      continue;
    }
    const result = await probe(action.href);
    if (result.ok) {
      console.log(`  ok  ${product.id}/${label} ${result.status} ${action.href}`);
    } else {
      console.log(`  FAIL ${product.id}/${label} ${result.status} ${action.href} ${result.error || ""}`);
      failed += 1;
    }
  }
}

if (failed) {
  console.error(`\nDownloads verify failed (${failed})`);
  process.exit(1);
}
console.log("\nDOWNLOADS VERIFY PASS");
