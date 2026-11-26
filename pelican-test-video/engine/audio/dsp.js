/**
 * Procedural DSP Synthesis Primitives & Reverb Builders (`audio/dsp.js`).
 * Pure Web Audio API (zero external audio files), deterministic PRNG noise & IRs,
 * and click-free AudioParam envelopes safe for OfflineAudioContext & real-time AudioContext.
 */

export const SAMPLE_RATE = 48000;
export const TOTAL_AUDIO_DUR = 137.0;

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function clampFreq(f) {
  return clamp(Number.isFinite(f) ? f : 440, 20, 21500);
}

export function safeGain(v) {
  return Math.max(0.0001, Number.isFinite(v) ? v : 0.0001);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createPrng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ctxAssetCache = new WeakMap();

function getCache(ctx) {
  let entry = ctxAssetCache.get(ctx);
  if (!entry) {
    entry = {};
    ctxAssetCache.set(ctx, entry);
  }
  return entry;
}

export function getWhiteNoiseBuffer(ctx) {
  const cache = getCache(ctx);
  if (cache.whiteNoise) return cache.whiteNoise;
  const sr = ctx.sampleRate || SAMPLE_RATE;
  const len = Math.floor(sr * 4.0);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const rand = createPrng(19001 + ch * 7919);
    for (let i = 0; i < len; i++) {
      data[i] = rand() * 2 - 1;
    }
  }
  cache.whiteNoise = buf;
  return buf;
}

export function getPinkNoiseBuffer(ctx) {
  const cache = getCache(ctx);
  if (cache.pinkNoise) return cache.pinkNoise;
  const sr = ctx.sampleRate || SAMPLE_RATE;
  const len = Math.floor(sr * 4.0);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const rand = createPrng(44203 + ch * 104729);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = rand() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      data[i] = clamp(sample, -1, 1);
    }
  }
  cache.pinkNoise = buf;
  return buf;
}

function buildExponentialIR(ctx, dur, seed, decayRate, lpCoeff, plateauSec = 0, gateSec = 0) {
  const sr = ctx.sampleRate || SAMPLE_RATE;
  const len = Math.max(256, Math.floor(sr * dur));
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const rand = createPrng(seed + ch * 31337);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const tSec = i / sr;
      let env;
      if (gateSec > 0 && plateauSec > 0) {
        // 80s gated plate envelope
        const attack = clamp(tSec / 0.012, 0, 1);
        if (tSec <= plateauSec) {
          env = attack * (1 - 0.18 * (tSec / plateauSec));
        } else {
          const gFrac = clamp((tSec - plateauSec) / gateSec, 0, 1);
          env = 0.82 * Math.pow(1 - gFrac, 2.8);
        }
      } else {
        const attack = clamp(tSec / 0.018, 0, 1);
        env = attack * Math.exp(-decayRate * tSec);
      }
      const white = rand() * 2 - 1;
      prev = prev + lpCoeff * (white - prev);
      data[i] = prev * env;
    }
    // Gentle early reflection taps for spatial realism (acoustic/hall IRs)
    if (gateSec === 0) {
      const taps = [0.008, 0.015, 0.024, 0.037, 0.052];
      for (let k = 0; k < taps.length; k++) {
        const idx = Math.floor((taps[k] + ch * 0.0017) * sr);
        if (idx < len) data[idx] += (k % 2 === 0 ? 1 : -1) * 0.34 * Math.exp(-k * 0.38);
      }
    }
  }
  return buf;
}

export function getStudioRoomIR(ctx) {
  const cache = getCache(ctx);
  if (!cache.studioIR) {
    cache.studioIR = buildExponentialIR(ctx, 1.35, 7101, 3.3, 0.48);
  }
  return cache.studioIR;
}

export function getGated80sDrumIR(ctx) {
  const cache = getCache(ctx);
  if (!cache.gatedIR) {
    cache.gatedIR = buildExponentialIR(ctx, 0.36, 8402, 1.0, 0.58, 0.21, 0.15);
  }
  return cache.gatedIR;
}

