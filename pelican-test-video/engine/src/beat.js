/**
 * Beat, timeline, camera curve, and portal-crossing math for 《鹈鹕测试》.
 * 120 BPM: 1 beat = 0.5s, 1 bar (4 beats) = 2.0s.
 * Total duration: 137.0s (2:17 exact).
 */

export const BPM = 120;
export const DEFAULT_FPS = 60;
export const BEAT_SEC = 60 / BPM; // 0.5s
export const BAR_SEC = BEAT_SEC * 4; // 2.0s

export const INTRO_DUR = 5.0; // 2.5 bars
export const SCENE_COUNT = 20;
export const SCENE_DUR = 6.0; // 3 bars per era
export const SCENES_END = INTRO_DUR + SCENE_COUNT * SCENE_DUR; // 125.0s
export const OUTRO_DUR = 12.0; // 6 bars
export const TOTAL_DUR = SCENES_END + OUTRO_DUR; // 137.0s

// Canonical 1000x1000 unit space inside 1840x1000 offscreen bleed buffer
export const SCENE_SIZE = 1000;
export const BLEED_LEFT = -420;
export const BLEED_RIGHT = 1420;
export const BUFFER_W = BLEED_RIGHT - BLEED_LEFT; // 1840
export const BUFFER_H = SCENE_SIZE; // 1000
export const ROAD_Y = 730;
export const W_STRIDE = BUFFER_W; // 1840 units per scene
export const CROSS_SPEED = W_STRIDE / SCENE_DUR; // 306.6667 units/sec

// Viewport geometry at 1920x1080 (1000 vertical units = 1080 px)
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;
export const UNIT_TO_PX = CANVAS_H / SCENE_SIZE; // 1.08
export const VIEW_HALF_W = CANVAS_W / 2 / UNIT_TO_PX; // 888.8889 units

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * C1-continuous cubic Hermite interpolation on [0, 1].
 */
