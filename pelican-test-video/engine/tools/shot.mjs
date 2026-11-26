/**
 * Screenshot Capture Tool (`tools/shot.mjs`).
 * Usage:
 *   node tools/shot.mjs                              # Captures default key frames
 *   node tools/shot.mjs 2.5 5.0 32.0                 # Captures out/shot_<t>.png
 *   node tools/shot.mjs --prefix s03 17.1 19.8 22.9  # Captures out/s03_shot_<t>.png
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser, openRenderPage } from "./browser.mjs";
import { startStaticServer } from "./server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");

const DEFAULT_SHOTS = [
  { t: 2.6, name: "shot_intro.png" },
  { t: 5.0, name: "shot_portal01.png" },
  { t: 32.0, name: "shot_era05.png" },
  { t: 89.0, name: "shot_portal15_electric.png" },
  { t: 127.5, name: "shot_outro_wall.png" },
  { t: 134.5, name: "shot_outro_seat.png" },
  { t: 135.85, name: "shot_outro_flyby.png" },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const rawArgs = process.argv.slice(2);
  let prefix = "";
  const timeArgs = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--prefix" && rawArgs[i + 1]) {
      prefix = rawArgs[++i] + "_";
    } else if (!rawArgs[i].startsWith("--")) {
      timeArgs.push(rawArgs[i]);
    }
  }

  const shots =
    timeArgs.length > 0
      ? timeArgs.map((s) => {
          const t = Number(s);
          return { t, name: `${prefix}shot_${t.toFixed(2).replace(".", "_")}s.png` };
        })
      : DEFAULT_SHOTS;

  const srv = await startStaticServer();
  const browser = await launchHeadlessBrowser();

  try {
    const { page, errors } = await openRenderPage(browser, srv.baseUrl);
    for (const item of shots) {
      const t0 = performance.now();
      await page.evaluate((t) => {
        window.renderAt(t);
      }, item.t);
      const outPath = path.join(OUT_DIR, item.name);
      await page.screenshot({ path: outPath });
      const dt = (performance.now() - t0).toFixed(1);
      console.log(`Captured t=${item.t.toFixed(2)}s -> out/${item.name} (${dt} ms)`);
    }
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
