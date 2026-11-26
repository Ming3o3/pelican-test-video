/**
 * Stage 2 Visual Verification Tool (`tools/stage2-verify.mjs`).
 * Captures 6 full-resolution 1080p keyframes + an 18-frame (6x3) contact sheet
 * covering Scenes #01 (Sahara), #05 (Song Shan-shui), and #19 (Vertical Short Video).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTRO_DUR, SCENE_DUR } from "../src/beat.js";
import { launchHeadlessBrowser, openRenderPage } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");

const SHOTS = [
  { t: INTRO_DUR + 0 * SCENE_DUR + 3.2, name: "s2_01_sahara_gag.png" },
  { t: INTRO_DUR + 4 * SCENE_DUR + 2.15, name: "s2_05_song_wide.png" },
  { t: INTRO_DUR + 4 * SCENE_DUR + 3.9, name: "s2_05_song_zoom.png" },
  { t: INTRO_DUR + 18 * SCENE_DUR + 3.1, name: "s2_19_video_gag.png" },
  { t: INTRO_DUR + 18 * SCENE_DUR + 5.95, name: "s2_19_video_exit.png" },
  { t: 127.5, name: "s2_outro_wall.png" },
];

const SHEET_SCENES = [
  { idx: 0, tag: "#01 撒哈拉岩画" },
  { idx: 4, tag: "#05 宋代山水" },
  { idx: 18, tag: "#19 竖屏短视频" },
];
const SHEET_US = [0.05, 1.1, 2.15, 3.3, 4.6, 5.95];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();

  try {
    const { page, errors } = await openRenderPage(browser, srv.baseUrl);

    for (const s of SHOTS) {
      const t0 = performance.now();
      await page.evaluate((t) => window.renderAt(t), s.t);
      await page.screenshot({ path: path.join(OUT_DIR, s.name) });
      console.log(`Shot t=${s.t.toFixed(2)}s -> out/${s.name} (${(performance.now() - t0).toFixed(1)} ms)`);
    }

    // Build 6x3 Stage 2 Contact Sheet
    const entries = [];
    for (const sc of SHEET_SCENES) {
      for (const u of SHEET_US) {
        const t = INTRO_DUR + sc.idx * SCENE_DUR + u;
        await page.evaluate((timeSec) => window.renderAt(timeSec), t);
        const b64 = await page.screenshot({ encoding: "base64", type: "png" });
        entries.push({
          label: `${sc.tag} · u=${u.toFixed(2)}s`,
          dataUrl: `data:image/png;base64,${b64}`,
        });
      }
    }

    const cols = 6;
    const rows = 3;
    const cellW = 460;
    const cellH = 259;
    const pad = 14;
    const labelH = 30;
    const headerH = 54;
    const sheetW = pad + cols * (cellW + pad);
    const sheetH = headerH + pad + rows * (cellH + labelH + pad);

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
      async ({ entries, cols, cellW, cellH, pad, labelH, headerH, sheetW, sheetH }) => {
        const canvas = document.getElementById("sheet");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#111317";
        ctx.fillRect(0, 0, sheetW, sheetH);

        ctx.fillStyle = "#e5a93c";
        ctx.font = "bold 22px PingFang SC, sans-serif";
        ctx.fillText("《鹈鹕测试》 Stage 2 Contact Sheet — #01 撒哈拉岩画 / #05 宋代山水 / #19 竖屏短视频", pad, 34);

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
      { entries, cols, cellW, cellH, pad, labelH, headerH, sheetW, sheetH }
    );
    await sheetPage.screenshot({ path: path.join(OUT_DIR, "stage2_contact_sheet.png") });
    console.log(`Contact sheet saved -> out/stage2_contact_sheet.png (${sheetW}x${sheetH})`);

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