export function getVaporMallHallIR(ctx) {
  const cache = getCache(ctx);
  if (!cache.mallIR) {
    cache.mallIR = buildExponentialIR(ctx, 4.2, 9503, 1.15, 0.34);
  }
  return cache.mallIR;
}

export function createSoftLimiterNode(ctx, ceiling = 0.90) {
  const shaper = ctx.createWaveShaper();
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1; // [-1..1] covers input normalized to drive range
    const raw = x * 2.2;
    if (Math.abs(raw) <= 0.58) {
      curve[i] = clamp(raw, -ceiling, ceiling);
    } else {
      const excess = Math.abs(raw) - 0.58;
      const head = ceiling - 0.58;
      const shaped = 0.58 + head * Math.tanh(excess / Math.max(0.05, head));
      curve[i] = Math.sign(raw) * clamp(shaped, 0, ceiling);
    }
  }
  // Pre-divide input via WaveShaper scaling trick: map WaveShaper directly on [-2.2, 2.2] via Gain(1/2.2) before!
  shaper.curve = curve;
  shaper.oversample = "2x";

  const pre = ctx.createGain();
  pre.gain.value = 1 / 2.2;
  pre.connect(shaper);
  return { input: pre, output: shaper };
}

export function connectPanAndSend(ctx, node, dest, gainVal, pan = 0, sendDest = null, sendAmt = 0) {
  const g = ctx.createGain();
  g.gain.value = gainVal;
  if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    node.connect(panner);
    panner.connect(g);
  } else {
    node.connect(g);
  }
  g.connect(dest);
  if (sendDest && sendAmt > 0.001) {
    const sg = ctx.createGain();
    sg.gain.value = sendAmt;
    g.connect(sg);
    sg.connect(sendDest);
  }
  return g;
}

const jawariCurveCache = new Map();

function createJawariShaper(ctx, amount = 0.45) {
  const key = Math.round(amount * 100);
  let curve = jawariCurveCache.get(key);
  if (!curve) {
    const n = 512;
    curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      const drive = 1 + amount * 1.1;
      const harmonic = amount * 0.16 * Math.sin(x * Math.PI * 3.0) * Math.abs(x);
      curve[i] = clamp(Math.tanh(x * drive) * 0.85 + harmonic, -1, 1);
    }
    jawariCurveCache.set(key, curve);
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  return shaper;
}

/**
 * Plucked string / harp / pipa / guqin / sitar / shamisen voice.
 */
