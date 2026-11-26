---
name: pelican-test-video
description: Build a "Pelican Test"-style procedural code-animation short film end to end: Puppeteer + p5.js frame rendering of 20 art-history eras (60fps), a fully procedural Web Audio soundtrack/SFX (no external audio, no TTS), FFmpeg muxing, and three cover images (16:9, 4:3 landscape, 3:4 portrait). Use when the user wants to reproduce, adapt, or extend this video or its covers.
---

# Pelican Test Video Pipeline

A pelican rides a bicycle along one continuous road through 20 art styles. Everything is a pure function of time `t`, so any frame can be rendered or seeked independently. Spec: 137.0 s, 120 BPM, 1920×1080, 60 fps (8,220 frames).

Note on "voiceover": this film has **no narration or TTS**. Its audio is a fully procedural score plus SFX synthesized with Web Audio (`OfflineAudioContext`). For narrated videos, use a separate TTS skill.

All paths below are relative to this skill folder. `engine/` is a complete working project; copy it somewhere writable first (`cp -R engine my-pelican && cd my-pelican`) and run every command there.

## Prerequisites
- Node.js 18+, `ffmpeg` on PATH, macOS/Linux.
- `npm install`, then install a project-local Chrome for Testing:
  `npx @puppeteer/browsers install chrome@stable --path .browsers`
  (or set `CHROME_PATH` to an existing Chrome binary). Do not install the browser into any tracked folder; `.browsers/`, `frames/`, `out/` are git-ignored.

## Workflow

### Stage 1 – Engine & timeline
Read `engine/src/beat.js` (timing constants, `ROAD_Y = 730`, 1000×1000 scene space with portal bleed) and `engine/src/scenes/registry.js` (metadata for the 20 eras). Timeline: Intro 0–5 s, 20 eras × 6 s (5–125 s), Outro press conference 125–137 s. Each era = 3 bars: enter / signature deadpan gag / exit.
Preview: `npm run preview`; single frames: `node tools/shot.mjs --prefix check 2.2 74.0`.

### Stage 2 – Per-era visuals
Write one art brief per era in `briefs/sNN_*.md`, following `references/STYLE_SPEC.md` (pure `render(ctx)`, continuous road alignment at `u<=0` / `u>=6`, bake heavy layers with `kit.bakeLayer`, p5 2.x string constants, public-domain styles only, original fictional UIs). Implement `src/scenes/sNN_*.js`, register it, then verify in batches:
`node tools/verify-batch.mjs --batch 3a --scenes 2,3,5,8` → contact sheet in `out/`. Parallelize eras across sub-agents (one per era), accepting each batch via its contact sheet. `npm run sheet` builds the whole-film 6×5 contact sheet.

### Stage 3 – Soundtrack & SFX (procedural "voice")
`engine/audio/` holds `dsp.js`, `instruments.js`, `score.js`, `sfx.js`, `vaporwave.js` (two-stage tape-warped smooth jazz for era 18), `engine.js`, `player.js`. The main melody stays on D, re-voiced in seven cultural modes. Render the master:
`npm run render-audio` → `out/soundtrack.wav` (48 kHz, 16-bit stereo, 137 s) with acoustic sanity checks. `index.html` plays it clock-locked to the animation.

### Stage 4 – Final film
`npm run build-film` = render-audio → `render-frames` (`--from 0 --to 137 --fps 60 --workers 6`, supports `--resume`) → `encode` (H.264, CRF 18, muxes the WAV) → `out/pelican_test_final_1080p_60fps.mp4`. Use `npm run compare-fps` to compare frame rates. Expect the frame render to dominate runtime.

### Stage 5 – Covers (16:9, 4:3 landscape, 3:4 portrait)
`scripts/build-covers.mjs` captures clean era frames from the real engine (it intercepts `src/kit/titleCard.js` in memory, so no tracked file changes), then composites on HTML5 canvases:
`node ../scripts/build-covers.mjs` (run from the engine copy; or set `ENGINE_DIR`; adjust the relative path to wherever you copied it).
Outputs in `out/`:
| File | Size | Layout |
|---|---|---|
| `cover_16x9.png` | 1920×1080 | badge + title, 5-slice continuous-road panorama (#02, #11, #12‖#13, #18), 2×10 era ribbon |
| `cover_4x3_landscape.png` | 1920×1440 | masthead, 5-slice panorama, 2×10 era grid |
| `cover_3x4_portrait.png` | 1440×1920 | poster header, 4-slice zoomed panorama, 4×5 era wall, footer quote |
Hero-frame lessons: pick `u≈3.0 s` for #02/#11/#12/#13 and `u=1.4 s` for #18 (a later frame leaks a wheel behind the bust). Always inspect the PNGs visually after generation.

### Stage 6 – Acceptance checklist
- 20/20 eras registered; no placeholder badges; title cards legible at 1080p.
- `out/` MP4 is 1920×1080 @60 fps, ~137 s, with audio (`ffprobe`).
- Three covers have exact pixel sizes (`sips -g pixelWidth -g pixelHeight` or `ffprobe`).
- `git status` clean; large outputs (`frames/`, `out/`) not committed.

## Rules
- Never hard-code absolute paths in scripts or docs; derive from the working directory or `import.meta.url`.
- Keep all art/UI original or public-domain; see `engine/THIRD_PARTY_NOTICES.md`.
