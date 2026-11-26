/**
 * Bicycle Foley & Signature Comedy SFX Engine (`audio/sfx.js`).
 * Pure procedural Web Audio sound effects synced to exact visual timestamps:
 * - Solo & pickup bicycle bell ("ding-ling!")
 * - Pedal-locked chain & freewheel tick percussion across 120 BPM eras
 * - 14->15 electric arc surge & CRT ignition sweep
 * - 8-bit jump, diamond coins, star-berry, and original 1UP fanfare
 * - 2000s IM Window Nudge vibration buzz
 * - Outro press camera flashbulb whine + mechanical shutter ("ka-chak!") & fly-by whoosh
 */

import {
  clampFreq,
  connectPanAndSend,
  getPinkNoiseBuffer,
  getWhiteNoiseBuffer,
  midiToFreq,
  playFMVoice,
} from "./dsp.js";

/**
 * Brass dome bicycle bell ("ding-ling!") built from realistic inharmonic bell partials.
 */
export function playBicycleBell(ctx, dest, t0, opts = {}) {
  const start = Math.max(0, t0);
  const { gain = 0.28, pan = 0.12, doubleRing = true, ringDecay = 0.95, sendDest = null, sendAmt = 0.24 } = opts;

  const strike = (ts, amp, baseFreq) => {
    // Classic brass dome modal ratios: [1.0, 2.0, 2.756, 3.89]
    const partials = [
      [1.0, 0.55, ringDecay],
      [2.0, 0.35, ringDecay * 0.72],
      [2.756, 0.22, ringDecay * 0.5],
      [3.89, 0.14, ringDecay * 0.32],
    ];
    for (const [ratio, weight, decay] of partials) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(clampFreq(baseFreq * ratio), ts);
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0, ts);
      eg.gain.linearRampToValueAtTime(amp * weight, ts + 0.002);
      eg.gain.exponentialRampToValueAtTime(0.0001, ts + decay);
      eg.gain.linearRampToValueAtTime(0, ts + decay + 0.02);
      o.connect(eg);
      connectPanAndSend(ctx, eg, dest, 1.0, pan, sendDest, sendAmt);
      o.start(ts);
      o.stop(ts + decay + 0.03);
    }

    // Crisp hammer strike transient
    const ns = ctx.createBufferSource();
    ns.buffer = getWhiteNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 5400;
    hp.Q.value = 3.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, ts);
    ng.gain.linearRampToValueAtTime(amp * 0.18, ts + 0.001);
    ng.gain.exponentialRampToValueAtTime(0.0001, ts + 0.015);
    ng.gain.linearRampToValueAtTime(0, ts + 0.02);
    ns.connect(hp);
    hp.connect(ng);
    connectPanAndSend(ctx, ng, dest, 1.0, pan, sendDest, sendAmt * 0.5);
    ns.start(ts, (ts * 3.1) % 3.1, 0.025);
  };

  strike(start, gain, 2349.3); // D7 bright brass fundamental
  if (doubleRing) {
    strike(start + 0.115, gain * 0.92, 2489.0); // slight natural double-clapper shimmer
  }
}

const tickBufCache = new WeakMap();

/**
 * Generates and caches crisp mechanical chain-tick AudioBuffers per context (zero per-tick filters!).
 */
function getChainTickBuffers(ctx) {
  const existing = tickBufCache.get(ctx);
  if (existing) return existing;
  const sr = ctx.sampleRate || 48000;
  const makeTick = (freq, decayRate, seed) => {
    const len = Math.floor(sr * 0.032);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    const w0 = (2 * Math.PI * freq) / sr;
    const alpha = Math.sin(w0) / (2 * 2.6);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    let s = seed >>> 0;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const x0 = (s / 4294967296) * 2 - 1;
      const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      const env = Math.min(1, i / (sr * 0.0012)) * Math.exp((-i / sr) * decayRate);
      data[i] = y0 * env * 2.4;
    }
    return buf;
  };
  const pair = {
    accent: makeTick(3800, 145, 7181),
    light: makeTick(5100, 210, 9241),
  };
  tickBufCache.set(ctx, pair);
  return pair;
}

/**
 * Crisp mechanical bicycle chain & pedal dead-center tick synced to 120 BPM (0.5s beat).
 */
function playChainTick(ctx, dest, t0, gain = 0.055, isAccent = false, pan = -0.1) {
  const start = Math.max(0, t0);
  const ticks = getChainTickBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = isAccent ? ticks.accent : ticks.light;
  connectPanAndSend(ctx, src, dest, gain, pan);
  src.start(start);
}