export function playPluck(ctx, dest, freq, t0, dur, opts = {}) {
  const start = Math.max(0, t0);
  const f = clampFreq(freq);
  const {
    gain = 0.24,
    pan = 0,
    waveform = "sawtooth",
    subTriangle = 0.35,
    brightMult = 7.5,
    decayMult = 1.6,
    filterQ = 1.4,
    bodyFreq = 0,
    bodyQ = 2.5,
    pickNoise = 0.16,
    bendSemis = 0,
    bendTime = 0.14,
    jawari = 0,
    sendDest = null,
    sendAmt = 0.16,
  } = opts;

  const stopTime = start + Math.max(0.05, dur);
  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.setValueAtTime(f, start);
  if (bendSemis !== 0) {
    const bendTarget = clampFreq(f * Math.pow(2, bendSemis / 12));
    osc.frequency.exponentialRampToValueAtTime(bendTarget, start + Math.min(dur * 0.7, bendTime));
  }

  const mix = ctx.createGain();
  mix.gain.value = 1.0;

  osc.connect(mix);
  osc.start(start);
  osc.stop(stopTime + 0.02);

  let osc2 = null;
  if (subTriangle > 0.01) {
    osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(f, start);
    if (bendSemis !== 0) {
      osc2.frequency.exponentialRampToValueAtTime(
        clampFreq(f * Math.pow(2, bendSemis / 12)),
        start + Math.min(dur * 0.7, bendTime)
      );
    }
    const g2 = ctx.createGain();
    g2.gain.value = subTriangle;
    osc2.connect(g2);
    g2.connect(mix);
    osc2.start(start);
    osc2.stop(stopTime + 0.02);
  }

  let head = mix;
  if (jawari > 0.01) {
    const shaper = createJawariShaper(ctx, jawari);
    const drv = ctx.createGain();
    drv.gain.value = 1.15;
    head.connect(drv);
    drv.connect(shaper);
    head = shaper;
  }

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = filterQ;
  const hiCut = clampFreq(f * brightMult);
  const loCut = clampFreq(f * decayMult);
  lp.frequency.setValueAtTime(hiCut, start);
  lp.frequency.exponentialRampToValueAtTime(loCut, start + Math.min(dur * 0.85, 0.35 + dur * 0.35));
  head.connect(lp);
  head = lp;

  if (bodyFreq > 40) {
    const body = ctx.createBiquadFilter();
    body.type = "peaking";
    body.frequency.value = clampFreq(bodyFreq);
    body.Q.value = bodyQ;
    body.gain.value = 5.5;
    head.connect(body);
    head = body;
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.004);
  env.gain.exponentialRampToValueAtTime(safeGain(gain * 0.28), start + dur * 0.38);
  env.gain.linearRampToValueAtTime(0, stopTime);
  head.connect(env);

  connectPanAndSend(ctx, env, dest, 1.0, pan, sendDest, sendAmt);

  // Brief mechanical pick / nail / skin transient
  if (pickNoise > 0.01) {
    const ns = ctx.createBufferSource();
    ns.buffer = getWhiteNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = clampFreq(f * 3.2 + 500);
    bp.Q.value = 1.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(gain * pickNoise, start + 0.0015);
    ng.gain.exponentialRampToValueAtTime(0.0001, start + 0.022);
    ng.gain.linearRampToValueAtTime(0, start + 0.026);
    ns.connect(bp);
    bp.connect(ng);
    connectPanAndSend(ctx, ng, dest, 1.0, pan, sendDest, sendAmt * 0.5);
    ns.start(start, (start * 1.37) % 3.2, 0.03);
  }
}

/**
 * 2-Operator FM synthesis + optional bell overtone partial (Bianzhong, Gamelan, DX7 E-piano, Sax, MIDI).
 */
export function playFMVoice(ctx, dest, freq, t0, dur, opts = {}) {
  const start = Math.max(0, t0);
  const f = clampFreq(freq);
  const {
    gain = 0.22,
    pan = 0,
    modRatio = 1.0,
    modIndexStart = 2.4,
    modIndexEnd = 0.5,
    attack = 0.008,
    decay = 0.22,
    sustain = 0.35,
    release = 0.06,
    vibratoHz = 0,
    vibratoCents = 0,
    vibratoDelay = 0.08,
    bellRatio = 0,
    bellLevel = 0.28,
    lpCutoff = 12000,
    sendDest = null,
    sendAmt = 0.16,
  } = opts;

  const stopTime = start + Math.max(0.04, dur);
  const relStart = Math.max(start + attack + 0.005, stopTime - release);

  const car = ctx.createOscillator();
  car.type = "sine";
  car.frequency.setValueAtTime(f, start);

  const mod = ctx.createOscillator();
  mod.type = "sine";
  mod.frequency.setValueAtTime(clampFreq(f * modRatio), start);

  const modGain = ctx.createGain();
  const idx0 = f * modIndexStart;
  const idx1 = f * Math.max(0.01, modIndexEnd);
  modGain.gain.setValueAtTime(idx0, start);
  modGain.gain.exponentialRampToValueAtTime(Math.max(0.1, idx1), start + Math.min(dur * 0.85, decay + 0.08));
  mod.connect(modGain);
  modGain.connect(car.frequency);

  if (vibratoHz > 0 && vibratoCents > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(vibratoHz, start);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, start);
    lfoGain.gain.linearRampToValueAtTime(vibratoCents, start + Math.min(dur * 0.6, vibratoDelay));
    lfo.connect(lfoGain);
    lfoGain.connect(car.detune);
    lfo.start(start);
    lfo.stop(stopTime + 0.02);
  }

  const mix = ctx.createGain();
  mix.gain.value = 1.0;
  car.connect(mix);

  if (bellRatio > 0.1) {
    const partial = ctx.createOscillator();
    partial.type = "sine";
    partial.frequency.setValueAtTime(clampFreq(f * bellRatio), start);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(bellLevel, start);
    pg.gain.exponentialRampToValueAtTime(0.001, start + Math.min(dur, 0.45 + dur * 0.35));
    partial.connect(pg);
    pg.connect(mix);
    partial.start(start);
    partial.stop(stopTime + 0.02);
  }

  let head = mix;
  if (lpCutoff < 18000) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = clampFreq(lpCutoff);
    head.connect(lp);
    head = lp;
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + Math.min(attack, dur * 0.45));
  if (relStart > start + attack + 0.01) {
    env.gain.exponentialRampToValueAtTime(
      safeGain(gain * sustain),
      Math.min(relStart, start + attack + decay)
    );
  }
  env.gain.linearRampToValueAtTime(0, stopTime);
  head.connect(env);

  connectPanAndSend(ctx, env, dest, 1.0, pan, sendDest, sendAmt);

  car.start(start);
  car.stop(stopTime + 0.02);
  mod.start(start);
  mod.stop(stopTime + 0.02);
}

