/**
 * Master Segmented Offline Soundtrack Engine, Acoustic Analyzer & 16-bit WAV Encoder (`audio/engine.js`).
 * Renders each 5–12s musical chapter in its own fast OfflineAudioContext (parallel batches),
 * composites into the 137.0s 48kHz stereo master AudioBuffer, and applies a smooth -0.8 dBFS
 * soft limiter pass so full-film startup takes just a few seconds instead of tens of seconds.
 */

import {
  SAMPLE_RATE,
  TOTAL_AUDIO_DUR,
  clamp,
  getStudioRoomIR,
  getVaporMallHallIR,
} from "./dsp.js";
import { scheduleEraBlock, scheduleIntroMusic, scheduleOutroMusic } from "./instruments.js";
import {
  playElectricTransitionSFX,
  schedule8BitGameSFX,
  scheduleEraBicyclePercussion,
  scheduleOutroSFX,
  scheduleWindowNudgeSFX,
} from "./sfx.js";
import { renderVaporwaveSourceBuffer, scheduleVaporwaveCassette } from "./vaporwave.js";

function setupSegmentGraph(durSec, sampleRate) {
  const ctx = new OfflineAudioContext(2, Math.ceil(durSec * sampleRate), sampleRate);
  const mixBus = ctx.createGain();
  mixBus.gain.value = 1.04;
  mixBus.connect(ctx.destination);

  const roomConv = ctx.createConvolver();
  roomConv.buffer = getStudioRoomIR(ctx);
  const roomReturn = ctx.createGain();
  roomReturn.gain.value = 0.6;
  roomConv.connect(roomReturn);
  roomReturn.connect(mixBus);

  return { ctx, mixBus, roomConv };
}

function softLimitSample(x, ceiling = 0.90) {
  const ax = Math.abs(x);
  if (ax <= 0.58) return x;
  const head = ceiling - 0.58;
  return Math.sign(x) * clamp(0.58 + head * Math.tanh((ax - 0.58) / head), 0, ceiling);
}

/**
 * Renders all 137.0s of multi-era procedural music & SFX via fast parallel OfflineAudioContexts.
 */
export async function renderFullSoundtrack({ sampleRate = SAMPLE_RATE } = {}) {
  // Stage A: Render #18 Vaporwave 151.2 BPM +4 semitone source track first
  const vaporBuffer = await renderVaporwaveSourceBuffer(sampleRate);

  const jobs = [];

  // 1) Intro (0.0 .. 5.25s)
  jobs.push({
    startSec: 0.0,
    run: async () => {
      const { ctx, mixBus, roomConv } = setupSegmentGraph(5.3, sampleRate);
      scheduleIntroMusic(ctx, mixBus, roomConv);
      scheduleEraBicyclePercussion(ctx, mixBus, roomConv, -1, 0);
      return await ctx.startRendering();
    },
  });

  // 2) Eras #01 .. #20 (6.0s + 0.35s reverb/decay tail)
  for (let i = 0; i < 20; i++) {
    const startSec = 5.0 + i * 6.0;
    jobs.push({
      startSec,
      run: async () => {
        const { ctx, mixBus, roomConv } = setupSegmentGraph(6.4, sampleRate);
        if (i === 17) {
          // #18 Vaporwave cassette slowed 0.7937x + Bar-2 4x stutter
          const mallIR = getVaporMallHallIR(ctx);
          scheduleVaporwaveCassette(ctx, mixBus, vaporBuffer, mallIR, 0.0);
        } else {
          scheduleEraBlock(ctx, mixBus, roomConv, i, 0.0);
        }
        scheduleEraBicyclePercussion(ctx, mixBus, roomConv, i, 0.0);
        if (i === 15) schedule8BitGameSFX(ctx, mixBus, 0.0);
        if (i === 16) scheduleWindowNudgeSFX(ctx, mixBus, 0.0);
        return await ctx.startRendering();
      },
    });
  }

  // 3) 14 -> 15 Electric Portal SFX bridging 88.45 .. 89.45s
  jobs.push({
    startSec: 88.45,
    run: async () => {
      const { ctx, mixBus, roomConv } = setupSegmentGraph(1.1, sampleRate);
      playElectricTransitionSFX(ctx, mixBus, 0.55, roomConv);
      return await ctx.startRendering();
    },
  });

  // 4) Outro Press Conference (125.0 .. 137.0s)
  jobs.push({
    startSec: 125.0,
    run: async () => {
      const { ctx, mixBus, roomConv } = setupSegmentGraph(12.0, sampleRate);
      scheduleOutroMusic(ctx, mixBus, roomConv, 0.0);
      scheduleOutroSFX(ctx, mixBus, roomConv, 0.0);
      return await ctx.startRendering();
    },
  });

  // Execute OfflineAudioContexts in bounded parallel waves of 6
  const rendered = [];
  for (let k = 0; k < jobs.length; k += 6) {
    const batch = jobs.slice(k, k + 6);
    const bufs = await Promise.all(batch.map((j) => j.run()));
    for (let m = 0; m < batch.length; m++) {
      rendered.push({ startSec: batch[m].startSec, buf: bufs[m] });
    }
  }

  // Sum into single stereo 137.0s master buffer
  const totalFrames = Math.ceil(TOTAL_AUDIO_DUR * sampleRate);
  const mixerCtx = new OfflineAudioContext(2, totalFrames, sampleRate);
  const masterBuf = mixerCtx.createBuffer(2, totalFrames, sampleRate);
  const outL = masterBuf.getChannelData(0);
  const outR = masterBuf.getChannelData(1);

  for (const item of rendered) {
    const offset = Math.max(0, Math.round(item.startSec * sampleRate));
    const srcL = item.buf.getChannelData(0);
    const srcR = item.buf.numberOfChannels > 1 ? item.buf.getChannelData(1) : srcL;
    const count = Math.min(item.buf.length, totalFrames - offset);
    for (let n = 0; n < count; n++) {
      outL[offset + n] += srcL[n];
      outR[offset + n] += srcR[n];
    }
  }

  // Smooth sample-accurate soft limiter pass at -0.8 dBFS ceiling (0.90)
  for (let i = 0; i < totalFrames; i++) {
    outL[i] = softLimitSample(outL[i], 0.9);
    outR[i] = softLimitSample(outR[i], 0.9);
  }

  return masterBuf;
}

