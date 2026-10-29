/**
 * CDP checks for spacing / ecosystem orbit / pricing after polish pass.
 * Requires: preview on 127.0.0.1:4321 and Chrome --remote-debugging-port=9222
 */
import fs from "fs";

const OUT = "qa-artifacts/polish-pass";
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:4321";

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

async function evaluate(send, expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return res.result?.result?.value;
}

async function screenshot(send, name) {
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.result.data, "base64"));
  console.log("shot", name);
}

async function setViewport(send, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function setPricing(send, students, rate, duration) {
  return evaluate(
    send,
    `(() => {
      const s = document.getElementById('lx-students');
      const r = document.getElementById('lx-rate');
      if (s) { s.value = ${JSON.stringify(String(students))}; s.dispatchEvent(new Event('input', {bubbles:true})); }
      if (r) { r.value = ${JSON.stringify(String(rate))}; r.dispatchEvent(new Event('input', {bubbles:true})); }
      const d = document.querySelector('input[name="lx-duration"][value="${duration}"]');
      if (d) { d.checked = true; d.dispatchEvent(new Event('change', {bubbles:true})); }
      return {
        subtotal: document.getElementById('lx-subtotal')?.textContent,
        monthly: document.getElementById('lx-monthly')?.textContent,
        total: document.getElementById('lx-total')?.textContent,
        note: document.getElementById('lx-minimum-note')?.textContent,
        annualNormal: document.querySelector('[data-plan-annual-normal]')?.textContent,
        annualDiscount: document.querySelector('[data-plan-annual-discount]')?.textContent,
        annualFinal: document.querySelector('[data-plan-total="12m"]')?.textContent,
      };
    })()`
  );
}

async function main() {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page") || list[0];
  const { ws, send } = connect(page.webSocketDebuggerUrl);
  await send("Page.enable");
  await send("Runtime.enable");

  const failures = [];

  await send("Page.navigate", { url: `${BASE}/` });
  await new Promise((r) => setTimeout(r, 1400));

  for (const [name, w, h] of [
    ["home-products-390", 390, 1200],
    ["home-products-768", 768, 1100],
    ["home-products-1024", 1024, 1100],
    ["home-products-1440", 1440, 1100],
  ]) {
    await setViewport(send, w, h);
    await evaluate(send, `document.getElementById('platform')?.scrollIntoView({block:'start'})`);
    await new Promise((r) => setTimeout(r, 350));
    await screenshot(send, name);
  }

  for (const [name, w, h] of [
    ["ecosystem-390", 390, 1400],
    ["ecosystem-768", 768, 1100],
    ["ecosystem-1440", 1440, 1100],
  ]) {
    await setViewport(send, w, h);
    await evaluate(
      send,
      `(() => {
        const el = document.getElementById('ecosystem');
        if (!el) return false;
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo(0, Math.max(0, top));
        return true;
      })()`
    );
    await new Promise((r) => setTimeout(r, 450));
    await screenshot(send, name);
  }

  await setViewport(send, 1440, 1100);
  const eco = await evaluate(
    send,
    `(() => {
      const orbit = document.querySelector('[data-lx-orbit]');
      const mobile = document.querySelector('.lx-orbit-mobile');
      const nodes = [...document.querySelectorAll('[data-node]')].map(n => n.getAttribute('data-node'));
      const hrefs = [...document.querySelectorAll('[data-node]')].map(n => n.getAttribute('href'));
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      return {
        hasOrbit: !!orbit,
        hasMobile: !!mobile,
        nodes,
        hrefs,
        overflow,
        orbitDisplay: orbit ? getComputedStyle(orbit).display : null,
        mobileDisplay: mobile ? getComputedStyle(mobile).display : null,
        noEcoCards: !document.querySelector('.lx-eco-hub'),
        noEcoStrip: !document.querySelector('.lx-eco-strip'),
      };
    })()`
  );
  console.log("ecosystem", JSON.stringify(eco, null, 2));
  if (!eco?.hasOrbit || !eco?.hasMobile) failures.push("missing orbit/mobile");
  if (!eco?.noEcoCards || !eco?.noEcoStrip) failures.push("old ecosystem cards still present");
  if (eco?.overflow) failures.push("horizontal overflow on home");
  for (const id of ["admin", "connect", "transport", "admissions", "careers", "nexus"]) {
    if (!eco?.nodes?.includes(id)) failures.push(`missing node ${id}`);
  }
  if (eco?.orbitDisplay === "none") failures.push("orbit hidden at desktop");

  await setViewport(send, 390, 1400);
  const ecoMobile = await evaluate(
    send,
    `(() => ({
      orbitDisplay: getComputedStyle(document.querySelector('[data-lx-orbit]')).display,
      mobileDisplay: getComputedStyle(document.querySelector('.lx-orbit-mobile')).display,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))()`
  );
  console.log("ecosystem-mobile", ecoMobile);
  if (ecoMobile?.mobileDisplay === "none") failures.push("mobile layout hidden at 390");
  if (ecoMobile?.overflow) failures.push("horizontal overflow at 390");

  await send("Page.navigate", { url: `${BASE}/pricing/` });
  await new Promise((r) => setTimeout(r, 1100));
  await setViewport(send, 1440, 1300);

  const cases = [
    {
      name: "900x10-annual",
      students: 900,
      rate: 10,
      duration: "12m",
      expect: {
        subtotal: "₹9,000",
        monthly: "₹9,000",
        annualNormal: "₹1,08,000",
        annualDiscount: "−₹18,000",
        annualFinal: "₹90,000",
      },
    },
    {
      name: "500x15-annual",
      students: 500,
      rate: 15,
      duration: "12m",
      expect: {
        subtotal: "₹7,500",
        monthly: "₹8,000",
        annualNormal: "₹96,000",
        annualDiscount: "−₹16,000",
        annualFinal: "₹80,000",
      },
    },
  ];

  for (const c of cases) {
    const state = await setPricing(send, c.students, c.rate, c.duration);
    console.log(c.name, state);
    for (const [k, v] of Object.entries(c.expect)) {
      if (state?.[k] !== v) {
        failures.push(`${c.name} ${k}: got ${state?.[k]} expected ${v}`);
        console.log("  FAIL", k, state?.[k], "!=", v);
      } else console.log("  ok", k);
    }
  }

  await evaluate(send, `document.getElementById('pricing')?.scrollIntoView({block:'start'})`);
  await setPricing(send, 900, 10, "12m");
  await screenshot(send, "pricing-900x10-1440");
  await setPricing(send, 500, 15, "12m");
  await screenshot(send, "pricing-500x15-1440");
  await setViewport(send, 390, 1600);
  await screenshot(send, "pricing-390");

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await send("Page.navigate", { url: `${BASE}/` });
  await new Promise((r) => setTimeout(r, 1100));
  await setViewport(send, 1440, 1100);
  await evaluate(send, `document.getElementById('ecosystem')?.scrollIntoView({block:'start'})`);
  await new Promise((r) => setTimeout(r, 400));
  await screenshot(send, "ecosystem-reduced-motion-1440");

  const focusOk = await evaluate(
    send,
    `(() => {
      const node = document.querySelector('[data-node="connect"]');
      if (!node) return { ok: false, reason: 'missing node' };
      node.dispatchEvent(new Event('mouseenter', { bubbles: true }));
      node.focus({ preventScroll: true });
      node.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      const caption = document.querySelector('[data-orbit-caption]')?.textContent || '';
      return {
        ok: node.classList.contains('is-active') && /connect/i.test(caption),
        caption,
        active: node.classList.contains('is-active'),
        ready: document.querySelector('[data-lx-orbit]')?.dataset?.lxOrbitReady,
      };
    })()`
  );
  console.log("focus-hover", focusOk);
  if (!focusOk?.ok) failures.push("orbit focus highlight/caption failed");

  ws.close();
  if (failures.length) {
    console.error("FAILURES:\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("POLISH UI PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
