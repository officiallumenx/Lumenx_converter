import assert from "node:assert/strict";
import {
  buildWeb3FormsData,
  normalizeAccessKey,
  submitViaWeb3Forms,
  WEB3FORMS_ENDPOINT,
} from "../src/scripts/web3forms-client.js";

function test(name, fn) {
  try {
    fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

console.log("Web3Forms client");

test("normalizeAccessKey trims", () => {
  assert.equal(normalizeAccessKey("  abc  "), "abc");
  assert.equal(normalizeAccessKey(""), "");
  assert.equal(normalizeAccessKey(null), "");
});

test("buildWeb3FormsData requires access key and maps required fields", () => {
  assert.equal(buildWeb3FormsData({ accessKey: "", name: "n", email: "a@b.co", message: "hi" }), null);
  const fd = buildWeb3FormsData({
    accessKey: "test-key-not-real",
    name: "Asha",
    email: "asha@school.edu",
    message: "Need a demo walkthrough",
    subject: "[LumenX] Ask a Question",
    phone: "9876543210",
    institute: "Green Valley",
    intent: "question",
  });
  assert.ok(fd instanceof FormData);
  assert.equal(fd.get("access_key"), "test-key-not-real");
  assert.equal(fd.get("name"), "Asha");
  assert.equal(fd.get("email"), "asha@school.edu");
  assert.equal(fd.get("message"), "Need a demo walkthrough");
  assert.equal(fd.get("subject"), "[LumenX] Ask a Question");
  assert.equal(fd.get("phone"), "9876543210");
  assert.equal(fd.get("institute"), "Green Valley");
  assert.equal(fd.get("intent"), "question");
});

await testAsync("rejects missing access key without calling network", async () => {
  const result = await submitViaWeb3Forms({
    accessKey: "   ",
    subject: "t",
    name: "n",
    email: "a@b.co",
    message: "hello world",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /not configured/i);
});

await testAsync("POSTs FormData to Web3Forms and maps success", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";
  let seenBody = null;
  let seenMethod = "";
  globalThis.fetch = async (url, init = {}) => {
    seenUrl = String(url);
    seenMethod = init.method || "";
    seenBody = init.body;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await submitViaWeb3Forms({
      accessKey: "test-key-not-real",
      subject: "t",
      name: "n",
      email: "a@b.co",
      message: "hello world",
    });
    assert.equal(result.ok, true);
    assert.equal(seenUrl, WEB3FORMS_ENDPOINT);
    assert.equal(seenMethod, "POST");
    assert.ok(seenBody instanceof FormData);
    assert.equal(seenBody.get("access_key"), "test-key-not-real");
    assert.equal(seenBody.get("name"), "n");
    assert.equal(seenBody.get("email"), "a@b.co");
    assert.equal(seenBody.get("message"), "hello world");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync("maps failed Web3Forms JSON without treating as success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: false, message: "Invalid access key" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    const result = await submitViaWeb3Forms({
      accessKey: "test-key-not-real",
      subject: "t",
      name: "n",
      email: "a@b.co",
      message: "hello world",
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /Invalid access key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync("handles invalid JSON response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("not-json", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  try {
    const result = await submitViaWeb3Forms({
      accessKey: "test-key-not-real",
      subject: "t",
      name: "n",
      email: "a@b.co",
      message: "hello world",
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /invalid response/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync("detects Cloudflare challenge HTML without claiming success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("<!DOCTYPE html><title>Just a moment...</title><div>cf-browser-verification</div>", {
      status: 403,
      headers: { "content-type": "text/html" },
    });
  try {
    const result = await submitViaWeb3Forms({
      accessKey: "test-key-not-real",
      subject: "t",
      name: "n",
      email: "a@b.co",
      message: "hello world",
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /blocked/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync("treats AbortController timeout as timedOut", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  try {
    const result = await submitViaWeb3Forms({
      accessKey: "test-key-not-real",
      subject: "t",
      name: "n",
      email: "a@b.co",
      message: "hello world",
      timeoutMs: 20,
    });
    assert.equal(result.ok, false);
    assert.equal(result.timedOut, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

if (process.exitCode) {
  console.error("web3forms-client tests failed");
  process.exit(process.exitCode);
}
console.log("web3forms-client tests passed");
