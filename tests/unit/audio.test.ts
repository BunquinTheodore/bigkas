import { expect, test } from "vitest";
import { downmix, processAudio, rejectSamples } from "@/lib/audio/process";
import { encodeWav } from "@/lib/audio/wav";

const tone = (seconds: number, peak = 0.5) => new Float32Array(Math.round(seconds * 16000)).fill(peak);

test("16 kHz mono 16 bit header and clamped samples", () => {
  const v = new DataView(encodeWav(Float32Array.of(0, 1, -1, 2), 16000));
  expect(String.fromCharCode(...new Uint8Array(v.buffer, 0, 4))).toBe("RIFF");
  expect([v.getUint16(22, true), v.getUint32(24, true), v.getUint16(34, true), v.getUint32(40, true)]).toEqual([1, 16000, 16, 8]);
  expect([44, 46, 48, 50].map((at) => v.getInt16(at, true))).toEqual([0, 32767, -32768, 32767]);
});
test("downmix and limits", () => {
  expect(Array.from(downmix([Float32Array.of(1, 0), Float32Array.of(0, 0)]))).toEqual([0.5, 0]);
  expect(rejectSamples(tone(1), 16000)).toBeNull();
  expect(rejectSamples(tone(1).slice(1), 16000)).toBe("too-short");
  expect(rejectSamples(tone(30.5), 16000)).toBeNull();
  expect(rejectSamples(tone(30.6), 16000)).toBe("too-long");
  expect(rejectSamples(tone(2, 0.005), 16000)).toBe("silent");
  expect(rejectSamples(tone(2, 0.02), 16000)).toBeNull();
});

test("a browser without Web Audio is reported as such, not as a bad file", async () => {
  expect(typeof AudioContext).toBe("undefined"); // Node has no Web Audio either
  expect(await processAudio(new Blob([new Uint8Array(16)]))).toEqual({ ok: false, reason: "unsupported" });
});