const ERA_CHAIN_LEVELS = [
  0.048, 0.035, 0.042, 0.040, 0.012,
  0.046, 0.044, 0.042, 0.010, 0.038,
  0.046, 0.036, 0.040, 0.016, 0.024,
  0.028, 0.032, 0.008, 0.048, 0.034,
];

/**
 * Schedules bicycle chain rhythm & pickup bell for Intro (local t=0..5s) or a single era (local t=0..6s).
 */
export function scheduleEraBicyclePercussion(ctx, dest, roomConv, eraIndex, tOffset = 0) {
  if (eraIndex < 0) {
    // Intro pickup
    playBicycleBell(ctx, dest, tOffset + 3.58, {
      gain: 0.22,
      pan: 0.18,
      doubleRing: true,
      sendDest: roomConv,
      sendAmt: 0.22,
    });
    for (let t = 3.5; t < 5.0; t += 0.25) {
      playChainTick(ctx, dest, tOffset + t, 0.04, Math.abs((t * 2) % 1) < 0.05, -0.15);
    }
    return;
  }

  const lv = ERA_CHAIN_LEVELS[eraIndex] ?? 0.03;
  for (let b = 0; b < 24; b++) {
    if (eraIndex === 15 && b >= 8 && b < 12) continue; // airborne over pit in #16
    const accent = b % 2 === 0;
    playChainTick(
      ctx,
      dest,
      tOffset + b * 0.25,
      accent ? lv : lv * 0.55,
      accent,
      b % 4 === 0 ? -0.12 : 0.12
    );
  }

  if (eraIndex === 0) {
    playBicycleBell(ctx, dest, tOffset + 0.02, { gain: 0.15, pan: -0.2, doubleRing: false, ringDecay: 0.7, sendDest: roomConv });
  } else if (eraIndex === 5) {
    playBicycleBell(ctx, dest, tOffset + 0.02, { gain: 0.16, pan: 0.15, doubleRing: true, ringDecay: 0.72, sendDest: roomConv });
  } else if (eraIndex === 12) {
    playBicycleBell(ctx, dest, tOffset + 0.75, { gain: 0.19, pan: -0.12, doubleRing: true, ringDecay: 0.75, sendDest: roomConv });
  }
}

/**
 * Schedules subtle bicycle chain rhythm & pickup bell accents across Intro -> Era 20 in one timeline.
 */
export function scheduleBicyclePercussion(ctx, dest, roomConv) {
  scheduleEraBicyclePercussion(ctx, dest, roomConv, -1, 0);
  for (let i = 0; i < 20; i++) {
    scheduleEraBicyclePercussion(ctx, dest, roomConv, i, 5.0 + i * 6.0);
  }
}

/**
 * 14 -> 15 High-voltage electrification crackle & P1 phosphor CRT sweep (t = 88.45 .. 89.20s).
 */
export function playElectricTransitionSFX(ctx, dest, tPortal = 89.0, roomConv) {
  const start = tPortal - 0.55; // 88.45s
  const end = tPortal + 0.35; // 89.35s

  // Sweeping CRT high-voltage deflection whine (400 Hz -> 2400 Hz -> lock)
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(320, start);
  o.frequency.exponentialRampToValueAtTime(1920, tPortal);
  o.frequency.exponentialRampToValueAtTime(680, end);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1200, start);
  bp.frequency.exponentialRampToValueAtTime(3200, tPortal);
  bp.Q.value = 3.0;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(0.18, tPortal - 0.04);
  g.gain.exponentialRampToValueAtTime(0.0002, end);
  g.gain.linearRampToValueAtTime(0, end + 0.02);
  o.connect(bp);
  bp.connect(g);
  connectPanAndSend(ctx, g, dest, 1.0, 0, roomConv, 0.25);
  o.start(start);
  o.stop(end + 0.04);

  // Staccato cyan electric arc snaps right across the portal flash
  const snapOffsets = [-0.46, -0.34, -0.22, -0.12, -0.04, 0.0, 0.08, 0.18];
  for (let k = 0; k < snapOffsets.length; k++) {
    const ts = tPortal + snapOffsets[k];
    const ns = ctx.createBufferSource();
    ns.buffer = getWhiteNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2600 + (k % 3) * 900;
    const ng = ctx.createGain();
    const peak = Math.abs(snapOffsets[k]) < 0.05 ? 0.34 : 0.16;
    ng.gain.setValueAtTime(0, ts);
    ng.gain.linearRampToValueAtTime(peak, ts + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, ts + 0.048);
    ng.gain.linearRampToValueAtTime(0, ts + 0.055);
    ns.connect(hp);
    hp.connect(ng);
    connectPanAndSend(ctx, ng, dest, 1.0, (k % 2 === 0 ? -0.28 : 0.28), roomConv, 0.2);
    ns.start(ts, (k * 0.43) % 2.8, 0.06);
  }
}

