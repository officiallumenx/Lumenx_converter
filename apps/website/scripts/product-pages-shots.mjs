import fs from "fs";

const OUT = "qa-artifacts/product-pages";
fs.mkdirSync(OUT, { recursive: true });

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
  };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  async function send(method, params = {}) {
    await ready;
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  return { ws, send };
}

async function shot(send, name) {
  const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(res.result.data, "base64"));
  console.log("wrote", name, res.result.data.length);
}

async function main() {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page") || list[0];
  const { ws, send } = connect(page.webSocketDebuggerUrl);
  await send("Page.enable");
  await send("Runtime.enable");

  const sizes = [
    { w: 390, h: 844, label: "390" },
    { w: 768, h: 1024, label: "768" },
    { w: 1024, h: 900, label: "1024" },
    { w: 1440, h: 1100, label: "1440" },
  ];

  const routes = [
    ["admin", "/platform/admin"],
    ["connect", "/platform/connect"],
    ["transport", "/platform/transport"],
    ["nexus", "/platform/nexus"],
  ];

  for (const [slug, url] of routes) {
    for (const size of sizes) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: size.w,
        height: size.h,
        deviceScaleFactor: 1,
        mobile: size.w < 768,
      });
      await send("Page.navigate", { url: `http://127.0.0.1:4321${url}` });
      await new Promise((r) => setTimeout(r, 1200));
      await send("Runtime.evaluate", {
        expression:
          "document.querySelectorAll('[data-reveal],[data-stagger]').forEach(el=>el.classList.add('is-inview')); true",
      });
      await new Promise((r) => setTimeout(r, 200));
      const overflow = await send("Runtime.evaluate", {
        expression: `({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          headline: document.querySelector('h1')?.textContent?.trim(),
          brokenImgs: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
        })`,
        returnByValue: true,
      });
      console.log(slug, size.label, JSON.stringify(overflow.result?.result?.value));
      await shot(send, `${slug}-${size.label}`);
    }
  }

  ws.close();
  console.log("DONE");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
