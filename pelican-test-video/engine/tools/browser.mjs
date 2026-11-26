/**
 * Browser launcher helper (`tools/browser.mjs`).
 * Locates the local Chrome for Testing binary installed in `.browsers/` via @puppeteer/browsers
 * and launches headless Chromium with WebGL2 enabled at 1920x1080.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BROWSERS_DIR = path.join(ROOT, ".browsers");

export function findChromeExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  // Search .browsers/chrome/**/Google Chrome for Testing
  const chromeRoot = path.join(BROWSERS_DIR, "chrome");
  if (fs.existsSync(chromeRoot)) {
    const builds = fs.readdirSync(chromeRoot).sort().reverse();
    for (const build of builds) {
      const macPath = path.join(
        chromeRoot,
        build,
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing"
      );
      if (fs.existsSync(macPath)) return macPath;

      const macX64Path = path.join(
        chromeRoot,
        build,
        "chrome-mac-x64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing"
      );
      if (fs.existsSync(macX64Path)) return macX64Path;

      const linuxPath = path.join(chromeRoot, build, "chrome-linux64", "chrome");
      if (fs.existsSync(linuxPath)) return linuxPath;
    }
  }

  throw new Error(
    `Chrome for Testing binary not found in ${BROWSERS_DIR}. Run: npx @puppeteer/browsers install chrome@stable --path .browsers`
  );
}

export async function launchHeadlessBrowser() {
  const executablePath = findChromeExecutable();
  return puppeteer.launch({
    executablePath,
    headless: "new",
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--autoplay-policy=no-user-gesture-required",
      "--window-size=1920,1080",
    ],
  });
}

export async function openRenderPage(browser, baseUrl, onError) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
    if (onError) onError(err);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  await page.goto(`${baseUrl}/render.html`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__RENDER_READY === true, { timeout: 20000 });
  return { page, errors };
}