export function hermite(p0, m0, p1, m1, u) {
  const t = clamp(u, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

/**
 * Beat phase info at global time t.
 */
export function getBeatInfo(t) {
  const safeT = Math.max(0, t);
  const totalBeats = safeT / BEAT_SEC;
  const beatIndex = Math.floor(totalBeats);
  const beatFrac = totalBeats - beatIndex;
  const barIndex = Math.floor(beatIndex / 4);
  const beatInBar = beatIndex % 4;
  // Sharp impulse on every beat (1 at beat downbeat, decays exponentially)
  const beatPulse = Math.exp(-beatFrac * 6.5);
  // Stronger impulse on bar downbeat (beat 0 of each bar)
  const barFrac = (safeT % BAR_SEC) / BAR_SEC;
  const barPulse = Math.exp(-barFrac * 8.0);
  // Pedal revolution = 2 beats (1.0s)
  const pedalAngle = safeT * Math.PI * 2;
  return {
    t: safeT,
    totalBeats,
    beatIndex,
    beatFrac,
    barIndex,
    beatInBar,
    beatPulse,
    barPulse,
    pedalAngle,
  };
}

/**
 * Retro temporal quantization (8-12 Hz) for Wayang Kulit, 8-bit, and Chat GIF interiors.
 */
export function quantizeTime(t, fps = 10) {
  return Math.floor(t * fps) / fps;
}

/**
 * Camera X inside a 6-second scene (u in [0, 6]).
 * Matches portal crossing speed CROSS_SPEED at u = 0 (camX = -420) and u = 6 (camX = 1420),
 * while settling softly around center x = 500 during Bar 2 (u in [1.6, 4.4]) so neither portal edge peeks in.
 */
export function getSceneCamX(u) {
  const c0 = BLEED_LEFT; // -420
  const c1 = 480;
  const c2 = 520;
  const c3 = BLEED_RIGHT; // 1420
  const tIn = 1.6;
  const tOut = 4.4;
  const midSpeed = (c2 - c1) / (tOut - tIn); // 14.2857 units/s

  if (u <= tIn) {
    return hermite(c0, CROSS_SPEED * tIn, c1, midSpeed * tIn, u / tIn);
  }
  if (u <= tOut) {
    return lerp(c1, c2, (u - tIn) / (tOut - tIn));
  }
  const durOut = SCENE_DUR - tOut; // 1.6s
  return hermite(c2, midSpeed * durOut, c3, CROSS_SPEED * durOut, (u - tOut) / durOut);
}

/**
 * Intro camera X in Intro-local space ([-420, 1420], center 500, exit portal at 1420).
 */
export function getIntroCamX(t) {
  const panStart = 3.6;
  if (t <= panStart) return 500;
  const dur = INTRO_DUR - panStart; // 1.4s
  const p = (t - panStart) / dur;
  return hermite(500, 0, BLEED_RIGHT, CROSS_SPEED * dur, p);
}

/**
 * Intro pelican X in Intro-local space: rides onto road during t in [3.5, 5.0] to meet portal at 1420,
 * and extends linearly past 1420 during t > 5.0 so rear half stays synced across Portal 1.
 */
export function getIntroPelicanX(t) {
  const startT = 3.5;
  if (t < startT) return null;
  if (t >= INTRO_DUR) {
    return BLEED_RIGHT + CROSS_SPEED * (t - INTRO_DUR);
  }
  const dur = INTRO_DUR - startT; // 1.5s
  const p = clamp((t - startT) / dur, 0, 1);
  // Start near sketch at x = 680 and accelerate smoothly to CROSS_SPEED at t = 5.0
  return hermite(680, 160, BLEED_RIGHT, CROSS_SPEED * dur, p);
}

/**
 * Default pelican X inside a 6-second scene (u in [0, 6]), extending linearly outside [0, 6]
 * so left/right halves across a Portal Frame stay 100% locked during transitions.
 */
export function getScenePelicanX(u, warpStrength = 0) {
  let uWarped = u;
  if (warpStrength > 0 && u > 0 && u < SCENE_DUR) {
    // Smooth bump slowing around u = 3.0 while guaranteeing warp(0)=0, warp(6)=6, warp'(0)=1, warp'(6)=1
    const norm = u / SCENE_DUR; // 0..1
    uWarped = u - warpStrength * (SCENE_DUR / (2 * Math.PI)) * Math.sin(2 * Math.PI * norm);
  }
  return BLEED_LEFT + CROSS_SPEED * uWarped;
}

/**
 * Subtle beat-synced camera zoom pulse when crossing a Picture Frame at t = 5 + 6*k (k = 0..20).
 */
export function getPortalZoom(t) {
  if (t < 4.5 || t > SCENES_END + 0.5) return 1.0;
  const nearestIdx = Math.round((t - INTRO_DUR) / SCENE_DUR);
  const crossT = INTRO_DUR + nearestIdx * SCENE_DUR;
  const dt = t - crossT;
  // Asymmetric slight anticipation & strong downbeat push-in
  const sigma = dt < 0 ? 0.16 : 0.28;
  const pulse = Math.exp(-(dt * dt) / (2 * sigma * sigma));
  return 1.0 + 0.055 * pulse;
}

/**
 * Locates which segment (intro / scenes / outro) owns global time t.
 */
export function getTimelineSegment(t) {
  const safeT = clamp(t, 0, TOTAL_DUR);
  if (safeT < INTRO_DUR) {
    return {
      kind: "intro",
      t: safeT,
      localTime: safeT,
      sceneIndex: -1,
      barInScene: Math.floor(safeT / BAR_SEC) + 1,
    };
  }
  if (safeT < SCENES_END) {
    const rel = safeT - INTRO_DUR;
    const idx = Math.min(SCENE_COUNT - 1, Math.floor(rel / SCENE_DUR));
    const u = rel - idx * SCENE_DUR;
    return {
      kind: "scene",
      t: safeT,
      localTime: u,
      sceneIndex: idx,
      barInScene: Math.min(3, Math.floor(u / BAR_SEC) + 1),
    };
  }
  const uOutro = safeT - SCENES_END;
  return {
    kind: "outro",
    t: safeT,
    localTime: uOutro,
    sceneIndex: SCENE_COUNT,
    barInScene: Math.min(6, Math.floor(uOutro / BAR_SEC) + 1),
  };
}
