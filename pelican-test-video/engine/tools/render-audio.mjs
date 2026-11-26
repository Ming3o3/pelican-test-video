/**
 * Headless Procedural Soundtrack Renderer (`tools/render-audio.mjs`).
 * Uses Chromium's OfflineAudioContext via `audio-render.html` to render all 137.0s of
 * stereo 48kHz audio, prints a segment-by-segment loudness audit, and exports `out/soundtrack.wav`.
 * Usage:
 *   node tools/render-audio.mjs [--out out/soundtrack.wav]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  let out = "out/soundtrack.wav";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { out };
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const outAbs = path.resolve(ROOT, out);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });

  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();
  const errors = [];

  try {
    const page = await browser.newPage();
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(`${srv.baseUrl}/audio-render.html`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__AUDIO_RENDER_READY === true, { timeout: 20000 });

    const t0 = performance.now();
    const { report, byteLength } = await page.evaluate(() => window.__buildSoundtrack());
    const renderMs = performance.now() - t0;

    console.log(
      `Rendered ${report.duration.toFixed(3)}s @ ${report.sampleRate} Hz (${report.channels}ch) in ${renderMs.toFixed(1)} ms | globalRMS=${report.globalRmsDb.toFixed(1)} dBFS | maxPeak=${report.maxPeak.toFixed(4)} | hasNaN=${report.hasNaN}`
    );

    const quietFailures = [];
    for (const seg of report.segments) {
      const flag = seg.requireActive && seg.rmsDb < -42 ? " [TOO QUIET]" : "";
      console.log(
        `  ${seg.name.padEnd(20)} [${seg.tStart.toFixed(1)}..${seg.tEnd.toFixed(1)}s] rms=${seg.rmsDb.toFixed(1)} dBFS peak=${seg.peak.toFixed(3)} (${seg.peakDb.toFixed(1)} dBFS)${flag}`
      );
      if (seg.requireActive && seg.rmsDb < -42) {
        quietFailures.push(`${seg.name} (${seg.rmsDb.toFixed(1)} dBFS)`);
      }
    }

    if (report.hasNaN) {
      throw new Error("Audio buffer contains NaN/Infinity samples!");
    }
    if (report.maxPeak > 0.999) {
      throw new Error(`Audio buffer clipped! maxPeak=${report.maxPeak}`);
    }
    if (quietFailures.length > 0) {
      throw new Error(`Active segments fell below -42 dBFS: ${quietFailures.join(", ")}`);
    }

    const chunkSize = 4 * 1024 * 1024;
    const chunks = [];
    for (let offset = 0; offset < byteLength; offset += chunkSize) {
      const len = Math.min(chunkSize, byteLength - offset);
      const b64 = await page.evaluate((o, l) => window.__getWavChunkBase64(o, l), offset, len);
      chunks.push(Buffer.from(b64, "base64"));
    }

    const wavBuf = Buffer.concat(chunks);
    await fs.writeFile(outAbs, wavBuf);
    console.log(`Saved WAV -> ${out} (${(wavBuf.byteLength / (1024 * 1024)).toFixed(2)} MiB)`);

    // Quick verification that interactive index.html boots cleanly with audio modules
    const idxPage = await browser.newPage();
    const idxErrors = [];
    idxPage.on("pageerror", (err) => idxErrors.push(`pageerror: ${err.message}`));
    idxPage.on("console", (msg) => {
      if (msg.type() === "error") idxErrors.push(`console.error: ${msg.text()}`);
    });
    await idxPage.goto(`${srv.baseUrl}/index.html`, { waitUntil: "networkidle0" });
    await idxPage.waitForFunction(() => window.__PELICAN_READY === true, { timeout: 25000 });
    await idxPage.waitForFunction(
      () => document.getElementById("audio-status")?.textContent?.includes("配乐就绪"),
      { timeout: 25000 }
    );
    const statusText = await idxPage.evaluate(() => document.getElementById("audio-status").textContent);
    console.log(`Interactive index.html verified: "${statusText}" (errors: ${idxErrors.length})`);
    if (idxErrors.length > 0) {
      throw new Error(`index.html errors:\n${idxErrors.join("\n")}`);
    }

    if (errors.length > 0) {
      throw new Error(`audio-render errors:\n${errors.join("\n")}`);
    }
  } finally {
    await browser.close();
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