/**
 * Bowed solo/ensemble string voice with formant resonance and optional pitch glissando.
 */
export function playBowedString(ctx, dest, freq, t0, dur, opts = {}) {
  const start = Math.max(0, t0);
  const f = clampFreq(freq);
  const {
    gain = 0.2,
    pan = 0,
    detuneCents = 7.5,
    attack = 0.075,
    release = 0.09,
    lpFreq = 3400,
    vibratoHz = 5.4,
    vibratoCents = 14,
    glideToFreq = null,
    glideStart = 0,
    glideDur = 0.25,
    bowAir = 0.04,
    sendDest = null,
    sendAmt = 0.2,
  } = opts;

  const stopTime = start + Math.max(0.06, dur);
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = "sawtooth";
  o2.type = "sawtooth";
  o1.frequency.setValueAtTime(f, start);
  o2.frequency.setValueAtTime(f, start);
  o1.detune.setValueAtTime(-detuneCents, start);
  o2.detune.setValueAtTime(detuneCents, start);

  if (glideToFreq && glideToFreq > 20) {
    const gStart = start + Math.max(0, glideStart);
    const gEnd = Math.min(stopTime, gStart + Math.max(0.03, glideDur));
    const gf = clampFreq(glideToFreq);
    o1.frequency.setValueAtTime(f, gStart);
    o2.frequency.setValueAtTime(f, gStart);
    o1.frequency.exponentialRampToValueAtTime(gf, gEnd);
    o2.frequency.exponentialRampToValueAtTime(gf, gEnd);
  }

  if (vibratoHz > 0 && vibratoCents > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = vibratoHz;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, start);
    lg.gain.linearRampToValueAtTime(vibratoCents, start + Math.min(dur * 0.5, 0.14));
    lfo.connect(lg);
    lg.connect(o1.detune);
    lg.connect(o2.detune);
    lfo.start(start);
    lfo.stop(stopTime + 0.02);
  }

  const mix = ctx.createGain();
  mix.gain.value = 0.55;
  o1.connect(mix);
  o2.connect(mix);

  const f1 = ctx.createBiquadFilter();
  f1.type = "peaking";
  f1.frequency.value = 285;
  f1.Q.value = 1.8;
  f1.gain.value = 4.2;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = clampFreq(lpFreq);
  lp.Q.value = 0.85;

  mix.connect(f1);
  f1.connect(lp);

  if (bowAir > 0.005) {
    const ns = ctx.createBufferSource();
    ns.buffer = getPinkNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = clampFreq(f * 2.2);
    bp.Q.value = 2.0;
    const ng = ctx.createGain();
    ng.gain.value = bowAir;
    ns.connect(bp);
    bp.connect(ng);
    ng.connect(lp);
    ns.start(start, (start * 2.1) % 3.0, stopTime - start + 0.02);
  }

  const env = ctx.createGain();
  const aEnd = start + Math.min(attack, dur * 0.45);
  const rStart = Math.max(aEnd + 0.005, stopTime - release);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, aEnd);
  env.gain.setValueAtTime(gain * 0.92, rStart);
  env.gain.linearRampToValueAtTime(0, stopTime);
  lp.connect(env);

  connectPanAndSend(ctx, env, dest, 1.0, pan, sendDest, sendAmt);

  o1.start(start);
  o2.start(start);
  o1.stop(stopTime + 0.02);
  o2.stop(stopTime + 0.02);
}