/**
 * Inspects rendered AudioBuffer for NaNs, headroom, and per-section RMS/peak loudness.
 */
export function analyzeAudioBuffer(audioBuffer) {
  const sr = audioBuffer.sampleRate;
  const chCount = audioBuffer.numberOfChannels;
  const left = audioBuffer.getChannelData(0);
  const right = chCount > 1 ? audioBuffer.getChannelData(1) : left;

  let hasNaN = false;
  let maxPeak = 0;
  let globalSq = 0;
  const totalSamples = audioBuffer.length;

  for (let i = 0; i < totalSamples; i++) {
    const l = left[i];
    const r = right[i];
    if (!Number.isFinite(l) || !Number.isFinite(r)) {
      hasNaN = true;
      continue;
    }
    const p = Math.max(Math.abs(l), Math.abs(r));
    if (p > maxPeak) maxPeak = p;
    globalSq += 0.5 * (l * l + r * r);
  }

  const measureRange = (name, tStart, tEnd, requireActive = true) => {
    const i0 = Math.max(0, Math.floor(tStart * sr));
    const i1 = Math.min(totalSamples, Math.floor(tEnd * sr));
    let peak = 0;
    let sq = 0;
    const count = Math.max(1, i1 - i0);
    for (let i = i0; i < i1; i++) {
      const l = left[i];
      const r = right[i];
      const p = Math.max(Math.abs(l), Math.abs(r));
      if (p > peak) peak = p;
      sq += 0.5 * (l * l + r * r);
    }
    const rms = Math.sqrt(sq / count);
    const rmsDb = rms > 1e-7 ? 20 * Math.log10(rms) : -140;
    const peakDb = peak > 1e-7 ? 20 * Math.log10(peak) : -140;
    return { name, tStart, tEnd, rmsDb, peak, peakDb, requireActive };
  };

  const segments = [measureRange("Intro", 0.0, 5.0, true)];
  for (let i = 0; i < 20; i++) {
    const s = 5.0 + i * 6.0;
    segments.push(measureRange(`Era #${String(i + 1).padStart(2, "0")}`, s, s + 6.0, true));
  }
  segments.push(measureRange("Outro Tutti", 125.0, 129.0, true));
  segments.push(measureRange("Outro Flash Push", 129.0, 133.0, true));
  segments.push(measureRange("Outro Silence", 133.6, 135.2, false));
  segments.push(measureRange("Outro Fly-by & Bell", 135.3, 137.0, true));

  const globalRms = Math.sqrt(globalSq / Math.max(1, totalSamples));
  return {
    duration: audioBuffer.duration,
    sampleRate: sr,
    channels: chCount,
    hasNaN,
    maxPeak,
    globalRmsDb: globalRms > 1e-7 ? 20 * Math.log10(globalRms) : -140,
    segments,
  };
}

/**
 * Encodes a stereo AudioBuffer into standard 16-bit PCM WAV bytes.
 */
export function encodeWav16Bit(audioBuffer) {
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sr = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const left = audioBuffer.getChannelData(0);
  const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;
  let bytePos = 44;
  for (let i = 0; i < numFrames; i++) {
    const sL = Math.round(clamp(left[i], -1, 1) * 32767);
    const sR = Math.round(clamp(right[i], -1, 1) * 32767);
    view.setInt16(bytePos, sL, true);
    view.setInt16(bytePos + 2, sR, true);
    bytePos += 4;
  }

  return new Uint8Array(buffer);
}
