/**
 * Contact Sheet Generator (`tools/sheet.mjs`).
 * Captures 30 key frames spanning Intro, all 20 Era Blocks, Portal crossings, and Outro,
 * and composites them into a single labeled 6x5 Contact Sheet PNG (`out/stage1_contact_sheet.png`).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTRO_DUR, SCENE_COUNT, SCENE_DUR } from "../src/beat.js";
import { SCENES_META } from "../src/scenes/registry.js";
import { launchHeadlessBrowser, openRenderPage } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");

function buildDefaultGridEntries() {
  const entries = [
    { t: 1.0, label: "Intro · 01 (1.0s)" },
    { t: 2.6, label: "Intro · Beat2 (2.6s)" },
    { t: 4.95, label: "Portal 0->1 (4.95s)" },
  ];

  // Sample all 20 eras at each scene's signature Bar 2 peak (`thumbTime`) plus key portal crossings
  for (let i = 0; i < SCENE_COUNT; i++) {
    const meta = SCENES_META[i];
    const u = meta.thumbTime ?? 2.8;
    entries.push({
      t: INTRO_DUR + i * SCENE_DUR + u,
      label: `#${String(meta.num).padStart(2, "0")} ${meta.zh}`,
    });
    if (i === 13) {
      entries.push({ t: INTRO_DUR + 14 * SCENE_DUR, label: "Portal 14->15 (89.0s)" });
    }
  }

  // Remaining 6 slots up to 30: Outro beats
  entries.push(
    { t: 125.1, label: "Outro Pullback (125.1s)" },
    { t: 127.5, label: "Outro 7x3 Wall (127.5s)" },
    { t: 131.05, label: "Outro Flash (131.05s)" },
    { t: 134.5, label: "Outro Empty Seat (134.5s)" },
    { t: 135.85, label: "Outro Fly-by (135.85s)" },
    { t: 136.9, label: "Outro End (136.9s)" }
  );

  return entries.slice(0, 30);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const outArgIdx = process.argv.indexOf("--out");
  const outFile =
    outArgIdx >= 0
      ? path.resolve(ROOT, process.argv[outArgIdx + 1])
      : path.join(OUT_DIR, "final_contact_sheet.png");

  const entries = buildDefaultGridEntries();
  const cols = 6;
  const rows = 5;
  const cellW = 460;
  const cellH = 259; // 16:9
  const pad = 14;
  const labelH = 30;
  const headerH = 56;
  const sheetW = pad + cols * (cellW + pad);
  const sheetH = headerH + pad + rows * (cellH + labelH + pad);

  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();

  try {
    const { page, errors } = await openRenderPage(browser, srv.baseUrl);
    const dataUrls = [];

    for (const item of entries) {
      await page.evaluate((t) => window.renderAt(t), item.t);
      const b64 = await page.screenshot({ encoding: "base64", type: "png" });
      dataUrls.push({ ...item, dataUrl: `data:image/png;base64,${b64}` });
    }

    const sheetPage = await browser.newPage();
    await sheetPage.setViewport({ width: sheetW, height: sheetH, deviceScaleFactor: 1 });
    await sheetPage.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0;background:#111317;color:#ece9e1;font-family:-apple-system,PingFang SC,sans-serif;">
          <canvas id="sheet" width="${sheetW}" height="${sheetH}"></canvas>
        </body>
      </html>
    `);

    await sheetPage.evaluate(
      async ({ dataUrls, cols, cellW, cellH, pad, labelH, headerH, sheetW, sheetH }) => {
        const canvas = document.getElementById("sheet");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#111317";
        ctx.fillRect(0, 0, sheetW, sheetH);

        ctx.fillStyle = "#e5a93c";
        ctx.font = "bold 22px PingFang SC, sans-serif";
        ctx.fillText("《鹈鹕测试》 Master Contact Sheet (6×5 · Intro / All 20 Eras / 14→15 Portal / Outro)", pad, 36);

        for (let i = 0; i < dataUrls.length; i++) {
          const item = dataUrls[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = pad + col * (cellW + pad);
          const y = headerH + pad + row * (cellH + labelH + pad);

          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = item.dataUrl;
          });
          ctx.drawImage(img, x, y, cellW, cellH);

          ctx.strokeStyle = "#323743";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, cellH);

          ctx.fillStyle = "#1a1d24";
          ctx.fillRect(x, y + cellH, cellW, labelH);

          ctx.fillStyle = "#e6e2d8";
          ctx.font = "14px PingFang SC, Menlo, sans-serif";
          ctx.fillText(item.label, x + 8, y + cellH + 20);
        }
      },
      { dataUrls, cols, cellW, cellH, pad, labelH, headerH, sheetW, sheetH }
    );

    await sheetPage.screenshot({ path: outFile });
    console.log(`Contact sheet saved -> ${path.relative(ROOT, outFile)} (${sheetW}x${sheetH})`);

    if (errors.length > 0) {
      console.error("Browser errors detected:", errors);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await srv.close();
  }
}

main();