/**
 * Wind/Flute/Ocarina/Xiao/Dizi synthesis with breath chiff & optional bamboo membrane buzz.
 */
export function playFluteReed(ctx, dest, freq, t0, dur, opts = {}) {
  const start = Math.max(0, t0);
  const f = clampFreq(freq);
  const {
    gain = 0.22,
    pan = 0,
    attack = 0.045,
    release = 0.06,
    breathAmt = 0.14,
    chiffAmt = 0.2,
    harmonic2 = 0.18,
    harmonic3 = 0.06,
    vibratoHz = 5.0,
    vibratoCents = 12,
    bendFromSemis = 0,
    bendDur = 0.07,
    diziBuzz = 0,
    sendDest = null,
    sendAmt = 0.22,
  } = opts;

  const stopTime = start + Math.max(0.05, dur);
  const fStart = bendFromSemis !== 0 ? clampFreq(f * Math.pow(2, bendFromSemis / 12)) : f;

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(fStart, start);
  if (bendFromSemis !== 0) {
    osc1.frequency.exponentialRampToValueAtTime(f, start + Math.min(dur * 0.5, bendDur));
  }

  const mix = ctx.createGain();
  mix.gain.value = 0.85;
  osc1.connect(mix);

  if (harmonic2 > 0.01) {
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(fStart * 2, start);
    if (bendFromSemis !== 0) osc2.frequency.exponentialRampToValueAtTime(f * 2, start + Math.min(dur * 0.5, bendDur));
    const g2 = ctx.createGain();
    g2.gain.value = harmonic2;
    osc2.connect(g2);
    g2.connect(mix);
    osc2.start(start);
    osc2.stop(stopTime + 0.02);
  }
  if (harmonic3 > 0.01) {
    const osc3 = ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(f * 3, start);
    const g3 = ctx.createGain();
    g3.gain.value = harmonic3 + diziBuzz * 0.18;
    osc3.connect(g3);
    g3.connect(mix);
    osc3.start(start);
    osc3.stop(stopTime + 0.02);
  }

  if (vibratoHz > 0 && vibratoCents > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = vibratoHz;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, start);
    lg.gain.linearRampToValueAtTime(vibratoCents, start + Math.min(dur * 0.55, 0.12));
    lfo.connect(lg);
    lg.connect(osc1.detune);
    lfo.start(start);
    lfo.stop(stopTime + 0.02);
  }

  // Breath air stream & attack chiff
  if (breathAmt > 0.005 || chiffAmt > 0.005) {
    const ns = ctx.createBufferSource();
    ns.buffer = getPinkNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = clampFreq(f * 1.65);
    bp.Q.value = 2.4;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(chiffAmt + breathAmt, start + 0.012);
    ng.gain.exponentialRampToValueAtTime(safeGain(breathAmt), start + Math.min(dur * 0.6, 0.06));
    ng.gain.linearRampToValueAtTime(0, stopTime);
    ns.connect(bp);
    bp.connect(ng);
    ng.connect(mix);
    ns.start(start, (start * 1.91) % 3.1, stopTime - start + 0.02);
  }

  let head = mix;
  if (diziBuzz > 0.01) {
    const br = ctx.createBiquadFilter();
    br.type = "peaking";
    br.frequency.value = clampFreq(f * 3.1);
    br.Q.value = 2.2;
    br.gain.value = 5.5 * diziBuzz;
    head.connect(br);
    head = br;
  }

  const env = ctx.createGain();
  const aEnd = start + Math.min(attack, dur * 0.4);
  const rStart = Math.max(aEnd + 0.005, stopTime - release);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, aEnd);
  env.gain.setValueAtTime(gain * 0.9, rStart);
  env.gain.linearRampToValueAtTime(0, stopTime);
  head.connect(env);

  connectPanAndSend(ctx, env, dest, 1.0, pan, sendDest, sendAmt);

  osc1.start(start);
  osc1.stop(stopTime + 0.02);
}

