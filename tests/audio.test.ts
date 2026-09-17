import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it, expect } from "vitest";
function worklet(rate: number) {
  type Processor = {
    process: (i: Float32Array[][], o: Float32Array[][]) => void;
    output: number[];
  };
  let Constructor: (new () => Processor) | undefined;
  const chunks: ArrayBuffer[] = [];
  const context = {
    sampleRate: rate,
    AudioWorkletProcessor: class {
      port = { postMessage: (b: ArrayBuffer) => chunks.push(b) };
    },
    registerProcessor: (_n: string, c: new () => Processor) =>
      (Constructor = c),
  };
  vm.runInNewContext(readFileSync("public/pcm-worklet.js", "utf8"), context);
  return { processor: new Constructor!(), chunks };
}
describe("microphone PCM transport", () => {
  it.each([44100, 48000, 24000])(
    "resamples %i Hz to 24kHz over multiple frames",
    (rate) => {
      const { processor, chunks } = worklet(rate);
      for (let n = 0; n < rate; n += 128) {
        const channel = new Float32Array(Math.min(128, rate - n)).fill(0.5);
        processor.process([[channel]], [[new Float32Array(128)]]);
      }
      const count =
        chunks.reduce((n, b) => n + b.byteLength / 2, 0) +
        processor.output.length;
      expect(count).toBeGreaterThanOrEqual(23998);
      expect(count).toBeLessThanOrEqual(24000);
      expect(chunks.every((b) => b.byteLength === 2400)).toBe(true);
      expect(new DataView(chunks[0]).getInt16(0, true)).toBe(16384);
    },
  );
  it("clips out-of-range input and keeps output silent", () => {
    const { processor, chunks } = worklet(24000);
    const out = new Float32Array(1400).fill(1);
    processor.process([[new Float32Array(1400).fill(-2)]], [[out]]);
    expect(new DataView(chunks[0]).getInt16(0, true)).toBe(-32768);
    expect(out.every((v) => v === 0)).toBe(true);
  });
});
