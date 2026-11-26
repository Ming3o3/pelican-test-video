/**
 * Reusable Batch Visual Verifier (`tools/verify-batch.mjs`).
 * Usage:
 *   node tools/verify-batch.mjs --batch 3a --scenes 2,3,5,8
 * Captures full-res 1920x1080 Bar-2 highlight shots + Outro gallery wall (127.5s)
 * and builds a labeled 6xN Contact Sheet (`out/batch<id>_contact_sheet.png`).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTRO_DUR, SCENE_DUR } from "../src/beat.js";
import { SCENES_META } from "../src/scenes/registry.js";
import { launchHeadlessBrowser, openRenderPage } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");
const SAMPLE_US = [0.05, 1.1, 2.15, 3.2, 4.6, 5.95];

function parseArgs(argv) {
  let batch = "3a";
  let scenes = [2, 3, 5, 8];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--batch" && argv[i + 1]) batch = argv[++i];
    else if (argv[i] === "--scenes" && argv[i + 1]) {
      scenes = argv[++i]
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    }
  }
  return { batch, scenes };
}

async function main() {
  const { batch, scenes } = parseArgs(process.argv.slice(2));
  await fs.mkdir(OUT_DIR, { recursive: true });

  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();

  try {
    const { page, errors } = await openRenderPage(browser, srv.baseUrl);

    // 1. Full-res 1080p shots at Bar 2 highlight (u = 3.0s) for each scene in batch
    for (const idx of scenes) {
      const meta = SCENES_META[idx];
      const highlightU = meta.thumbTime ?? 3.0;
      const t = INTRO_DUR + idx * SCENE_DUR + highlightU;
      const numStr = String(meta.num).padStart(2, "0");
      const shortName = meta.id.replace(/^s\d+_/, "");
      const outName = `b${batch}_${numStr}_${shortName}.png`;

      const t0 = performance.now();
      await page.evaluate((timeSec) => window.renderAt(timeSec), t);
      await page.screenshot({ path: path.join(OUT_DIR, outName) });
      console.log(`Shot #${numStr} (${meta.zh}) t=${t.toFixed(2)}s -> out/${outName} (${(performance.now() - t0).toFixed(1)} ms)`);
    }

    // Also capture Outro 7x3 wall to confirm updated gallery thumbnails
    const wallName = `b${batch}_outro_wall.png`;
    await page.evaluate(() => window.renderAt(127.5));
    await page.screenshot({ path: path.join(OUT_DIR, wallName) });
    console.log(`Shot Outro wall t=127.50s -> out/${wallName}`);

    // 2. Contact Sheet (6 x N)
    const entries = [];
    for (const idx of scenes) {
      const meta = SCENES_META[idx];
      const numStr = String(meta.num).padStart(2, "0");
      for (const u of SAMPLE_US) {
        const t = INTRO_DUR + idx * SCENE_DUR + u;
        await page.evaluate((timeSec) => window.renderAt(timeSec), t);
        const b64 = await page.screenshot({ encoding: "base64", type: "png" });
        entries.push({
          label: `#${numStr} ${meta.zh} · u=${u.toFixed(2)}s`,
          dataUrl: `data:image/png;base64,${b64}`,
        });
      }
    }

    const cols = SAMPLE_US.length;
    const rows = scenes.length;
    const cellW = 460;
    const cellH = 259;
    const pad = 14;
    const labelH = 30;
    const headerH = 54;
    const sheetW = pad + cols * (cellW + pad);
    const sheetH = headerH + pad + rows * (cellH + labelH + pad);
    const titleLabels = scenes.map((i) => `#${String(SCENES_META[i].num).padStart(2, "0")} ${SCENES_META[i].zh}`).join(" / ");

    const sheetPage = await browser.newPage();
    await sheetPage.setViewport({ width: sheetW, height: sheetH, deviceScaleFactor: 1 });
    await sheetPage.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0;background:#111317;">
          <canvas id="sheet" width="${sheetW}" height="${sheetH}"></canvas>
        </body>
      </html>
    `);
    await sheetPage.evaluate(
      async ({ entries, cols, cellW, cellH, pad, labelH, headerH, sheetW, sheetH, headerTitle }) => {
        const canvas = document.getElementById("sheet");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#111317";
        ctx.fillRect(0, 0, sheetW, sheetH);

        ctx.fillStyle = "#e5a93c";
        ctx.font = "bold 22px PingFang SC, sans-serif";
        ctx.fillText(headerTitle, pad, 34);

        for (let i = 0; i < entries.length; i++) {
          const item = entries[i];
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
      {
        entries,
        cols,
        cellW,
        cellH,
        pad,
        labelH,
        headerH,
        sheetW,
        sheetH,
        headerTitle: `《鹈鹕测试》 Batch ${batch.toUpperCase()} Contact Sheet — ${titleLabels}`,
      }
    );

    const sheetName = `batch${batch}_contact_sheet.png`;
    await sheetPage.screenshot({ path: path.join(OUT_DIR, sheetName) });
    console.log(`Contact sheet saved -> out/${sheetName} (${sheetW}x${sheetH})`);

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