/**
 * Procedural multi-era drum & percussion synthesizer.
 */
export function playDrum(ctx, dest, kind, t0, vel = 0.7, opts = {}) {
  const start = Math.max(0, t0);
  const { pan = 0, pitch = 240, sendDest = null, sendAmt = 0.12 } = opts;

  if (kind === "djembeLow" || kind === "taikoCeremonial" || kind === "tanggu" || kind === "kick909") {
    const f0 = kind === "kick909" ? 142 : kind === "djembeLow" ? 132 : kind === "tanggu" ? 128 : 96;
    const f1 = kind === "kick909" ? 45 : kind === "djembeLow" ? 64 : kind === "tanggu" ? 66 : 48;
    const dur = kind === "taikoCeremonial" ? 0.42 : 0.24;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(f1, start + 0.065);
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, start);
    eg.gain.linearRampToValueAtTime(vel * 0.75, start + 0.004);
    eg.gain.exponentialRampToValueAtTime(0.0002, start + dur - 0.01);
    eg.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(eg);
    connectPanAndSend(ctx, eg, dest, 1.0, pan, sendDest, sendAmt * 0.4);
    o.start(start);
    o.stop(start + dur + 0.02);

    // Mallet/palm impact click
    const ns = ctx.createBufferSource();
    ns.buffer = getPinkNoiseBuffer(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = kind === "kick909" ? 950 : 750;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(vel * 0.28, start + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
    ng.gain.linearRampToValueAtTime(0, start + 0.04);
    ns.connect(lp);
    lp.connect(ng);
    connectPanAndSend(ctx, ng, dest, 1.0, pan, sendDest, sendAmt * 0.2);
    ns.start(start, (start * 0.9) % 3.1, 0.045);
    return;
  }

  if (kind === "djembeSlap" || kind === "clap" || kind === "snarePop") {
    const dur = kind === "clap" ? 0.16 : 0.13;
    const ns = ctx.createBufferSource();
    ns.buffer = getWhiteNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = kind === "djembeSlap" ? 1650 : kind === "clap" ? 1550 : 2100;
    bp.Q.value = kind === "clap" ? 1.4 : 1.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, start);
    ng.gain.linearRampToValueAtTime(vel * 0.42, start + 0.002);
    if (kind === "clap") {
      ng.gain.setValueAtTime(vel * 0.15, start + 0.011);
      ng.gain.linearRampToValueAtTime(vel * 0.36, start + 0.018);
      ng.gain.setValueAtTime(vel * 0.12, start + 0.028);
      ng.gain.linearRampToValueAtTime(vel * 0.32, start + 0.036);
    }
    ng.gain.exponentialRampToValueAtTime(0.0002, start + dur - 0.01);
    ng.gain.linearRampToValueAtTime(0, start + dur);
    ns.connect(bp);
    bp.connect(ng);
    connectPanAndSend(ctx, ng, dest, 1.0, pan, sendDest, sendAmt);
    ns.start(start, (start * 1.7) % 3.1, dur + 0.02);

    if (kind === "djembeSlap" || kind === "snarePop") {
      const bo = ctx.createOscillator();
      bo.type = "triangle";
      bo.frequency.setValueAtTime(kind === "djembeSlap" ? 310 : 210, start);
      bo.frequency.exponentialRampToValueAtTime(kind === "djembeSlap" ? 155 : 132, start + 0.05);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0, start);
      bg.gain.linearRampToValueAtTime(vel * 0.34, start + 0.002);
      bg.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
      bg.gain.linearRampToValueAtTime(0, start + 0.085);
      bo.connect(bg);
      connectPanAndSend(ctx, bg, dest, 1.0, pan, sendDest, sendAmt * 0.5);
      bo.start(start);
      bo.stop(start + 0.095);
    }
    return;
  }

  if (kind === "woodblock" || kind === "logDrum") {
    const f = kind === "logDrum" ? clampFreq(pitch) : 980;
    const dur = kind === "logDrum" ? 0.22 : 0.075;
    const o = ctx.createOscillator();
    o.type = kind === "logDrum" ? "sine" : "triangle";
    o.frequency.setValueAtTime(f * 1.15, start);
    o.frequency.exponentialRampToValueAtTime(f, start + 0.012);
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, start);
    eg.gain.linearRampToValueAtTime(vel * 0.48, start + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, start + dur - 0.005);
    eg.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(eg);
    connectPanAndSend(ctx, eg, dest, 1.0, pan, sendDest, sendAmt);
    o.start(start);
    o.stop(start + dur + 0.015);
    return;
  }

  if (kind === "tablaBayan" || kind === "tablaDayan") {
    if (kind === "tablaBayan") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(84, start);
      o.frequency.exponentialRampToValueAtTime(142, start + 0.09);
      o.frequency.exponentialRampToValueAtTime(76, start + 0.26);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vel * 0.62, start + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      g.gain.linearRampToValueAtTime(0, start + 0.30);
      o.connect(g);
      connectPanAndSend(ctx, g, dest, 1.0, pan - 0.25, sendDest, sendAmt * 0.4);
      o.start(start);
      o.stop(start + 0.32);
    } else {
      playFMVoice(ctx, dest, clampFreq(pitch || 294), start, 0.24, {
        gain: vel * 0.32,
        pan: pan + 0.25,
        modRatio: 1.5,
        modIndexStart: 1.4,
        modIndexEnd: 0.15,
        attack: 0.002,
        decay: 0.12,
        sustain: 0.08,
        release: 0.05,
        bellRatio: 2.0,
        bellLevel: 0.24,
        sendDest,
        sendAmt,
      });
    }
    return;
  }

  if (kind === "gong") {
    const base = clampFreq(opts.pitch || 98);
    const ratios = [1.0, 1.52, 2.13, 2.89, 3.74];
    for (let i = 0; i < ratios.length; i++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(clampFreq(base * ratios[i]), start);
      const g = ctx.createGain();
      const lv = (vel * 0.28) / (1 + i * 0.7);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(lv, start + 0.015 + i * 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 2.2 - i * 0.25);
      g.gain.linearRampToValueAtTime(0, start + 2.35 - i * 0.25);
      o.connect(g);
      connectPanAndSend(ctx, g, dest, 1.0, pan, sendDest, sendAmt + 0.15);
      o.start(start);
      o.stop(start + 2.4);
    }
    return;
  }

  // Metallic hi-hats (hatClosed, hatOpen, sistrum)
  const dur = kind === "hatOpen" ? 0.24 : kind === "sistrum" ? 0.14 : 0.048;
  const ns = ctx.createBufferSource();
  ns.buffer = getWhiteNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = kind === "sistrum" ? 5800 : 7200;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, start);
  ng.gain.linearRampToValueAtTime(vel * 0.24, start + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, start + dur - 0.005);
  ng.gain.linearRampToValueAtTime(0, start + dur);
  ns.connect(hp);
  hp.connect(ng);
  connectPanAndSend(ctx, ng, dest, 1.0, pan, sendDest, sendAmt);
  ns.start(start, (start * 2.3) % 3.1, dur + 0.015);
}
