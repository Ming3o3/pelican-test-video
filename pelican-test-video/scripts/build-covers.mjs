/**
 * Bespoke Multi-Aspect Cover Art Generator (`build-covers.mjs`).
 * Captures clean title-card-free era renders from the real engine via Chromium request interception,
 * composites 3 original covers (`out/cover_16x9.png`, `out/cover_4x3_landscape.png`,
 * `out/cover_3x4_portrait.png`) keeping `git status` clean inside the project repo.
 */

import fs from "node:fs/promises";
import path from "node:path";

import path0 from "node:path";
import { pathToFileURL } from "node:url";
// Run from the engine directory (cwd), or pass ENGINE_DIR=<path>.
const PROJECT_ROOT = path0.resolve(process.env.ENGINE_DIR || process.cwd());
const load = (rel) => import(pathToFileURL(path0.join(PROJECT_ROOT, rel)).href);
const { INTRO_DUR, SCENE_COUNT, SCENE_DUR } = await load("src/beat.js");
const { SCENES_META } = await load("src/scenes/registry.js");
const { launchHeadlessBrowser } = await load("tools/browser.mjs");
const { startStaticServer } = await load("tools/server.mjs");
const OUT_DIR = path.join(PROJECT_ROOT, "out");

async function openCleanRenderPage(browser, baseUrl) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url.endsWith("/src/kit/titleCard.js") || url.includes("/src/kit/titleCard.js?")) {
      req.respond({
        status: 200,
        contentType: "application/javascript; charset=utf-8",
        body: "export function drawEraTitleCard() {}",
      });
    } else {
      req.continue();
    }
  });

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(`${baseUrl}/render.html`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__RENDER_READY === true, { timeout: 25000 });
  return { page, errors };
}

async function capturePlate(page, t) {
  await page.evaluate((sec) => window.renderAt(sec), t);
  const b64 = await page.screenshot({ encoding: "base64", type: "png" });
  return `data:image/png;base64,${b64}`;
}

