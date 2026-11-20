import fs from "fs";

const OUT = "qa-artifacts/pricing-ui";
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

async function readState(send) {
  const res = await send("Runtime.evaluate", {
    expression: `({
      students: document.getElementById('lx-students')?.value,
      rate: document.getElementById('lx-rate')?.value,
      rateInvalid: document.getElementById('lx-rate')?.getAttribute('aria-invalid'),
      rateError: document.getElementById('lx-rate-error')?.textContent?.trim(),
      rateErrorHidden: document.getElementById('lx-rate-error')?.classList.contains('hidden'),
      duration: document.querySelector('input[name="lx-duration"]:checked')?.value,
      subtotal: document.getElementById('lx-subtotal')?.textContent,
      monthly: document.getElementById('lx-monthly')?.textContent,
      note: document.getElementById('lx-minimum-note')?.textContent,
      total: document.getElementById('lx-total')?.textContent,
      hasRateChips: !!document.querySelector('input[name="lx-rate"][type="radio"]'),
      labels: [...document.querySelectorAll('.lx-plan-label')].map(el => el.textContent.trim()),
      cardAnnualNormal: document.querySelector('[data-plan-annual-normal]')?.textContent.trim(),
      cardAnnualDiscount: document.querySelector('[data-plan-annual-discount]')?.textContent.trim(),
      cardAnnualFinal: document.querySelector('[data-plan-total="12m"]')?.textContent.trim()
    })`,
    returnByValue: true,
  });
  return res.result?.result?.value;
}

async function setCalc(send, { students, rate, duration }) {
  await send("Runtime.evaluate", {
    expression: `(() => {
      const studentsEl = document.getElementById('lx-students');
      if (studentsEl) {
        studentsEl.value = ${JSON.stringify(String(students))};
        studentsEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const rateEl = document.getElementById('lx-rate');
      if (rateEl) {
        rateEl.value = ${JSON.stringify(String(rate))};
        rateEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const durEl = document.querySelector('input[name="lx-duration"][value="${duration}"]');
      if (durEl) { durEl.checked = true; durEl.dispatchEvent(new Event('change', { bubbles: true })); }
      return true;
    })()`,
  });
  await new Promise((r) => setTimeout(r, 200));
}

async function main() {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page") || list[0];
  const { ws, send } = connect(page.webSocketDebuggerUrl);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:4321/pricing" });
  await new Promise((r) => setTimeout(r, 1500));

  const cases = [
    {
      name: "default-10-6m",
      students: 900,
      rate: 10,
      duration: "6m",
      expect: { monthly: "₹9,000", total: "₹54,000", rateInvalid: "false" },
    },
    {
      name: "custom-12-3m",
      students: 900,
      rate: 12,
      duration: "3m",
      expect: { monthly: "₹10,800", total: "₹32,400", rateInvalid: "false" },
    },
    {
      name: "custom-20-annual",
      students: 900,
      rate: 20,
      duration: "12m",
      expect: {
        monthly: "₹18,000",
        total: "₹1,80,000",
        annualNormal: "₹2,16,000",
        annualDiscount: "₹36,000",
        rateInvalid: "false",
      },
    },
    {
      name: "custom-50-annual",
      students: 200,
      rate: 50,
      duration: "12m",
      expect: {
        monthly: "₹10,000",
        total: "₹1,00,000",
        annualNormal: "₹1,20,000",
        annualDiscount: "₹20,000",
        rateInvalid: "false",
      },
    },
    {
      name: "below-min-students",
      students: 300,
      rate: 15,
      duration: "3m",
      expect: { monthly: "₹8,000", total: "₹24,000", noteIncludes: "Minimum monthly" },
    },
    {
      name: "reject-9.99",
      students: 900,
      rate: 9.99,
      duration: "6m",
      expect: { invalid: true, total: "—", monthly: "—" },
    },
    {
      name: "reject-blank",
      students: 900,
      rate: "",
      duration: "6m",
      expect: { invalid: true, total: "—", monthly: "—" },
    },
    {
      name: "reject-zero",
      students: 900,
      rate: 0,
      duration: "6m",
      expect: { invalid: true, total: "—", monthly: "—" },
    },
  ];

  let failed = 0;
  for (const c of cases) {
    await setCalc(send, c);
    const state = await readState(send);
    console.log(c.name, JSON.stringify(state, null, 2));
    const checks = [
      ["no-rate-chips", state.hasRateChips === false],
      ["labels", JSON.stringify(state.labels) === JSON.stringify(["3 Months", "6 Months", "Annual Plan"])],
    ];
    if (c.expect.invalid) {
      checks.push(["invalid-flag", state.rateInvalid === "true"]);
      checks.push(["error-visible", state.rateErrorHidden === false]);
      checks.push(["cleared-total", state.total === "—"]);
      checks.push(["cleared-monthly", state.monthly === "—"]);
    } else {
      checks.push(["monthly", state.monthly === c.expect.monthly]);
      checks.push(["total", state.total === c.expect.total]);
      checks.push(["rate-valid", state.rateInvalid === "false" || state.rateInvalid === null]);
      checks.push(["error-hidden", state.rateErrorHidden === true]);
    }
    if (c.expect.noteIncludes) {
      checks.push(["note", (state.note || "").includes(c.expect.noteIncludes)]);
    }
    if (c.expect.annualNormal) {
      checks.push(["cardAnnualNormal", state.cardAnnualNormal === c.expect.annualNormal]);
      checks.push([
        "cardAnnualDiscount",
        state.cardAnnualDiscount === `−${c.expect.annualDiscount}` ||
          state.cardAnnualDiscount === `-${c.expect.annualDiscount}`,
      ]);
      checks.push(["cardAnnualFinal", state.cardAnnualFinal === c.expect.total]);
    }
    for (const [label, ok] of checks) {
      if (!ok) {
        console.log("  FAIL", label, "got", state);
        failed += 1;
      } else {
        console.log("  ok", label);
      }
    }
  }

  await setCalc(send, { students: 900, rate: 20, duration: "12m" });
  let shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(`${OUT}/pricing-custom-20-annual.png`, Buffer.from(shot.result.data, "base64"));

  await setCalc(send, { students: 900, rate: 9.99, duration: "6m" });
  shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(`${OUT}/pricing-invalid-rate.png`, Buffer.from(shot.result.data, "base64"));

  ws.close();
  console.log(failed === 0 ? "PRICING UI PASS" : `PRICING UI FAIL: ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
