/**
 * Multi-Browser Contiguous Parallel Frame Renderer (`tools/render-frames.mjs`).
 * Partitions [0..totalFrames) into contiguous chunks and launches one dedicated Chrome instance
 * per worker so GPU compositing and kit.bakeLayer() caches scale cleanly across cores.
 * Usage:
 *   node tools/render-frames.mjs --from 0 --to 137 --fps 60 --outDir frames/final_master --workers 6 [--resume]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser, openRenderPage } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const opts = {
    from: 0,
    to: 137,
    fps: 60,
    outDir: "frames/main",
    workers: 6,
    resume: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--from") opts.from = Number(v);
    else if (k === "--to") opts.to = Number(v);
    else if (k === "--fps") opts.fps = Number(v);
    else if (k === "--outDir") opts.outDir = v;
    else if (k === "--workers") opts.workers = Math.max(1, Number(v));
    else if (k === "--resume") opts.resume = true;
  }
  return opts;
}

export async function renderFrameSequence(opts) {
  const outAbs = path.resolve(ROOT, opts.outDir);
  if (!opts.resume) {
    await fs.rm(outAbs, { recursive: true, force: true });
  }
  await fs.mkdir(outAbs, { recursive: true });

  const dur = Math.max(0, opts.to - opts.from);
  const totalFrames = Math.round(dur * opts.fps);
  const workerCount = Math.min(opts.workers || 6, Math.max(1, totalFrames));

  const srv = await startStaticServer();
  const tWallStart = performance.now();

  let doneCount = 0;
  let renderedCount = 0;
  const allErrors = [];

  const baseCount = Math.floor(totalFrames / workerCount);
  const extra = totalFrames % workerCount;

  try {
    const workerTasks = Array.from({ length: workerCount }, async (_, w) => {
      const startF = w * baseCount + Math.min(w, extra);
      const endF = startF + baseCount + (w < extra ? 1 : 0);
      if (startF >= endF) return;

      const browser = await launchHeadlessBrowser();
      try {
        const { page, errors } = await openRenderPage(browser, srv.baseUrl);
        for (let f = startF; f < endF; f++) {
          const fileName = `frame_${String(f).padStart(5, "0")}.png`;
          const outPath = path.join(outAbs, fileName);

          if (opts.resume) {
            try {
              const st = await fs.stat(outPath);
              if (st.size > 0) {
                doneCount++;
                continue;
              }
            } catch {
              // File doesn't exist yet; proceed to render
            }
          }

          const t = opts.from + f / opts.fps;
          await page.evaluate((timeSec) => window.renderAt(timeSec), t);
          await page.screenshot({ path: outPath });

          renderedCount++;
          doneCount++;
          if (doneCount % 300 === 0 || doneCount === totalFrames) {
            const elapsed = performance.now() - tWallStart;
            const msPerF = elapsed / Math.max(1, renderedCount);
            const pct = ((doneCount / Math.max(1, totalFrames)) * 100).toFixed(1);
            console.log(
              `[render-frames] ${doneCount}/${totalFrames} (${pct}%) — ${msPerF.toFixed(1)} ms/frame`
            );
          }
        }
        if (errors.length > 0) allErrors.push(...errors);
        await page.close();
      } finally {
        await browser.close();
      }
    });

    await Promise.all(workerTasks);
  } finally {
    await srv.close();
  }

  const elapsedMs = performance.now() - tWallStart;
  const msPerFrame = elapsedMs / Math.max(1, renderedCount);
  if (allErrors.length > 0) {
    throw new Error(`Browser errors during render: ${allErrors.join(" | ")}`);
  }

  return {
    totalFrames,
    fps: opts.fps,
    outDir: outAbs,
    elapsedMs,
    msPerFrame,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opts = parseArgs(process.argv.slice(2));
  const res = await renderFrameSequence(opts);
  console.log(
    `Rendered ${res.totalFrames} frames @ ${res.fps}fps in ${(res.elapsedMs / 1000).toFixed(2)}s (${res.msPerFrame.toFixed(1)} ms/frame)`
  );
}
