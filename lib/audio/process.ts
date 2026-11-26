// Checks a recording or upload and converts it to 16 kHz mono WAV in the browser.
import {
  DURATION_TOLERANCE_SECONDS,
  MAX_RECORDING_SECONDS,
  MAX_UPLOAD_BYTES,
  MIN_RECORDING_SECONDS,
  SILENCE_PEAK,
  TARGET_SAMPLE_RATE,
} from "../config";
import type { Source } from "../types";
import { encodeWav } from "./wav";

export type Rejection = "unsupported" | "unreadable" | "too-large" | "too-short" | "too-long" | "silent";

export type ProcessResult =
  | { ok: true; wav: ArrayBuffer; durationMs: number }
  | { ok: false; reason: Rejection };

export const REJECTION_MESSAGES: Record<Rejection, string> = {
  unsupported: "This browser cannot process audio. Open this page in Safari or Chrome.",
  unreadable: "This file could not be read as audio.",
  "too-large": "Files must be 10 MB or smaller.",
  "too-short": "Audio must be at least 1 second long.",
  "too-long": "Audio must be 30 seconds or shorter.",
  silent: "No sound was detected. Try again.",
};

/** Averages all channels into one. */
export function downmix(channels: readonly Float32Array[]): Float32Array {
  return Float32Array.from(channels[0], (_, i) => channels.reduce((sum, c) => sum + c[i], 0) / channels.length);
}

/** False when the length is unknown (NaN or Infinity). */
const isTooLong = (seconds: number) =>
  Number.isFinite(seconds) && seconds > MAX_RECORDING_SECONDS + DURATION_TOLERANCE_SECONDS;

export function rejectSamples(samples: Float32Array, sampleRate: number): Rejection | null {
  const seconds = samples.length / sampleRate;
  if (seconds < MIN_RECORDING_SECONDS) return "too-short";
  if (isTooLong(seconds)) return "too-long";
  return samples.some((s) => Math.abs(s) >= SILENCE_PEAK) ? null : "silent";
}

const METADATA_TIMEOUT_MS = 3000;

/** The length the browser reports without decoding the audio. NaN or Infinity when it cannot tell. */
function reportedSeconds(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (seconds: number) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    const timer = setTimeout(() => done(Number.NaN), METADATA_TIMEOUT_MS);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(Number.NaN);
    audio.src = url;
  });
}

/** Null when the browser cannot read the file. The speaker is told so. */
async function decode(blob: Blob): Promise<AudioBuffer | null> {
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await blob.arrayBuffer());
  } catch (error) {
    console.warn("Audio could not be decoded", error);
    return null;
  } finally {
    await context.close();
  }
}

async function resample(samples: Float32Array, sampleRate: number): Promise<Float32Array> {
  const length = Math.ceil((samples.length / sampleRate) * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
  const buffer = offline.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

const hasWebAudio = () => typeof AudioContext !== "undefined" && typeof OfflineAudioContext !== "undefined";

/**
 * Uploads over the time limit are refused. A recording is cut to the limit instead, because the
 * stop timer can fire late on a busy phone and the take must not be lost.
 */
export async function processAudio(blob: Blob, source: Source = "uploaded"): Promise<ProcessResult> {
  const upload = source === "uploaded";
  if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too-large" };
  if (!hasWebAudio()) return { ok: false, reason: "unsupported" };
  // A long file can be small on disk but huge once decoded, enough to crash a phone.
  if (upload && isTooLong(await reportedSeconds(blob))) return { ok: false, reason: "too-long" };
  const decoded = await decode(blob);
  if (!decoded) return { ok: false, reason: "unreadable" };
  if (upload && isTooLong(decoded.duration)) return { ok: false, reason: "too-long" };
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, c) => decoded.getChannelData(c));
  const whole = downmix(channels);
  const mono = upload ? whole : whole.subarray(0, MAX_RECORDING_SECONDS * decoded.sampleRate);
  const reason = rejectSamples(mono, decoded.sampleRate);
  if (reason) return { ok: false, reason };
  const wav = encodeWav(await resample(mono, decoded.sampleRate), TARGET_SAMPLE_RATE);
  return { ok: true, wav, durationMs: Math.round((mono.length / decoded.sampleRate) * 1000) };
}