/**
 * Original 8-bit chiptune SFX for Scene #16 (jump, 3 diamond coins, star-berry, 1UP!).
 */
export function schedule8BitGameSFX(ctx, dest, tStart = 95.0) {
  // 1) Pit Jump rising square sweep at u = 2.00s (t = 97.00s)
  const tJump = tStart + 2.0;
  const jo = ctx.createOscillator();
  jo.type = "square";
  jo.frequency.setValueAtTime(220, tJump);
  jo.frequency.exponentialRampToValueAtTime(680, tJump + 0.22);
  const jg = ctx.createGain();
  jg.gain.setValueAtTime(0, tJump);
  jg.gain.linearRampToValueAtTime(0.14, tJump + 0.01);
  jg.gain.exponentialRampToValueAtTime(0.0001, tJump + 0.24);
  jg.gain.linearRampToValueAtTime(0, tJump + 0.26);
  jo.connect(jg);
  connectPanAndSend(ctx, jg, dest, 1.0, -0.1);
  jo.start(tJump);
  jo.stop(tJump + 0.27);

  // 2) Original 3 diamond coin chimes (syncs with s16_8bit px crossings u=2.31, 2.52, 2.73)
  const coinMidis = [74, 78, 81]; // D5 -> F#5 -> A5 original rising steps!
  const coinTimes = [2.31, 2.52, 2.73];
  for (let i = 0; i < 3; i++) {
    const tc = tStart + coinTimes[i];
    const m = coinMidis[i];
    const co = ctx.createOscillator();
    co.type = "square";
    co.frequency.setValueAtTime(midiToFreq(m), tc);
    co.frequency.setValueAtTime(midiToFreq(m + 5), tc + 0.055);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, tc);
    cg.gain.linearRampToValueAtTime(0.15, tc + 0.003);
    cg.gain.exponentialRampToValueAtTime(0.0002, tc + 0.19);
    cg.gain.linearRampToValueAtTime(0, tc + 0.21);
    co.connect(cg);
    connectPanAndSend(ctx, cg, dest, 1.0, -0.15 + i * 0.15);
    co.start(tc);
    co.stop(tc + 0.22);
  }

  // 3) Glowing star-berry pickup at u = 2.86s (t = 97.86s)
  const tStar = tStart + 2.86;
  const starMidis = [76, 81, 86];
  for (let i = 0; i < starMidis.length; i++) {
    const ts = tStar + i * 0.036;
    const so = ctx.createOscillator();
    so.type = "triangle";
    so.frequency.setValueAtTime(midiToFreq(starMidis[i]), ts);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, ts);
    sg.gain.linearRampToValueAtTime(0.16, ts + 0.003);
    sg.gain.exponentialRampToValueAtTime(0.0001, ts + 0.09);
    sg.gain.linearRampToValueAtTime(0, ts + 0.1);
    so.connect(sg);
    sg.connect(dest);
    so.start(ts);
    so.stop(ts + 0.11);
  }

  // 4) Landing "1UP!" celebratory original chip arpeggio at u = 3.00s (t = 98.00s)
  const t1up = tStart + 3.0;
  const fanfare = [74, 78, 81, 83, 86, 90]; // D5 F#5 A5 B5 D6 F#6
  for (let i = 0; i < fanfare.length; i++) {
    const tf = t1up + i * 0.068;
    const dur = i === fanfare.length - 1 ? 0.28 : 0.064;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(midiToFreq(fanfare[i]), tf);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, tf);
    g.gain.linearRampToValueAtTime(0.16, tf + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0002, tf + dur);
    g.gain.linearRampToValueAtTime(0, tf + dur + 0.01);
    o.connect(g);
    connectPanAndSend(ctx, g, dest, 1.0, i % 2 === 0 ? -0.18 : 0.18);
    o.start(tf);
    o.stop(tf + dur + 0.015);
  }
}

/**
 * 2000s Early Messenger "Window Nudge" vibration buzzes on beats u=2.0, 2.5, 3.0, 3.5.
 */
