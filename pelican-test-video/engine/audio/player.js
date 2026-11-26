/**
 * Real-Time Browser Audio Sync Controller (`audio/player.js`).
 * Pre-renders the 137.0s procedural soundtrack via OfflineAudioContext on load
 * and locks visual animation frames to Web Audio hardware `AudioContext.currentTime`.
 */

import { TOTAL_AUDIO_DUR, clamp } from "./dsp.js";
import { analyzeAudioBuffer, renderFullSoundtrack } from "./engine.js";

export function createAudioPlayer({ onStatusChange = null } = {}) {
  let audioCtx = null;
  let masterGain = null;
  let renderedBuffer = null;
  let renderPromise = null;
  let activeSrc = null;
  let isPlaying = false;
  let isMuted = false;
  let startOffset = 0;
  let startCtxTime = 0;
  let playToken = 0;

  function emitStatus(text, ready = false) {
    if (onStatusChange) onStatusChange({ text, ready, muted: isMuted });
  }

  function prepare() {
    if (renderPromise) return renderPromise;
    emitStatus("120 BPM · 合成配乐渲染中...", false);
    const t0 = performance.now();
    renderPromise = renderFullSoundtrack()
      .then((buf) => {
        renderedBuffer = buf;
        const stats = analyzeAudioBuffer(buf);
        const ms = Math.round(performance.now() - t0);
        emitStatus(`120 BPM · 60fps · 配乐就绪 (${ms}ms · ${stats.maxPeak.toFixed(2)}pk)`, true);
        return buf;
      })
      .catch((err) => {
        emitStatus(`音频初始化失败: ${err.message}`, false);
        throw err;
      });
    return renderPromise;
  }

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = isMuted ? 0 : 0.94;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function stopSource() {
    if (activeSrc) {
      try {
        activeSrc.stop();
        activeSrc.disconnect();
      } catch {
        // Ignore already-stopped source nodes
      }
      activeSrc = null;
    }
  }

  async function startFrom(offsetSec = 0) {
    const token = ++playToken;
    isPlaying = true;
    const ctx = ensureAudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const buf = renderedBuffer || (await prepare());
    if (token !== playToken || !isPlaying) return;

    stopSource();
    startOffset = clamp(offsetSec, 0, Math.max(0, buf.duration - 0.02));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(masterGain);
    startCtxTime = ctx.currentTime;
    src.start(0, startOffset);
    activeSrc = src;
  }

  function stop() {
    playToken++;
    isPlaying = false;
    stopSource();
  }

  function setMuted(muted) {
    isMuted = Boolean(muted);
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.94, audioCtx.currentTime, 0.015);
    }
  }

  function toggleMute() {
    setMuted(!isMuted);
    return isMuted;
  }

  function getAudioTime() {
    if (!isPlaying || !audioCtx || !renderedBuffer || !activeSrc) return null;
    return clamp(startOffset + Math.max(0, audioCtx.currentTime - startCtxTime), 0, TOTAL_AUDIO_DUR);
  }

  return {
    prepare,
    startFrom,
    stop,
    setMuted,
    toggleMute,
    isMuted: () => isMuted,
    isReady: () => Boolean(renderedBuffer),
    getAudioTime,
  };
}
