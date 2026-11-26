/**
 * Stage 1 Shared Placeholder Scene Generator (`src/scenes/placeholder.js`).
 * Gives each of the 20 eras its distinct color palette, p5.brush background texture,
 * scrolling road milestones (clearly showing camera pan for 30 vs 60 fps testing),
 * Title Card, Bar 2 gag preview cue, and live Pelican Rig.
 * Replaced individually in Stage 2 and Stage 3.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  getScenePelicanX,
  quantizeTime,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { drawRig2D, getRigPose } from "../rig.js";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function renderPlaceholderScene(meta, ctx) {
  const { p, brush, g, kit, t, localTime } = ctx;
  const u = localTime;

  // Apply retro temporal quantization if era specifies (10: Wayang, 16: 8-bit, 17: Chat GIF)
  const animT = meta.quantizeFps ? quantizeTime(t, meta.quantizeFps) : t;
  const animU = meta.quantizeFps ? quantizeTime(u, meta.quantizeFps) : u;

  // Baked background wash with subtle paper/grain texture per era
  const backdrop = kit.bakeLayer(`ph_bg_${meta.id}`, 1840, 1000, (pg) => {
    const [r, gr, b] = hexToRgb(meta.bg);
    const [fr, fg, fb] = hexToRgb(meta.fg);
    pg.background(meta.bg);

    // Subtle atmospheric vertical gradient
    pg.noFill();
    for (let y = 0; y < 1000; y += 4) {
      const k = y / 1000;
      const mix = k * 0.14;
      pg.stroke(
        Math.round(r * (1 - mix) + fr * mix),
        Math.round(gr * (1 - mix) + fg * mix),
        Math.round(b * (1 - mix) + fb * mix),
        90
      );
      pg.strokeWeight(4);
      pg.line(0, y, 1840, y);
    }

    // Subtle procedural texture dots
    let seed = (meta.index + 1) * 9973;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    pg.noStroke();
    for (let i = 0; i < 450; i++) {
      pg.fill(fr, fg, fb, 14);
      pg.circle(rand() * 1840, rand() * 1000, 10 + rand() * 48);
    }
  });

  // 1. Draw baked backdrop into framebuffer
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // 2. p5.brush textured horizon, hills/pillars & continuous road stroke
  brush.set("charcoal", meta.roadColor, 2.2);
  brush.line(BLEED_LEFT, ROAD_Y, BLEED_RIGHT, ROAD_Y);
  brush.set("HB", meta.accent, 1.1);
  brush.line(BLEED_LEFT, ROAD_Y + 9, BLEED_RIGHT, ROAD_Y + 9);

  // Era silhouettes / architecture markers along the road (gives strong parallax & pan landmarks)
  brush.set("2B", meta.fg, 1.0);
  for (let mx = -280; mx <= 1300; mx += 260) {
    const h = 55 + ((Math.abs(mx + meta.num * 73) % 5) * 24);
    brush.rect(mx - 22, ROAD_Y - h, 44, h);
  }

  // 3. 2D Overlay: Road surface, milestone posts, Stage 1 placeholder info, Rig, Title Card
  g.push();

  // Special 9:16 mask preview on #19 Short Video so frame contrast is already visible in Stage 1
  if (meta.id === "s19_shortvideo") {
    g.noStroke();
    g.fill(8, 9, 12, 210);
    g.rect(BLEED_LEFT, 0, 215 - BLEED_LEFT, 1000);
    g.rect(785, 0, BLEED_RIGHT - 785, 1000);
  }

  // Road band and clear distance posts (ideal for judging 30fps vs 60fps smoothness!)
  g.noStroke();
  g.fill(meta.roadColor);
  g.rect(BLEED_LEFT, ROAD_Y, BLEED_RIGHT - BLEED_LEFT, 16);

  g.stroke(meta.accent);
  g.strokeWeight(2);
  for (let px = -360; px <= 1360; px += 120) {
    g.line(px, ROAD_Y + 16, px, ROAD_Y + 34);
    g.fill(meta.accent);
    g.noStroke();
    g.circle(px, ROAD_Y + 8, 5);
    g.stroke(meta.accent);
  }

  // Watermark era number in center background
  g.push();
  g.fill(meta.fg);
  g.drawingContext.globalAlpha = 0.09;
  g.noStroke();
  g.textAlign("center", "center");
  g.textFont("Georgia, serif");
  g.textStyle("bold");
  g.textSize(290);
  g.text(String(meta.num).padStart(2, "0"), 500, 405);
  g.pop();

  // Bar 2 signature gag placeholder cue card (appears during Bar 2 [2..4s])
  const bar2Alpha = smoothstep(1.65, 2.05, u) * (1 - smoothstep(3.95, 4.35, u));
  if (bar2Alpha > 0.02) {
    g.push();
    g.drawingContext.globalAlpha = bar2Alpha * 0.92;
    g.fill(meta.family === "ink" || meta.bg > "#9" ? "rgba(255,250,240,0.86)" : "rgba(18,22,28,0.82)");
    g.stroke(meta.accent);
    g.strokeWeight(2);
    g.rectMode("center");
    g.rect(500, 232, 560, 82, 8);

    g.noStroke();
    g.fill(meta.accent);
    g.textAlign("center", "top");
    g.textFont("Menlo, monospace");
    g.textStyle("bold");
    g.textSize(13);
    g.text(`STAGE 1 PLACEHOLDER · BAR 2 GAG BEAT`, 500, 202);

    g.fill(meta.family === "ink" || meta.bg > "#9" ? "#1e1914" : "#f4f6fa");
    g.textFont("PingFang SC, Songti SC, sans-serif");
    g.textStyle("normal");
    g.textSize(20);
    g.text(meta.gag, 500, 228);
    g.pop();
  }

  // Compute pelican X (with optional Bar 2 warp e.g. Egypt slow-pose)
  const px = getScenePelicanX(animU, meta.warpStrength || 0);
  const pose = getRigPose(animT, {
    x: px,
    y: ROAD_Y,
    scale: meta.id === "s05_song" ? 0.45 : 1.0,
  });

  // Era-aware placeholder rig styling hints
  const rigPalette = {
    frame: meta.family === "crt" ? "#42ff7a" : meta.fg,
    tire: meta.family === "crt" ? "#42ff7a" : meta.fg,
    feather: meta.family === "rubbing" ? "#ede9de" : "#faf5ea",
    featherShade: meta.family === "rubbing" ? "#cfc8b8" : "#ddd2be",
    beak: meta.accent,
    pouch: meta.accent,
    leg: meta.accent,
    outline: meta.family === "rubbing" ? "#f2ede2" : meta.fg,
    silhouette: meta.id === "s14_nosferatu" || meta.id === "s01_sahara" || meta.id === "s10_wayang",
  };

  if (meta.id === "s14_nosferatu") {
    // Diagonal staircase shadow hint even in Stage 1
    g.fill("rgba(10, 10, 8, 0.25)");
    g.noStroke();
    g.triangle(120, ROAD_Y, 960, ROAD_Y, 960, 280);
  }

  drawRig2D(g, pose, rigPalette);

  // Title card (Chinese + English + Era) in top-left of canonical square
  drawEraTitleCard(g, meta, u);

  g.pop();
}
