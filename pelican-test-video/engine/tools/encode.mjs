/**
 * FFmpeg Video Encoder (`tools/encode.mjs`).
 * Usage:
 *   node tools/encode.mjs --frames frames/p30 --fps 30 --out out/clip.mp4 [--audio audio/mix.wav]
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function encodeFramesToMp4({
  framesDir,
  fps = 60,
  outFile,
  audioFile = null,
  crf = 18,
}) {
  const framesAbs = path.resolve(ROOT, framesDir);
  const outAbs = path.resolve(ROOT, outFile);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });

  const args = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(framesAbs, "frame_%05d.png"),
  ];

  if (audioFile) {
    args.push("-i", path.resolve(ROOT, audioFile));
  }

  args.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    String(crf),
    "-preset",
    "medium",
    "-movflags",
    "+faststart"
  );

  if (audioFile) {
    args.push("-c:a", "aac", "-b:a", "256k", "-shortest");
  } else {
    args.push("-an");
  }

  args.push(outAbs);

  await execFileAsync("ffmpeg", args);
  return outAbs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (flag, def) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : def;
  };
  const outAbs = await encodeFramesToMp4({
    framesDir: get("--frames", "frames/main"),
    fps: Number(get("--fps", 60)),
    outFile: get("--out", "out/pelican_test.mp4"),
    audioFile: get("--audio", null),
    crf: Number(get("--crf", 18)),
  });
  console.log(`Encoded MP4 -> ${path.relative(ROOT, outAbs)}`);
}
