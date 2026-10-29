import fs from "fs";
/* Uses Node's built-in WebSocket (Node 22+). Requires Chrome --remote-debugging-port=9222. */

const OUT = "qa-artifacts/copy-pass";
fs.mkdirSync(OUT, { recursive: true });

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
  });
  const ready = new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  async function send(method, params = {}) {
    await ready;
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, (msg) => {
        pending.delete(id);
        resolve(msg);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  return { ws, send };
}

async function main() {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page") || list[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No CDP page target");
  const { ws, send } = connect(page.webSocketDebuggerUrl);

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Page.navigate", { url: "http://127.0.0.1:4321/" });
  for (let i = 0; i < 50; i++) {
    const r = await send("Runtime.evaluate", {
      expression:
        "(document.querySelector('.hero-stage')?.className||'') + '|' + (document.querySelector('.hero-title')?.textContent||'').trim()",
      returnByValue: true,
    });
    const v = r.result?.result?.value || "";
    if (v.includes("is-ready") && v.includes("One connected")) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  await send("Runtime.evaluate", {
    expression:
      "document.querySelector('.hero-stage')?.classList.add('is-ready'); true",
  });
  await new Promise((r) => setTimeout(r, 500));

  const info = await send("Runtime.evaluate", {
    expression: `({
      title: document.querySelector('.hero-title')?.textContent?.trim(),
      eyebrow: document.querySelector('.hero-eyebrow')?.textContent?.trim(),
      copy: document.querySelector('.hero-copy')?.textContent?.trim(),
      cta: [...document.querySelectorAll('.hero-actions a')].map(a => a.textContent.replace(/\\s+/g,' ').trim()),
      className: document.querySelector('.hero-stage')?.className,
      titleOpacity: getComputedStyle(document.querySelector('.hero-title')).opacity,
      img: document.querySelector('.hero-preview img')?.getAttribute('src'),
      aboutH2: document.querySelector('#about h2')?.textContent?.trim(),
      products: [...document.querySelectorAll('#platform .font-medium.text-dark, #platform p.mb-2')].slice(0,12).map(el => el.textContent.trim()).filter(Boolean)
    })`,
    returnByValue: true,
  });
  console.log("HOME", JSON.stringify(info.result?.result?.value, null, 2));

  let shot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  fs.writeFileSync(
    `${OUT}/home-1440-cdp.png`,
    Buffer.from(shot.result.data, "base64"),
  );

  await send("Page.navigate", { url: "http://127.0.0.1:4321/about" });
  await new Promise((r) => setTimeout(r, 1200));
  const aboutInfo = await send("Runtime.evaluate", {
    expression: `({
      crumb: document.querySelector('h1')?.textContent?.trim(),
      h2: [...document.querySelectorAll('h2')].map(h => h.textContent.trim())
    })`,
    returnByValue: true,
  });
  console.log("ABOUT", JSON.stringify(aboutInfo.result?.result?.value, null, 2));
  shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(
    `${OUT}/about-1440-cdp.png`,
    Buffer.from(shot.result.data, "base64"),
  );

  await send("Page.navigate", { url: "http://127.0.0.1:4321/pricing" });
  await new Promise((r) => setTimeout(r, 1500));
  await send("Runtime.evaluate", {
    expression: `(() => {
      const radio = document.querySelector('input[name="lx-duration"][value="12m"]') || document.querySelector('input[value="12m"]');
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); radio.click(); }
      document.getElementById('pricing-calculator')?.scrollIntoView({ block: 'start' });
      return true;
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  const pricingInfo = await send("Runtime.evaluate", {
    expression: `({
      heading: document.querySelector('#pricing h2')?.textContent?.trim(),
      intro: document.querySelector('#pricing p')?.textContent?.trim(),
      discountLabel: [...document.querySelectorAll('#lx-annual-breakdown *')].map(n => n.textContent.trim()).filter(Boolean).slice(0, 8),
      discount: document.getElementById('lx-annual-discount')?.textContent,
      total: document.getElementById('lx-total')?.textContent,
      summary: document.getElementById('lx-summary')?.textContent,
      annualHidden: document.getElementById('lx-annual-breakdown')?.classList.contains('hidden')
    })`,
    returnByValue: true,
  });
  console.log("PRICING", JSON.stringify(pricingInfo.result?.result?.value, null, 2));
  shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(
    `${OUT}/pricing-calc-cdp.png`,
    Buffer.from(shot.result.data, "base64"),
  );

  // Mobile home
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:4321/" });
  await new Promise((r) => setTimeout(r, 1200));
  await send("Runtime.evaluate", {
    expression:
      "document.querySelector('.hero-stage')?.classList.add('is-ready'); true",
  });
  await new Promise((r) => setTimeout(r, 400));
  shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(
    `${OUT}/home-390-cdp.png`,
    Buffer.from(shot.result.data, "base64"),
  );

  ws.close();
  console.log("DONE");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