export function scheduleWindowNudgeSFX(ctx, dest, tStart = 101.0) {
  for (const bu of [2.0, 2.5, 3.0, 3.5]) {
    const tn = tStart + bu;
    const dur = 0.24;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(92, tn);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 38;
    const lg = ctx.createGain();
    lg.gain.value = 42;
    lfo.connect(lg);
    lg.connect(o.frequency);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 240;
    bp.Q.value = 1.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, tn);
    g.gain.linearRampToValueAtTime(0.24, tn + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0002, tn + dur);
    g.gain.linearRampToValueAtTime(0, tn + dur + 0.01);

    o.connect(bp);
    bp.connect(g);
    connectPanAndSend(ctx, g, dest, 1.0, 0);
    o.start(tn);
    o.stop(tn + dur + 0.02);
    lfo.start(tn);
    lfo.stop(tn + dur + 0.02);
  }
}

/**
 * Press conference camera flashbulb whine + crisp shutter click ("ka-chak!") + Outro fly-by whoosh & final bell.
 */
export function scheduleOutroSFX(ctx, dest, roomConv, tOutro = 125.0) {
  // 3 Press Flashbulbs synced to visual strobe peaks in outro.js (uOutro = 5.0, 6.0, 7.0)
  for (let i = 0; i < 3; i++) {
    const tf = tOutro + 5.0 + i * 1.0; // 130.0, 131.0, 132.0s
    const pan = -0.35 + i * 0.35;

    // 1) Mechanical shutter click ("ka-chak")
    for (const [off, freq, amp] of [
      [0.0, 2800, 0.34],
      [0.042, 4200, 0.26],
    ]) {
      const ns = ctx.createBufferSource();
      ns.buffer = getWhiteNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 2.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, tf + off);
      ng.gain.linearRampToValueAtTime(amp, tf + off + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.0001, tf + off + 0.028);
      ng.gain.linearRampToValueAtTime(0, tf + off + 0.032);
      ns.connect(bp);
      bp.connect(ng);
      connectPanAndSend(ctx, ng, dest, 1.0, pan, roomConv, 0.25);
      ns.start(tf + off, (i * 0.6 + off) % 2.8, 0.04);
    }

    // 2) Brief xenon flashbulb capacitor recharge chirp
    const wo = ctx.createOscillator();
    wo.type = "sine";
    wo.frequency.setValueAtTime(1650 + i * 140, tf + 0.04);
    wo.frequency.exponentialRampToValueAtTime(4800 + i * 200, tf + 0.42);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0, tf + 0.04);
    wg.gain.linearRampToValueAtTime(0.045, tf + 0.14);
    wg.gain.exponentialRampToValueAtTime(0.0001, tf + 0.44);
    wg.gain.linearRampToValueAtTime(0, tf + 0.46);
    wo.connect(wg);
    connectPanAndSend(ctx, wg, dest, 1.0, pan, roomConv, 0.15);
    wo.start(tf + 0.04);
    wo.stop(tf + 0.47);
  }

  // Final Fly-by tire & wind whoosh behind empty chair (uOutro in [10.3, 11.45] -> t = 135.30..136.45s)
  const wStart = tOutro + 10.3;
  const wDur = 1.15;
  const ns = ctx.createBufferSource();
  ns.buffer = getPinkNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(340, wStart);
  bp.frequency.exponentialRampToValueAtTime(980, wStart + 0.5);
  bp.frequency.exponentialRampToValueAtTime(280, wStart + wDur);
  bp.Q.value = 1.4;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(-0.85, wStart);
  panner.pan.linearRampToValueAtTime(0.88, wStart + wDur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, wStart);
  g.gain.linearRampToValueAtTime(0.24, wStart + 0.45);
  g.gain.linearRampToValueAtTime(0, wStart + wDur);
  ns.connect(bp);
  bp.connect(panner);
  panner.connect(g);
  g.connect(dest);
  ns.start(wStart, 0.4, wDur + 0.05);

  // Subtle spinning spokes whirr during fly-by
  for (let k = 0; k < 10; k++) {
    const pan = -0.75 + (k / 9) * 1.55;
    playChainTick(ctx, dest, wStart + 0.08 + k * 0.1, 0.055 * Math.sin(((k + 1) / 11) * Math.PI), true, pan);
  }

  // THE FINAL SOLO BICYCLE BELL ("ding-ling!") right at uOutro = 10.65s (t = 135.65s, matching `outro.js`!)
  playBicycleBell(ctx, dest, tOutro + 10.65, {
    gain: 0.62,
    pan: 0.22,
    doubleRing: true,
    ringDecay: 1.25,
    sendDest: roomConv,
    sendAmt: 0.34,
  });
}
