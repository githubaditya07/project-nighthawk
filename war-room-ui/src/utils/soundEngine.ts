// Web Audio API Sound Engine (matching reference HTML ambient bed + SFX)
let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientStarted = false;

export let sfxEnabledState = true;

export function setSfxEnabled(enabled: boolean) {
  sfxEnabledState = enabled;
}

function getAudioCtx(): AudioContext | null {
  if (!sfxEnabledState) return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function ensureAmbientBed(sfxEnabled: boolean, weatherEnabled: boolean) {
  sfxEnabledState = sfxEnabled;
  if (!sfxEnabled || !weatherEnabled) {
    if (ambientGain && audioCtx) {
      ambientGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.25);
    }
    return;
  }
  const ctx = getAudioCtx();
  if (!ctx) return;

  if (!ambientStarted) {
    ambientStarted = true;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      ch[i] = (b0 + b1 + b2 + white * 0.015) * 0.45;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.65;
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.0001;
    src.connect(bp).connect(ambientGain).connect(ctx.destination);
    src.start();
  }
  if (ambientGain) {
    ambientGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.35);
  }
}

export function duckAmbientBed(durationSec = 0.7, weatherEnabled = true) {
  if (!ambientGain || !audioCtx || !sfxEnabledState || !weatherEnabled) return;
  const now = audioCtx.currentTime;
  ambientGain.gain.cancelScheduledValues(now);
  ambientGain.gain.setTargetAtTime(0.008, now, 0.04);
  ambientGain.gain.setTargetAtTime(0.045, now + durationSec, 0.3);
}

export function playTactileClick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.055);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.065);
}

export function playNavWhoosh() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(320, now);
  filter.frequency.exponentialRampToValueAtTime(1600, now + 0.16);
  filter.frequency.exponentialRampToValueAtTime(420, now + 0.35);
  filter.Q.value = 1.6;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.001, now);
  nGain.gain.linearRampToValueAtTime(0.18, now + 0.09);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  noise.connect(filter).connect(nGain).connect(ctx.destination);
  noise.start(now);

  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.22);
  oGain.gain.setValueAtTime(0.08, now + 0.04);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  osc.connect(oGain).connect(ctx.destination);
  osc.start(now + 0.04);
  osc.stop(now + 0.35);
}

export function playThunderStrike(weatherEnabled = true) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  duckAmbientBed(0.85, weatherEnabled);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(135, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.45);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(240, now);
  oGain.gain.setValueAtTime(0.24, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(lp).connect(oGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.52);

  const bufferSize = ctx.sampleRate * 0.65;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.22));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'lowpass';
  nFilter.frequency.setValueAtTime(650, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.22, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  noise.connect(nFilter).connect(nGain).connect(ctx.destination);
  noise.start(now);
}

export function playBitRotGlitch() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.08].forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(idx === 0 ? 440 : 310, now + offset);
    osc.frequency.setValueAtTime(idx === 0 ? 290 : 195, now + offset + 0.04);
    gain.gain.setValueAtTime(0.07, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.075);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.08);
  });
}

const HEAL_NOTES = [523.25, 659.25, 783.99, 987.77, 1174.66];

export function playHealChime(step = 0, weatherEnabled = true) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  duckAmbientBed(0.5, weatherEnabled);
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(HEAL_NOTES[step % HEAL_NOTES.length], now);
  gain.gain.setValueAtTime(0.11, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.34);
}
