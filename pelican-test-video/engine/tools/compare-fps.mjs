/**
 * 30fps vs 60fps Pan Comparison Tool (`tools/compare-fps.mjs`).
 * Renders t in [4.0, 12.0] (Intro ride-out -> Portal 1 -> Era 1 Sahara -> Portal 2 -> Era 2 Egypt)
 * at both 30fps and 60fps so the user can visually compare panning smoothness before committing frame rate.
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { encodeFramesToMp4 } from "./encode.mjs";
import { renderFrameSequence } from "./render-frames.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const from = 4.0;
  const to = 12.0;
  const workers = 4;

  console.log(`Rendering 30fps pan test (${from}s -> ${to}s)...`);
  const r30 = await renderFrameSequence({
    from,
    to,
    fps: 30,
    outDir: "frames/compare_30fps",
    workers,
  });
  const mp4_30 = await encodeFramesToMp4({
    framesDir: "frames/compare_30fps",
    fps: 30,
    outFile: "out/compare_pan_30fps.mp4",
  });

  console.log(`Rendering 60fps pan test (${from}s -> ${to}s)...`);
  const r60 = await renderFrameSequence({
    from,
    to,
    fps: 60,
    outDir: "frames/compare_60fps",
    workers,
  });
  const mp4_60 = await encodeFramesToMp4({
    framesDir: "frames/compare_60fps",
    fps: 60,
    outFile: "out/compare_pan_60fps.mp4",
  });

  for (const [label, mp4, res] of [
    ["30fps", mp4_30, r30],
    ["60fps", mp4_60, r60],
  ]) {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,nb_frames,duration",
      "-of",
      "json",
      mp4,
    ]);
    console.log(
      `[${label}] ${path.relative(ROOT, mp4)}: wall=${(res.elapsedMs / 1000).toFixed(2)}s, ${res.msPerFrame.toFixed(1)} ms/frame`,
      stdout.trim()
    );
  }
}

main();
