/**
 * Shared Rendering Toolkit (`src/kit/index.js`).
 * Manages p5.js 2.x + p5.brush 3.x WebGL offscreen Framebuffers, 2D overlay compositing,
 * deterministic seeding, static texture baking, and portal-frame rendering.
 */

import { BLEED_LEFT, BUFFER_H, BUFFER_W, SCENE_SIZE } from "../beat.js";

export function createKit(p, brush) {
  const bakedCache = new Map();
  let overlay2D = null;

  function ensureOverlay2D(w = BUFFER_W, h = BUFFER_H) {
    if (!overlay2D || overlay2D.width !== w || overlay2D.height !== h) {
      if (overlay2D) overlay2D.remove();
      overlay2D = p.createGraphics(w, h);
      overlay2D.pixelDensity(1);
    }
    overlay2D.clear();
    return overlay2D;
  }

  function createSlotFramebuffer(w = BUFFER_W, h = BUFFER_H) {
    return p.createFramebuffer({
      width: w,
      height: h,
      density: 1,
      antialias: false,
      depth: false,
      stencil: false,
    });
  }

  function seedFor(sceneIdx, salt = 0) {
    const s = 104729 + sceneIdx * 7919 + salt * 3571;
    p.randomSeed(s);
    p.noiseSeed(s);
  }

  function resetBrushState() {
    brush.noField();
    brush.noClip();
    brush.noFill();
    brush.noHatch();
    brush.noMass();
    brush.noWash();
    brush.noStroke();
  }

  /**
   * Caches an expensive procedural 2D texture/backdrop once per key.
   */
  function bakeLayer(key, w, h, drawFn) {
    if (bakedCache.has(key)) return bakedCache.get(key);
    const pg = p.createGraphics(w, h);
    pg.pixelDensity(1);
    drawFn(pg);
    bakedCache.set(key, pg);
    return pg;
  }

  /**
   * Executes a scene render function inside an offscreen 1840x1000 Framebuffer (`slotFb`)
   * with coordinate origin translated so (0, 0)..(1000, 1000) is the canonical square
   * and x in [-420, 1420] covers left/right portal bleed cleanly.
   */
  function renderIntoSlot(slotFb, sceneIdx, drawCallback) {
    seedFor(sceneIdx, 0);
    const g2d = ensureOverlay2D(slotFb.width, slotFb.height);

    // Prepare 2D layer in canonical [0..1000] x [0..1000] with [-420..1420] bleed
    g2d.push();
    g2d.translate(-BLEED_LEFT, 0);

    let resultMeta = null;
    slotFb.draw(() => {
      p.resetMatrix();
      p.angleMode(p.RADIANS);
      p.clear();
      // Translate WEBGL center (0,0) so scene (500, 500) sits at center of 1840x1000 fb
      p.push();
      p.translate(-SCENE_SIZE / 2, -SCENE_SIZE / 2);

      brush.load(slotFb);
      resetBrushState();

      resultMeta = drawCallback({ p, brush, g: g2d, w: slotFb.width, h: slotFb.height });

      // Flush any pending p5.brush stroke/fill mask into THIS slotFb before exiting its draw() scope
      // so strokes render beneath g2d and never leak into subsequent slots or postdraw.
      p.push();
      brush.noField();
      brush.noClip();
      brush.noStroke();
      brush.noHatch();
      brush.noFill();
      brush.wash(p.color(1, 2, 3, 0));
      brush.rect(-9000, -9000, 4, 4);
      brush.noWash();
      p.pop();

      p.pop();
    });

    g2d.pop();

    // Composite crisp 2D text / shapes / UI layer onto the same framebuffer
    slotFb.draw(() => {
      p.resetMatrix();
      p.imageMode(p.CENTER);
      p.image(g2d, 0, 0, slotFb.width, slotFb.height);
    });

    brush.load();
    resetBrushState();
    return resultMeta;
  }

  /**
   * Draws an era-appropriate Picture Frame border column at screenX when a scene transition crosses the view.
   */
  function drawPortalFrame(screenX, nextMeta, nextIndex, electricFactor = 0) {
    const g = ensureOverlay2D(p.width, p.height);
    g.push();

    const frameW = 28;
    const x0 = screenX - frameW / 2;

    if (electricFactor > 0.01) {
      // Special 14 -> 15 electrified CRT border flash
      const glowAlpha = Math.round(230 * electricFactor);
      g.noStroke();
      g.fill(66, 255, 122, glowAlpha * 0.35);
      g.rect(screenX - 44, 0, 88, p.height);
      g.fill(180, 255, 200, glowAlpha);
      g.rect(screenX - 4, 0, 8, p.height);
    }

    // Outer frame shadow
    g.noStroke();
    g.fill(0, 0, 0, 95);
    g.rect(x0 - 8, 0, frameW + 16, p.height);

    // Frame molding styled by destination era
    const baseCol = nextMeta?.bg || "#d4c3a3";
    const accentCol = nextMeta?.accent || "#c49a47";

    g.fill("#1e1a16");
    g.rect(x0, 0, frameW, p.height);

    g.fill(accentCol);
    g.rect(x0 + 5, 0, 6, p.height);
    g.fill(baseCol);
    g.rect(x0 + 14, 0, 5, p.height);

    // Corner/mid plaque notches
    g.fill("#f6efe2");
    g.rect(x0 + 3, 28, frameW - 6, 48, 3);
    g.fill("#1b1815");
    g.textAlign("center", "center");
    g.textFont("Menlo, monospace");
    g.textStyle("bold");
    g.textSize(13);
    g.text(String(nextIndex + 1).padStart(2, "0"), screenX, 52);

    g.pop();

    p.push();
    p.resetMatrix();
    p.imageMode(p.CENTER);
    p.image(g, 0, 0, p.width, p.height);
    p.pop();
  }

  return {
    p,
    brush,
    createSlotFramebuffer,
    ensureOverlay2D,
    seedFor,
    resetBrushState,
    bakeLayer,
    renderIntoSlot,
    drawPortalFrame,
  };
}
