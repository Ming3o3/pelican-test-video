/**
 * Master Scheduler & Portal-Frame Orchestrator (`src/main.js`).
 * Pure-time rendering entry point `renderAt(t)` driving both the interactive browser player
 * and headless Puppeteer frame capture.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  BUFFER_H,
  BUFFER_W,
  CANVAS_H,
  CANVAS_W,
  INTRO_DUR,
  SCENES_END,
  SCENE_COUNT,
  SCENE_DUR,
  TOTAL_DUR,
  UNIT_TO_PX,
  clamp,
  getBeatInfo,
  getIntroCamX,
  getPortalZoom,
  getSceneCamX,
  getTimelineSegment,
} from "./beat.js";
import { createKit } from "./kit/index.js";
import { renderIntro } from "./scenes/intro.js";
import { renderOutro } from "./scenes/outro.js";
import { SCENE_RENDERERS } from "./scenes/index.js";
import { SCENES_META } from "./scenes/registry.js";

export function createPelicanApp(options = {}) {
  const {
    container = null,
    onReady = null,
    onFrameStats = null,
    onPlayStateChange = null,
    clockSource: initialClockSource = null,
    autoplay = false,
  } = options;

  let currentTime = 0;
  let isPlaying = autoplay;
  let lastRafMs = 0;
  let clockSource = initialClockSource;
  let pInst = null;
  let kit = null;
  let slotA = null;
  let slotB = null;
  let thumbnails = null;
  let readyFired = false;

  function drawSlotToMain(p, fb, camX, zoom, scissorRange = null) {
    const gl = p.drawingContext;
    const drawW = fb.width * UNIT_TO_PX * zoom;
    const drawH = fb.height * UNIT_TO_PX * zoom;
    const centerX = (500 - camX) * UNIT_TO_PX * zoom;

    if (scissorRange) {
      const sx0 = clamp(Math.round(scissorRange[0]), 0, CANVAS_W);
      const sx1 = clamp(Math.round(scissorRange[1]), 0, CANVAS_W);
      const sw = sx1 - sx0;
      if (sw <= 0) return;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(sx0, 0, sw, CANVAS_H);
    }

    p.push();
    p.resetMatrix();
    p.imageMode(p.CENTER);
    p.image(fb, centerX, 0, drawW, drawH);
    p.pop();

    if (scissorRange) {
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  function ensureThumbnails(p) {
    if (thumbnails) return thumbnails;
    thumbnails = [];
    const thumbSize = 512;
    const thumbRatio = thumbSize / 1000;

    for (let i = 0; i < SCENE_COUNT; i++) {
      const thumbU = SCENES_META[i].thumbTime ?? 2.8;
      const tMid = INTRO_DUR + i * SCENE_DUR + thumbU;
      kit.renderIntoSlot(slotA, i + 1, (ctx) => {
        SCENE_RENDERERS[i]({
          ...ctx,
          kit,
          t: tMid,
          localTime: thumbU,
          beat: getBeatInfo(tMid),
          meta: SCENES_META[i],
        });
      });

      const thumbFb = p.createFramebuffer({
        width: thumbSize,
        height: thumbSize,
        density: 1,
        antialias: false,
        depth: false,
        stencil: false,
      });
      thumbFb.draw(() => {
        p.resetMatrix();
        p.clear();
        p.imageMode(p.CENTER);
        p.image(slotA, 0, 0, BUFFER_W * thumbRatio, BUFFER_H * thumbRatio);
      });
      thumbnails.push(thumbFb);
    }
    return thumbnails;
  }

  function renderFrame(p, t) {
    const safeT = clamp(t, 0, TOTAL_DUR);
    const seg = getTimelineSegment(safeT);
    const beat = getBeatInfo(safeT);
    const zoom = getPortalZoom(safeT);

    p.background(14, 14, 16);

    if (seg.kind === "intro") {
      const camX = getIntroCamX(safeT);
      const rightPortalScreenX = CANVAS_W / 2 + (BLEED_RIGHT - camX) * UNIT_TO_PX * zoom;

      kit.renderIntoSlot(slotA, 0, (ctx) => {
        renderIntro({ ...ctx, kit, t: safeT, localTime: safeT, beat });
      });

      if (rightPortalScreenX < CANVAS_W) {
        kit.renderIntoSlot(slotB, 1, (ctx) => {
          SCENE_RENDERERS[0]({
            ...ctx,
            kit,
            t: safeT,
            localTime: safeT - INTRO_DUR,
            beat,
            meta: SCENES_META[0],
          });
        });
        drawSlotToMain(p, slotA, camX, zoom, [0, rightPortalScreenX]);
        drawSlotToMain(p, slotB, camX - BUFFER_W, zoom, [rightPortalScreenX, CANVAS_W]);
        kit.drawPortalFrame(rightPortalScreenX, SCENES_META[0], 0, 0);
      } else {
        drawSlotToMain(p, slotA, camX, zoom, null);
      }
    } else if (seg.kind === "scene") {
      const idx = seg.sceneIndex;
      const u = seg.localTime;
      const camX = getSceneCamX(u);

      const leftPortalScreenX = CANVAS_W / 2 + (BLEED_LEFT - camX) * UNIT_TO_PX * zoom;
      const rightPortalScreenX = CANVAS_W / 2 + (BLEED_RIGHT - camX) * UNIT_TO_PX * zoom;

      // Render current scene into slotA
      kit.renderIntoSlot(slotA, idx + 1, (ctx) => {
        SCENE_RENDERERS[idx]({
          ...ctx,
          kit,
          t: safeT,
          localTime: u,
          beat,
          meta: SCENES_META[idx],
        });
      });

      if (leftPortalScreenX > 0) {
        // Left side still shows previous scene (or Intro)
        if (idx === 0) {
          kit.renderIntoSlot(slotB, 0, (ctx) => {
            renderIntro({ ...ctx, kit, t: safeT, localTime: safeT, beat });
          });
        } else {
          kit.renderIntoSlot(slotB, idx, (ctx) => {
            SCENE_RENDERERS[idx - 1]({
              ...ctx,
              kit,
              t: safeT,
              localTime: u + SCENE_DUR,
              beat,
              meta: SCENES_META[idx - 1],
            });
          });
        }
        drawSlotToMain(p, slotB, camX + BUFFER_W, zoom, [0, leftPortalScreenX]);
        drawSlotToMain(p, slotA, camX, zoom, [leftPortalScreenX, CANVAS_W]);

        const electric = idx === 14 ? Math.exp(-Math.abs(safeT - (INTRO_DUR + 14 * SCENE_DUR)) * 5.0) : 0;
        kit.drawPortalFrame(leftPortalScreenX, SCENES_META[idx], idx, electric);
      } else if (rightPortalScreenX < CANVAS_W) {
        if (idx < SCENE_COUNT - 1) {
          kit.renderIntoSlot(slotB, idx + 2, (ctx) => {
            SCENE_RENDERERS[idx + 1]({
              ...ctx,
              kit,
              t: safeT,
              localTime: u - SCENE_DUR,
              beat,
              meta: SCENES_META[idx + 1],
            });
          });
          drawSlotToMain(p, slotA, camX, zoom, [0, rightPortalScreenX]);
          drawSlotToMain(p, slotB, camX - BUFFER_W, zoom, [rightPortalScreenX, CANVAS_W]);

          const electric = idx === 13 ? Math.exp(-Math.abs(safeT - (INTRO_DUR + 14 * SCENE_DUR)) * 5.0) : 0;
          kit.drawPortalFrame(rightPortalScreenX, SCENES_META[idx + 1], idx + 1, electric);
        } else {
          // Exiting Scene 20 toward Outro museum wall
          drawSlotToMain(p, slotA, camX, zoom, [0, rightPortalScreenX]);
          kit.drawPortalFrame(rightPortalScreenX, { bg: "#141312", accent: "#d4ad58" }, 20, 0);
        }
      } else {
        drawSlotToMain(p, slotA, camX, zoom, null);
      }
    } else {
      // Outro (t in [125.0, 137.0])
      const thumbs = ensureThumbnails(p);
      const gOutro = kit.ensureOverlay2D(CANVAS_W, CANVAS_H);
      renderOutro({
        p,
        g: gOutro,
        t: safeT,
        uOutro: seg.localTime,
        thumbnails: thumbs,
      });
    }

    if (onFrameStats) {
      onFrameStats({ t: safeT, seg, beat });
    }
  }

  const sketch = (p) => {
    window.brush.instance(p);

    p.setup = () => {
      const cnv = p.createCanvas(CANVAS_W, CANVAS_H, p.WEBGL);
      if (container) cnv.parent(container);
      p.pixelDensity(1);
      p.angleMode(p.RADIANS);
      p.noLoop();

      kit = createKit(p, window.brush);
      slotA = kit.createSlotFramebuffer(BUFFER_W, BUFFER_H);
      slotB = kit.createSlotFramebuffer(BUFFER_W, BUFFER_H);

      if (!readyFired) {
        readyFired = true;
        window.__PELICAN_READY = true;
        if (onReady) onReady(api);
      }
    };

    p.draw = () => {
      renderFrame(p, currentTime);
    };
  };

  pInst = new window.p5(sketch);

  function rafTick(nowMs) {
    if (!isPlaying) return;
    const extTime = clockSource ? clockSource() : null;
    if (extTime !== null && Number.isFinite(extTime)) {
      currentTime = clamp(extTime, 0, TOTAL_DUR);
      if (currentTime >= TOTAL_DUR) {
        currentTime = TOTAL_DUR;
        isPlaying = false;
        if (onPlayStateChange) onPlayStateChange(false);
      }
      pInst.redraw();
    } else if (lastRafMs > 0) {
      const dt = Math.min(0.1, (nowMs - lastRafMs) / 1000);
      currentTime += dt;
      if (currentTime >= TOTAL_DUR) {
        currentTime = TOTAL_DUR;
        isPlaying = false;
        if (onPlayStateChange) onPlayStateChange(false);
      }
      pInst.redraw();
    }
    lastRafMs = nowMs;
    if (isPlaying) {
      requestAnimationFrame(rafTick);
    }
  }

  const api = {
    getDuration: () => TOTAL_DUR,
    getTime: () => currentTime,
    isPlaying: () => isPlaying,
    setClockSource: (fn) => {
      clockSource = fn || null;
    },
    renderAt: (t) => {
      currentTime = clamp(t, 0, TOTAL_DUR);
      pInst.redraw();
    },
    play: () => {
      if (isPlaying) return;
      if (currentTime >= TOTAL_DUR) currentTime = 0;
      isPlaying = true;
      lastRafMs = 0;
      if (onPlayStateChange) onPlayStateChange(true);
      requestAnimationFrame(rafTick);
    },
    pause: () => {
      if (!isPlaying) return;
      isPlaying = false;
      lastRafMs = 0;
      if (onPlayStateChange) onPlayStateChange(false);
    },
    togglePlay: () => {
      if (isPlaying) api.pause();
      else api.play();
    },
    getSegmentInfo: (t = currentTime) => {
      const seg = getTimelineSegment(t);
      const beat = getBeatInfo(t);
      let label = "Intro · 开场序言";
      if (seg.kind === "scene") {
        const m = SCENES_META[seg.sceneIndex];
        label = `#${String(m.num).padStart(2, "0")} ${m.zh} (${m.era})`;
      } else if (seg.kind === "outro") {
        label = "Outro · 新闻发布会 (7×3)";
      }
      return { seg, beat, label };
    },
  };

  window.renderAt = (t) => api.renderAt(t);
  window.pelicanApp = api;
  return api;
}