function getHeroSpecs() {
  // Center-aligned u=3.00s plates (pelican centered at screenX=960, ROAD_Y at screenY=788.4)
  // Vaporwave uses u=1.40s (Pelican on far left) so the bust + full marquee sit unobstructed.
  return {
    egypt: INTRO_DUR + 1 * SCENE_DUR + 3.0,
    ukiyoe: INTRO_DUR + 10 * SCENE_DUR + 3.0,
    vangogh: INTRO_DUR + 11 * SCENE_DUR + 3.0,
    munch: INTRO_DUR + 12 * SCENE_DUR + 3.0,
    vaporwaveClean: INTRO_DUR + 17 * SCENE_DUR + 1.4,
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();

  try {
    const { page, errors } = await openCleanRenderPage(browser, srv.baseUrl);

    // 1. Capture clean thumbnail plates for all 20 eras
    const eraPlates = [];
    for (let i = 0; i < SCENE_COUNT; i++) {
      const m = SCENES_META[i];
      const u = m.thumbTime ?? 2.85;
      const t = INTRO_DUR + i * SCENE_DUR + u;
      eraPlates.push({
        num: m.num,
        zh: m.zh,
        en: m.en,
        era: m.era,
        accent: m.accent,
        dataUrl: await capturePlate(page, t),
      });
    }

    // 2. Capture exact center-aligned hero plates for continuous-road split portals
    const heroSpecs = getHeroSpecs();
    const heroPlates = {};
    for (const [key, t] of Object.entries(heroSpecs)) {
      heroPlates[key] = await capturePlate(page, t);
    }

    if (errors.length > 0) {
      throw new Error(`Render errors during plate capture:\n${errors.join("\n")}`);
    }

    const renderCover = async (filename, width, height, mode) => {
      const cPage = await browser.newPage();
      await cPage.setViewport({ width, height, deviceScaleFactor: 1 });
      await cPage.setContent(`
        <!doctype html>
        <html>
          <body style="margin:0;background:#11100f;">
            <canvas id="c" width="${width}" height="${height}"></canvas>
          </body>
        </html>
      `);

      await cPage.evaluate(
        async ({ width, height, mode, eraPlates, heroPlates }) => {
          const canvas = document.getElementById("c");
          const ctx = canvas.getContext("2d");

          const loadImg = (src) =>
            new Promise((res, rej) => {
              const img = new Image();
              img.onload = () => res(img);
              img.onerror = rej;
              img.src = src;
            });

          const heroImgs = {};
          for (const [k, v] of Object.entries(heroPlates)) {
            heroImgs[k] = await loadImg(v);
          }
          const thumbImgs = [];
          for (const item of eraPlates) {
            thumbImgs.push({ ...item, img: await loadImg(item.dataUrl) });
          }

          function drawPortalBar(x, y, h, accent = "#d8ab4c", wBar = 14) {
            ctx.save();
            // Ambient cast shadow left & right
            const shL = ctx.createLinearGradient(x - wBar * 1.8, y, x - wBar * 0.5, y);
            shL.addColorStop(0, "rgba(0,0,0,0)");
            shL.addColorStop(1, "rgba(0,0,0,0.48)");
            ctx.fillStyle = shL;
            ctx.fillRect(x - wBar * 1.8, y, wBar * 1.3, h);

            const shR = ctx.createLinearGradient(x + wBar * 0.5, y, x + wBar * 1.8, y);
            shR.addColorStop(0, "rgba(0,0,0,0.48)");
            shR.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = shR;
            ctx.fillRect(x + wBar * 0.5, y, wBar * 1.3, h);

            // Ebony outer molding + brushed gold inlay
            const mold = ctx.createLinearGradient(x - wBar / 2, y, x + wBar / 2, y);
            mold.addColorStop(0, "#14110e");
            mold.addColorStop(0.28, "#3e3121");
            mold.addColorStop(0.5, accent);
            mold.addColorStop(0.72, "#3e3121");
            mold.addColorStop(1, "#14110e");
            ctx.fillStyle = mold;
            ctx.fillRect(x - wBar / 2, y, wBar, h);

            ctx.fillStyle = "rgba(255, 244, 212, 0.72)";
            ctx.fillRect(x - 1, y, 2, h);
            ctx.restore();
          }

          function drawRoundRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
          }

          function drawMiniEraGrid(items, cols, rows, startX, startY, gridW, gridH, gap, showLabels) {
            const cellW = (gridW - gap * (cols - 1)) / cols;
            const cellH = (gridH - gap * (rows - 1)) / rows;
            const barH = showLabels ? 24 : 18;
            for (let i = 0; i < items.length; i++) {
              const c = i % cols;
              const r = Math.floor(i / cols);
              const x = startX + c * (cellW + gap);
              const y = startY + r * (cellH + gap);
              const imgH = cellH;

              ctx.save();
              drawRoundRect(x, y, cellW, cellH, 4);
              ctx.clip();

              // Center-crop around Pelican & signature Bar-2 action preserving upper gag context
              const targetRatio = cellW / imgH;
              const sH = 1040;
              const sW = Math.min(1920, sH * targetRatio);
              const sX = (1920 - sW) / 2;
              const sY = 20;
              ctx.drawImage(items[i].img, sX, sY, sW, sH, x, y, cellW, imgH);

              // Subtle bottom gradient label
              const lg = ctx.createLinearGradient(x, y + cellH - barH - 14, x, y + cellH);
              lg.addColorStop(0, "rgba(10,11,14,0)");
              lg.addColorStop(0.55, "rgba(10,11,14,0.82)");
              lg.addColorStop(1, "rgba(10,11,14,0.94)");
              ctx.fillStyle = lg;
              ctx.fillRect(x, y + cellH - barH - 14, cellW, barH + 14);

              ctx.fillStyle = "#f2ede2";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.font = showLabels
                ? "bold 14px 'PingFang SC', 'Songti SC', sans-serif"
                : "bold 11.5px 'PingFang SC', sans-serif";
              const labelText = showLabels
                ? `${String(items[i].num).padStart(2, "0")} · ${items[i].zh}`
                : `${String(items[i].num).padStart(2, "0")} ${items[i].zh}`;
              ctx.fillText(labelText, x + cellW / 2, y + cellH - barH * 0.46, cellW - 8);
              ctx.restore();

              ctx.save();
              ctx.strokeStyle = items[i].accent || "#c9a456";
              ctx.lineWidth = showLabels ? 1.8 : 1.3;
              drawRoundRect(x, y, cellW, cellH, 4);
              ctx.stroke();
              ctx.restore();
            }
          }

          if (mode === "16x9") {
            const stageH = 892;
            const srcY = 74;
            const srcH = stageH; // 1:1 scale so ROAD_Y=788.4 aligns across all 5 slices at destY=714.4

            // 5-slice Continuous-Road Portal Panorama across all 1920px width
            const slices = [
              { img: heroImgs.egypt, sx: 468, sw: 330, dx: 0, dw: 330, accent: "#d49635" },
              { img: heroImgs.ukiyoe, sx: 1120, sw: 310, dx: 330, dw: 310, accent: "#c84630" },
              { img: heroImgs.vangogh, sx: 640, sw: 320, dx: 640, dw: 320, accent: "#f4ce52" },
              { img: heroImgs.munch, sx: 960, sw: 420, dx: 960, dw: 420, accent: "#f0a943" },
              { img: heroImgs.vaporwaveClean, sx: 1030, sw: 540, dx: 1380, dw: 540, accent: "#4cf2ea" },
            ];
            for (const s of slices) {
              ctx.drawImage(s.img, s.sx, srcY, s.sw, srcH, s.dx, 0, s.dw, stageH);
            }
            for (let i = 1; i < slices.length; i++) {
              drawPortalBar(slices[i].dx, 0, stageH, slices[i].accent, 14);
            }

            // Editorial Title Plate Backdrop (subtle dark frosted gradient top-left, unobstructed Pelican)
            const vig = ctx.createRadialGradient(460, 130, 40, 500, 150, 680);
            vig.addColorStop(0, "rgba(9, 10, 15, 0.85)");
            vig.addColorStop(0.55, "rgba(9, 10, 15, 0.54)");
            vig.addColorStop(1, "rgba(9, 10, 15, 0)");
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, 1280, 380);

            // Top badge pill
            ctx.save();
            drawRoundRect(54, 38, 344, 34, 17);
            ctx.fillStyle = "rgba(18, 16, 13, 0.9)";
            ctx.fill();
            ctx.strokeStyle = "#e5b654";
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = "#f4cf7a";
            ctx.font = "bold 15px 'PingFang SC', 'Menlo', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("120 BPM · 20 种艺术风格 · 代码动画短片", 226, 56);
            ctx.restore();

            // Main Title: 《鹈鹕测试》
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 5;
            ctx.fillStyle = "#fbf6ea";
            ctx.font = "bold 90px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText("《鹈鹕测试》", 20, 86);

            ctx.font = "bold 28px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillStyle = "#f4e9d2";
            ctx.fillText("人类自古以来就痴迷于画鹈鹕骑自行车", 56, 192);

            ctx.font = "bold 26px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillStyle = "#f6be58";
            ctx.fillText("——早在自行车被发明之前。", 56, 230);
            ctx.restore();

            // Bottom 20-Era Exhibition Strip (y in [892, 1080])
            ctx.fillStyle = "#111114";
            ctx.fillRect(0, stageH, width, height - stageH);
            ctx.fillStyle = "#d4a84c";
            ctx.fillRect(0, stageH, width, 3);
            drawMiniEraGrid(thumbImgs, 10, 2, 18, stageH + 12, width - 36, height - stageH - 22, 8, false);
          } else if (mode === "4x3") {
            const topH = 248;
            const stageH = 788;
            const botY = topH + stageH; // 1036

            // Top Museum Header
            ctx.fillStyle = "#131210";
            ctx.fillRect(0, 0, width, topH);
            ctx.strokeStyle = "#b98e3d";
            ctx.lineWidth = 2;
            ctx.strokeRect(18, 16, width - 36, topH - 32);
            ctx.strokeStyle = "rgba(212, 173, 88, 0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(24, 22, width - 48, topH - 44);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#d9ad54";
            ctx.font = "bold 16px Georgia, Menlo, serif";
            ctx.fillText("THE PELICAN TEST · 120 BPM · 20 ERAS OF ART HISTORY", width / 2, 50);

            ctx.fillStyle = "#fbf6ea";
            ctx.font = "bold 92px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillText("《鹈鹕测试》", width / 2, 118);

            ctx.fillStyle = "#e6dcc8";
            ctx.font = "bold 28px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillText("人类自古以来就痴迷于画鹈鹕骑自行车 —— 早在自行车被发明之前。", width / 2, 198);

            // Center 5-Slice Split-Portal Panorama (1:1 vertical crop srcY [126..914])
            const srcY = 126;
            const srcH = stageH;
            const slices = [
              { img: heroImgs.egypt, sx: 468, sw: 330, dx: 0, dw: 330, accent: "#d49635" },
              { img: heroImgs.ukiyoe, sx: 1120, sw: 310, dx: 330, dw: 310, accent: "#c84630" },
              { img: heroImgs.vangogh, sx: 640, sw: 320, dx: 640, dw: 320, accent: "#f4ce52" },
              { img: heroImgs.munch, sx: 960, sw: 420, dx: 960, dw: 420, accent: "#f0a943" },
              { img: heroImgs.vaporwaveClean, sx: 1030, sw: 540, dx: 1380, dw: 540, accent: "#4cf2ea" },
            ];
            for (const s of slices) {
              ctx.drawImage(s.img, s.sx, srcY, s.sw, srcH, s.dx, topH, s.dw, stageH);
            }
            for (let i = 1; i < slices.length; i++) {
              drawPortalBar(slices[i].dx, topH, stageH, slices[i].accent, 14);
            }

            // Bottom Gold Borders & Complete 2x10 Exhibition Grid
            ctx.fillStyle = "#111114";
            ctx.fillRect(0, botY, width, height - botY);
            ctx.fillStyle = "#d4a84c";
            ctx.fillRect(0, topH, width, 3);
            ctx.fillRect(0, botY, width, 3);

            drawMiniEraGrid(thumbImgs, 10, 2, 22, botY + 18, width - 44, height - botY - 36, 10, true);
          } else if (mode === "3x4") {
            const topH = 336;
            const stageH = 680;
            const wallY = topH + stageH; // 1016
            const footerH = 74;

            // Top Mobile Poster Masthead
            ctx.fillStyle = "#131210";
            ctx.fillRect(0, 0, width, topH);
            ctx.strokeStyle = "#b98e3d";
            ctx.lineWidth = 2.5;
            ctx.strokeRect(20, 18, width - 40, topH - 36);

            ctx.save();
            drawRoundRect(width / 2 - 210, 42, 420, 38, 19);
            ctx.fillStyle = "rgba(212, 173, 88, 0.14)";
            ctx.fill();
            ctx.strokeStyle = "#e0b354";
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = "#f4cf7a";
            ctx.font = "bold 17px 'PingFang SC', 'Menlo', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("2:17 全程序合成代码动画短片 · 120 BPM", width / 2, 62);
            ctx.restore();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fbf6ea";
            ctx.font = "bold 104px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillText("《鹈鹕测试》", width / 2, 148);

            ctx.fillStyle = "#eee3cc";
            ctx.font = "bold 30px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillText("人类自古以来就痴迷于画鹈鹕骑自行车", width / 2, 238);

            ctx.fillStyle = "#f6be58";
            ctx.font = "bold 28px 'Songti SC', 'STSong', 'PingFang SC', serif";
            ctx.fillText("——早在自行车被发明之前。", width / 2, 282);

            // Center 4-Slice Continuous-Road Hero Portal (zoom 1.12x -> srcH=607, srcY=250)
            const zoom = 1.12;
            const srcH = stageH / zoom;
            const srcY = 250;
            const slices = [
              { img: heroImgs.egypt, sx: 468, sw: Math.round(280 / zoom), dx: 0, dw: 280, accent: "#d49635" },
              {
                img: heroImgs.vangogh,
                sx: 960 - Math.round(440 / zoom),
                sw: Math.round(440 / zoom),
                dx: 280,
                dw: 440,
                accent: "#f4ce52",
              },
              { img: heroImgs.munch, sx: 960, sw: Math.round(440 / zoom), dx: 720, dw: 440, accent: "#f0a943" },
              { img: heroImgs.vaporwaveClean, sx: 1155, sw: Math.round(280 / zoom), dx: 1160, dw: 280, accent: "#4cf2ea" },
            ];
            for (const s of slices) {
              ctx.drawImage(s.img, s.sx, srcY, s.sw, srcH, s.dx, topH, s.dw, stageH);
            }
            for (let i = 1; i < slices.length; i++) {
              drawPortalBar(slices[i].dx, topH, stageH, slices[i].accent, 14);
            }

            // Gold dividers
            ctx.fillStyle = "#d4a84c";
            ctx.fillRect(0, topH, width, 3);
            ctx.fillRect(0, wallY, width, 3);

            // Lower 4x5 Complete 20-Era Exhibition Wall
            const wallH = height - wallY - footerH;
            ctx.fillStyle = "#111114";
            ctx.fillRect(0, wallY + 3, width, height - wallY - 3);
            drawMiniEraGrid(thumbImgs, 4, 5, 24, wallY + 20, width - 48, wallH - 28, 14, true);

            // Press Footer Caption
            ctx.fillStyle = "#bfb5a2";
            ctx.font = "22px 'Songti SC', 'STSong', serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("「截至目前，人类共提交了 20 份答卷。鹈鹕本人对此尚未发表评论。」", width / 2, height - footerH / 2 - 4);
          }
        },
        { width, height, mode, eraPlates, heroPlates }
      );

      const outPath = path.join(OUT_DIR, filename);
      await cPage.screenshot({ path: outPath });
      console.log(`Saved cover -> out/${filename} (${width}x${height})`);
      await cPage.close();
    };

    await renderCover("cover_16x9.png", 1920, 1080, "16x9");
    await renderCover("cover_4x3_landscape.png", 1920, 1440, "4x3");
    await renderCover("cover_3x4_portrait.png", 1440, 1920, "3x4");
  } finally {
    await browser.close();
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
